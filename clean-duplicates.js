// Duplicate kayıtları temizleme scripti
// Tarayıcı konsolunda çalıştırın

const cleanDuplicates = () => {
  const collections = ['creditCards', 'bankAccounts', 'categories', 'cari', 'payments', 'reminders'];
  
  collections.forEach(collection => {
    const encrypted = localStorage.getItem(`db_${collection}`);
    if (!encrypted) return;
    
    // Decrypt (aynı şifreleme mantığı)
    const SECRET_KEY = 'KusogluFinans2026SecretKey';
    const str = atob(encrypted);
    const decoded = decodeURIComponent(str.split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    const items = JSON.parse(decrypted);
    
    // Duplicate'leri temizle (code veya name'e göre)
    const seen = new Map();
    const unique = [];
    
    items.forEach(item => {
      const key = item.code || item.name || item.id;
      if (!seen.has(key)) {
        seen.set(key, true);
        unique.push(item);
      } else {
        console.log(`${collection}: Duplicate silindi ->`, key);
      }
    });
    
    // Encrypt ve kaydet
    const str2 = JSON.stringify(unique);
    let encrypted2 = '';
    for (let i = 0; i < str2.length; i++) {
      encrypted2 += String.fromCharCode(str2.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    const final = btoa(encodeURIComponent(encrypted2).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
    
    localStorage.setItem(`db_${collection}`, final);
    console.log(`${collection}: ${items.length} -> ${unique.length} (${items.length - unique.length} duplicate temizlendi)`);
  });
  
  console.log('Temizleme tamamlandı! Sayfayı yenileyin.');
};

cleanDuplicates();
