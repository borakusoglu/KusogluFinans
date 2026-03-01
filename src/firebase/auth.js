import { db, auth } from './config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { createSession, checkActiveSession, removeSession, removeAllUserSessions } from './firestore';
import onlineStatus from '../utils/onlineStatus';
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'KusogluFinans2026SecureKey!@#$%';

const showCaptcha = () => {
  return new Promise((resolve) => {
    if (window.showCaptchaModal) {
      window.showCaptchaModal(resolve);
    } else {
      resolve(false);
    }
  });
};

const encryptData = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
};

const decryptData = (encrypted) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    return null;
  }
};

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
    // IP al
    let userIP = 'unknown';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      userIP = ipData.ip;
    } catch {}
    
    // Rate limiting kontrolü (IP + username)
    const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    const now = Date.now();
    const attemptKey = `${userIP}_${username || 'unknown'}`;
    
    if (loginAttempts[attemptKey]) {
      const { count, blockedUntil } = loginAttempts[attemptKey];
      
      // Bloke süresi geçmişse sıfırla
      if (blockedUntil && now >= blockedUntil) {
        delete loginAttempts[attemptKey];
        localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
      } else if (blockedUntil && now < blockedUntil) {
        // Hala blokeli
        const remainingSeconds = Math.ceil((blockedUntil - now) / 1000);
        return { success: false, error: `Çok fazla başarısız deneme. ${remainingSeconds} saniye sonra tekrar deneyin.`, blockedUntil };
      }
    }
    
    // Captcha kontrolü (3+ başarısız denemeden sonra)
    const currentAttempts = loginAttempts[attemptKey]?.count || 0;
    if (currentAttempts >= 3) {
      const captchaResult = await showCaptcha();
      if (!captchaResult) {
        return { success: false, error: 'Captcha doğrulanmadı' };
      }
    }
    
    // Online kontrolü
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      // Offline login: Local'den doğrula
      const encryptedUsers = localStorage.getItem('offlineUsers');
      if (!encryptedUsers) {
        return { success: false, error: 'Offline modda giriş yapılamadı. İnternet bağlantısı gerekli.' };
      }
      
      const offlineUsers = decryptData(encryptedUsers) || [];
      const user = offlineUsers.find(u => u.username === username && u.password === password);
      
      if (!user) {
        return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
      }
      
      if (user.approved === false) {
        return { success: false, error: 'Hesabınız henüz onaylanmamış.' };
      }
      
      const sessionId = `offline_${Date.now()}`;
      const userData = { uid: user.uid, sessionId, keepLoggedIn, loginTime: Date.now(), ...user, offline: true };
      localStorage.setItem('user', JSON.stringify(userData));
      
      return { success: true, user: userData };
    }
    
    // Online login: Firebase'den doğrula
    const q = query(
      collection(db, 'users'),
      where('username', '==', username),
      where('password', '==', password)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Başarısız deneme kaydet
      if (!loginAttempts[attemptKey]) {
        loginAttempts[attemptKey] = { count: 1, lastAttempt: now };
      } else {
        loginAttempts[attemptKey].count++;
        loginAttempts[attemptKey].lastAttempt = now;
        
        // 10 başarısız deneme = 2 dakika bloke
        if (loginAttempts[attemptKey].count >= 10) {
          loginAttempts[attemptKey].blockedUntil = now + (2 * 60 * 1000);
        }
      }
      
      localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
      return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
    }

    const userData = snapshot.docs[0].data();
    
    // Admin onayı kontrolü
    if (userData.approved === false) {
      return { success: false, error: 'Hesabınız henüz onaylanmamış. Lütfen admin onayını bekleyin.' };
    }
    
    const userId = snapshot.docs[0].id;
    
    // Başarılı giriş - denemeleri sıfırla
    if (loginAttempts[attemptKey]) {
      delete loginAttempts[attemptKey];
      localStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
    }
    
    // Offline kullanım için şifreli kaydet
    const encryptedUsers = localStorage.getItem('offlineUsers');
    const offlineUsers = encryptedUsers ? (decryptData(encryptedUsers) || []) : [];
    const existingIndex = offlineUsers.findIndex(u => u.uid === userId);
    const offlineUser = { uid: userId, username, password, ...userData };
    
    if (existingIndex !== -1) {
      offlineUsers[existingIndex] = offlineUser;
    } else {
      offlineUsers.push(offlineUser);
    }
    localStorage.setItem('offlineUsers', encryptData(offlineUsers));
    
    // Eski oturumları temizle
    await removeAllUserSessions(userId);
    
    // Yeni oturum oluştur
    const sessionId = await createSession(userId);
    
    const user = { uid: userId, sessionId, keepLoggedIn, loginTime: Date.now(), ...userData };
    localStorage.setItem('user', JSON.stringify(user));
    
    // Online durumunu ayarla
    await onlineStatus.setOnline(userId, username);
    
    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.sessionId) {
    await removeSession(user.sessionId);
  }
  
  // Offline durumunu ayarla
  await onlineStatus.setOffline();
  
  localStorage.removeItem('user');
  return { success: true };
};

export const getUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
