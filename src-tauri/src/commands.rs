use std::path::PathBuf;
use std::process::Command;
use std::fs;
use std::io;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use chrono::Utc;
use reqwest;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use zip::ZipArchive;
use futures_util::StreamExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionProgress {
    pub status: String,
    pub message: String,
    pub progress: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f32,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PandocDownloadResult {
    pub success: bool,
    pub pandoc_path: Option<String>,
    pub error: Option<String>,
}

// Helper function to create log entries
fn create_log_entry(level: &str, message: &str, details: Option<String>) -> LogEntry {
    LogEntry {
        timestamp: Utc::now().to_rfc3339(),
        level: level.to_string(),
        message: message.to_string(),
        details,
    }
}

// Helper function to emit log entry
fn emit_log(app: &tauri::AppHandle, level: &str, message: &str, details: Option<String>) {
    let _ = app.emit("conversion_log", create_log_entry(level, message, details));
}

// Get the appropriate pandoc download URL based on the current system
fn get_pandoc_download_url() -> Option<String> {
    let base_url = "https://assets.randynamic.org/pandocx/";
    let version = "3.8";
    
    let filename = if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            format!("pandoc-{}-arm64-macOS.zip", version)
        } else {
            format!("pandoc-{}-x86_64-macOS.zip", version)
        }
    } else if cfg!(target_os = "windows") {
        format!("pandoc-{}-windows-x86_64.zip", version)
    } else {
        // No Linux support for now
        return None;
    };
    
    Some(format!("{}{}", base_url, filename))
}

// Get the app data directory for storing pandoc binary
fn get_pandoc_storage_dir() -> Result<PathBuf, String> {
    let app_data_dir = dirs::data_dir()
        .ok_or("Could not determine app data directory")?
        .join("pandocx");
    
    // Create directory if it doesn't exist
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    Ok(app_data_dir)
}

// Check if pandoc binary exists and is executable
fn check_pandoc_exists() -> Option<PathBuf> {
    if let Ok(storage_dir) = get_pandoc_storage_dir() {
        let pandoc_path = storage_dir.join("pandoc");
        if pandoc_path.exists() {
            return Some(pandoc_path);
        }
    }
    None
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub async fn check_or_download_pandoc(app: tauri::AppHandle) -> Result<PandocDownloadResult, String> {
    // First check if pandoc already exists
    if let Some(pandoc_path) = check_pandoc_exists() {
        return Ok(PandocDownloadResult {
            success: true,
            pandoc_path: Some(pandoc_path.to_string_lossy().to_string()),
            error: None,
        });
    }
    
    // Get download URL for current system
    let download_url = get_pandoc_download_url()
        .ok_or("No pandoc binary available for your system")?;
    
    // Log the download URL for debugging
    emit_log(&app, "info", &format!("Downloading from: {}", download_url), None);
    
    let storage_dir = get_pandoc_storage_dir()?;
    let zip_path = storage_dir.join("pandoc.zip");
    
    // Emit initial download progress
    let _ = app.emit("download_progress", DownloadProgress {
        downloaded: 0,
        total: 0,
        percentage: 0.0,
        status: "Starting download...".to_string(),
    });
    
    // Download the zip file
    let client = reqwest::Client::new();
    let response = client.get(&download_url)
        .send()
        .await
        .map_err(|e| {
            let error_msg = format!("Failed to start download from {}: {}", download_url, e);
            emit_log(&app, "error", &error_msg, None);
            error_msg
        })?;
    
    if !response.status().is_success() {
        let error_msg = format!("Download failed with HTTP status: {} from URL: {}", response.status(), download_url);
        emit_log(&app, "error", &error_msg, None);
        return Err(error_msg);
    }
    
    let total_size = response.content_length().unwrap_or(0);
    
    // Create the zip file
    let mut file = File::create(&zip_path)
        .await
        .map_err(|e| format!("Failed to create zip file: {}", e))?;
    
    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();
    
    // Download with progress tracking
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Failed to read chunk: {}", e))?;
        
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Failed to write chunk: {}", e))?;
        
        downloaded += chunk.len() as u64;
        let percentage = if total_size > 0 {
            (downloaded as f32 / total_size as f32) * 100.0
        } else {
            0.0
        };
        
        // Emit progress update
        let _ = app.emit("download_progress", DownloadProgress {
            downloaded,
            total: total_size,
            percentage,
            status: "Downloading...".to_string(),
        });
    }
    
    file.flush().await.map_err(|e| format!("Failed to flush file: {}", e))?;
    drop(file);
    
    // Emit extraction progress
    let _ = app.emit("download_progress", DownloadProgress {
        downloaded: total_size,
        total: total_size,
        percentage: 100.0,
        status: "Extracting...".to_string(),
    });
    
    // Extract the zip file
    let zip_file = std::fs::File::open(&zip_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;
    
    let mut archive = ZipArchive::new(zip_file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;
    
    // Find and extract the pandoc binary
    let mut pandoc_found = false;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {}", e))?;
        
        let file_name = file.name();
        if file_name.ends_with("pandoc") || file_name.ends_with("pandoc.exe") {
            let pandoc_path = storage_dir.join("pandoc");
            
            let mut outfile = std::fs::File::create(&pandoc_path)
                .map_err(|e| format!("Failed to create pandoc file: {}", e))?;
            
            io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract pandoc: {}", e))?;
            
            // Make executable on Unix systems
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                std::fs::set_permissions(&pandoc_path, std::fs::Permissions::from_mode(0o755))
                    .map_err(|e| format!("Failed to set executable permissions: {}", e))?;
            }
            
            pandoc_found = true;
            break;
        }
    }
    
    // Clean up zip file
    let _ = std::fs::remove_file(&zip_path);
    
    if !pandoc_found {
        return Err("Pandoc binary not found in downloaded archive".to_string());
    }
    
    let pandoc_path = storage_dir.join("pandoc");
    
    // Emit completion
    let _ = app.emit("download_progress", DownloadProgress {
        downloaded: total_size,
        total: total_size,
        percentage: 100.0,
        status: "Complete!".to_string(),
    });
    
    Ok(PandocDownloadResult {
        success: true,
        pandoc_path: Some(pandoc_path.to_string_lossy().to_string()),
        error: None,
    })
}

#[tauri::command]
pub async fn get_pandoc_path() -> Result<Option<String>, String> {
    if let Some(pandoc_path) = check_pandoc_exists() {
        Ok(Some(pandoc_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn convert_document(
    app: tauri::AppHandle,
    pandoc_path: String,
    input_path: String,
    output_format: String,
) -> Result<ConversionResult, String> {
    let input_path_buf = PathBuf::from(&input_path);
    let input_stem = input_path_buf.file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid input file name")?;
    
    let output_path = input_path_buf.parent()
        .ok_or("Cannot determine output directory")?
        .join(format!("{}.{}", input_stem, output_format));

    // Build the command string for logging
    let command_str = format!("{} \"{}\" -o \"{}\"", pandoc_path, input_path, output_path.to_string_lossy());
    
    // Log the command being executed
    emit_log(&app, "info", &format!("$ {}", command_str), None);

    // Execute pandoc command
    let output = Command::new(&pandoc_path)
        .arg(&input_path)
        .arg("-o")
        .arg(&output_path)
        .output()
        .map_err(|e| {
            let error_msg = format!("Failed to execute pandoc: {}", e);
            emit_log(&app, "error", &error_msg, None);
            error_msg
        })?;

    // Log stdout if present
    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.trim().is_empty() {
        emit_log(&app, "info", &stdout.trim(), None);
    }

    // Log stderr if present (even on success, pandoc might output warnings)
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !stderr.trim().is_empty() {
        let level = if output.status.success() { "info" } else { "error" };
        emit_log(&app, level, &stderr.trim(), None);
    }

    if output.status.success() {
        let success_msg = format!("Successfully created: {}", output_path.to_string_lossy());
        emit_log(&app, "success", &success_msg, None);

        Ok(ConversionResult {
            success: true,
            output_path: Some(output_path.to_string_lossy().to_string()),
            error: None,
        })
    } else {
        Ok(ConversionResult {
            success: false,
            output_path: None,
            error: Some(stderr.to_string()),
        })
    }
}

#[tauri::command]
pub async fn check_pandoc_path(pandoc_path: String) -> Result<bool, String> {
    let output = Command::new(&pandoc_path)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute pandoc: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
pub async fn get_pandoc_version(app: tauri::AppHandle, pandoc_path: String) -> Result<String, String> {
    let command_str = format!("{} --version", pandoc_path);
    
    emit_log(&app, "info", &format!("$ {}", command_str), None);

    let output = Command::new(&pandoc_path)
        .arg("--version")
        .output()
        .map_err(|e| {
            let error_msg = format!("Failed to execute pandoc: {}", e);
            emit_log(&app, "error", &error_msg, None);
            error_msg
        })?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Log each line of the version output
        for line in stdout.lines() {
            if !line.trim().is_empty() {
                emit_log(&app, "success", line.trim(), None);
            }
        }
        Ok(stdout.to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        emit_log(&app, "error", &stderr.trim(), None);
        Err(stderr.to_string())
    }
}

#[tauri::command]
pub async fn open_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open in Finder: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open in Explorer: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("nautilus")
            .arg("--select")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open in file manager: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(settings_window) = app.get_webview_window("settings") {
        // Window exists (either visible or hidden), just show and focus it
        settings_window.show().map_err(|e| e.to_string())?;
        settings_window.set_focus().map_err(|e| e.to_string())?;
    } else {
        return Err("Settings window not found".to_string());
    }
    
    Ok(())
}

#[tauri::command]
pub async fn close_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(settings_window) = app.get_webview_window("settings") {
        settings_window.hide().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn open_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(main_window) = app.get_webview_window("main") {
        // Window exists (either visible or hidden), just show and focus it
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
    } else {
        return Err("Main window not found".to_string());
    }
    
    Ok(())
}
