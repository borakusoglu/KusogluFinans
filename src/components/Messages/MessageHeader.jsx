export default function MessageHeader({ 
  searchTerm, 
  setSearchTerm, 
  selectedMessage,
  selectedMessages,
  filteredMessages,
  toggleSelectAll,
  handleDeleteSelected
}) {
  return (
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
          style={{width: '100%', padding: '10px 12px 10px 44px', background: '#f1f3f4', border: 'none', borderRadius: '8px', fontSize: '14px', outline: 'none'}}
        />
      </div>
      {!selectedMessage && (
        <>
          <button 
            onClick={toggleSelectAll} 
            style={{padding: '8px 16px', background: 'transparent', border: '1px solid #dadce0', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: '#5f6368', whiteSpace: 'nowrap'}}
          >
            {selectedMessages.length === filteredMessages.length && filteredMessages.length > 0 ? 'Seçimi Kaldır' : 'Hepsini Seç'}
          </button>
          {selectedMessages.length > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              style={{padding: '8px 16px', background: '#ea4335', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: 'white', fontWeight: 500, whiteSpace: 'nowrap'}}
            >
              Seçilenleri Sil ({selectedMessages.length})
            </button>
          )}
        </>
      )}
    </div>
  );
}
