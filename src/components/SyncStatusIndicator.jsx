import { useState, useEffect } from 'react';

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState(null); // 'syncing', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleSyncStart = () => {
      setStatus('syncing');
      setMessage('Kaydediliyor...');
    };

    const handleSyncSuccess = () => {
      setStatus('success');
      setMessage('Kaydedildi');
      setTimeout(() => setStatus(null), 3000);
    };

    const handleSyncError = (e) => {
      setStatus('error');
      setMessage(e.detail?.message || 'Kayıt hatası');
      setTimeout(() => setStatus(null), 5000);
    };

    window.addEventListener('syncStart', handleSyncStart);
    window.addEventListener('syncSuccess', handleSyncSuccess);
    window.addEventListener('syncError', handleSyncError);

    return () => {
      window.removeEventListener('syncStart', handleSyncStart);
      window.removeEventListener('syncSuccess', handleSyncSuccess);
      window.removeEventListener('syncError', handleSyncError);
    };
  }, []);

  if (!status) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slideIn">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl ${
        status === 'syncing' ? 'bg-blue-500' :
        status === 'success' ? 'bg-green-500' :
        'bg-red-500'
      } text-white`}>
        {status === 'syncing' && (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        {status === 'success' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'error' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="font-semibold">{message}</span>
      </div>
    </div>
  );
}
