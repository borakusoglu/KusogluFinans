import { db } from './config';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, setDoc } from 'firebase/firestore';

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
  let q = collection(db, 'payments');
  
  if (filters.startDate && filters.endDate) {
    q = query(q, 
      where('payment_date', '>=', filters.startDate),
      where('payment_date', '<=', filters.endDate)
    );
  }
  
  const snapshot = await getDocs(q);
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
