mod commands;

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
            commands::close_settings_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
