import { invoke } from '@tauri-apps/api/core';

export async function getHardwareId() {
  try {
    const hwid = await invoke('get_hardware_id');
    return hwid;
  } catch (error) {
    console.error('HWID alınamadı:', error);
    // Vite'ın tarayıcı önizlemesinde Tauri komutları bulunmaz. Yalnızca geliştirme
    // derlemesinde sabit bir kimlik kullanarak arayüz testi yapılabilmesini sağla.
    if (import.meta.env.DEV) {
      return 'DEV-BROWSER-HWID';
    }
    return null;
  }
}

export function generateDeviceFingerprint(hwid) {
  return btoa(hwid).substring(0, 32);
}
