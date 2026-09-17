mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
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
            storage::backup_catalog_database,
            storage::check_storage_health,
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
            storage::render_bibliography,
            storage::list_recovery_snapshots,
            storage::restore_recovery_snapshot,
            storage::clear_recovery_snapshots,
            storage::list_attachments,
            storage::link_attachment,
            storage::unlink_attachment,
            storage::open_attachment,
            storage::open_external_url,
            storage::rename_entry_metadata,
            storage::delete_entry_metadata,
            storage::list_entry_trash,
            storage::discard_entry_trash,
            storage::list_projects,
            storage::save_project,
            storage::delete_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hayman");
}
