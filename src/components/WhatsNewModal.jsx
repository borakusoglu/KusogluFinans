import { useState } from 'react';
import { APP_VERSION } from '../config/version';

export default function WhatsNewModal() {
  const [show, setShow] = useState(
    () => localStorage.getItem('lastSeenVersion') !== APP_VERSION,
  );

  const handleClose = () => {
    localStorage.setItem('lastSeenVersion', APP_VERSION);
    setShow(false);
  };

  if (!show) return null;

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
              <div style={{width: '40px', height: '40px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>Plasiyer Tahsilatları</h3>
                <p style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>K-Depo mobil uygulamasından gelen saha tahsilatları artık finans kuyruğunda. Müşteri, belge, ödeme tipi, tutar ve işlem durumu tek ekrandan takip edilebiliyor.</p>
              </div>
            </div>

            <div style={{display: 'flex', gap: '12px', alignItems: 'start'}}>
              <div style={{width: '40px', height: '40px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>İsme Göre Plasiyer Filtresi</h3>
                <p style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>Yeni dropdown menüyle plasiyer adına göre hızlı seçim yapılabiliyor. İsim ve plasiyer kodu birlikte gösteriliyor; arama ve durum filtreleriyle beraber çalışıyor.</p>
              </div>
            </div>

            <div style={{display: 'flex', gap: '12px', alignItems: 'start'}}>
              <div style={{width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>Planlı Plasiyer Çıktısı</h3>
                <p style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>Bekleyen tahsilatlar plasiyer bazında raporlanıp saat 07:30'da varsayılan yazıcıya gönderiliyor. Uygulama açılışında yazdırma başlamıyor; manuel çıktı seçeneği de kullanılabiliyor.</p>
              </div>
            </div>

            <div style={{display: 'flex', gap: '12px', alignItems: 'start'}}>
              <div style={{width: '40px', height: '40px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div style={{flex: 1}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '2px'}}>Kontrollü Netsis Aktarımı</h3>
                <p style={{fontSize: '13px', color: '#6b7280', lineHeight: '1.5'}}>Yazdırılmış tahsilatlar seçilerek Netsis'e aktarılabiliyor. Görüntüleme, düzenleme, silme, yazdırma ve aktarım işlemleri yalnızca admin ve süper admin yetkisine açıldı.</p>
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
