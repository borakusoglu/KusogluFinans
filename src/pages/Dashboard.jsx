import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Ajanda from './Ajanda';
import KrediKarti from './KrediKarti';
import Istatistikler from './Istatistikler';
import Tanimlamalar from './Tanimlamalar';
import AdminDashboard from './AdminDashboard';
import Mesajlar from './Mesajlar';
import Hatirlatmalar from './Hatirlatmalar';
import Ayarlar from '../components/Ayarlar';
import VersionChecker from '../components/VersionChecker';
import { logoutUser } from '../firebase/auth';
import * as firestore from '../firebase/firestore';

export default function Dashboard({ user, setUser }) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [reminderAlerts, setReminderAlerts] = useState([]);
  const [showReminderAlert, setShowReminderAlert] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessages, setNewMessages] = useState([]);
  const [showMessageAlert, setShowMessageAlert] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    checkReminders();
    
    // Online/offline durumunu kontrol et
    const checkConnection = async () => {
      try {
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    
    checkConnection();
    const connectionInterval = setInterval(checkConnection, 5000);
    
    const handleOnline = () => { setIsOnline(true); checkConnection(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const unsubscribe = firestore.listenToUnreadMessages(user.uid, (messages) => {
      const count = messages.length;
      
      if (count > 0 && count > unreadCount) {
        const newMsgCount = unreadCount === 0 ? Math.min(count, 5) : count - unreadCount;
        setNewMessages(messages.slice(0, newMsgCount));
        setShowMessageAlert(true);
      }
      
      setUnreadCount(count);
    });
    
    return () => {
      unsubscribe();
      clearInterval(connectionInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkReminders = async () => {
    const reminders = await firestore.getReminders();
    const cards = await firestore.getCreditCards();
    const cariList = await firestore.getCari();
    const today = new Date();
    const currentDay = today.getDate();
    
    const alerts = [];
    
    reminders.forEach(reminder => {
      if (reminder.isActive === false || !reminder.remainingCount || reminder.remainingCount <= 0) return;
      if (!reminder.dayStart || !reminder.dayEnd) return;
      
      const dayStart = parseInt(reminder.dayStart);
      const dayEnd = parseInt(reminder.dayEnd);
      
      // Son 3 gün kontrolü
      let daysUntilEnd = 0;
      if (dayStart > dayEnd) {
        // Ay geçişi var (27-10 gibi)
        if (currentDay >= dayStart) {
          // Aynı ay içinde
          daysUntilEnd = dayEnd + (new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - currentDay);
        } else {
          // Gelecek ay
          daysUntilEnd = dayEnd - currentDay;
        }
      } else {
        // Normal durum (5-15 gibi)
        daysUntilEnd = dayEnd - currentDay;
      }
      
      if (daysUntilEnd >= 0 && daysUntilEnd <= 3) {
        let title = '';
        if (reminder.type === 'creditCard') {
          const card = cards.find(c => c.id === reminder.creditCardId);
          title = `${card?.code || 'Kart'} - Kredi Kartı Ödemesi`;
        } else if (reminder.type === 'cari') {
          const cari = cariList.find(c => c.id === reminder.cariId);
          const paymentMethod = reminder.paymentType ? ` (${reminder.paymentType.toUpperCase()})` : '';
          title = `${cari?.name || 'Cari'} - Cari Ödemesi${paymentMethod}`;
        } else {
          title = reminder.title;
        }
        
        alerts.push({
          title,
          daysLeft: daysUntilEnd,
          dayRange: `${dayStart}-${dayEnd}`,
          remainingCount: reminder.remainingCount,
          paymentCount: reminder.paymentCount
        });
      }
    });
    
    if (alerts.length > 0) {
      setReminderAlerts(alerts);
      setShowReminderAlert(true);
    }
  };

  const getDeviceFingerprint = async () => {
    let deviceId = 'UNKNOWN';
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      deviceId = await invoke('get_hardware_id');
    } catch (error) {
      console.error('MAC adresi alınamadı:', error);
      deviceId = localStorage.getItem('deviceId') || 'WEB-' + Date.now().toString(16).toUpperCase();
      localStorage.setItem('deviceId', deviceId);
    }
    
    let ip = 'Bilinmiyor';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      ip = ipData.ip;
    } catch (error) {
      console.error('IP alınamadı:', error);
    }
    
    return `${deviceId} | IP: ${ip}`;
  };

  const handleLogout = async () => {
    const deviceInfo = await getDeviceFingerprint();
    
    // Logout log kaydı
    await firestore.addLog(user.username, 'Çıkış Yapıldı', deviceInfo);
    
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
          
          <nav style={{display: 'flex', gap: '8px', minWidth: '800px'}}>
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
            {(user.role === 'superadmin' || user.role === 'admin') && (
              <Link to="/admin" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', color: '#374151', borderRadius: '12px', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', textDecoration: 'none', width: '140px'}}>
                <svg style={{width: '20px', height: '20px', color: '#dc2626', flexShrink: 0}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span style={{fontWeight: 600, whiteSpace: 'nowrap', fontSize: '14px'}}>Admin</span>
              </Link>
            )}
          </nav>

          <div style={{display: 'flex', alignItems: 'center', gap: '12px', width: '280px', justifyContent: 'flex-end'}}>
            {!isOnline && (
              <div style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#dc2626', borderRadius: '20px'}}>
                <div style={{width: '8px', height: '8px', background: 'white', borderRadius: '50%'}}></div>
                <span style={{fontSize: '12px', fontWeight: '600', color: 'white'}}>Offline</span>
              </div>
            )}
            <Link to="/hatirlatmalar" style={{padding: '8px', color: '#6b7280', borderRadius: '12px', transition: 'all 0.2s', border: 'none', background: 'transparent', cursor: 'pointer', textDecoration: 'none', display: 'flex', position: 'relative'}} title="Hatırlatmalar">
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Link>
            <Link to="/mesajlar" style={{padding: '8px', color: '#6b7280', borderRadius: '12px', transition: 'all 0.2s', border: 'none', background: 'transparent', cursor: 'pointer', textDecoration: 'none', display: 'flex', position: 'relative'}} title="Mesajlar">
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {unreadCount > 0 && (
                <span style={{position: 'absolute', top: '4px', right: '4px', background: '#dc2626', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
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
            <Route path="/" element={<Ajanda user={user} />} />
            <Route path="/kredi-karti" element={<KrediKarti user={user} />} />
            <Route path="/istatistikler" element={<Istatistikler />} />
            <Route path="/tanimlamalar" element={<Tanimlamalar user={user} />} />
            <Route path="/hatirlatmalar" element={<Hatirlatmalar user={user} />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="/mesajlar" element={<Mesajlar user={user} />} />
          </Routes>
        </div>
      </main>
      {showSettings && <Ayarlar onClose={() => setShowSettings(false)} />}
      <VersionChecker />
      {showMessageAlert && (
        <div style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
          <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'}} onClick={() => {
            newMessages.forEach(msg => firestore.markMessageAsRead(msg.id));
            setShowMessageAlert(false);
          }}></div>
          <div style={{background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '500px', padding: '24px', position: 'relative', zIndex: 10}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <svg style={{width: '32px', height: '32px', color: '#2563eb'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h2 style={{fontSize: '24px', fontWeight: 'bold', color: '#111827'}}>Yeni Mesaj!</h2>
              </div>
              <button onClick={() => { 
                newMessages.forEach(msg => firestore.markMessageAsRead(msg.id));
                setShowMessageAlert(false); 
              }} style={{padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s'}}>
                <svg style={{width: '24px', height: '24px', color: '#6b7280'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{marginBottom: '24px'}}>
              <p style={{color: '#4b5563', fontWeight: 500, marginBottom: '16px'}}>Yeni mesajlarınız var:</p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto'}}>
                {newMessages.map((msg, index) => (
                  <div key={index} style={{background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '16px', borderRadius: '8px'}}>
                    <div style={{display: 'flex', alignItems: 'start', justifyContent: 'space-between'}}>
                      <div style={{flex: 1}}>
                        <p style={{fontWeight: 600, color: '#111827', marginBottom: '4px'}}>{msg.fromUsername}</p>
                        <p style={{fontSize: '14px', color: '#374151', marginBottom: '4px'}}>{msg.subject}</p>
                        <p style={{fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{msg.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => { 
              newMessages.forEach(msg => firestore.markMessageAsRead(msg.id));
              setShowMessageAlert(false); 
              navigate('/mesajlar'); 
            }} style={{width: '100%', padding: '12px 24px', background: 'linear-gradient(to right, #2563eb, #1d4ed8)', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.2s'}}>
              Mesajları Görüntüle
            </button>
          </div>
        </div>
      )}
      {showReminderAlert && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReminderAlert(false)}
          ></div>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h2 className="text-2xl font-bold text-gray-900">Hatırlatma!</h2>
              </div>
              <button
                onClick={() => setShowReminderAlert(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-700 font-medium mb-4">Ödeme yapılması gereken hatırlatmalar:</p>
              {reminderAlerts.map((alert, index) => (
                <div key={index} className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{alert.title}</p>
                      <p className="text-sm text-gray-600">Gün Aralığı: {alert.dayRange}</p>
                      <p className="text-sm text-gray-600">Kalan Ödeme: {alert.remainingCount} / {alert.paymentCount}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="bg-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold">
                        {alert.daysLeft === 0 ? 'Bugün' : `${alert.daysLeft} gün`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setShowReminderAlert(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all font-semibold shadow-lg"
              >
                Anlaşıldı
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
