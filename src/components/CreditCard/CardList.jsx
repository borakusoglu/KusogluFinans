import { useState, useEffect } from 'react';
import * as firestore from '../../firebase/firestore';

const detectCardType = (code) => {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.startsWith('4')) return 'Visa';
  if (cleaned.startsWith('5')) return 'Mastercard';
  if (cleaned.startsWith('9')) return 'Troy';
  return '';
};

const DEFAULT_COLUMNS = [
  { key: 'owner_name', label: 'Kart Kullanıcısı', width: '1.5fr', visible: true },
  { key: 'code', label: 'Kart No', width: '1.2fr', visible: true },
  { key: 'card_type', label: 'Tip', width: '0.8fr', visible: true },
  { key: 'bank', label: 'Banka', width: '1.2fr', visible: true },
  { key: 'expiry_date', label: 'S.K.T', width: '0.6fr', visible: true },
  { key: 'statement_day', label: 'Kesim', width: '0.5fr', visible: true },
  { key: 'payment_day', label: 'Ödeme', width: '0.5fr', visible: true },
  { key: 'available', label: 'Kullanılabilir', width: '1.4fr', visible: true },
  { key: 'limit_amount', label: 'Limit', width: '1.3fr', visible: true },
  { key: 'is_active', label: 'Durum', width: '0.8fr', visible: true }
];

export default function CardList({ cards: initialCards, cardUsages, viewMode, onCardClick, canEdit = true }) {
  const [cards, setCards] = useState(initialCards);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('cardListColumns');
    if (saved) {
      const savedColumns = JSON.parse(saved);
      // Eski formattaki sütunları yeni formatla güncelle
      const updated = savedColumns.map(col => {
        const defaultCol = DEFAULT_COLUMNS.find(d => d.key === col.key);
        return defaultCol ? { ...col, width: defaultCol.width } : col;
      });
      return updated;
    }
    return DEFAULT_COLUMNS;
  });
  const [draggedColumn, setDraggedColumn] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    let sortedCards = [...initialCards];
    if (sortConfig.key) {
      sortedCards.sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === 'card_type') {
          aVal = detectCardType(a.code);
          bVal = detectCardType(b.code);
        } else if (sortConfig.key === 'is_active') {
          aVal = a.is_active ? 1 : 0;
          bVal = b.is_active ? 1 : 0;
        } else if (sortConfig.key === 'available') {
          const aBalance = cardUsages[a.id] || 0;
          const bBalance = cardUsages[b.id] || 0;
          aVal = Math.min(a.limit_amount, a.limit_amount + aBalance);
          bVal = Math.min(b.limit_amount, b.limit_amount + bBalance);
        } else {
          aVal = a[sortConfig.key] || '';
          bVal = b[sortConfig.key] || '';
        }
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    setCards(sortedCards);
  }, [initialCards, sortConfig, cardUsages]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleToggleActive = async (e, card) => {
    e.stopPropagation();
    try {
      await firestore.updateDocument('creditCards', card.id, { is_active: !card.is_active });
      setCards(prevCards => 
        prevCards.map(c => 
          c.id === card.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    } catch (error) {
      console.error('Error toggling card status:', error);
    }
  };

  const toggleColumnVisibility = (key) => {
    const updated = columns.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    setColumns(updated);
    localStorage.setItem('cardListColumns', JSON.stringify(updated));
  };

  const handleColumnMouseDown = (e, index) => {
    e.preventDefault();
    setDraggedColumn(index);
  };

  const handleColumnMouseUp = (targetIndex) => {
    if (draggedColumn === null || draggedColumn === targetIndex) {
      setDraggedColumn(null);
      return;
    }
    
    const updated = [...columns];
    const draggedItem = updated[draggedColumn];
    updated.splice(draggedColumn, 1);
    updated.splice(targetIndex, 0, draggedItem);
    
    setColumns(updated);
    setDraggedColumn(null);
    localStorage.setItem('cardListColumns', JSON.stringify(updated));
  };

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    localStorage.setItem('cardListColumns', JSON.stringify(DEFAULT_COLUMNS));
  };

  const visibleColumns = columns.filter(col => col.visible);
  const gridTemplate = visibleColumns.map(col => col.width).join(' ');
  if (cards.length === 0) {
    return (
      <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '32px', textAlign: 'center'}}>
        <p style={{color: '#4b5563'}}>Arama kriterlerine uygun kart bulunamadı.</p>
      </div>
    );
  }

  if (viewMode === 'detail') {
    return (
      <>
        <div style={{marginBottom: '12px', display: 'flex', justifyContent: 'flex-end'}}>
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            style={{padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600}}
          >
            <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Sütunları Özelleştir
          </button>
        </div>

        {showColumnSettings && (
          <div style={{background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
              <h3 style={{fontSize: '16px', fontWeight: 600, color: '#111827'}}>Sütun Ayarları</h3>
              <button
                onClick={resetColumns}
                style={{padding: '6px 12px', background: '#6b7280', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600}}
              >
                Sıfırla
              </button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px'}}>
              {columns.map((col, index) => (
                <div
                  key={col.key}
                  onMouseDown={(e) => handleColumnMouseDown(e, index)}
                  onMouseUp={() => handleColumnMouseUp(index)}
                  style={{padding: '8px 12px', background: draggedColumn === index ? '#dbeafe' : '#f3f4f6', borderRadius: '6px', cursor: 'move', display: 'flex', alignItems: 'center', gap: '8px', border: '2px solid', borderColor: draggedColumn === index ? '#3b82f6' : 'transparent', userSelect: 'none'}}
                >
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumnVisibility(col.key)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{width: '16px', height: '16px', cursor: 'pointer'}}
                  />
                  <span style={{fontSize: '13px', color: '#374151', fontWeight: 500, flex: 1}}>{col.label}</span>
                  <svg style={{width: '16px', height: '16px', color: '#9ca3af'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

      <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', width: '100%'}}>
        <div style={{display: 'grid', gridTemplateColumns: gridTemplate, gap: '16px', padding: '16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151'}}>
          {visibleColumns.map(col => {
            const align = ['available', 'limit_amount'].includes(col.key) ? 'right' : ['code', 'card_type', 'expiry_date', 'statement_day', 'payment_day', 'is_active'].includes(col.key) ? 'center' : 'left';
            return (
              <div key={col.key} onClick={() => handleSort(col.key)} style={{textAlign: align, cursor: 'pointer', userSelect: 'none'}}>
                {col.label} {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
            );
          })}
        </div>
        {cards.map((card, index) => {
          const currentBalance = cardUsages[card.id] || 0;
          const available = Math.min(card.limit_amount, card.limit_amount + currentBalance);
          const usagePercent = currentBalance < 0 ? (Math.abs(currentBalance) / card.limit_amount) * 100 : 0;
          
          const today = new Date().getDate();
          const daysUntilStatement = card.statement_day ? card.statement_day - today : null;
          const isStatementNear = daysUntilStatement !== null && daysUntilStatement > 0 && daysUntilStatement <= 3;
          
          const renderCell = (col) => {
            switch(col.key) {
              case 'owner_name':
                return <p style={{fontWeight: 600, color: card.is_active ? '#111827' : '#6b7280'}}>{card.owner_name || card.name}</p>;
              case 'code':
                return <p style={{fontFamily: 'monospace', textAlign: 'center', color: card.is_active ? '#111827' : '#6b7280'}}>
                  {user?.role === 'superadmin' || user?.role === 'admin' ? '**** ' + card.code.slice(-4) : '**** ' + card.code.slice(-4)}
                </p>;
              case 'card_type':
                return <div style={{textAlign: 'center', color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {detectCardType(card.code) === 'Visa' && (
                  <svg style={{width: '32px', height: '20px'}} viewBox="0 0 48 32" fill="none">
                    <rect width="48" height="32" rx="4" fill="#1434CB"/>
                    <path d="M20.5 11h-3.2l-2 10h3.2l2-10zm7.6 6.5l1.7-4.7.9 4.7h-2.6zm3.6 3.5h2.9l-2.5-10h-2.7c-.6 0-1.1.3-1.3.9l-4.6 9.1h3.4l.7-1.9h4.1v1.9zm-9.2-3.2c0-2.6-3.6-2.8-3.6-4 0-.4.4-.8 1.2-.9.4 0 1.5-.1 2.8.5l.5-2.3c-.7-.2-1.6-.5-2.7-.5-2.9 0-4.9 1.5-4.9 3.7 0 1.6 1.4 2.5 2.5 3 1.1.6 1.5.9 1.5 1.4 0 .8-.9 1.1-1.8 1.1-1.5 0-2.3-.2-3.5-.8l-.5 2.4c.8.4 2.3.7 3.8.7 3.1.1 5.1-1.5 5.1-3.8z" fill="white"/>
                  </svg>
                )}
                {detectCardType(card.code) === 'Mastercard' && (
                  <svg style={{width: '32px', height: '20px'}} viewBox="0 0 48 32" fill="none">
                    <rect width="48" height="32" rx="4" fill="#EB001B"/>
                    <circle cx="18" cy="16" r="10" fill="#FF5F00"/>
                    <circle cx="30" cy="16" r="10" fill="#F79E1B"/>
                  </svg>
                )}
                {detectCardType(card.code) === 'Troy' && (
                  <svg style={{width: '32px', height: '20px'}} viewBox="0 0 48 32" fill="none">
                    <rect width="48" height="32" rx="4" fill="#00B2E3"/>
                    <text x="24" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">TROY</text>
                  </svg>
                )}
                  {!detectCardType(card.code) && '-'}
                </div>;
              case 'bank':
                return <p style={{color: card.is_active ? '#111827' : '#6b7280'}}>{card.bank}</p>;
              case 'expiry_date':
                return <p style={{textAlign: 'center', color: card.is_active ? '#111827' : '#6b7280'}}>{card.expiry_date || '-'}</p>;
              case 'statement_day':
                return <p style={{textAlign: 'center', color: isStatementNear ? '#dc2626' : (card.is_active ? '#111827' : '#6b7280'), fontWeight: isStatementNear ? 600 : 400}}>{card.statement_day || '-'}</p>;
              case 'payment_day':
                return <p style={{textAlign: 'center', color: card.is_active ? '#111827' : '#6b7280'}}>{card.payment_day || '-'}</p>;
              case 'available':
                return <p style={{fontWeight: 600, textAlign: 'right', color: usagePercent > 80 ? '#dc2626' : usagePercent > 50 ? '#ca8a04' : '#16a34a'}}>{available.toLocaleString('tr-TR')} ₺</p>;
              case 'limit_amount':
                return <p style={{fontWeight: 600, textAlign: 'right', color: card.is_active ? '#111827' : '#6b7280'}}>{card.limit_amount.toLocaleString('tr-TR')} ₺</p>;
              case 'is_active':
                return <div style={{textAlign: 'center'}}>
                  <button
                    onClick={(e) => canEdit && handleToggleActive(e, card)}
                    disabled={!canEdit}
                    style={{padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: card.is_active ? '#dcfce7' : '#f3f4f6', color: card.is_active ? '#166534' : '#6b7280', border: 'none', cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : 0.6}}
                  >
                    {card.is_active ? 'Aktif' : 'İnaktif'}
                  </button>
                </div>;
              default:
                return null;
            }
          };
          
          return (
            <div key={card.id} onClick={() => onCardClick(card)} style={{display: 'grid', gridTemplateColumns: gridTemplate, gap: '16px', padding: '16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', alignItems: 'center', opacity: card.is_active ? 1 : 0.6, background: index % 2 === 0 ? 'white' : '#e5e7eb'}}>
              {visibleColumns.map(col => (
                <div key={col.key}>{renderCell(col)}</div>
              ))}
            </div>
          );
        })}
      </div>
      </>
    );
  }

  const gradients = [
    'linear-gradient(to bottom right, #9333ea, #7e22ce, #6b21a8)',
    'linear-gradient(to bottom right, #2563eb, #1d4ed8, #0ea5e9)',
    'linear-gradient(to bottom right, #db2777, #be185d, #dc2626)',
    'linear-gradient(to bottom right, #16a34a, #059669, #0d9488)',
    'linear-gradient(to bottom right, #ea580c, #d97706, #eab308)',
    'linear-gradient(to bottom right, #475569, #1e293b, #18181b)'
  ];

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div style={{display: 'grid', gridTemplateColumns: viewMode === 'large' ? 'repeat(3, 400px)' : 'repeat(4, 300px)', gap: '32px'}}>
      {cards.map((card, index) => {
        const currentBalance = cardUsages[card.id] || 0;
        const available = Math.min(card.limit_amount, card.limit_amount + currentBalance);
        const usagePercent = currentBalance < 0 ? (Math.abs(currentBalance) / card.limit_amount) * 100 : 0;
        const availablePercent = (available / card.limit_amount) * 100;
        const gradient = card.is_active ? gradients[index % gradients.length] : 'linear-gradient(to bottom right, #9ca3af, #6b7280, #4b5563)';

        return (
          <div key={card.id} style={{cursor: 'pointer', position: 'relative', transition: 'transform 0.3s ease', transform: hoveredCard === card.id ? 'translateY(-8px)' : 'translateY(0)'}} onMouseEnter={() => setHoveredCard(card.id)} onMouseLeave={() => setHoveredCard(null)}>
            {viewMode === 'large' ? (
              <div>
                <div onClick={() => onCardClick(card)} style={{background: gradient, borderRadius: '16px', padding: '24px', color: 'white', boxShadow: hoveredCard === card.id ? '0 30px 60px -12px rgba(0, 0, 0, 0.35)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)', aspectRatio: '1.586/1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.3s ease'}}>
                  {hoveredCard === card.id && (
                    <button
                      onClick={(e) => canEdit && handleToggleActive(e, card)}
                      disabled={!canEdit}
                      style={{position: 'absolute', top: '12px', right: '12px', zIndex: 20, padding: '8px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px', border: 'none', cursor: canEdit ? 'pointer' : 'not-allowed', backdropFilter: 'blur(10px)', transition: 'all 0.2s', opacity: canEdit ? 1 : 0.5, animation: 'fadeIn 0.2s ease-in'}}
                      onMouseEnter={(e) => canEdit && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
                      onMouseLeave={(e) => canEdit && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                      title={canEdit ? (card.is_active ? 'İnaktif Yap' : 'Aktif Yap') : (card.is_active ? 'Aktif' : 'İnaktif')}
                    >
                      {card.is_active ? (
                        <svg style={{width: '20px', height: '20px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg style={{width: '20px', height: '20px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div style={{position: 'absolute', right: '-40px', top: '-40px', width: '160px', height: '160px', background: 'white', opacity: 0.1, borderRadius: '50%'}}></div>
                  <div style={{position: 'absolute', left: '-40px', bottom: '-40px', width: '160px', height: '160px', background: 'white', opacity: 0.1, borderRadius: '50%'}}></div>
                  
                  <div style={{position: 'relative', zIndex: 10}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px'}}>
                      <div style={{width: '48px', height: '40px', background: 'linear-gradient(to bottom right, #fef08a, #fbbf24)', borderRadius: '6px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <div style={{width: '32px', height: '24px', border: '2px solid #ca8a04', borderRadius: '2px'}}></div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <p style={{fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em'}}>{detectCardType(card.code)}</p>
                        <p style={{fontSize: '14px', fontWeight: 600}}>{card.bank}</p>
                      </div>
                    </div>
                    
                    <div style={{marginBottom: '16px'}}>
                      <p style={{fontSize: '24px', fontFamily: 'monospace', letterSpacing: '0.1em'}}>
                        {user?.role === 'superadmin' || user?.role === 'admin' 
                          ? card.code.replace(/-/g, ' ')
                          : '**** **** **** ' + card.code.slice(-4)}
                      </p>
                    </div>
                    
                    <div style={{marginBottom: '24px'}}>
                      <p style={{fontSize: '14px', opacity: 0.9, fontWeight: 600}}>{card.owner_name || card.name}</p>
                    </div>
                  </div>
                  
                  <div style={{position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                    <div>
                      <p style={{fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Limit</p>
                      <p style={{fontSize: '20px', fontWeight: 'bold'}}>{card.limit_amount.toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <p style={{fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>Son Kullanma</p>
                      <p style={{fontSize: '14px', fontFamily: 'monospace'}}>{card.expiry_date || '12/25'}</p>
                    </div>
                  </div>
                </div>
                <div style={{marginTop: '12px', flex: 1}}>
                  {card.is_active ? (
                    <>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4b5563', marginBottom: '4px'}}>
                        <span>Kullanılabilir Limit</span>
                        <span style={{fontWeight: 600}}>{available.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div style={{width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '8px'}}>
                        <div style={{height: '8px', borderRadius: '9999px', width: `${Math.max(0, Math.min(availablePercent, 100))}%`, background: usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#eab308' : '#22c55e'}}></div>
                      </div>
                    </>
                  ) : (
                    <div style={{textAlign: 'center', padding: '8px'}}>
                      <span style={{fontSize: '18px', fontWeight: 'bold', color: '#6b7280'}}>İNAKTİF</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div onClick={() => onCardClick(card)} style={{background: gradient, borderRadius: '12px', padding: '12px', color: 'white', boxShadow: hoveredCard === card.id ? '0 25px 35px -5px rgba(0, 0, 0, 0.2)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.3s ease'}}>
                  {hoveredCard === card.id && (
                    <button
                      onClick={(e) => canEdit && handleToggleActive(e, card)}
                      disabled={!canEdit}
                      style={{position: 'absolute', top: '8px', right: '8px', zIndex: 20, padding: '6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px', border: 'none', cursor: canEdit ? 'pointer' : 'not-allowed', backdropFilter: 'blur(10px)', transition: 'all 0.2s', opacity: canEdit ? 1 : 0.5, animation: 'fadeIn 0.2s ease-in'}}
                      onMouseEnter={(e) => canEdit && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
                      onMouseLeave={(e) => canEdit && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                      title={canEdit ? (card.is_active ? 'İnaktif Yap' : 'Aktif Yap') : (card.is_active ? 'Aktif' : 'İnaktif')}
                    >
                      {card.is_active ? (
                        <svg style={{width: '16px', height: '16px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg style={{width: '16px', height: '16px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div style={{position: 'absolute', right: '-16px', top: '-16px', width: '64px', height: '64px', background: 'white', opacity: 0.1, borderRadius: '50%'}}></div>
                  <div style={{position: 'absolute', left: '-16px', bottom: '-16px', width: '64px', height: '64px', background: 'white', opacity: 0.1, borderRadius: '50%'}}></div>
                  
                  <div style={{position: 'relative', zIndex: 10}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                      <div style={{width: '28px', height: '20px', background: 'linear-gradient(to bottom right, #fef08a, #fbbf24)', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <div style={{width: '20px', height: '12px', border: '1px solid #ca8a04', borderRadius: '1px'}}></div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <p style={{fontSize: '12px', opacity: 0.9, fontWeight: 600}}>{detectCardType(card.code)}</p>
                        <p style={{fontSize: '12px', opacity: 0.7}}>{card.bank}</p>
                      </div>
                    </div>
                    
                    <div style={{marginBottom: '8px'}}>
                      <p style={{fontSize: '14px', fontFamily: 'monospace', letterSpacing: '0.05em'}}>
                        {user?.role === 'superadmin' || user?.role === 'admin' 
                          ? card.code.replace(/-/g, ' ')
                          : '**** **** **** ' + card.code.slice(-4)}
                      </p>
                    </div>
                    
                    <div style={{marginBottom: '8px'}}>
                      <p style={{fontSize: '12px', opacity: 0.9}}>{card.owner_name || card.name}</p>
                    </div>
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '8px'}}>
                      <div>
                        <p style={{opacity: 0.7, marginBottom: '4px'}}>Limit</p>
                        <p style={{fontWeight: 'bold'}}>{card.limit_amount.toLocaleString('tr-TR')} ₺</p>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <p style={{opacity: 0.7, marginBottom: '4px'}}>S.K.T</p>
                        <p style={{fontFamily: 'monospace'}}>{card.expiry_date || '12/25'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{marginTop: '8px'}}>
                  {card.is_active ? (
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <div style={{flex: 1, background: '#e5e7eb', borderRadius: '9999px', height: '6px'}}>
                        <div style={{height: '6px', borderRadius: '9999px', width: `${Math.max(0, Math.min(availablePercent, 100))}%`, background: usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#eab308' : '#22c55e'}}></div>
                      </div>
                      <span style={{fontSize: '12px', color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap'}}>{available.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  ) : (
                    <div style={{textAlign: 'center'}}>
                      <span style={{fontSize: '12px', fontWeight: 'bold', color: '#6b7280'}}>İNAKTİF</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </>
  );
}
