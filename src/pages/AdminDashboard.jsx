import { useState, useEffect } from 'react';
import { getUsers } from '../firebase/auth';
import { getLogs, createBackup, restoreBackup } from '../firebase/firestore';
import { db } from '../firebase/config';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);

  const canEdit = user.role === 'superadmin' || user.role === 'admin' || user.role === 'editor';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, logsData] = await Promise.all([
        getUsers(),
        getLogs()
      ]);
      setUsers(usersData);
      setLogs(logsData);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    }
    setLoading(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role
        });
        setEditingUser(null);
      } else {
        await addDoc(collection(db, 'users'), {
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          approved: true,
          createdAt: new Date()
        });
      }
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      loadData();
    } catch (error) {
      alert('Kullanıcı işlemi hatası: ' + error.message);
    }
  };

  const handleEditUser = (u) => {
    setEditingUser(u);
    setNewUser({ username: u.username, email: u.email || '', password: u.password, role: u.role });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewUser({ username: '', email: '', password: '', role: 'user' });
  };

  const handleDeleteUser = async (id, username) => {
    if (username === 'bora') {
      console.error('Bora kullanıcısı silinemez!');
      return;
    }
    setUserToDelete({ id, username });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      loadData();
    } catch (error) {
      console.error('Silme hatası:', error);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    await updateDoc(doc(db, 'users', id), { role: newRole });
    loadData();
  };

  const handleApproveUser = async (id, username) => {
    await updateDoc(doc(db, 'users', id), { approved: true });
    await addDoc(collection(db, 'logs'), {
      username: user.username,
      action: 'Kullanıcı Onayladı',
      details: username,
      timestamp: new Date()
    });
    loadData();
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const backup = await createBackup();
      const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filePath = await save({ defaultPath: fileName, filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(backup, null, 2));
        await addDoc(collection(db, 'logs'), { username: user.username, action: 'Yedek Oluşturdu', details: fileName, timestamp: new Date() });
        alert('Yedek başarıyla kaydedildi!');
      }
    } catch (error) {
      alert('Yedek oluşturma hatası: ' + error.message);
    }
    setBackupLoading(false);
  };

  const handleRestore = async () => {
    if (!confirm('Tüm veriler silinip yedekten yüklenecek. Emin misiniz?')) return;
    setBackupLoading(true);
    try {
      const filePath = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (filePath) {
        const content = await readTextFile(filePath);
        const backup = JSON.parse(content);
        await restoreBackup(backup);
        await addDoc(collection(db, 'logs'), { username: user.username, action: 'Yedek Yükledi', details: filePath, timestamp: new Date() });
        alert('Yedek başarıyla yüklendi!');
        loadData();
      }
    } catch (error) {
      alert('Yedek yükleme hatası: ' + error.message);
    }
    setBackupLoading(false);
  };

  const filteredUsers = users.filter(u =>
    u.username !== 'bora' &&
    String(u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter(log =>
    String(log.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(log.action || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role) => {
    const styles = {
      superadmin: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
      editor: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      superadmin: 'Süper Admin',
      admin: 'Admin',
      editor: 'Editör',
      user: 'Kullanıcı'
    };
    return { style: styles[role] || styles.user, label: labels[role] || 'Kullanıcı' };
  };

  const getActionColor = (action) => {
    if (action.includes('Ekledi') || action.includes('Oluşturdu')) return 'text-green-600';
    if (action.includes('Sildi')) return 'text-red-600';
    if (action.includes('Güncelledi')) return 'text-blue-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite'}}></div>
          <p style={{color: '#6b7280'}}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    {showDeleteConfirm && (
      <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)'}}>
        <div style={{backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
          <h3 style={{fontSize: '18px', fontWeight: 600, color: '#1f2937', marginBottom: '12px'}}>Kullanıcıyı Sil</h3>
          <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '20px'}}>
            <strong>{userToDelete?.username}</strong> kullanıcısını silmek istediğinize emin misiniz?
          </p>
          <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
            <button
              onClick={() => { setShowDeleteConfirm(false); setUserToDelete(null); }}
              style={{padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer'}}
            >
              İptal
            </button>
            <button
              onClick={confirmDelete}
              style={{padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 500, cursor: 'pointer'}}
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    )}
    <div style={{height: '100%', background: 'linear-gradient(to bottom right, #f9fafb, #dbeafe)', padding: '32px', overflowY: 'auto'}}>
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px'}}>
          <h1 style={{fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '24px'}}>Admin Dashboard</h1>

          <div className="flex space-x-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Kullanıcılar
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'logs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Loglar
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'backup' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Yedekleme
            </button>
          </div>

          <div className="mb-4">
            <div className="relative" style={{maxWidth: '450px'}}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ara..."
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {activeTab === 'users' && (
            <>
              <div style={{background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '16px'}}>
                <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151'}}>
                  {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
                </h3>
                <form onSubmit={handleAddUser} style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                  <input
                    type="text"
                    placeholder="Kullanıcı Adı"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    style={{flex: '1 1 150px'}}
                    required
                  />
                  <input
                    type="email"
                    placeholder="E-posta"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    style={{flex: '1 1 200px'}}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Şifre"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    style={{flex: '1 1 120px'}}
                    required
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="user">Kullanıcı</option>
                    <option value="editor">Editör</option>
                    <option value="admin">Admin</option>
                    {user.role === 'superadmin' && <option value="superadmin">Süper Admin</option>}
                  </select>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingUser ? 'Güncelle' : 'Ekle'}
                  </button>
                  {editingUser && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      İptal
                    </button>
                  )}
                </form>
              </div>
              <div className="mb-3 text-sm text-gray-600">
                {filteredUsers.length} kullanıcı görüntüleniyor
              </div>
              <div className="overflow-x-auto" style={{maxHeight: '500px', overflowY: 'auto'}}>
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Kullanıcı Adı</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">E-posta</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Şifre</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Durum</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rol</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const roleBadge = getRoleBadge(u.role);
                      return (
                        <tr key={u.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.username}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{u.email || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <span>{visiblePasswords[u.id] ? u.password : '*'.repeat(u.password?.length || 8)}</span>
                              <button
                                onClick={() => setVisiblePasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                style={{padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280'}}
                              >
                                {visiblePasswords[u.id] ? (
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
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {u.approved === false ? (
                              <button
                                onClick={() => handleApproveUser(u.id, u.username)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Onayla
                              </button>
                            ) : (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">Onaylı</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={u.role || 'user'}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={u.username === 'bora' || !canEdit}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                              style={{cursor: (u.username === 'bora' || !canEdit) ? 'not-allowed' : 'pointer', opacity: (u.username === 'bora' || !canEdit) ? 0.7 : 1}}
                            >
                              <option value="user">Kullanıcı</option>
                              <option value="editor">Editör</option>
                              <option value="admin">Admin</option>
                              {user.role === 'superadmin' && <option value="superadmin">Süper Admin</option>}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleEditUser(u)}
                              disabled={u.username === 'bora' || !canEdit}
                              className="px-1.5 py-1 rounded text-xs mr-1"
                              style={{background: (u.username === 'bora' || !canEdit) ? '#9ca3af' : '#2563eb', color: 'white', cursor: (u.username === 'bora' || !canEdit) ? 'not-allowed' : 'pointer', border: 'none'}}
                              title="Düzenle"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={u.username === 'bora' || !canEdit}
                              className="px-1.5 py-1 rounded text-xs"
                              style={{background: (u.username === 'bora' || !canEdit) ? '#9ca3af' : '#dc2626', color: 'white', cursor: (u.username === 'bora' || !canEdit) ? 'not-allowed' : 'pointer', opacity: (u.username === 'bora' || !canEdit) ? 0.5 : 1, border: 'none'}}
                              title={u.username === 'bora' ? 'Korumalı' : (canEdit ? 'Sil' : 'Yetki Yok')}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'logs' && (
            <>
              <div className="mb-3 text-sm text-gray-600">
                {filteredLogs.length} log kaydı görüntüleniyor
              </div>
              <div className="overflow-x-auto" style={{maxHeight: '500px', overflowY: 'auto'}}>
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tarih/Saat</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Kullanıcı</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aksiyon</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Detay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('tr-TR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.username}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.details || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-1">Önemli Uyarı</h3>
                    <p className="text-sm text-yellow-700">Yedek yükleme işlemi mevcut tüm verileri silip yedeği geri yükler. İşlem öncesi mutlaka yeni bir yedek alın!</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-600 rounded-full p-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Yedek Al</h3>
                      <p className="text-sm text-gray-600">Tüm verileri JSON dosyasına kaydet</p>
                    </div>
                  </div>
                  <button
                    onClick={handleBackup}
                    disabled={backupLoading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2"
                  >
                    {backupLoading ? 'İşleniyor...' : 'Yedek Oluştur'}
                  </button>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-600 rounded-full p-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Yedek Yükle</h3>
                      <p className="text-sm text-gray-600">JSON dosyasından verileri geri yükle</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRestore}
                    disabled={backupLoading}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2"
                  >
                    {backupLoading ? 'İşleniyor...' : 'Yedek Yükle'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Yedekleme Hakkında
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Sadece kritik veriler yedeklenir: Ödemeler, Kredi Kartları, Banka Hesapları, Kategoriler, Cariler, Hatırlatmalar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Yedek dosyaları JSON formatında kaydedilir</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Düzenli yedek almayı unutmayın (haftalık önerilir)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Yedek dosyalarını güvenli bir yerde saklayın (USB, cloud vb.)</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
