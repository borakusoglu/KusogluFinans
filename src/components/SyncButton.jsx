import { useState } from 'react';
import syncManager from '../utils/syncManager';
import changeLogSync from '../utils/changeLogSync';
import localDB from '../utils/localDB';

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    
    // 1. Cloud'a yükle
    const uploadResult = await syncManager.uploadToCloud();
    
    if (!uploadResult.success) {
      setMessage('✗ Hata: ' + uploadResult.error);
      setSyncing(false);
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // 2. Direkt Firebase'den güncel verileri çek
    console.log('🔄 Güncel veriler çekiliyor...');
    await syncManager.downloadFromCloud();
    
    // 3. ChangeLog'dan kaçırılan değişiklikleri al
    await changeLogSync.fetchMissedChanges();
    
    setMessage('✓ Senkronizasyon tamamlandı');
    window.dispatchEvent(new Event('dataUpdated'));
    
    setSyncing(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const dirtyCollections = localDB.getDirtyCollections();
  const lastSync = localDB.getLastSync();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
          dirtyCollections.length > 0
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {syncing ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Senkronize ediliyor...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Senkronize Et
            {dirtyCollections.length > 0 && (
              <span className="bg-white text-orange-500 px-2 py-0.5 rounded-full text-xs font-bold">
                {dirtyCollections.length}
              </span>
            )}
          </span>
        )}
      </button>
      
      {lastSync && (
        <span className="text-xs text-gray-500">
          Son: {new Date(lastSync).toLocaleString('tr-TR')}
        </span>
      )}
      
      {message && (
        <span className={`text-sm font-semibold ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </span>
      )}
    </div>
  );
}
