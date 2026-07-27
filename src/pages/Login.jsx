import { useState, useEffect } from 'react';
import { loginUser } from '../firebase/auth';
import * as firestore from '../firebase/firestore';
import logo from '../assets/kusoglu-logo.png';
import { APP_VERSION } from '../config/version';
import VersionChecker from '../components/VersionChecker';
import CaptchaModal from '../components/CaptchaModal';
import Register from './Register';

export default function Login({ setUser }) {
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [blockTime, setBlockTime] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.showCaptchaModal = (resolve) => {
      setShowCaptcha(true);
      window.captchaResolve = resolve;
    };
  }, []);

  const getDeviceFingerprint = async () => {
    let deviceId = 'UNKNOWN';
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      deviceId = await invoke('get_hardware_id');
    } catch {
      deviceId = localStorage.getItem('deviceId') || 'WEB-' + Date.now().toString(16).toUpperCase();
      localStorage.setItem('deviceId', deviceId);
    }
    
    let ip = 'Bilinmiyor';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      ip = ipData.ip;
    } catch {
      // IP alınamadı
    }
    
    return `${deviceId} | IP: ${ip}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const result = await loginUser(username, password, keepLoggedIn);
      if (result.success) {
        const deviceInfo = await getDeviceFingerprint();
        await firestore.addLog(result.user.username, 'Giriş Yapıldı', deviceInfo);
        setUser(result.user);
      } else {
        setError(result.error);
        if (result.blockedUntil) {
          setBlockTime(result.blockedUntil);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!blockTime) return;
    const timer = setInterval(() => {
      const remaining = Math.ceil((blockTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setBlockTime(null);
        setError('');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [blockTime]);

  if (showRegister) {
    return <Register onBackToLogin={() => setShowRegister(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiAzNGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTM2IDM0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
      
      <div className="relative bg-white/95 backdrop-blur-xl p-6 pb-5 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="text-center">
          <div className="flex justify-center">
            <img 
              src={logo}
              alt="Kuşoğlu Logo" 
              className="h-28 max-w-full w-auto object-contain"
            />
          </div>
          <div className="flex justify-center">
            <svg width="200" height="6" style={{display: 'block'}}>
              <defs>
                <linearGradient id="loginLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" stopOpacity="0" />
                  <stop offset="50%" stopColor="#374151" stopOpacity="1" />
                  <stop offset="100%" stopColor="#374151" stopOpacity="0" />
                </linearGradient>
              </defs>
              <ellipse cx="100" cy="3" rx="100" ry="1.5" fill="url(#loginLineGradient)" opacity="0.8" />
            </svg>
          </div>
          <h1 className="text-3xl bg-gradient-to-br from-emerald-600 from-45% via-white via-50% to-emerald-600 to-55% bg-clip-text text-transparent animate-shimmer" style={{marginBottom: '16px', fontFamily: '"Sansita Swashed", system-ui', fontWeight: 400, fontOpticalSizing: 'auto', letterSpacing: '-0.01em', backgroundSize: '800% 800%', backgroundImage: 'linear-gradient(60deg, #059669 47%, #ffffff 50%, #059669 53%)'}}>Finans</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-3" aria-busy={isSubmitting}>
          <div>
            <label htmlFor="login-username" className="block text-sm font-semibold text-gray-700 mb-1.5">Kullanıcı Adı</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="Kullanıcı adınızı girin"
              autoComplete="username"
              aria-describedby={error ? 'login-error' : undefined}
              required
            />
          </div>
          
          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-1.5">Şifre</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="Şifrenizi girin"
              autoComplete="current-password"
              aria-describedby={error ? 'login-error' : undefined}
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="keepLoggedIn"
              checked={keepLoggedIn}
              onChange={(e) => setKeepLoggedIn(e.target.checked)}
              className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
            />
            <label htmlFor="keepLoggedIn" className="ml-2 text-sm text-gray-700 cursor-pointer">
              Beni hatırla
            </label>
          </div>

          {error && (
            <div id="login-error" role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
              {blockTime && (
                <div className="mt-2 font-semibold">
                  Kalan süre: {Math.ceil((blockTime - Date.now()) / 1000)} saniye
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="w-full text-gray-600 py-1 text-sm hover:text-gray-800 transition-colors"
          >
            Hesabınız yok mu? Üye olun
          </button>

          <p className="text-center text-xs text-gray-500 mt-1">v{APP_VERSION}</p>
        </form>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          45% { background-position: 100% 100%; }
          100% { background-position: 100% 100%; }
        }
        .animate-shimmer {
          animation: shimmer 7s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-shimmer {
            animation: none;
          }
        }
      `}</style>
      <VersionChecker />
      {showCaptcha && (
        <CaptchaModal
          onVerify={(result) => {
            setShowCaptcha(false);
            if (window.captchaResolve) {
              window.captchaResolve(result);
            }
          }}
          onClose={() => {
            setShowCaptcha(false);
            if (window.captchaResolve) {
              window.captchaResolve(false);
            }
          }}
        />
      )}
    </div>
  );
}
