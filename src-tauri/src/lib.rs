#[tauri::command]
fn get_hardware_id() -> Result<String, String> {
    // MAC adresini al
    let mac = match mac_address::get_mac_address() {
        Ok(Some(ma)) => ma.to_string().replace(":", "").to_uppercase(),
        _ => "UNKNOWN".to_string(),
    };
    
    Ok(format!("MAC-{}", mac))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![get_hardware_id])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
