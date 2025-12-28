import { db, auth } from './config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { createSession, checkActiveSession, removeSession, removeAllUserSessions } from './firestore';

// Custom token oluşturmak için backend'e istek at
const getCustomToken = async (userId) => {
  // Geçici çözüm: userId'yi token olarak kullan
  // Gerçek üretimde backend'den custom token alınmalı
  return userId;
};

export const registerUser = async (email, username, password) => {
  try {
    // Email kontrolü
    const emailQuery = query(collection(db, 'users'), where('email', '==', email));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
      return { success: false, error: 'Bu e-posta adresi zaten kullanılıyor' };
    }

    // Kullanıcı adı kontrolü
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
      return { success: false, error: 'Bu kullanıcı adı zaten kullanılıyor' };
    }

    // Yeni kullanıcı oluştur
    await addDoc(collection(db, 'users'), {
      email,
      username,
      password,
      approved: false,
      role: 'user',
      createdAt: new Date()
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const loginUser = async (username, password, keepLoggedIn = false) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('username', '==', username),
      where('password', '==', password)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
    }

    const userData = snapshot.docs[0].data();
    
    // Admin onayı kontrolü
    if (userData.approved === false) {
      return { success: false, error: 'Hesabınız henüz onaylanmamış. Lütfen admin onayını bekleyin.' };
    }
    
    const userId = snapshot.docs[0].id;
    
    // Eski oturumları temizle
    await removeAllUserSessions(userId);
    
    // Yeni oturum oluştur
    const sessionId = await createSession(userId);
    
    const user = { uid: userId, sessionId, keepLoggedIn, loginTime: Date.now(), ...userData };
    localStorage.setItem('user', JSON.stringify(user));
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.sessionId) {
    await removeSession(user.sessionId);
  }
  
  localStorage.removeItem('user');
  return { success: true };
};

export const getUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
