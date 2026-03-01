import { useState, useEffect } from 'react';
import { APP_VERSION } from '../config/version';

export default function WhatsNewModal() {
  const [show, setShow] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    const lastSeenVersion = localStorage.getItem('lastSeenVersion');
    if (lastSeenVersion !== APP_VERSION) {
      setShow(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('lastSeenVersion', APP_VERSION);
    setShow(false);
  };

  if (!show) return null;

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
      <div style={{background: 'white', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '600px', maxHeight: '85vh', overflow: 'hidden'}}>
        <div style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '24px', textAlign: 'center'}}>
          <div style={{width: '64px', height: '64px', background: 'white', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'}}>
            <svg style={{width: '40px', height: '40px', color: '#667eea'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 style={{fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '4px'}}>Yeni Özellikler!</h2>
          <p style={{fontSize: '15px', color: 'rgba(255,255,255,0.9)'}}>Versiyon {APP_VERSION}</p>
        </div>

        <div style={{padding: '24px', maxHeight: '450px', overflowY: 'auto'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={{display: 'flex', gap: '12px', alignItems: 'start'}}>
              <div style={{width: '40px', height: '40px', background: 'linear-gradient(135deg, #ec4899, #db2777)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>Hatırlatma Detayları</h3>
                <p style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>Hatırlatmalara tıklayarak detaylı bilgi görüntüleyin. Ödeme ilerlemesi, kalan tutar ve tüm bilgiler tek ekranda.</p>
              </div>
            </div>

            {isAdmin && (
              <>
                <div style={{display: 'flex', gap: '12px', alignItems: 'start'}}>
                  <div style={{width: '40px', height: '40px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                    <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div style={{flex: 1}}>
                    <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>Online Kullanıcı Takibi</h3>
                    <p style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>Hangi kullanıcıların aktif olduğunu gerçek zamanlı görün. Son görülme zamanı ve online/offline durumu.</p>
                  </div>
                </div>
              </>
            )}

            <div style={{display: 'flex', gap: '12px', alignItems: 'start'}}>
              <div style={{width: '40px', height: '40px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>Daha Hızlı Performans</h3>
                <p style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>Optimize edilmiş veri senkronizasyonu ile daha hızlı ve akıcı kullanım deneyimi.</p>
              </div>
            </div>

            <div style={{display: 'flex', gap: '12px', alignItems: 'start'}}>
              <div style={{width: '40px', height: '40px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>Hata Düzeltmeleri</h3>
                <p style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>Çeşitli hata düzeltmeleri ve stabilite iyileştirmeleri yapıldı.</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{padding: '20px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb'}}>
          <button
            onClick={handleClose}
            style={{width: '100%', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.2s'}}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Harika, Anladım!
          </button>
        </div>
      </div>
    </div>
  );
}
