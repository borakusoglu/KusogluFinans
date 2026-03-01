import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export default function VersionChecker() {
  const [showModal, setShowModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await check({
        headers: import.meta.env.VITE_GITHUB_TOKEN ? {
          'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`
        } : {}
      });
      
      if (update?.available) {
        setUpdateInfo(update);
        setShowModal(true);
      }
    } catch (error) {
      // Sessizce geç
    }
  };

  const handleDownload = async () => {
    if (!updateInfo) return;
    
    try {
      setDownloading(true);
      setDownloadError(null);
      console.log('[Updater] İndirme başlatılıyor...', updateInfo);
      
      await updateInfo.downloadAndInstall((event) => {
        console.log('[Updater] Event:', event);
        switch (event.event) {
          case 'Started':
            setDownloadProgress(0);
            break;
          case 'Progress':
            if (event.data.contentLength) {
              setDownloadProgress(Math.round((event.data.downloaded / event.data.contentLength) * 100));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });
      
      console.log('[Updater] İndirme tamamlandı, relaunch...');
      await relaunch();
    } catch (error) {
      console.error('[Updater] Hata:', error);
      setDownloadError(String(error));
      setDownloading(false);
    }
  };

  if (!showModal) return null;

  return (
    <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
      <div style={{backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
        <div style={{textAlign: 'center', marginBottom: '24px'}}>
          <div style={{width: '64px', height: '64px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
            <svg style={{width: '32px', height: '32px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 style={{fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px'}}>Yeni Güncelleme Mevcut</h3>
          <p style={{color: '#6b7280', fontSize: '14px'}}>Uygulamanın yeni bir sürümü yayınlandı</p>
        </div>

        <div style={{backgroundColor: '#f3f4f6', borderRadius: '12px', padding: '16px', marginBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{color: '#6b7280', fontSize: '14px'}}>Mevcut Sürüm:</span>
            <span style={{fontWeight: '600', color: '#1f2937', fontSize: '14px'}}>v{updateInfo?.currentVersion}</span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span style={{color: '#6b7280', fontSize: '14px'}}>Yeni Sürüm:</span>
            <span style={{fontWeight: '600', color: '#10b981', fontSize: '14px'}}>v{updateInfo?.version}</span>
          </div>
        </div>

        <div style={{backgroundColor: '#eff6ff', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #dbeafe'}}>
          <h4 style={{fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '12px'}}>Yenilikler:</h4>
          <ul style={{margin: 0, paddingLeft: '20px', color: '#374151', fontSize: '13px', lineHeight: '1.8'}}>
            <li>Hatırlatma detay modalında ödeme özeti eklendi</li>
            <li>Hatırlatmalardan yapılan ödemeler artık takip ediliyor</li>
            <li>Ödeme kartlarında kullanıcı adı ve tarih-saat bilgisi gösteriliyor</li>
            <li>Admin Dashboard'da Online Kullanıcılar sekmesi eklendi</li>
            <li>Kredi kartı hatırlatmalarında yapılan ödeme tutarı gösteriliyor</li>
            <li>Tarih gösteriminde Türkiye saat dilimi desteği eklendi</li>
            <li>Arama özelliği sadece kullanıcılar ve loglar sekmelerinde aktif</li>
          </ul>
        </div>

        {downloadError && (
          <div style={{marginBottom: '16px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px'}}>
            <p style={{color: '#dc2626', fontSize: '12px', margin: 0, wordBreak: 'break-all'}}>❌ Hata: {downloadError}</p>
          </div>
        )}

        {downloading && (
          <div style={{marginBottom: '24px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
              <span style={{fontSize: '14px', color: '#6b7280'}}>İndiriliyor...</span>
              <span style={{fontSize: '14px', fontWeight: '600', color: '#10b981'}}>{downloadProgress}%</span>
            </div>
            <div style={{width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
              <div style={{width: `${downloadProgress}%`, height: '100%', background: 'linear-gradient(to right, #10b981, #059669)', transition: 'width 0.3s'}}></div>
            </div>
          </div>
        )}

        <div style={{display: 'flex', gap: '12px'}}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', fontWeight: '600', cursor: downloading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)', opacity: downloading ? 0.7 : 1}}
          >
            {downloading ? 'İndiriliyor...' : 'Güncelle'}
          </button>
        </div>
      </div>
    </div>
  );
}
