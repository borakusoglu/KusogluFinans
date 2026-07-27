import { onValue, ref, serverTimestamp, set } from 'firebase/database';
import { realtimeDB } from './config';

export const DATA_TRIGGER_ROOT = 'dataTriggers';

const getClientId = () => {
  const storageKey = 'finans_client_id';
  let clientId = sessionStorage.getItem(storageKey);

  if (!clientId) {
    clientId = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(storageKey, clientId);
  }

  return clientId;
};

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
};

const getSignalFingerprint = (signal) => {
  if (!signal) return null;
  return `${signal.nonce || ''}:${signal.timestamp || ''}`;
};

export const publishDataTrigger = async (
  collectionName,
  action = 'update',
  documentId = null,
  actor = {}
) => {
  if (!collectionName) {
    throw new Error('Realtime tetikleyici için koleksiyon adı gerekli');
  }

  const currentUser = getCurrentUser();
  const signalRef = ref(realtimeDB, `${DATA_TRIGGER_ROOT}/${collectionName}`);

  await set(signalRef, {
    collection: collectionName,
    action,
    documentId,
    userId: actor.userId || currentUser.uid || null,
    username: actor.username || currentUser.username || 'system',
    clientId: getClientId(),
    nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: serverTimestamp()
  });
};

export const listenToDataTriggers = (collectionNames, callback, onError) => {
  const allowedCollections = new Set(collectionNames);
  const triggerRootRef = ref(realtimeDB, DATA_TRIGGER_ROOT);
  let previousSignals = null;

  return onValue(
    triggerRootRef,
    (snapshot) => {
      const signals = snapshot.val() || {};

      // İlk değer yalnızca mevcut durumun taban çizgisidir. Firestore ilk yüklemesi
      // dinleyiciyi başlatan katmanda ayrıca yapıldığı için eski sinyalleri çalıştırma.
      if (previousSignals === null) {
        previousSignals = Object.fromEntries(
          Object.entries(signals).map(([name, signal]) => [
            name,
            getSignalFingerprint(signal)
          ])
        );
        return;
      }

      for (const [collectionName, signal] of Object.entries(signals)) {
        if (!allowedCollections.has(collectionName)) continue;

        const nextFingerprint = getSignalFingerprint(signal);
        if (previousSignals[collectionName] !== nextFingerprint) {
          callback({ collectionName, signal });
        }

        previousSignals[collectionName] = nextFingerprint;
      }
    },
    (error) => {
      console.error('Realtime tetikleyici dinleme hatası:', error);
      onError?.(error);
    }
  );
};
