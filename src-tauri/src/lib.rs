use std::process::Command;

#[tauri::command]
fn get_hardware_id() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("wmic")
            .args(["csproduct", "get", "uuid"])
            .output()
            .map_err(|e| e.to_string())?;
        
        let result = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = result.lines().collect();
        
        if lines.len() > 1 {
            let uuid = lines[1].trim().to_string();
            return Ok(uuid);
        }
    }
    
    Err("HWID alınamadı".to_string())
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
