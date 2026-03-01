// Basit XOR şifreleme
const SECRET_KEY = 'KusogluFinans2026SecretKey';

const encrypt = (data) => {
  const str = JSON.stringify(data);
  let encrypted = '';
  for (let i = 0; i < str.length; i++) {
    encrypted += String.fromCharCode(str.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
  }
  return btoa(encrypted);
};

const decrypt = (encrypted) => {
  try {
    const str = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < str.length; i++) {
      decrypted += String.fromCharCode(str.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
};

export const setCache = (key, data) => {
  const encrypted = encrypt(data);
  localStorage.setItem(`cache_${key}`, encrypted);
  localStorage.setItem(`cache_${key}_time`, Date.now().toString());
};

export const getCache = (key, maxAge = 3600000) => {
  const encrypted = localStorage.getItem(`cache_${key}`);
  const time = localStorage.getItem(`cache_${key}_time`);
  
  if (!encrypted || !time) return null;
  
  const age = Date.now() - parseInt(time);
  if (age > maxAge) {
    clearCache(key);
    return null;
  }
  
  return decrypt(encrypted);
};

export const clearCache = (key) => {
  localStorage.removeItem(`cache_${key}`);
  localStorage.removeItem(`cache_${key}_time`);
};

export const clearAllCache = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('cache_')) {
      localStorage.removeItem(key);
    }
  });
};
