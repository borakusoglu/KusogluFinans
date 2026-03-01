import { useState, useEffect } from 'react';
import onlineStatus from '../utils/onlineStatus';
import * as firestore from '../firebase/firestore';

export default function OnlineUsers({ embedded = false }) {
  const [users, setUsers] = useState([]);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const registered = await firestore.getUsers();
      setAllRegisteredUsers(registered);
    };
    loadUsers();

    const unsubscribe = onlineStatus.listenOnlineUsers((onlineUsers) => {
      setUsers(onlineUsers);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleUserClick = async (user) => {
    setSelectedUser(user);
    setLoadingLogs(true);
    const logs = await firestore.getLogs();
    const filteredLogs = logs.filter(log => log.username === user.username);
    setUserLogs(filteredLogs);
    setLoadingLogs(false);
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Bilinmiyor';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    return `${days} gün önce`;
  };

  const mergedUsers = allRegisteredUsers.map(registered => {
    const onlineData = users.find(u => u.userId === registered.uid);
    return {
      userId: registered.uid,
      username: registered.username,
      online: onlineData?.online || false,
      lastSeen: onlineData?.lastSeen || null
    };
  });

  const onlineUsers = mergedUsers.filter(u => u.online);
  const offlineUsers = mergedUsers.filter(u => !u.online);

  return (
    <div style={{padding: '24px', maxWidth: '1200px', margin: '0 auto'}}>
      <div style={{background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'}}>
          <svg style={{width: '32px', height: '32px', color: '#10b981'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <div>
            <h2 style={{fontSize: '24px', fontWeight: 'bold', color: '#1f2937'}}>Online Kullanıcılar</h2>
            <p style={{fontSize: '14px', color: '#6b7280'}}>{onlineUsers.length} aktif kullanıcı</p>
          </div>
        </div>

        {onlineUsers.length > 0 && (
          <div style={{marginBottom: '32px'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#059669', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <div style={{width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite'}}></div>
              Çevrimiçi
            </h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px'}}>
              {onlineUsers.map((user) => (
                <div 
                  key={user.userId} 
                  onClick={() => handleUserClick(user)}
                  style={{background: 'linear-gradient(to bottom right, #d1fae5, #a7f3d0)', borderRadius: '12px', padding: '16px', border: '2px solid #10b981', cursor: 'pointer', transition: 'transform 0.2s'}}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{position: 'relative'}}>
                      <div style={{width: '48px', height: '48px', background: 'linear-gradient(to bottom right, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px'}}>
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{position: 'absolute', bottom: '0', right: '0', width: '14px', height: '14px', background: '#10b981', border: '2px solid white', borderRadius: '50%'}}></div>
                    </div>
                    <div style={{flex: 1}}>
                      <p style={{fontWeight: '600', color: '#065f46', fontSize: '16px'}}>{user.username}</p>
                      <p style={{fontSize: '12px', color: '#047857'}}>{formatLastSeen(user.lastSeen)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {offlineUsers.length > 0 && (
          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#6b7280', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <div style={{width: '8px', height: '8px', background: '#9ca3af', borderRadius: '50%'}}></div>
              Çevrimdışı
            </h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px'}}>
              {offlineUsers.map((user) => (
                <div 
                  key={user.userId} 
                  onClick={() => handleUserClick(user)}
                  style={{background: '#f9fafb', borderRadius: '12px', padding: '16px', border: '2px solid #e5e7eb', cursor: 'pointer', transition: 'transform 0.2s'}}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{position: 'relative'}}>
                      <div style={{width: '48px', height: '48px', background: 'linear-gradient(to bottom right, #9ca3af, #6b7280)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px'}}>
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{position: 'absolute', bottom: '0', right: '0', width: '14px', height: '14px', background: '#9ca3af', border: '2px solid white', borderRadius: '50%'}}></div>
                    </div>
                    <div style={{flex: 1}}>
                      <p style={{fontWeight: '600', color: '#374151', fontSize: '16px'}}>{user.username}</p>
                      <p style={{fontSize: '12px', color: '#6b7280'}}>{formatLastSeen(user.lastSeen)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mergedUsers.length === 0 && (
          <div style={{textAlign: 'center', padding: '48px', color: '#9ca3af'}}>
            <svg style={{width: '64px', height: '64px', margin: '0 auto 16px', opacity: 0.5}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p style={{fontSize: '16px', fontWeight: '500'}}>Henüz kullanıcı yok</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {selectedUser && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50}} onClick={() => setSelectedUser(null)}>
          <div style={{background: 'white', borderRadius: '16px', width: '90%', maxWidth: '900px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'}} onClick={(e) => e.stopPropagation()}>
            <div style={{padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '48px', height: '48px', background: selectedUser.online ? 'linear-gradient(to bottom right, #10b981, #059669)' : 'linear-gradient(to bottom right, #9ca3af, #6b7280)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px'}}>
                  {selectedUser.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{fontSize: '20px', fontWeight: 'bold', color: 'white'}}>{selectedUser.username}</h3>
                  <p style={{fontSize: '14px', color: 'rgba(255,255,255,0.8)'}}>{selectedUser.online ? 'Çevrimiçi' : 'Çevrimdışı'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white'}}>
                <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{padding: '24px', flex: 1, overflowY: 'auto'}}>
              <h4 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px'}}>Kullanıcı Aktiviteleri</h4>
              {loadingLogs ? (
                <div style={{textAlign: 'center', padding: '48px', color: '#9ca3af'}}>
                  <div style={{width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite'}}></div>
                  <p>Loglar yükleniyor...</p>
                </div>
              ) : userLogs.length === 0 ? (
                <div style={{textAlign: 'center', padding: '48px', color: '#9ca3af'}}>
                  <svg style={{width: '64px', height: '64px', margin: '0 auto 16px', opacity: 0.5}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p style={{fontSize: '16px', fontWeight: '500'}}>Henüz aktivite yok</p>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {userLogs.map((log, index) => (
                    <div key={index} style={{background: '#f9fafb', borderRadius: '8px', padding: '16px', border: '1px solid #e5e7eb'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px'}}>
                        <span style={{fontSize: '14px', fontWeight: '600', color: '#1f2937'}}>{log.action}</span>
                        <span style={{fontSize: '12px', color: '#6b7280'}}>{log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString('tr-TR') : new Date(log.timestamp).toLocaleString('tr-TR')}</span>
                      </div>
                      {log.details && (
                        <p style={{fontSize: '13px', color: '#6b7280', margin: 0}}>{log.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
