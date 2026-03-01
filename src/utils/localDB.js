// Şifreli Local Database
const SECRET_KEY = 'KusogluFinans2026SecretKey';

const encrypt = (data) => {
  const str = JSON.stringify(data);
  let encrypted = '';
  for (let i = 0; i < str.length; i++) {
    encrypted += String.fromCharCode(str.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
  }
  // UTF-8 desteği için encodeURIComponent kullan
  return btoa(encodeURIComponent(encrypted).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode('0x' + p1);
  }));
};

const decrypt = (encrypted) => {
  try {
    const str = atob(encrypted);
    // UTF-8 decode
    const decoded = decodeURIComponent(str.split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
};

class LocalDB {
  constructor() {
    this.collections = ['creditCards', 'bankAccounts', 'categories', 'cari', 'payments', 'reminders', 'messages'];
  }

  // Koleksiyon verilerini al
  get(collection) {
    const encrypted = localStorage.getItem(`db_${collection}`);
    if (!encrypted) return [];
    return decrypt(encrypted) || [];
  }

  // Koleksiyon verilerini kaydet
  set(collection, data) {
    const encrypted = encrypt(data);
    localStorage.setItem(`db_${collection}`, encrypted);
    localStorage.setItem(`db_${collection}_timestamp`, Date.now().toString());
  }

  // Tek döküman ekle
  add(collection, data) {
    const items = this.get(collection);
    const newItem = { id: data.id || this.generateId(), ...data };
    
    // Aynı ID'ye sahip kayıt varsa güncelle
    const existingIndex = items.findIndex(item => item.id === newItem.id);
    if (existingIndex !== -1) {
      items[existingIndex] = newItem;
    } else {
      items.push(newItem);
    }
    
    const encrypted = encrypt(items);
    localStorage.setItem(`db_${collection}`, encrypted);
    localStorage.setItem(`db_${collection}_timestamp`, Date.now().toString());
    
    return newItem.id;
  }

  // Döküman güncelle
  update(collection, id, data) {
    const items = this.get(collection);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...data };
      this.set(collection, items);
    }
  }

  // Döküman sil
  delete(collection, id) {
    const items = this.get(collection);
    const filtered = items.filter(item => item.id !== id);
    this.set(collection, filtered);
  }

  // ID oluştur
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Son sync zamanı
  getLastSync() {
    return localStorage.getItem('db_last_sync');
  }

  setLastSync() {
    localStorage.setItem('db_last_sync', new Date().toISOString());
  }

  // Tüm veriyi temizle
  clear() {
    this.collections.forEach(col => {
      localStorage.removeItem(`db_${col}`);
    });
  }

  // Son güncelleme zamanı
  getLastUpdate(collection) {
    return localStorage.getItem(`db_${collection}_timestamp`);
  }
}

export default new LocalDB();
