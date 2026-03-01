import { useState, useEffect } from 'react';
import transferManager from '../utils/transferManager';
import syncManager from '../utils/syncManager';
import changeLogSync from '../utils/changeLogSync';
import localDB from '../utils/localDB';

export default function SyncModal({ onClose, dirtyCount }) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backups, setBackups] = useState([]);
  const [appDataPath, setAppDataPath] = useState('');
  const [currentDirtyCount, setCurrentDirtyCount] = useState(dirtyCount);

  useEffect(() => {
    loadBackups();
    
    // Dirty count'u sürekli güncelle
    const interval = setInterval(() => {
      setCurrentDirtyCount(localDB.getDirtyCollections().length);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  const loadBackups = async () => {
    const result = await transferManager.listBackups();
    if (result.success) {
      setBackups(result.files);
    }
    const pathResult = await transferManager.getAppDataPath();
    if (pathResult.success) {
      setAppDataPath(pathResult.path);
    }
  };

  const handleSmartSync = async () => {
    setSyncing(true);
    setMessage('Senkronize ediliyor...');
    window.dispatchEvent(new Event('syncStart'));
    
    try {
      console.log('🔵 Tam sync başladı');
      console.log('Dirty collections (önce):', localDB.getDirtyCollections());
      
      const dirtyCollections = localDB.getDirtyCollections();
      if (dirtyCollections.length > 0) {
        setMessage(`${dirtyCollections.length} değişiklik yükleniyor...`);
        await syncManager.uploadToCloud();
      }
      
      setMessage('Güncel veriler çekiliyor...');
      await syncManager.downloadFromCloud();
      await changeLogSync.fetchMissedChanges();
      
      console.log('Dirty collections (sync sonrası):', localDB.getDirtyCollections());
      
      // Dirty temizle
      localDB.clearDirty();
      
      console.log('Dirty collections (temizlendi):', localDB.getDirtyCollections());
      console.log('✅ Tam sync tamamlandı');
      
      setMessage('✓ Senkronizasyon tamamlandı');
      window.dispatchEvent(new Event('syncSuccess'));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('❌ Sync hatası:', error);
      setMessage(`✗ Hata: ${error.message}`);
      window.dispatchEvent(new CustomEvent('syncError', { detail: { message: error.message } }));
    }
    
    setSyncing(false);
  };

  const handleUploadToCloud = async () => {
    setSyncing(true);
    setMessage('Cloud\'a yükleniyor...');
    
    try {
      console.log('🔵 Upload başladı');
      console.log('Dirty collections (önce):', localDB.getDirtyCollections());
      
      // Tüm local verileri dirty olarak işaretle
      const collections = ['creditCards', 'bankAccounts', 'categories', 'cari', 'payments', 'reminders'];
      collections.forEach(col => localDB.markDirty(col));
      
      console.log('Dirty collections (işaretlendi):', localDB.getDirtyCollections());
      
      await syncManager.uploadToCloud();
      
      console.log('Dirty collections (upload sonrası):', localDB.getDirtyCollections());
      
      // Dirty temizle
      localDB.clearDirty();
      
      console.log('Dirty collections (temizlendi):', localDB.getDirtyCollections());
      console.log('✅ Upload tamamlandı');
      
      setMessage('✓ Tüm veriler Cloud\'a yüklendi');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('❌ Upload hatası:', error);
      setMessage(`✗ Hata: ${error.message}`);
    }
    
    setSyncing(false);
  };

  const handleDownloadFromCloud = async () => {
    setSyncing(true);
    setMessage('Cloud\'dan çekiliyor...');
    
    try {
      await syncManager.downloadFromCloud();
      await changeLogSync.fetchMissedChanges();
      setMessage('✓ Veriler indirildi, sayfa yenileniyor...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
      window.location.reload();
    } catch (error) {
      setMessage(`✗ Hata: ${error.message}`);
    }
    
    setSyncing(false);
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage('Dosya kaydediliyor...');
    const result = await transferManager.exportData();
    setMessage(result.success ? `✓ Kaydedildi: ${result.path || 'Downloads'}` : `✗ Hata: ${result.error}`);
    setExporting(false);
    if (result.success) {
      await loadBackups();
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleImportFromCache = async (filename) => {
    setImporting(true);
    setMessage('Yükleniyor...');
    const result = await transferManager.importData(filename, 'merge');
    setMessage(result.success ? '✓ Veri yüklendi' : `✗ Hata: ${result.error}`);
    setImporting(false);
    
    if (result.success) {
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    }
  };

  const handleImport = async (e) => {
    const file = e?.target?.files?.[0];
    
    setImporting(true);
    setMessage('Dosya yükleniyor...');
    const result = await transferManager.importData(file, 'merge');
    setMessage(result.success ? '✓ Veri yüklendi' : `✗ Hata: ${result.error}`);
    setImporting(false);
    
    if (result.success) {
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Senkronizasyon</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg mb-4 text-center font-medium ${
            message.includes('✓') ? 'bg-green-100 text-green-800' : 
            message.includes('✗') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleUploadToCloud}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-5" />
            </svg>
            <span>Cloud'a Gönder</span>
          </button>

          <button
            onClick={handleDownloadFromCloud}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3-3v12" />
            </svg>
            <span>Cloud'dan Çek</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">veya</span>
            </div>
          </div>

          <button
            onClick={handleSmartSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-xl hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all"
          >
            <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Tam Senkronizasyon</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Yerel Yedekler</span>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 font-semibold shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Yeni Yedek Oluştur</span>
          </button>

          {backups.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 p-3 rounded-xl">
              <p className="text-xs text-gray-600 mb-2">Kaydedilen Yedekler:</p>
              {backups.map((backup, index) => (
                <button
                  key={index}
                  onClick={() => handleImportFromCache(backup)}
                  disabled={importing}
                  className="w-full text-left px-3 py-2 bg-white hover:bg-emerald-50 rounded-lg text-sm text-gray-700 hover:text-emerald-700 transition-colors border border-gray-200 hover:border-emerald-300 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">{backup}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <label className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl hover:from-emerald-600 hover:to-green-700 font-semibold shadow-lg transition-all cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>{importing ? 'Yükleniyor...' : 'Dış Dosya Yükle'}</span>
            <input
              type="file"
              accept=".finans"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>

        {appDataPath && (
          <p className="text-xs text-gray-500 text-center mt-4">
            Yedekler: {appDataPath}
          </p>
        )}
      </div>
    </div>
  );
}
