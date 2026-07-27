import { db } from './config';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, setDoc } from 'firebase/firestore';
import localDB from '../utils/localDB';
import { listenToDataTriggers, publishDataTrigger } from './realtimeTriggers';

const REALTIME_COLLECTIONS = [
  'creditCards',
  'bankAccounts',
  'categories',
  'cari',
  'payments',
  'reminders',
  'messages'
];

const notifyDataChange = (collectionName, action, documentId = null) => {
  // Firestore yazımı başarılıysa Realtime bağlantısı ana kullanıcı işlemini
  // bekletmemeli. RTDB çevrimdışı kuyruğu sinyali bağlantı gelince gönderir.
  publishDataTrigger(collectionName, action, documentId).catch(error => {
    console.error(`${collectionName} Realtime tetikleyici hatası:`, error);
  });
};

const loadCollectionFromFirestore = async (collectionName) => {
  const snapshot = await getDocs(collection(db, collectionName));
  const data = snapshot.docs.map(document => ({
    id: document.id,
    ...document.data()
  }));

  localDB.set(collectionName, data);
  return data;
};

const getUserId = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.uid;
};

// Kredi Kartları
export const addCreditCard = async (data) => {
  const cards = localDB.get('creditCards');
  if (cards.some(c => c.code === data.code)) {
    throw new Error('Bu kart numarası zaten kayıtlı!');
  }
  const cardData = { ...data, is_active: true };
  const docRef = await addDoc(collection(db, 'creditCards'), cardData);
  localDB.add('creditCards', { id: docRef.id, ...cardData });
  await notifyDataChange('creditCards', 'create', docRef.id);
  return docRef.id;
};

export const getCreditCards = async (includeInactive = false) => {
  const cards = localDB.get('creditCards');
  return includeInactive ? cards : cards.filter(c => c.is_active === true);
};

// Banka Hesapları
export const addBankAccount = async (data) => {
  const accounts = localDB.get('bankAccounts');
  if (accounts.some(a => a.code === data.code || a.name === data.name)) {
    throw new Error('Bu banka hesabı zaten kayıtlı!');
  }
  const docRef = await addDoc(collection(db, 'bankAccounts'), data);
  localDB.add('bankAccounts', { id: docRef.id, ...data });
  await notifyDataChange('bankAccounts', 'create', docRef.id);
  return docRef.id;
};

export const getBankAccounts = async () => {
  return localDB.get('bankAccounts');
};

// Kategoriler
export const addCategory = async (data) => {
  const docRef = await addDoc(collection(db, 'categories'), data);
  localDB.add('categories', { id: docRef.id, ...data });
  await notifyDataChange('categories', 'create', docRef.id);
  return docRef.id;
};

export const getCategories = async () => {
  return localDB.get('categories');
};

// Cariler
export const addCari = async (data) => {
  const docRef = await addDoc(collection(db, 'cari'), data);
  localDB.add('cari', { id: docRef.id, ...data });
  await notifyDataChange('cari', 'create', docRef.id);
  return docRef.id;
};

export const getCari = async () => {
  return localDB.get('cari');
};

// Ödemeler
export const addPayment = async (data) => {
  const paymentData = { ...data, createdAt: new Date() };
  const docRef = await addDoc(collection(db, 'payments'), paymentData);
  localDB.add('payments', { id: docRef.id, ...paymentData });
  await notifyDataChange('payments', 'create', docRef.id);
  return { id: docRef.id };
};

export const addPaymentWithId = async (customId, data) => {
  const paymentData = { ...data, createdAt: new Date() };
  await setDoc(doc(db, 'payments', customId), paymentData);
  localDB.add('payments', { id: customId, ...paymentData });
  await notifyDataChange('payments', 'create', customId);
  return customId;
};

export const getPayments = async (filters = {}) => {
  let payments = localDB.get('payments');
  
  if (filters.startDate && filters.endDate) {
    payments = payments.filter(p => {
      // Çekler için hem kesim tarihi hem vade tarihini kontrol et
      if (p.payment_method === 'cek') {
        const kesimTarihi = p.payment_date;
        const vadeTarihi = p.due_date;
        
        // Kesim tarihi veya vade tarihi aralıkta ise göster
        const kesimInRange = kesimTarihi && kesimTarihi >= filters.startDate && kesimTarihi <= filters.endDate;
        const vadeInRange = vadeTarihi && vadeTarihi >= filters.startDate && vadeTarihi <= filters.endDate;
        
        return kesimInRange || vadeInRange;
      }
      
      // Diğer ödeme tipleri için normal kontrol
      const compareDate = p.payment_date;
      return compareDate >= filters.startDate && compareDate <= filters.endDate;
    });
  }
  
  const [cariList, cardsList, accountsList] = await Promise.all([
    getCari(),
    getCreditCards(),
    getBankAccounts()
  ]);
  
  return payments.map(payment => {
    const cari = cariList.find(c => c.id === payment.cari_id);
    const card = cardsList.find(c => c.id === payment.credit_card_id);
    const account = accountsList.find(a => a.id === payment.bank_account_id);
    
    return {
      ...payment,
      cari_name: cari?.name || '',
      credit_card_name: card?.name || '',
      credit_card_code: card?.code || '',
      bank_account_name: account?.name || ''
    };
  });
};

export const updatePayment = async (id, data) => {
  await updateDoc(doc(db, 'payments', id), data);
  localDB.update('payments', id, data);
  await notifyDataChange('payments', 'update', id);
};

export const deletePayment = async (id) => {
  await deleteDoc(doc(db, 'payments', id));
  localDB.delete('payments', id);
  await notifyDataChange('payments', 'delete', id);
};

// Admin: Tüm ödemeleri sil
export const deleteAllPayments = async () => {
  const snapshot = await getDocs(collection(db, 'payments'));
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  const result = await Promise.all(deletePromises);
  localDB.set('payments', []);
  await notifyDataChange('payments', 'delete-all');
  return result;
};

// Genel silme fonksiyonu
export const deleteDocument = async (collectionName, id) => {
  await deleteDoc(doc(db, collectionName, id));
  localDB.delete(collectionName, id);
  await notifyDataChange(collectionName, 'delete', id);
};

// Genel güncelleme fonksiyonu
export const updateDocument = async (collectionName, id, data) => {
  await updateDoc(doc(db, collectionName, id), data);
  localDB.update(collectionName, id, data);
  await notifyDataChange(collectionName, 'update', id);
};

// Hatırlatmalar
export const addReminder = async (data) => {
  const reminderData = { ...data, createdAt: new Date(), isActive: true };
  const docRef = await addDoc(collection(db, 'reminders'), reminderData);
  localDB.add('reminders', { id: docRef.id, ...reminderData });
  await notifyDataChange('reminders', 'create', docRef.id);
  return { id: docRef.id };
};

export const getReminders = async () => {
  return localDB.get('reminders');
};

export const updateReminder = async (id, data) => {
  await updateDoc(doc(db, 'reminders', id), data);
  localDB.update('reminders', id, data);
  await notifyDataChange('reminders', 'update', id);
};

export const deleteReminder = async (id) => {
  await deleteDoc(doc(db, 'reminders', id));
  localDB.delete('reminders', id);
  await notifyDataChange('reminders', 'delete', id);
};

// Hatırlatma Logları
export const addReminderLog = async (data) => {
  return await addDoc(collection(db, 'reminderLogs'), { ...data, createdAt: new Date() });
};

export const getReminderLogs = async () => {
  const q = query(collection(db, 'reminderLogs'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Oturum Yönetimi
export const createSession = async (userId) => {
  const sessionId = `${userId}_${Date.now()}`;
  await addDoc(collection(db, 'sessions'), {
    userId,
    sessionId,
    createdAt: new Date()
  });
  return sessionId;
};

export const checkActiveSession = async (userId) => {
  const q = query(collection(db, 'sessions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const removeSession = async (sessionId) => {
  const q = query(collection(db, 'sessions'), where('sessionId', '==', sessionId));
  const snapshot = await getDocs(q);
  snapshot.docs.forEach(doc => deleteDoc(doc.ref));
};

export const removeAllUserSessions = async (userId) => {
  const q = query(collection(db, 'sessions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  snapshot.docs.forEach(doc => deleteDoc(doc.ref));
};

// Kullanıcı Ayarları
export const saveUserSettings = async (userId, settings) => {
  const q = query(collection(db, 'userSettings'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return await addDoc(collection(db, 'userSettings'), { userId, ...settings, updatedAt: new Date() });
  } else {
    const docRef = doc(db, 'userSettings', snapshot.docs[0].id);
    return await updateDoc(docRef, { ...settings, updatedAt: new Date() });
  }
};

export const getUserSettings = async (userId) => {
  const q = query(collection(db, 'userSettings'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return { calendarTheme: 'indigo', cardExpiryMonths: 3 };
  }
  
  return snapshot.docs[0].data();
};

// Loglar
export const addLog = async (username, action, details = '') => {
  return await addDoc(collection(db, 'logs'), {
    username,
    action,
    details,
    timestamp: new Date()
  });
};

export const getLogs = async () => {
  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Mesajlaşma
export const sendMessage = async (data) => {
  try {
    const docRef = await addDoc(collection(db, 'messages'), { 
      ...data, 
      deletedBy: {},
      starredBy: {}
    });
    // Local'e de ekle
    const messages = localDB.get('messages') || [];
    messages.push({ id: docRef.id, ...data, deletedBy: {}, starredBy: {} });
    localDB.set('messages', messages);
    await notifyDataChange('messages', 'create', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('sendMessage hatası:', error);
    throw error;
  }
};

export const getMessages = async (userId) => {
  try {
    // Local'den oku
    let messages = localDB.get('messages') || [];
    
    // İlk giriş: Firebase'den çek
    if (messages.length === 0) {
      const receivedQ = query(collection(db, 'messages'), where('to', '==', userId));
      const sentQ = query(collection(db, 'messages'), where('from', '==', userId));
      
      const [receivedSnapshot, sentSnapshot] = await Promise.all([
        getDocs(receivedQ),
        getDocs(sentQ)
      ]);
      
      const received = receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sent = sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      messages = [...received, ...sent];
      localDB.set('messages', messages);
    }
    
    // Bu kullanıcı için silinmemiş mesajları filtrele
    const filtered = messages.filter(msg => 
      !msg.deletedBy?.[userId] && (msg.to === userId || msg.from === userId)
    );
    
    const users = await getUsers();
    
    const allMessages = filtered.map(msg => {
      const toUser = users.find(u => u.uid === msg.to);
      const fromUser = users.find(u => u.uid === msg.from);
      return {
        ...msg,
        toUsername: toUser?.username || 'Bilinmeyen',
        fromUsername: fromUser?.username || msg.fromUsername || 'Bilinmeyen',
        starred: msg.starredBy?.[userId] || false
      };
    });
    
    return allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('getMessages hatası:', error);
    return [];
  }
};

export const getTrashMessages = async (userId) => {
  try {
    const receivedQ = query(collection(db, 'messages'), where('to', '==', userId));
    const sentQ = query(collection(db, 'messages'), where('from', '==', userId));
    
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQ),
      getDocs(sentQ)
    ]);
    
    // Bu kullanıcı tarafından silinmiş mesajları filtrele
    const received = receivedSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => msg.deletedBy?.[userId] === true);
    const sent = sentSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => msg.deletedBy?.[userId] === true);
    
    const users = await getUsers();
    const allMessages = [...received, ...sent].map(msg => {
      const toUser = users.find(u => u.uid === msg.to);
      const fromUser = users.find(u => u.uid === msg.from);
      return {
        ...msg,
        toUsername: toUser?.username || 'Bilinmeyen',
        fromUsername: fromUser?.username || msg.fromUsername || 'Bilinmeyen'
      };
    });
    
    return allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('getTrashMessages hatası:', error);
    return [];
  }
};

export const moveToTrash = async (messageId) => {
  try {
    const userId = getUserId();
    const docRef = doc(db, 'messages', messageId);
    await updateDoc(docRef, { 
      [`deletedBy.${userId}`]: true,
      [`deletedAt.${userId}`]: new Date().toISOString()
    });
    // Local'de de güncelle
    const messages = localDB.get('messages') || [];
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      if (!messages[index].deletedBy) messages[index].deletedBy = {};
      if (!messages[index].deletedAt) messages[index].deletedAt = {};
      messages[index].deletedBy[userId] = true;
      messages[index].deletedAt[userId] = new Date().toISOString();
      localDB.set('messages', messages);
    }
    await notifyDataChange('messages', 'update', messageId);
  } catch (error) {
    console.error('moveToTrash hatası:', error);
    throw error;
  }
};

export const restoreFromTrash = async (messageId) => {
  try {
    const userId = getUserId();
    const docRef = doc(db, 'messages', messageId);
    await updateDoc(docRef, { 
      [`deletedBy.${userId}`]: false,
      [`deletedAt.${userId}`]: null
    });
    await notifyDataChange('messages', 'update', messageId);
  } catch (error) {
    console.error('restoreFromTrash hatası:', error);
  }
};

export const deleteOldTrashMessages = async () => {
  try {
    const userId = getUserId();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
    
    const receivedQ = query(collection(db, 'messages'), where('to', '==', userId));
    const sentQ = query(collection(db, 'messages'), where('from', '==', userId));
    
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQ),
      getDocs(sentQ)
    ]);
    
    const allDocs = [...receivedSnapshot.docs, ...sentSnapshot.docs];
    
    const oldMessages = allDocs.filter(doc => {
      const data = doc.data();
      const deletedAt = data.deletedAt?.[userId];
      return deletedAt && deletedAt <= thirtyDaysAgoISO;
    });
    
    const deletePromises = oldMessages.map(doc => {
      // Sadece bu kullanıcı için silme işaretini kaldır
      return updateDoc(doc.ref, {
        [`deletedBy.${userId}`]: null,
        [`deletedAt.${userId}`]: null
      });
    });
    await Promise.all(deletePromises);
    if (oldMessages.length > 0) {
      await notifyDataChange('messages', 'update');
    }
    
    return oldMessages.length;
  } catch {
    return 0;
  }
};

export const markMessageAsRead = async (messageId) => {
  try {
    const docRef = doc(db, 'messages', messageId);
    await updateDoc(docRef, { read: true });
    // Local'de de güncelle
    const messages = localDB.get('messages') || [];
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages[index].read = true;
      localDB.set('messages', messages);
    }
    await notifyDataChange('messages', 'update', messageId);
  } catch (error) {
    console.error('markMessageAsRead hatası:', error);
  }
};

export const getUnreadMessageCount = async (userId) => {
  try {
    const receivedQ = query(
      collection(db, 'messages'),
      where('to', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(receivedQ);
    // Bu kullanıcı tarafından silinmemiş mesajları say
    const unreadCount = snapshot.docs.filter(doc => !doc.data().deletedBy?.[userId]).length;
    return unreadCount;
  } catch {
    return 0;
  }
};

export const getUnreadMessages = async (userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('to', '==', userId),
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const users = await getUsers();
    
    return snapshot.docs
      .filter(doc => !doc.data().deletedBy?.[userId])
      .map(doc => {
        const data = doc.data();
        const fromUser = users.find(u => u.uid === data.from);
        return {
          id: doc.id,
          ...data,
          fromUsername: fromUser?.username || data.fromUsername || 'Bilinmeyen'
        };
      });
  } catch {
    return [];
  }
};

export const listenToUnreadMessages = (userId, callback) => {
  let disposed = false;
  let refreshSequence = 0;

  const refreshUnreadMessages = async () => {
    const sequence = ++refreshSequence;
    const unreadMessages = await getUnreadMessages(userId);

    if (!disposed && sequence === refreshSequence) {
      callback(unreadMessages);
    }
  };

  const handleDataUpdated = (event) => {
    const changedCollection = event.detail?.collectionName;
    if (!changedCollection || changedCollection === 'messages') {
      refreshUnreadMessages();
    }
  };

  window.addEventListener('dataUpdated', handleDataUpdated);
  refreshUnreadMessages();

  return () => {
    disposed = true;
    window.removeEventListener('dataUpdated', handleDataUpdated);
  };
};

export const getUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => {
      const userData = { ...doc.data() };
      delete userData.password;
      return { uid: doc.id, ...userData };
    });
  } catch (error) {
    console.error('getUsers hatası:', error);
    return [];
  }
};

// Backup İşlemleri (Sadece kritik veriler)
export const createBackup = async () => {
  try {
    const collections = ['creditCards', 'bankAccounts', 'categories', 'cari', 'payments', 'reminders'];
    const backup = { timestamp: new Date().toISOString(), data: {} };
    
    for (const col of collections) {
      const snapshot = await getDocs(collection(db, col));
      backup.data[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    return backup;
  } catch (error) {
    console.error('Backup oluşturma hatası:', error);
    throw error;
  }
};

export const restoreBackup = async (backup) => {
  try {
    for (const [colName, docs] of Object.entries(backup.data)) {
      for (const docData of docs) {
        const { id, ...data } = docData;
        await setDoc(doc(db, colName, id), data);
      }
      if (REALTIME_COLLECTIONS.includes(colName)) {
        await notifyDataChange(colName, 'restore');
      }
    }
    return true;
  } catch (error) {
    console.error('Backup yükleme hatası:', error);
    throw error;
  }
};

// Firestore verilerini Realtime Database tetikleyicileriyle yenile
export const listenToCollection = (collectionName, callback) => {
  let disposed = false;
  let refreshInProgress = null;
  let refreshAgain = false;

  const refresh = async (signal = null) => {
    if (refreshInProgress) {
      refreshAgain = true;
      return refreshInProgress;
    }

    refreshInProgress = (async () => {
      do {
        refreshAgain = false;
        const data = await loadCollectionFromFirestore(collectionName);
        if (disposed) return;

        callback(data);
        window.dispatchEvent(new CustomEvent('dataUpdated', {
          detail: { collectionName, signal }
        }));
      } while (refreshAgain && !disposed);
    })()
      .catch(error => {
        console.error(`${collectionName} yenileme hatası:`, error);
      })
      .finally(() => {
        refreshInProgress = null;
      });

    return refreshInProgress;
  };

  const unsubscribe = listenToDataTriggers(
    [collectionName],
    ({ signal }) => refresh(signal)
  );

  refresh();

  return () => {
    disposed = true;
    unsubscribe();
  };
};

export const startAllListeners = () => {
  let disposed = false;
  const activeRefreshes = new Map();
  const queuedRefreshes = new Set();

  const refreshCollection = async (collectionName, signal = null) => {
    if (activeRefreshes.has(collectionName)) {
      queuedRefreshes.add(collectionName);
      return activeRefreshes.get(collectionName);
    }

    const refreshPromise = (async () => {
      do {
        queuedRefreshes.delete(collectionName);
        const data = await loadCollectionFromFirestore(collectionName);
        if (disposed) return;

        console.log(`🔔 ${collectionName} güncellendi: ${data.length} kayıt`);
        window.dispatchEvent(new CustomEvent('dataUpdated', {
          detail: { collectionName, signal }
        }));
      } while (queuedRefreshes.has(collectionName) && !disposed);
    })()
      .catch(error => {
        console.error(`${collectionName} yenileme hatası:`, error);
      })
      .finally(() => {
        activeRefreshes.delete(collectionName);
      });

    activeRefreshes.set(collectionName, refreshPromise);
    return refreshPromise;
  };

  const unsubscribe = listenToDataTriggers(
    REALTIME_COLLECTIONS,
    ({ collectionName, signal }) => refreshCollection(collectionName, signal)
  );

  REALTIME_COLLECTIONS.forEach(collectionName => {
    refreshCollection(collectionName);
  });
  
  console.log('✅ Realtime Database tetikleyicileri başlatıldı');
  return () => {
    disposed = true;
    unsubscribe();
  };
};

// Sync Sinyali Gönder
export const sendSyncSignal = async (userId, username, action = 'update') => {
  try {
    await publishDataTrigger('_global', action, null, { userId, username });
  } catch (error) {
    console.error('Sinyal gönderme hatası:', error);
  }
};

// Sync Sinyallerini Dinle
export const listenToSyncSignals = (currentUserId, callback) => {
  try {
    return listenToDataTriggers(
      ['_global'],
      ({ signal }) => {
        if (signal.userId !== currentUserId) {
          console.log(`📡 ${signal.username} değişiklik yaptı!`);
          callback(signal);
        }
      }
    );
  } catch (error) {
    console.error('listenToSyncSignals error:', error);
    return () => {};
  }
};
