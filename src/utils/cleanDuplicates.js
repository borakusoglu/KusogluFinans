import localDB from './localDB';

// Duplicate kayıtları temizle
export const cleanDuplicates = () => {
  const collections = ['creditCards', 'bankAccounts', 'categories', 'cari', 'payments', 'reminders'];
  let totalCleaned = 0;
  
  collections.forEach(collection => {
    const items = localDB.get(collection);
    const seen = new Map();
    const unique = [];
    
    items.forEach(item => {
      // ID'ye göre kontrol et
      if (!seen.has(item.id)) {
        seen.set(item.id, true);
        unique.push(item);
      }
    });
    
    const cleaned = items.length - unique.length;
    if (cleaned > 0) {
      localDB.set(collection, unique);
      console.log(`${collection}: ${cleaned} duplicate temizlendi`);
      totalCleaned += cleaned;
    }
  });
  
  return totalCleaned;
};
