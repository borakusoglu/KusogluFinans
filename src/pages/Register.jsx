import { useState } from 'react';
import { registerUser } from '../firebase/auth';
import logo from '../assets/kusoglu-logo.png';

export default function Register({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await registerUser(email, username, password);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiAzNGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTM2IDM0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
        
        <div className="relative bg-white/95 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 text-center">
          <div className="mb-6">
            <svg className="w-20 h-20 mx-auto text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Kayıt Başarılı!</h1>
          <p className="text-gray-600 mb-6">
            Kaydınız alındı. Admin onayından sonra giriş yapabileceksiniz.
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-semibold"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiAzNGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTM2IDM0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
      
      <div className="relative bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="text-center">
          <div className="flex justify-center">
            <img 
              src={logo}
              alt="Kuşoğlu Logo" 
              className="h-20 max-w-full w-auto object-contain"
            />
          </div>
          <div className="flex justify-center">
            <svg width="200" height="6" style={{display: 'block'}}>
              <defs>
                <linearGradient id="registerLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" stopOpacity="0" />
                  <stop offset="50%" stopColor="#374151" stopOpacity="1" />
                  <stop offset="100%" stopColor="#374151" stopOpacity="0" />
                </linearGradient>
              </defs>
              <ellipse cx="100" cy="3" rx="100" ry="1.5" fill="url(#registerLineGradient)" opacity="0.8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Üye Ol</h1>
          <p className="text-sm text-gray-600 mb-2">Admin onayından sonra giriş yapabileceksiniz</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-2.5" aria-busy={isSubmitting}>
          <div>
            <label htmlFor="register-email" className="block text-sm font-semibold text-gray-700 mb-1">E-posta</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="ornek@email.com"
              autoComplete="email"
              aria-describedby={error ? 'register-error' : undefined}
              required
            />
          </div>

          <div>
            <label htmlFor="register-username" className="block text-sm font-semibold text-gray-700 mb-1">Kullanıcı Adı</label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="Kullanıcı adınız"
              autoComplete="username"
              aria-describedby={error ? 'register-error' : undefined}
              required
            />
          </div>
          
          <div>
            <label htmlFor="register-password" className="block text-sm font-semibold text-gray-700 mb-1">Şifre</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="En az 6 karakter"
              autoComplete="new-password"
              minLength={6}
              aria-describedby={error ? 'register-error' : undefined}
              required
            />
          </div>

          <div>
            <label htmlFor="register-password-confirmation" className="block text-sm font-semibold text-gray-700 mb-1">Şifre Tekrar</label>
            <input
              id="register-password-confirmation"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              placeholder="Şifrenizi tekrar girin"
              autoComplete="new-password"
              minLength={6}
              aria-describedby={error ? 'register-error' : undefined}
              required
            />
          </div>

          {error && (
            <div id="register-error" role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-gray-600 py-1 text-sm hover:text-gray-800 transition-colors"
          >
            Zaten hesabınız var mı? Giriş yapın
          </button>
        </form>
      </div>
    </div>
  );
}
