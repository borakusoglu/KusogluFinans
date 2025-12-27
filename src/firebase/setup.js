import { db } from './config';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export const setupInitialUser = async () => {
  try {
    // Kullanıcı var mı kontrol et
    const q = query(collection(db, 'users'), where('username', '==', 'admin'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // İlk kullanıcıyı oluştur
      await addDoc(collection(db, 'users'), {
        username: 'admin',
        password: '123456'
      });
      console.log('İlk kullanıcı oluşturuldu: admin / 123456');
    }
  } catch (error) {
    console.error('Setup hatası:', error);
  }
};
