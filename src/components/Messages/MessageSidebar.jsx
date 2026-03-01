export default function MessageSidebar({ activeFolder, setActiveFolder, unreadCount, setShowCompose, setSelectedMessage, setSelectedMessages }) {
  return (
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
        {[
          { id: 'inbox', label: 'Gelen Kutusu', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', count: unreadCount },
          { id: 'sent', label: 'Gönderilenler', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
          { id: 'starred', label: 'Yıldızlı', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', starred: true },
          { id: 'trash', label: 'Çöp Kutusu', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }
        ].map(folder => (
          <button
            key={folder.id}
            onClick={() => {
              setActiveFolder(folder.id);
              setSelectedMessage(null);
              setSelectedMessages([]);
            }}
            style={{
              padding: '8px 16px',
              background: activeFolder === folder.id ? '#d3e3fd' : 'transparent',
              border: 'none',
              borderRadius: '0 24px 24px 0',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: activeFolder === folder.id ? 600 : 400,
              color: '#202124'
            }}
          >
            <svg style={{width: '20px', height: '20px'}} fill={folder.starred && activeFolder === folder.id ? '#f4b400' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={folder.icon} />
            </svg>
            {folder.label}
            {folder.count > 0 && (
              <span style={{marginLeft: 'auto', fontWeight: 700, color: '#202124'}}>{folder.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
