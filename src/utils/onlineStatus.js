import { realtimeDB } from '../firebase/config';
import { ref, set, onDisconnect, onValue, update } from 'firebase/database';

class OnlineStatus {
  constructor() {
    this.userId = null;
    this.unsubscribe = null;
  }

  // Kullanıcıyı online yap
  async setOnline(userId, username) {
    console.log('🟢 setOnline çağrıldı:', { userId, username });
    this.userId = userId;
    const userRef = ref(realtimeDB, `onlineUsers/${userId}`);
    
    try {
      await set(userRef, {
        username,
        online: true,
        lastSeen: Date.now()
      });
      console.log('✅ Kullanıcı online olarak işaretlendi');
      
      onDisconnect(userRef).update({
        online: false,
        lastSeen: Date.now()
      });
      console.log('✅ onDisconnect ayarlandı');

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      this.heartbeatInterval = setInterval(() => {
        update(userRef, {
          lastSeen: Date.now()
        });
        console.log('💓 Heartbeat güncellendi');
      }, 30000);
    } catch (error) {
      console.error('❌ setOnline hatası:', error);
    }
  }

  // Kullanıcıyı offline yap
  async setOffline() {
    if (!this.userId) return;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    const userRef = ref(realtimeDB, `onlineUsers/${this.userId}`);
    
    await update(userRef, {
      online: false,
      lastSeen: Date.now()
    });
    
    this.userId = null;
  }

  // Online kullanıcıları dinle
  listenOnlineUsers(callback) {
    console.log('👂 listenOnlineUsers başlatıldı');
    const usersRef = ref(realtimeDB, 'onlineUsers');
    
    this.unsubscribe = onValue(usersRef, (snapshot) => {
      console.log('📡 Realtime Database snapshot alındı');
      const users = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        console.log('👤 Kullanıcı:', childSnapshot.key, data);
        users.push({
          userId: childSnapshot.key,
          ...data
        });
      });
      console.log('✅ Toplam kullanıcı:', users.length);
      callback(users);
    }, (error) => {
      console.error('❌ listenOnlineUsers hatası:', error);
    });
    
    return this.unsubscribe;
  }

  // Dinlemeyi durdur
  stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export default new OnlineStatus();
