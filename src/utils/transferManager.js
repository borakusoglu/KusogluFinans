import { invoke } from '@tauri-apps/api/core';
import localDB from './localDB';

const ENCRYPTION_KEY = 'KusogluFinans2026TransferKey256';

class TransferManager {
  // Tüm veriyi export et
  async exportData(isAutoBackup = false) {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) throw new Error('Kullanıcı bulunamadı');

      // Tüm koleksiyonları topla
      const exportData = {
        version: '1.0',
        timestamp: Date.now(),
        user: {
          uid: user.uid,
          username: user.username,
          email: user.email
        },
        collections: {}
      };

      localDB.collections.forEach(col => {
        exportData.collections[col] = localDB.get(col);
      });

      // JSON'a çevir
      const jsonData = JSON.stringify(exportData);

      // AES-256 ile şifrele
      const encrypted = await invoke('encrypt_data', {
        data: jsonData,
        key: ENCRYPTION_KEY
      });

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const filename = `${day}-${month}-${year}-save.finans`;

      // Tauri - app data cache klasörüne kaydet
      try {
        const filePath = await invoke('save_backup_file', {
          data: encrypted,
          filename: filename
        });
        
        // Otomatik backup ise sessiz, manuel ise bildir
        if (!isAutoBackup) {
          return { success: true, message: 'Veri başarıyla kaydedildi', path: filePath };
        }
        return { success: true, path: filePath };
      } catch (tauriError) {
        // Web ortamı - browser download
        const blob = new Blob([encrypted], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, message: 'Veri başarıyla export edildi' };
      }
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, error: error.message };
    }
  }

  // Veriyi import et
  async importData(fileOrFilename, mode = 'merge') {
    try {
      let text;
      
      // String ise filename (cache'den oku)
      if (typeof fileOrFilename === 'string') {
        text = await invoke('read_backup_file', { filename: fileOrFilename });
      } else if (fileOrFilename) {
        // File object - web ortamı
        text = await fileOrFilename.text();
      } else {
        return { success: false, error: 'Dosya bulunamadı' };
      }

      // AES-256 ile deşifrele
      const decrypted = await invoke('decrypt_data', {
        encrypted: text,
        key: ENCRYPTION_KEY
      });

      const importData = JSON.parse(decrypted);

      // Versiyon kontrolü
      if (!importData.version) {
        throw new Error('Geçersiz dosya formatı');
      }

      // Mode'a göre işle
      if (mode === 'replace') {
        localDB.collections.forEach(col => {
          if (importData.collections[col]) {
            localDB.set(col, importData.collections[col]);
          }
        });
      } else {
        localDB.collections.forEach(col => {
          if (importData.collections[col]) {
            const existing = localDB.get(col);
            const imported = importData.collections[col];
            
            const merged = [...existing];
            imported.forEach(item => {
              const index = merged.findIndex(e => e.id === item.id);
              if (index === -1) {
                merged.push(item);
              } else {
                if (item.timestamp > merged[index].timestamp) {
                  merged[index] = item;
                }
              }
            });
            
            localDB.set(col, merged);
          }
        });
      }

      return { 
        success: true, 
        message: 'Veri başarıyla import edildi',
        data: importData
      };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, error: error.message };
    }
  }

  // Cache'deki backup dosyalarını listele
  async listBackups() {
    try {
      const files = await invoke('list_backup_files');
      return { success: true, files };
    } catch (error) {
      return { success: false, files: [], error: error.message };
    }
  }

  // App data path'i al
  async getAppDataPath() {
    try {
      const path = await invoke('get_app_data_path');
      return { success: true, path };
    } catch (error) {
      return { success: false, path: null };
    }
  }

  // Otomatik günlük cache kaydetme (Her gece 00:00)
  startAutoDailyBackup() {
    const checkAndBackup = async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // Saat 00:00'da cache kaydet
      if (hour === 0 && minute === 0) {
        const today = now.toISOString().split('T')[0];
        const lastBackupDate = localStorage.getItem('lastBackupDate');
        
        if (lastBackupDate !== today) {
          console.log('Günlük cache kaydediliyor...');
          await this.exportData(true);
          localStorage.setItem('lastBackupDate', today);
        }
      }
    };

    // Her dakika kontrol et
    setInterval(checkAndBackup, 60000);
    checkAndBackup();
  }

  // Tüm cache dosyalarını oku ve birleştir
  async loadAllCacheFiles() {
    try {
      console.log('Tüm cache dosyaları yükleniyor...');
      const result = await this.listBackups();
      
      if (!result.success || result.files.length === 0) {
        console.log('Cache dosyası bulunamadı');
        return { success: true, message: 'Cache boş' };
      }
      
      // Tarihe göre sırala (eskiden yeniye)
      const sortedFiles = result.files.sort();
      
      console.log(`${sortedFiles.length} cache dosyası bulundu`);
      
      // Her dosyayı oku ve birleştir
      for (const filename of sortedFiles) {
        try {
          const fileResult = await this.importData(filename, 'merge');
          if (fileResult.success) {
            console.log(`✓ ${filename} yüklendi`);
          }
        } catch (error) {
          console.error(`✗ ${filename} yüklenemedi:`, error);
        }
      }
      
      console.log(`✓ ${sortedFiles.length} cache dosyası birleştirildi`);
      return { success: true, count: sortedFiles.length };
    } catch (error) {
      console.error('Cache yükleme hatası:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new TransferManager();
