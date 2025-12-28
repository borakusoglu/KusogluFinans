import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';

export default function Mesajlar({ user }) {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState({
    to: [],
    subject: '',
    body: ''
  });

  useEffect(() => {
    loadMessages();
    loadUsers();
    firestore.deleteOldTrashMessages();
  }, [activeFolder]);

  const loadMessages = async () => {
    setLoading(true);
    setMessages([]);
    if (activeFolder === 'trash') {
      const trashMsgs = await firestore.getTrashMessages(user.uid);
      setMessages(trashMsgs);
    } else {
      const allMessages = await firestore.getMessages(user.uid);
      setMessages(allMessages);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const allUsers = await firestore.getUsers();
    const filteredUsers = allUsers.filter(u => u.uid !== user.uid && u.role !== 'superadmin');
    console.log('All users:', allUsers);
    console.log('Filtered users for selection:', filteredUsers);
    setUsers(filteredUsers);
  };

  const handleSendMessage = async () => {
    if (newMessage.to.length === 0 || !newMessage.subject || !newMessage.body) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const recipients = newMessage.to.map(uid => {
        const u = users.find(user => user.uid === uid);
        return { uid, username: u?.username || 'Bilinmeyen' };
      });
      
      const promises = newMessage.to.map(recipientId => {
        const messageData = {
          from: user.uid,
          fromUsername: user.username,
          to: recipientId,
          recipients,
          subject: newMessage.subject,
          body: newMessage.body,
          timestamp,
          read: false
        };
        return firestore.sendMessage(messageData);
      });
      
      await Promise.all(promises);
      setNewMessage({ to: [], subject: '', body: '' });
      setShowCompose(false);
      await loadMessages();
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
    }
  };

  const handleDeleteSelected = async () => {
    console.log('Deleting messages:', selectedMessages);
    for (const messageId of selectedMessages) {
      await firestore.moveToTrash(messageId);
    }
    setSelectedMessages([]);
    setSelectedMessage(null);
    await loadMessages();
    console.log('Messages moved to trash');
  };

  const toggleSelectAll = () => {
    if (selectedMessages.length === filteredMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map(m => m.id));
    }
  };

  const toggleSelectMessage = (messageId) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(selectedMessages.filter(id => id !== messageId));
    } else {
      setSelectedMessages([...selectedMessages, messageId]);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    await firestore.moveToTrash(messageId);
    setSelectedMessage(null);
    await loadMessages();
  };

  const handleStarMessage = async (messageId, currentStarred) => {
    await firestore.updateDocument('messages', messageId, { starred: !currentStarred });
    await loadMessages();
  };

  const handleMarkAsRead = async (messageId) => {
    await firestore.markMessageAsRead(messageId);
    loadMessages();
  };

  const getFilteredMessages = () => {
    let filtered = messages;
    
    if (activeFolder === 'inbox') {
      filtered = messages.filter(m => m.to === user.uid);
      console.log('Inbox messages:', filtered);
    } else if (activeFolder === 'sent') {
      filtered = messages.filter(m => m.from === user.uid);
      console.log('Sent messages:', filtered);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.fromUsername && m.fromUsername.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const filteredMessages = getFilteredMessages();
  const unreadCount = messages.filter(m => m.to === user.uid && !m.read && m.deleted !== true).length;

  return (
    <div style={{height: '100%', display: 'flex', background: '#f5f5f5', maxWidth: '1200px', margin: '0 auto'}}>
      {/* Sol Sidebar */}
      <div style={{width: '240px', background: 'white', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', padding: '16px'}}>
        <button
          onClick={() => setShowCompose(true)}
          style={{
            padding: '12px 24px',
            background: '#c2e7ff',
            color: '#001d35',
            borderRadius: '24px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Oluştur
        </button>

        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
          <button
            onClick={() => {
              setActiveFolder('inbox');
              setSelectedMessage(null);
              setSelectedMessages([]);
            }}
            style={{
              padding: '8px 16px',
              background: activeFolder === 'inbox' ? '#d3e3fd' : 'transparent',
              border: 'none',
              borderRadius: '0 24px 24px 0',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: activeFolder === 'inbox' ? 600 : 400,
              color: '#202124'
            }}
          >
            <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Gelen Kutusu
            {unreadCount > 0 && (
              <span style={{marginLeft: 'auto', fontWeight: 700, color: '#202124'}}>{unreadCount}</span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveFolder('sent');
              setSelectedMessage(null);
              setSelectedMessages([]);
            }}
            style={{
              padding: '8px 16px',
              background: activeFolder === 'sent' ? '#d3e3fd' : 'transparent',
              border: 'none',
              borderRadius: '0 24px 24px 0',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: activeFolder === 'sent' ? 600 : 400,
              color: '#202124'
            }}
          >
            <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Gönderilenler
          </button>

          <button
            onClick={async () => {
              setActiveFolder('trash');
              setSelectedMessage(null);
              setSelectedMessages([]);
            }}
            style={{
              padding: '8px 16px',
              background: activeFolder === 'trash' ? '#d3e3fd' : 'transparent',
              border: 'none',
              borderRadius: '0 24px 24px 0',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: activeFolder === 'trash' ? 600 : 400,
              color: '#202124'
            }}
          >
            <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Çöp Kutusu
          </button>
        </div>
      </div>

      {/* Ana İçerik */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
        {/* Arama Çubuğu */}
        <div style={{background: 'white', padding: '8px 16px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '16px'}}>
          <div style={{position: 'relative', flex: 1, maxWidth: '720px'}}>
            <svg style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#5f6368'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Postalarda arayın"
              style={{
                width: '100%',
                padding: '10px 12px 10px 44px',
                background: '#f1f3f4',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          {!selectedMessage && (
            <>
              <button
                onClick={toggleSelectAll}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#5f6368',
                  whiteSpace: 'nowrap'
                }}
              >
                {selectedMessages.length === filteredMessages.length && filteredMessages.length > 0 ? 'Seçimi Kaldır' : 'Hepsini Seç'}
              </button>
              {selectedMessages.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  style={{
                    padding: '8px 16px',
                    background: '#ea4335',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'white',
                    fontWeight: 500,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Seçilenleri Sil ({selectedMessages.length})
                </button>
              )}
            </>
          )}
        </div>

        {/* Mesaj Listesi veya Detay */}
        <div style={{flex: 1, overflowY: 'auto', background: 'white'}}>
          {selectedMessage ? (
            // Mesaj Detayı
            <div style={{padding: '24px'}}>
              <div style={{marginBottom: '16px'}}>
                <button
                  onClick={() => setSelectedMessage(null)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#5f6368',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Geri
                </button>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0'}}>
                <div style={{flex: 1}}>
                  <h2 style={{fontSize: '24px', fontWeight: 400, color: '#202124', margin: '0 0 12px 0'}}>{selectedMessage.subject}</h2>
                  <div style={{fontSize: '14px', color: '#5f6368', marginBottom: '4px'}}>
                    Kimden: {selectedMessage.fromUsername}
                  </div>
                  {selectedMessage.recipients && selectedMessage.recipients.length > 0 && (
                    <div style={{fontSize: '13px', color: '#5f6368', marginBottom: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center'}}>
                      <span>Kime:</span>
                      {selectedMessage.recipients.map((r, i) => (
                        <span key={i} style={{background: '#e8f0fe', color: '#1967d2', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'}}>
                          {r.username}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{fontSize: '12px', color: '#5f6368'}}>
                    {new Date(selectedMessage.timestamp).toLocaleString('tr-TR')}
                  </div>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button
                    onClick={() => handleStarMessage(selectedMessage.id, selectedMessage.starred)}
                    style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px'}}
                    title={selectedMessage.starred ? 'Yıldızı Kaldır' : 'Yıldızla'}
                  >
                    <svg style={{width: '24px', height: '24px', color: selectedMessage.starred ? '#f4b400' : '#5f6368'}} fill={selectedMessage.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                    style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px'}}
                    title="Sil"
                  >
                    <svg style={{width: '24px', height: '24px', color: '#5f6368'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div style={{fontSize: '14px', color: '#202124', lineHeight: '1.8', whiteSpace: 'pre-wrap'}}>
                {selectedMessage.body}
              </div>
            </div>
          ) : loading ? (
            <div style={{padding: '48px', textAlign: 'center', color: '#5f6368'}}>
              <p>Yükleniyor...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div style={{padding: '48px', textAlign: 'center', color: '#5f6368'}}>
              <p>Mesaj bulunamadı</p>
            </div>
          ) : (
            filteredMessages.map(message => (
              <div
                key={message.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  background: message.starred ? '#fffbeb' : (message.read || message.from === user.uid ? 'white' : '#f0f0f0'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'box-shadow 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'inset 1px 0 0 #dadce0, inset -1px 0 0 #dadce0, 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <input
                  type="checkbox"
                  checked={selectedMessages.includes(message.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectMessage(message.id);
                  }}
                  onChange={() => {}}
                  style={{cursor: 'pointer', width: '18px', height: '18px'}}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStarMessage(message.id, message.starred);
                  }}
                  style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px'}}
                >
                  <svg style={{width: '20px', height: '20px', color: message.starred ? '#f4b400' : '#5f6368'}} fill={message.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
                <div
                  onClick={() => {
                    setSelectedMessage(message);
                    if (!message.read && message.to === user.uid) {
                      handleMarkAsRead(message.id);
                    }
                  }}
                  style={{display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0}}
                >
                  <div style={{width: '200px', fontWeight: message.read || message.from === user.uid ? 400 : 700, fontSize: '15px', color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {message.from === user.uid ? message.toUsername : message.fromUsername}
                  </div>
                  <div style={{flex: 1, display: 'flex', gap: '8px', overflow: 'hidden'}}>
                    <span style={{fontWeight: message.read || message.from === user.uid ? 400 : 700, fontSize: '15px', color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{message.subject}</span>
                  </div>
                  <div style={{fontSize: '13px', color: '#5f6368', whiteSpace: 'nowrap'}}>
                    {new Date(message.timestamp).toLocaleDateString('tr-TR', {day: 'numeric', month: 'short'})}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <button
          onClick={() => setShowCompose(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '16px',
            background: '#1a73e8',
            color: 'white',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            zIndex: 50,
            display: showCompose ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Yeni Mesaj Modal */}
      {showCompose && (
        <div style={{position: 'fixed', bottom: '24px', right: '24px', width: '500px', background: 'white', borderRadius: '8px', boxShadow: '0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.2)', zIndex: 100}}>
          <div style={{padding: '12px 16px', background: '#404040', color: 'white', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontSize: '14px', fontWeight: 500}}>Yeni Mesaj</span>
            <button
              onClick={() => setShowCompose(false)}
              style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px'}}
            >
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div style={{borderBottom: '1px solid #e0e0e0', paddingBottom: '8px'}}>
              <div style={{fontSize: '12px', color: '#5f6368', marginBottom: '8px'}}>Kime</div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px'}}>
                {newMessage.to.map(uid => {
                  const selectedUser = users.find(u => u.uid === uid);
                  return (
                    <span key={uid} style={{background: '#e8f0fe', color: '#1967d2', padding: '4px 8px', borderRadius: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                      {selectedUser?.username}
                      <button onClick={() => setNewMessage({...newMessage, to: newMessage.to.filter(id => id !== uid)})} style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', color: '#1967d2', fontSize: '16px', lineHeight: '1'}}>×</button>
                    </span>
                  );
                })}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !newMessage.to.includes(e.target.value)) {
                    setNewMessage({...newMessage, to: [...newMessage.to, e.target.value]});
                  }
                }}
                style={{padding: '8px', border: 'none', fontSize: '14px', outline: 'none', width: '100%', cursor: 'pointer'}}
              >
                <option value="">Alıcı ekle...</option>
                {users.filter(u => !newMessage.to.includes(u.uid)).map(u => (
                  <option key={u.uid} value={u.uid}>{u.username}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={newMessage.subject}
              onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
              placeholder="Konu"
              style={{padding: '8px', border: 'none', borderBottom: '1px solid #e0e0e0', fontSize: '14px', outline: 'none'}}
            />

            <textarea
              value={newMessage.body}
              onChange={(e) => setNewMessage({...newMessage, body: e.target.value})}
              placeholder="Mesajınızı yazın..."
              style={{padding: '8px', border: 'none', fontSize: '14px', resize: 'none', height: '200px', outline: 'none'}}
            />

            <button
              onClick={handleSendMessage}
              style={{
                padding: '10px 24px',
                background: '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                alignSelf: 'flex-start'
              }}
            >
              Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
