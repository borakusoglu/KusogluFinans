import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function registerDevice(hwid, username) {
  try {
    const deviceRef = doc(db, 'devices', hwid);
    await setDoc(deviceRef, {
      hwid,
      username,
      registeredAt: new Date().toISOString(),
      active: true
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function checkDeviceActivation(hwid) {
  try {
    const deviceRef = doc(db, 'devices', hwid);
    const deviceSnap = await getDoc(deviceRef);
    
    if (deviceSnap.exists() && deviceSnap.data().active) {
      return { activated: true, username: deviceSnap.data().username };
    }
    
    return { activated: false };
  } catch (error) {
    return { activated: false, error: error.message };
  }
}

export async function isDeviceRegisteredToAnotherUser(hwid, username) {
  try {
    const deviceRef = doc(db, 'devices', hwid);
    const deviceSnap = await getDoc(deviceRef);
    
    if (deviceSnap.exists()) {
      const registeredUsername = deviceSnap.data().username;
      return registeredUsername !== username;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}
