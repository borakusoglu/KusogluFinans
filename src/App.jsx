import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { logoutUser } from './firebase/auth';
import { getHardwareId } from './utils/hwid';
import { startAllListeners } from './firebase/firestore';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      if (!userData.keepLoggedIn) {
        localStorage.removeItem('user');
        return null;
      }
      const loginTime = userData.loginTime || Date.now();
      const daysPassed = (Date.now() - loginTime) / (1000 * 60 * 60 * 24);
      if (daysPassed > 7) {
        localStorage.removeItem('user');
        return null;
      }
      return userData;
    }
    return null;
  });
  
  const [deviceLocked, setDeviceLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return undefined;

    let disposed = false;
    let stopCollectionListeners = () => {};
    let stopAutoBackup = () => {};
    let stopCloseListener = () => {};

    const initializeData = async () => {
      console.log('🔥 Realtime Database tetikleyicileri başlatılıyor...');

      const onlineStatus = (await import('./utils/onlineStatus')).default;
      if (disposed) return;

      await onlineStatus.setOnline(user.uid, user.username);
      if (disposed) return;

      // Realtime sinyali geldiğinde ilgili Firestore koleksiyonunu yenile.
      stopCollectionListeners = startAllListeners();

      const transferManager = (await import('./utils/transferManager')).default;
      if (disposed) return;
      stopAutoBackup = transferManager.startAutoDailyBackup();
      
      // Tauri window close event
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        const unlisten = await appWindow.onCloseRequested(async () => {
          await onlineStatus.setOffline();
          await transferManager.exportData(true);
          await appWindow.close();
        });

        if (disposed) {
          unlisten();
        } else {
          stopCloseListener = unlisten;
        }
      } catch (error) {
        console.error('Tauri close setup error:', error);
      }
    };

    window.user = user;
    initializeData().catch(error => {
      console.error('Uygulama verileri başlatılamadı:', error);
    });

    return () => {
      disposed = true;
      stopCollectionListeners();
      stopAutoBackup();
      stopCloseListener();

      if (window.user?.uid === user.uid) {
        delete window.user;
      }
    };
  }, [user]);

  useEffect(() => {
    const verifyDevice = async () => {
      try {
        const hwid = await getHardwareId();
        if (!hwid) {
          setDeviceLocked(true);
          setChecking(false);
          return;
        }
        
        const storedHwid = localStorage.getItem('device_hwid');
        const isBrowserPreview = import.meta.env.DEV && !window.__TAURI_INTERNALS__;
        
        if (storedHwid && storedHwid !== hwid && !isBrowserPreview) {
          setDeviceLocked(true);
          localStorage.clear();
        } else if (!storedHwid || isBrowserPreview) {
          localStorage.setItem('device_hwid', hwid);
        }
        
        setChecking(false);
      } catch (error) {
        console.error('Cihaz doğrulama hatası:', error);
        setDeviceLocked(true);
        setChecking(false);
      }
    };
    
    verifyDevice();
  }, []);

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const checkSessionExpiry = () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        const loginTime = userData.loginTime || Date.now();
        const daysPassed = (Date.now() - loginTime) / (1000 * 60 * 60 * 24);
        if (daysPassed > 7) {
          logoutUser();
          setUser(null);
          localStorage.removeItem('user');
        }
      }
    };

    checkSessionExpiry();
    const interval = setInterval(checkSessionExpiry, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (checking) {
    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(to bottom right, #1e293b, #059669, #1e293b)'}}>
        <div style={{textAlign: 'center', color: 'white'}}>
          <div style={{width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite'}}></div>
          <p style={{fontSize: '16px'}}>Cihaz doğrulanıyor...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  
  if (deviceLocked) {
    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(to bottom right, #1e293b, #dc2626, #1e293b)'}}>
        <div style={{background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'}}>
          <div style={{width: '64px', height: '64px', background: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
            <svg style={{width: '32px', height: '32px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 style={{fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px'}}>Cihaz Kilitli</h2>
          <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '16px'}}>Bu uygulama başka bir cihaza kayıtlı. Lütfen yetkili kişi ile iletişime geçin.</p>
          <p style={{color: '#dc2626', fontSize: '12px', fontWeight: '600'}}>Hata Kodu: DEVICE_MISMATCH</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
        <Route path="/*" element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
