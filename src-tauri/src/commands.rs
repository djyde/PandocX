use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use chrono::Utc;

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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
