import { db } from './config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { createSession, checkActiveSession, removeSession, removeAllUserSessions } from './firestore';

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
    
    const userId = snapshot.docs[0].id;
    
    // Eski oturumları temizle
    await removeAllUserSessions(userId);
    
    // Yeni oturum oluştur
    const sessionId = await createSession(userId);
    
    const userData = snapshot.docs[0].data();
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
