export default function MessageList({ filteredMessages, loading, selectedMessages, toggleSelectMessage, handleStarMessage, setSelectedMessage, handleMarkAsRead, user }) {
  if (loading) {
    return (
      <div style={{padding: '48px', textAlign: 'center', color: '#5f6368'}}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div style={{padding: '48px', textAlign: 'center', color: '#5f6368'}}>
        <p>Mesaj bulunamadı</p>
      </div>
    );
  }

  return (
    <>
      {filteredMessages.map(message => (
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
      ))}
    </>
  );
}
