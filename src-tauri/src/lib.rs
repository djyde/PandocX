mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::convert_document,
            commands::check_pandoc_path,
            commands::get_pandoc_version,
            commands::open_in_finder,
            commands::open_settings_window,
            commands::close_settings_window,
            commands::open_main_window,
            commands::check_or_download_pandoc,
            commands::get_pandoc_path
        ])
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Intercept close event for both main and settings windows
                    if window.label() == "settings" || window.label() == "main" {
                        // Prevent the default close behavior
                        api.prevent_close();
                        // Hide the window instead
                        let _ = window.hide();
                    }
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::Reopen { .. } => {
                    // Handle dock icon click on macOS
                    if let Some(main_window) = app_handle.get_webview_window("main") {
                        let _ = main_window.show();
                        let _ = main_window.set_focus();
                    }
                }
                _ => {}
            }
        });
}
