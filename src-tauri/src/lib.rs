mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            storage::initialize(app.handle()).map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            storage::storage_info,
            storage::list_bibliographies,
            storage::get_bibliography,
            storage::create_managed_bibliography,
            storage::link_bibliography,
            storage::import_bibliography_file,
            storage::save_bibliography,
            storage::rename_bibliography,
            storage::delete_bibliography,
            storage::get_settings,
            storage::set_settings,
            storage::typst_version,
            storage::render_typst,
            storage::list_recovery_snapshots,
            storage::restore_recovery_snapshot,
            storage::clear_recovery_snapshots,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hayman");
}
