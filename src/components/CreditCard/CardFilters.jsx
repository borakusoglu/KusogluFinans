export default function CardFilters({ 
  searchTerm, 
  setSearchTerm, 
  selectedBank, 
  setSelectedBank, 
  selectedCardCategory,
  setSelectedCardCategory,
  availableBanks, 
  viewMode, 
  handleViewModeChange 
}) {
  return (
    <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', minWidth: '1000px'}}>
      <div style={{width: '400px'}}>
        <div style={{position: 'relative'}}>
          <svg style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Kart ara (isim veya kod)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{width: '100%', paddingLeft: '40px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', border: '1px solid #d1d5db', borderRadius: '8px'}}
          />
        </div>
      </div>
      <div style={{width: '256px'}}>
        <select
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
          style={{width: '100%', padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px'}}
        >
          <option value="">Tüm Bankalar</option>
          {availableBanks.map(bank => (
            <option key={bank} value={bank}>{bank}</option>
          ))}
        </select>
      </div>
      <div style={{width: '192px'}}>
        <select
          value={selectedCardCategory}
          onChange={(e) => setSelectedCardCategory(e.target.value)}
          style={{width: '100%', padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px'}}
        >
          <option value="">Tüm Kartlar</option>
          <option value="bireysel">Bireysel</option>
          <option value="sirket">Şirket</option>
        </select>
      </div>
      <div style={{display: 'flex', gap: '8px', borderLeft: '1px solid #e5e7eb', paddingLeft: '16px'}}>
        <button
          onClick={() => handleViewModeChange('large')}
          style={{padding: '8px', borderRadius: '8px', transition: 'all 0.2s', background: viewMode === 'large' ? '#3b82f6' : '#f3f4f6', color: viewMode === 'large' ? 'white' : '#4b5563', border: 'none', cursor: 'pointer'}}
          title="Büyük Görünüm"
        >
          <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
          </svg>
        </button>
        <button
          onClick={() => handleViewModeChange('medium')}
          style={{padding: '8px', borderRadius: '8px', transition: 'all 0.2s', background: viewMode === 'medium' ? '#3b82f6' : '#f3f4f6', color: viewMode === 'medium' ? 'white' : '#4b5563', border: 'none', cursor: 'pointer'}}
          title="Orta Görünüm"
        >
          <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/>
            <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2"/>
          </svg>
        </button>
        <button
          onClick={() => handleViewModeChange('detail')}
          style={{padding: '8px', borderRadius: '8px', transition: 'all 0.2s', background: viewMode === 'detail' ? '#3b82f6' : '#f3f4f6', color: viewMode === 'detail' ? 'white' : '#4b5563', border: 'none', cursor: 'pointer'}}
          title="Detaylı Liste"
        >
          <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
