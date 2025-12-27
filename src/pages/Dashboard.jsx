import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Ajanda from './Ajanda';
import KrediKarti from './KrediKarti';
import Istatistikler from './Istatistikler';
import Tanimlamalar from './Tanimlamalar';
import KullaniciYonetimi from './KullaniciYonetimi';
import Hatirlatma from '../components/Hatirlatma';
import Ayarlar from '../components/Ayarlar';
import VersionChecker from '../components/VersionChecker';
import { logoutUser } from '../firebase/auth';

export default function Dashboard({ user, setUser }) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    navigate('/login');
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh', background: 'linear-gradient(to bottom right, #f9fafb, #f1f5f9)', minWidth: '1200px'}}>
      <header style={{background: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderBottom: '1px solid #e5e7eb', minWidth: '1200px'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', minWidth: '1200px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '4px', width: '180px'}}>
            <h2 style={{fontSize: '24px', fontWeight: 'bold', letterSpacing: '-0.025em'}}>
              <span style={{color: '#dc2626'}}>K</span>
              <span style={{color: '#334155'}}>uşoğlu</span>
            </h2>
            <div style={{width: '4px', height: '48px', display: 'flex', alignItems: 'center'}}>
              <svg width="4" height="48" style={{display: 'block'}}>
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity="0" />
                    <stop offset="50%" stopColor="#1e293b" stopOpacity="1" />
                    <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <ellipse cx="2" cy="24" rx="1" ry="24" fill="url(#lineGradient)" opacity="0.8" />
              </svg>
            </div>
            <h2 style={{fontSize: '24px', fontWeight: 'bold', letterSpacing: '-0.025em', background: 'linear-gradient(to right, #10b981, #0d9488)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Finans</h2>
          </div>
          
          <nav style={{display: 'flex', gap: '8px', minWidth: '700px'}}>
            <Link to="/" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', color: '#374151', borderRadius: '12px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', textDecoration: 'none', width: '120px'}}>
              <svg style={{width: '20px', height: '20px', color: '#2563eb', flexShrink: 0}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span style={{fontWeight: 600, whiteSpace: 'nowrap', fontSize: '14px'}}>Ajanda</span>
            </Link>
            <Link to="/kredi-karti" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', color: '#374151', borderRadius: '12px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', textDecoration: 'none', width: '140px'}}>
              <svg style={{width: '20px', height: '20px', color: '#9333ea', flexShrink: 0}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span style={{fontWeight: 600, whiteSpace: 'nowrap', fontSize: '14px'}}>Kredi Kartı</span>
            </Link>
            <Link to="/istatistikler" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', color: '#374151', borderRadius: '12px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', textDecoration: 'none', width: '140px'}}>
              <svg style={{width: '20px', height: '20px', color: '#0d9488', flexShrink: 0}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span style={{fontWeight: 600, whiteSpace: 'nowrap', fontSize: '14px'}}>İstatistikler</span>
            </Link>
            <Link to="/tanimlamalar" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', color: '#374151', borderRadius: '12px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', textDecoration: 'none', width: '160px'}}>
              <svg style={{width: '20px', height: '20px', color: '#ea580c', flexShrink: 0}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span style={{fontWeight: 600, whiteSpace: 'nowrap', fontSize: '14px'}}>Tanımlamalar</span>
            </Link>
            {(user.role === 'admin' || user.role === 'manager') && (
              <Link to="/kullanicilar" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', color: '#374151', borderRadius: '12px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', textDecoration: 'none', width: '140px'}}>
                <svg style={{width: '20px', height: '20px', color: '#db2777', flexShrink: 0}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span style={{fontWeight: 600, whiteSpace: 'nowrap', fontSize: '14px'}}>Kullanıcılar</span>
              </Link>
            )}
          </nav>

          <div style={{display: 'flex', alignItems: 'center', gap: '12px', width: '280px', justifyContent: 'flex-end'}}>
            <Hatirlatma />
            <button
              onClick={() => setShowSettings(true)}
              style={{padding: '8px', color: '#6b7280', borderRadius: '12px', transition: 'all 0.2s', border: 'none', background: 'transparent', cursor: 'pointer'}}
              title="Ayarlar"
            >
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <span style={{fontSize: '13px', fontWeight: 500, color: '#4b5563'}}>{user.username}</span>
            <div style={{width: '36px', height: '36px', background: 'linear-gradient(to bottom right, #2563eb, #9333ea)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              style={{padding: '8px', color: '#dc2626', borderRadius: '12px', transition: 'all 0.2s', border: 'none', background: 'transparent', cursor: 'pointer'}}
              title="Çıkış"
            >
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main style={{flex: 1, overflow: 'hidden'}}>
        <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
          <Routes>
            <Route path="/" element={<Ajanda />} />
            <Route path="/kredi-karti" element={<KrediKarti />} />
            <Route path="/istatistikler" element={<Istatistikler />} />
            <Route path="/tanimlamalar" element={<Tanimlamalar user={user} />} />
            {(user.role === 'admin' || user.role === 'manager') && <Route path="/kullanicilar" element={<KullaniciYonetimi />} />}
          </Routes>
        </div>
      </main>
      {showSettings && <Ayarlar onClose={() => setShowSettings(false)} />}
      <VersionChecker />
    </div>
  );
}
