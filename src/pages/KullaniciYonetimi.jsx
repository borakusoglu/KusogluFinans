import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export default function KullaniciYonetimi() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('calisan');
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'users'), { username, password, role });
    setUsername('');
    setPassword('');
    setRole('calisan');
    loadUsers();
  };

  const handleDelete = async (id, username) => {
    if (username === 'bora') {
      alert('Bora kullanıcısı silinemez!');
      return;
    }
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      await deleteDoc(doc(db, 'users', id));
      loadUsers();
    }
  };

  const handleRoleChange = async (id, newRole) => {
    await updateDoc(doc(db, 'users', id), { role: newRole });
    loadUsers();
  };

  return (
    <div style={{padding: '32px', background: 'linear-gradient(to bottom right, #f8fafc, #dbeafe)', height: '100%', overflowY: 'auto'}}>
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        <h1 style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '32px'}}>
          <svg style={{width: '40px', height: '40px', color: '#db2777'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Kullanıcı Yönetimi
        </h1>

        <div style={{background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px'}}>
          <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px'}}>Yeni Kullanıcı Ekle</h2>
          <form onSubmit={handleAdd} style={{display: 'flex', gap: '16px'}}>
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{flex: 1, padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px'}}
              required
            />
            <input
              type="text"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{flex: 1, padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px'}}
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px'}}
            >
              <option value="gozlemci">Gözlemci</option>
              <option value="calisan">Çalışan</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              style={{padding: '8px 24px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer'}}
            >
              Ekle
            </button>
          </form>
        </div>

        <div style={{background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '24px'}}>
          <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px'}}>Kullanıcılar</h2>
          <table style={{width: '100%'}}>
            <thead style={{background: '#f9fafb'}}>
              <tr>
                <th style={{padding: '12px 16px', textAlign: 'left'}}>Kullanıcı Adı</th>
                <th style={{padding: '12px 16px', textAlign: 'left'}}>Şifre</th>
                <th style={{padding: '12px 16px', textAlign: 'left'}}>Rol</th>
                <th style={{padding: '12px 16px', textAlign: 'right'}}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(user => user.username !== 'bora').map(user => (
                <tr key={user.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                  <td style={{padding: '12px 16px', fontWeight: 600}}>{user.username}</td>
                  <td style={{padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span>{visiblePasswords[user.id] ? user.password : '*'.repeat(user.password?.length || 8)}</span>
                    <button
                      onClick={() => setVisiblePasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                      style={{padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280'}}
                      title={visiblePasswords[user.id] ? 'Şifre Gizle' : 'Şifre Göster'}
                    >
                      {visiblePasswords[user.id] ? (
                        <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td style={{padding: '12px 16px'}}>
                    <select
                      value={user.role || 'calisan'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.username === 'bora'}
                      style={{padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: user.username === 'bora' ? 'not-allowed' : 'pointer', opacity: user.username === 'bora' ? 0.7 : 1}}
                    >
                      <option value="gozlemci">Gözlemci</option>
                      <option value="calisan">Çalışan</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={{padding: '12px 16px', textAlign: 'right'}}>
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={user.username === 'bora'}
                      style={{padding: '8px 16px', background: user.username === 'bora' ? '#9ca3af' : '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: user.username === 'bora' ? 'not-allowed' : 'pointer', opacity: user.username === 'bora' ? 0.5 : 1}}
                    >
                      {user.username === 'bora' ? 'Korumalı' : 'Sil'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
