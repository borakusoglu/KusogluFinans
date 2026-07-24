use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce
};
use base64::{Engine as _, engine::general_purpose};
use rand::RngCore;
use std::fs;
use tauri::Manager;

mod collection_api;

#[tauri::command]
async fn get_field_collections(status: String) -> Result<serde_json::Value, String> {
    collection_api::get_collections(&status).await
}

#[tauri::command]
async fn update_field_collection(collection: serde_json::Value, edited_by: String) -> Result<serde_json::Value, String> {
    collection_api::update_collection(&collection, &edited_by).await
}

#[tauri::command]
async fn delete_field_collection(id_tahsilat: u32, reason: String, deleted_by: String) -> Result<serde_json::Value, String> {
    collection_api::delete_collection(id_tahsilat, &reason, &deleted_by).await
}

#[tauri::command]
async fn mark_field_collections_printed(ids: Vec<u32>, printed_by: String) -> Result<serde_json::Value, String> {
    collection_api::mark_printed(&ids, &printed_by).await
}

#[tauri::command]
async fn send_field_collection(id_tahsilat: u32, sent_by: String) -> Result<serde_json::Value, String> {
    collection_api::send_collection(id_tahsilat, &sent_by).await
}

#[tauri::command]
async fn print_collection_report(report: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || print_report_blocking(&report))
        .await
        .map_err(|error| format!("Yazdirma gorevi tamamlanamadi: {error}"))?
}

#[cfg(target_os = "windows")]
fn print_report_blocking(report: &str) -> Result<(), String> {
    use std::io::Write;
    use std::process::{Command, Stdio};

    let script = concat!(
        "$ErrorActionPreference='Stop';",
        "[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false);",
        "$report=[Console]::In.ReadToEnd();",
        "$report | Out-Printer"
    );
    let mut child = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Windows yazdirma servisi baslatilamadi: {error}"))?;
    child.stdin.as_mut()
        .ok_or_else(|| "Yaziciya rapor verisi aktarilamadi.".to_string())?
        .write_all(report.as_bytes())
        .map_err(|error| format!("Rapor yaziciya aktarilamadi: {error}"))?;
    let output = child.wait_with_output().map_err(|error| format!("Yazdirma sonucu alinamadi: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if error.is_empty() { "Varsayilan yaziciya cikti gonderilemedi.".to_string() } else { error })
    }
}

#[cfg(not(target_os = "windows"))]
fn print_report_blocking(_report: &str) -> Result<(), String> {
    Err("Otomatik yazdirma yalnizca Windows surumunde destekleniyor.".to_string())
}

#[tauri::command]
fn get_hardware_id() -> Result<String, String> {
    // MAC adresini al
    let mac = match mac_address::get_mac_address() {
        Ok(Some(ma)) => ma.to_string().replace(":", "").to_uppercase(),
        _ => "UNKNOWN".to_string(),
    };
    
    Ok(format!("MAC-{}", mac))
}

#[tauri::command]
fn get_app_data_path(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = app.path().app_data_dir()
        .map_err(|e| format!("Path error: {}", e))?;
    
    // Cache klasörünü oluştur
    let cache_dir = app_data.join("cache");
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Create dir error: {}", e))?;
    
    Ok(cache_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_backup_file(app: tauri::AppHandle, data: String, filename: String) -> Result<String, String> {
    let app_data = app.path().app_data_dir()
        .map_err(|e| format!("Path error: {}", e))?;
    
    let cache_dir = app_data.join("cache");
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Create dir error: {}", e))?;
    
    let file_path = cache_dir.join(&filename);
    fs::write(&file_path, data)
        .map_err(|e| format!("Write error: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn read_backup_file(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let app_data = app.path().app_data_dir()
        .map_err(|e| format!("Path error: {}", e))?;
    
    let file_path = app_data.join("cache").join(&filename);
    fs::read_to_string(&file_path)
        .map_err(|e| format!("Read error: {}", e))
}

#[tauri::command]
fn list_backup_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let app_data = app.path().app_data_dir()
        .map_err(|e| format!("Path error: {}", e))?;
    
    let cache_dir = app_data.join("cache");
    
    if !cache_dir.exists() {
        return Ok(Vec::new());
    }
    
    let entries = fs::read_dir(&cache_dir)
        .map_err(|e| format!("Read dir error: {}", e))?;
    
    let mut files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".finans") {
                    files.push(name.to_string());
                }
            }
        }
    }
    
    Ok(files)
}

#[tauri::command]
fn encrypt_data(data: String, key: String) -> Result<String, String> {
    // Key'i 32 byte'a dönüştür (AES-256)
    let mut key_bytes = [0u8; 32];
    let key_data = key.as_bytes();
    let len = key_data.len().min(32);
    key_bytes[..len].copy_from_slice(&key_data[..len]);
    
    let cipher = Aes256Gcm::new(&key_bytes.into());
    
    // Random nonce oluştur (12 bytes)
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    // Şifrele
    let ciphertext = cipher.encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption error: {}", e))?;
    
    // Nonce + ciphertext birleştir ve base64'e çevir
    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&ciphertext);
    
    Ok(general_purpose::STANDARD.encode(result))
}

#[tauri::command]
fn decrypt_data(encrypted: String, key: String) -> Result<String, String> {
    // Key'i 32 byte'a dönüştür
    let mut key_bytes = [0u8; 32];
    let key_data = key.as_bytes();
    let len = key_data.len().min(32);
    key_bytes[..len].copy_from_slice(&key_data[..len]);
    
    let cipher = Aes256Gcm::new(&key_bytes.into());
    
    // Base64 decode
    let data = general_purpose::STANDARD.decode(encrypted)
        .map_err(|e| format!("Base64 decode error: {}", e))?;
    
    if data.len() < 12 {
        return Err("Invalid encrypted data".to_string());
    }
    
    // Nonce ve ciphertext'i ayır
    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    // Deşifrele
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption error: {}", e))?;
    
    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8 error: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      get_hardware_id,
      encrypt_data,
      decrypt_data,
      get_app_data_path,
      save_backup_file,
      read_backup_file,
      list_backup_files,
      get_field_collections,
      update_field_collection,
      delete_field_collection,
      mark_field_collections_printed,
      send_field_collection,
      print_collection_report
    ])
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
