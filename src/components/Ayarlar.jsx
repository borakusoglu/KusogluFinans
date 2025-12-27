import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';

const themeOptions = [
  { id: 'indigo', name: 'İndigo', gradient: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', sidebarGradient: 'linear-gradient(to bottom, #4f46e5, #7c3aed)' },
  { id: 'blue', name: 'Mavi', gradient: 'linear-gradient(135deg, #dbeafe, #93c5fd)', sidebarGradient: 'linear-gradient(to bottom, #2563eb, #1d4ed8)' },
  { id: 'purple', name: 'Mor', gradient: 'linear-gradient(135deg, #f3e8ff, #d8b4fe)', sidebarGradient: 'linear-gradient(to bottom, #9333ea, #7e22ce)' },
  { id: 'pink', name: 'Pembe', gradient: 'linear-gradient(135deg, #fce7f3, #f9a8d4)', sidebarGradient: 'linear-gradient(to bottom, #ec4899, #db2777)' },
  { id: 'green', name: 'Yeşil', gradient: 'linear-gradient(135deg, #d1fae5, #6ee7b7)', sidebarGradient: 'linear-gradient(to bottom, #10b981, #059669)' },
  { id: 'orange', name: 'Turuncu', gradient: 'linear-gradient(135deg, #fffaf0, #fff5e6)', sidebarGradient: 'linear-gradient(to bottom, #fec89a, #fb923c)' },
  { id: 'stars', name: 'Yıldızlı', gradient: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 5l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z\' fill=\'%23d1d5db\' opacity=\'0.3\'/%3E%3C/svg%3E"), linear-gradient(135deg, #f9fafb, #f3f4f6)', sidebarGradient: 'linear-gradient(to bottom, #6b7280, #4b5563)' },
  { id: 'tiles', name: 'Karo', gradient: 'repeating-linear-gradient(45deg, #f0f9ff 0px, #f0f9ff 20px, #e0f2fe 20px, #e0f2fe 40px), repeating-linear-gradient(-45deg, #f0f9ff 0px, #f0f9ff 20px, #e0f2fe 20px, #e0f2fe 40px)', sidebarGradient: 'linear-gradient(to bottom, #0ea5e9, #0284c7)' },
  { id: 'dots', name: 'Noktalı', gradient: 'radial-gradient(circle at 2px 2px, #d1d5db 1px, transparent 1px), linear-gradient(135deg, #f9fafb, #f3f4f6)', sidebarGradient: 'linear-gradient(to bottom, #6b7280, #4b5563)', backgroundSize: '20px 20px' },
];

export default function Ayarlar({ onClose }) {
  const [selectedTheme, setSelectedTheme] = useState('indigo');
  const [cardExpiryMonths, setCardExpiryMonths] = useState(3);
  const [showReminderBadge, setShowReminderBadge] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.uid) {
      setUserId(user.uid);
      setUserName(user.username);
      setUserRole(user.role);
      loadUserSettings(user.uid);
    }
  }, []);

  const loadUserSettings = async (uid) => {
    const settings = await firestore.getUserSettings(uid);
    setSelectedTheme(settings.calendarTheme || 'indigo');
    setCardExpiryMonths(settings.cardExpiryMonths || 3);
    setShowReminderBadge(settings.showReminderBadge !== false);
  };

  const handleThemeChange = async (themeId) => {
    setSelectedTheme(themeId);
    if (userId) {
      await firestore.saveUserSettings(userId, {
        calendarTheme: themeId,
        cardExpiryMonths: cardExpiryMonths,
        showReminderBadge: showReminderBadge
      });
      window.dispatchEvent(new Event('themeChanged'));
    }
  };

  const handleDeleteAllPayments = async () => {
    try {
      await firestore.deleteAllPayments();
      setShowDeleteConfirm(false);
      alert('Tüm ödemeler başarıyla silindi!');
      window.location.reload();
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
      <div style={{background: 'white', borderRadius: '16px', padding: '24px', width: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <h3 style={{fontSize: '20px', fontWeight: 'bold', color: '#1f2937'}}>Ayarlar</h3>
          <button onClick={onClose} style={{padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280'}}>
            <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{marginBottom: '24px'}}>
          <h4 style={{fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px'}}>Ajanda Renk Teması</h4>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px'}}>
            {themeOptions.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: selectedTheme === theme.id ? '3px solid #2563eb' : '2px solid #e5e7eb',
                  background: theme.gradient,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{fontSize: '13px', fontWeight: 600, color: '#1f2937'}}>{theme.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom: '24px'}}>
          <h4 style={{fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px'}}>Kart Süresi Dolma Uyarısı</h4>
          <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '12px'}}>
            Kart süresinin dolmasına kaç ay kala uyarı almak istiyorsunuz?
          </p>
          <input
            type="number"
            min="1"
            max="12"
            value={cardExpiryMonths}
            onChange={(e) => setCardExpiryMonths(parseInt(e.target.value) || 1)}
            style={{width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', fontWeight: 600}}
          />
          <p style={{fontSize: '12px', color: '#9ca3af', marginTop: '8px'}}>
            Şu anda: {cardExpiryMonths} ay önceden uyarı alıyorsunuz
          </p>
        </div>

        <div style={{marginBottom: '24px'}}>
          <h4 style={{fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px'}}>Hatırlatma Bildirimleri</h4>
          <label style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb'}}>
            <input
              type="checkbox"
              checked={showReminderBadge}
              onChange={(e) => setShowReminderBadge(e.target.checked)}
              style={{width: '18px', height: '18px', cursor: 'pointer'}}
            />
            <div>
              <div style={{fontSize: '14px', fontWeight: 600, color: '#1f2937'}}>Hatırlatma sayısını göster</div>
              <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>Hatırlatma ikonunda kırmızı bildirim göster</div>
            </div>
          </label>
        </div>

        {userName === 'bora' && (
          <div style={{marginBottom: '24px', padding: '16px', background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '12px'}}>
            <h4 style={{fontSize: '14px', fontWeight: 600, color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Süper Admin Araçları
            </h4>
            <p style={{fontSize: '13px', color: '#991b1b', marginBottom: '12px'}}>
              Dikkat: Bu işlem geri alınamaz!
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{width: '100%', padding: '12px', background: '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px'}}
            >
              Tüm Ödemeleri Sil
            </button>
          </div>
        )}

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px'}}>
          <button
            onClick={async () => {
              if (userId) {
                await firestore.saveUserSettings(userId, {
                  calendarTheme: selectedTheme,
                  cardExpiryMonths: cardExpiryMonths,
                  showReminderBadge: showReminderBadge
                });
                window.dispatchEvent(new Event('reminderBadgeChanged'));
              }
              onClose();
            }}
            style={{padding: '10px 20px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600}}
          >
            Kaydet
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100}}>
          <div style={{background: 'white', borderRadius: '16px', padding: '24px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <svg style={{width: '48px', height: '48px', color: '#dc2626'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 style={{fontSize: '18px', fontWeight: 'bold', color: '#1f2937'}}>Emin misiniz?</h3>
                <p style={{fontSize: '14px', color: '#6b7280', marginTop: '4px'}}>Tüm ödemeler silinecek!</p>
              </div>
            </div>
            <p style={{fontSize: '13px', color: '#991b1b', marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '8px'}}>
              Bu işlem geri alınamaz. Tüm ödeme kayıtları kalıcı olarak silinecektir.
            </p>
            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{flex: 1, padding: '10px 20px', background: '#e5e7eb', color: '#374151', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600}}
              >
                İptal
              </button>
              <button
                onClick={handleDeleteAllPayments}
                style={{flex: 1, padding: '10px 20px', background: '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600}}
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
