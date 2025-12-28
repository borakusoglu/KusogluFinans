import { db } from './config';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, setDoc, onSnapshot } from 'firebase/firestore';

const getUserId = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.uid;
};

// Kredi Kartları
export const addCreditCard = async (data) => {
  // Aynı kart numarasının olup olmadığını kontrol et
  const q = query(collection(db, 'creditCards'), where('code', '==', data.code));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error('Bu kart numarası zaten kayıtlı!');
  }
  const docRef = await addDoc(collection(db, 'creditCards'), { ...data, is_active: true });
  return docRef.id;
};

export const getCreditCards = async (includeInactive = false) => {
  let q = collection(db, 'creditCards');
  if (!includeInactive) {
    q = query(q, where('is_active', '==', true));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Banka Hesapları
export const addBankAccount = async (data) => {
  return await addDoc(collection(db, 'bankAccounts'), data);
};

export const getBankAccounts = async () => {
  const snapshot = await getDocs(collection(db, 'bankAccounts'));
  console.log('getBankAccounts - Found documents:', snapshot.docs.length);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Kategoriler
export const addCategory = async (data) => {
  return await addDoc(collection(db, 'categories'), data);
};

export const getCategories = async () => {
  const snapshot = await getDocs(collection(db, 'categories'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Cariler
export const addCari = async (data) => {
  return await addDoc(collection(db, 'cari'), data);
};

export const getCari = async () => {
  const snapshot = await getDocs(collection(db, 'cari'));
  console.log('getCari - Found documents:', snapshot.docs.length);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Ödemeler
export const addPayment = async (data) => {
  return await addDoc(collection(db, 'payments'), { ...data, createdAt: new Date() });
};

export const addPaymentWithId = async (customId, data) => {
  const docRef = doc(db, 'payments', customId);
  await setDoc(docRef, { ...data, createdAt: new Date() });
  return customId;
};

export const getPayments = async (filters = {}) => {
  if (filters.startDate && filters.endDate) {
    // Her iki sorguyu paralel çalıştır
    const [paymentsSnapshot, allChecksSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, 'payments'),
        where('payment_date', '>=', filters.startDate),
        where('payment_date', '<=', filters.endDate)
      )),
      getDocs(query(
        collection(db, 'payments'),
        where('payment_method', '==', 'cek')
      ))
    ]);
    
    let payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const allChecks = allChecksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Vade tarihi o ay içinde olan çekleri filtrele
    const checksWithDueDateInRange = allChecks.filter(check => 
      check.due_date && 
      check.due_date >= filters.startDate && 
      check.due_date <= filters.endDate
    );
    
    // Mevcut payments'a ekle (duplicate kontrolü ile)
    const existingIds = new Set(payments.map(p => p.id));
    checksWithDueDateInRange.forEach(check => {
      if (!existingIds.has(check.id)) {
        payments.push(check);
      }
    });
    
    // Cari, kredi kartı ve banka hesabı isimlerini çek
    const [cariList, cardsList, accountsList] = await Promise.all([
      getCari(),
      getCreditCards(),
      getBankAccounts()
    ]);
    
    // İsimleri ekle
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
  } else {
    // Filtre yoksa tüm ödemeleri getir
    const snapshot = await getDocs(collection(db, 'payments'));
    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cari, kredi kartı ve banka hesabı isimlerini çek
    const [cariList, cardsList, accountsList] = await Promise.all([
      getCari(),
      getCreditCards(),
      getBankAccounts()
    ]);
    
    // İsimleri ekle
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
  }
};

export const updatePayment = async (id, data) => {
  const docRef = doc(db, 'payments', id);
  return await updateDoc(docRef, data);
};

export const deletePayment = async (id) => {
  const docRef = doc(db, 'payments', id);
  return await deleteDoc(docRef);
};

// Admin: Tüm ödemeleri sil
export const deleteAllPayments = async () => {
  const snapshot = await getDocs(collection(db, 'payments'));
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  return await Promise.all(deletePromises);
};

// Genel silme fonksiyonu
export const deleteDocument = async (collectionName, id) => {
  const docRef = doc(db, collectionName, id);
  return await deleteDoc(docRef);
};

// Genel güncelleme fonksiyonu
export const updateDocument = async (collectionName, id, data) => {
  const docRef = doc(db, collectionName, id);
  return await updateDoc(docRef, data);
};

// Hatırlatmalar
export const addReminder = async (data) => {
  return await addDoc(collection(db, 'reminders'), { ...data, createdAt: new Date(), isActive: true });
};

export const getReminders = async () => {
  const snapshot = await getDocs(collection(db, 'reminders'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateReminder = async (id, data) => {
  const docRef = doc(db, 'reminders', id);
  return await updateDoc(docRef, data);
};

export const deleteReminder = async (id) => {
  const docRef = doc(db, 'reminders', id);
  return await deleteDoc(docRef);
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
    const docRef = await addDoc(collection(db, 'messages'), { ...data, deleted: false });
    return docRef.id;
  } catch (error) {
    console.error('sendMessage hatası:', error);
    throw error;
  }
};

export const getMessages = async (userId) => {
  try {
    console.log('getMessages called for userId:', userId);
    
    // deleted alanı olmayan mesajları da getir
    const receivedQ = query(collection(db, 'messages'), where('to', '==', userId));
    const sentQ = query(collection(db, 'messages'), where('from', '==', userId));
    
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQ),
      getDocs(sentQ)
    ]);
    
    // deleted=false veya deleted alanı olmayan mesajları filtrele
    const received = receivedSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => msg.deleted !== true);
    const sent = sentSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => msg.deleted !== true);
    
    console.log('Received messages count:', received.length);
    console.log('Sent messages count:', sent.length);
    
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
    
    // deleted=true olan mesajları filtrele
    const received = receivedSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => msg.deleted === true);
    const sent = sentSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(msg => msg.deleted === true);
    
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
    const docRef = doc(db, 'messages', messageId);
    await updateDoc(docRef, { deleted: true, deletedAt: new Date().toISOString() });
  } catch (error) {
    console.error('moveToTrash hatası:', error);
    throw error;
  }
};

export const restoreFromTrash = async (messageId) => {
  try {
    const docRef = doc(db, 'messages', messageId);
    await updateDoc(docRef, { deleted: false, deletedAt: null });
  } catch (error) {
    console.error('restoreFromTrash hatası:', error);
  }
};

export const deleteOldTrashMessages = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
    
    const q = query(collection(db, 'messages'), where('deleted', '==', true));
    const snapshot = await getDocs(q);
    
    const oldMessages = snapshot.docs.filter(doc => {
      const deletedAt = doc.data().deletedAt;
      return deletedAt && deletedAt <= thirtyDaysAgoISO;
    });
    
    const deletePromises = oldMessages.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return oldMessages.length;
  } catch (error) {
    return 0;
  }
};

export const markMessageAsRead = async (messageId) => {
  try {
    const docRef = doc(db, 'messages', messageId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error('markMessageAsRead hatası:', error);
  }
};

export const getUnreadMessageCount = async (userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('to', '==', userId),
      where('read', '==', false),
      where('deleted', '!=', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    return 0;
  }
};

export const getUnreadMessages = async (userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('to', '==', userId),
      where('read', '==', false),
      where('deleted', '!=', true),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const users = await getUsers();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const fromUser = users.find(u => u.uid === data.from);
      return {
        id: doc.id,
        ...data,
        fromUsername: fromUser?.username || data.fromUsername || 'Bilinmeyen'
      };
    });
  } catch (error) {
    return [];
  }
};

export const listenToUnreadMessages = (userId, callback) => {
  const q = query(
    collection(db, 'messages'),
    where('to', '==', userId),
    where('read', '==', false)
  );
  
  return onSnapshot(q, async (snapshot) => {
    const users = await getUsers();
    const messages = snapshot.docs
      .map(doc => {
        const data = doc.data();
        const fromUser = users.find(u => u.uid === data.from);
        return {
          id: doc.id,
          ...data,
          fromUsername: fromUser?.username || data.fromUsername || 'Bilinmeyen'
        };
      })
      .filter(msg => msg.deleted !== true);
    callback(messages);
  });
};

export const getUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
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
    }
    return true;
  } catch (error) {
    console.error('Backup yükleme hatası:', error);
    throw error;
  }
};
