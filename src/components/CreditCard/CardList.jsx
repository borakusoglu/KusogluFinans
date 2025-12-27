import { useState, useEffect } from 'react';
import * as firestore from '../../firebase/firestore';

const detectCardType = (code) => {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.startsWith('4')) return 'Visa';
  if (cleaned.startsWith('5')) return 'Mastercard';
  if (cleaned.startsWith('9')) return 'Troy';
  return '';
};

export default function CardList({ cards: initialCards, cardUsages, viewMode, onCardClick }) {
  const [cards, setCards] = useState(initialCards);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  const handleToggleActive = async (e, card) => {
    e.stopPropagation();
    try {
      await firestore.updateDocument('creditCards', card.id, { is_active: !card.is_active });
      // Sadece local state'i güncelle
      setCards(prevCards => 
        prevCards.map(c => 
          c.id === card.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    } catch (error) {
      console.error('Error toggling card status:', error);
    }
  };
  if (cards.length === 0) {
    return (
      <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '32px', textAlign: 'center'}}>
        <p style={{color: '#4b5563'}}>Arama kriterlerine uygun kart bulunamadı.</p>
      </div>
    );
  }

  if (viewMode === 'detail') {
    return (
      <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', minWidth: '1000px'}}>
        <div style={{display: 'grid', gridTemplateColumns: '150px 120px 80px 120px 100px 120px 120px 80px', gap: '16px', padding: '16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151'}}>
          <div>Kart Kullanıcısı</div>
          <div style={{textAlign: 'center'}}>Kart No</div>
          <div style={{textAlign: 'center'}}>Tip</div>
          <div>Banka</div>
          <div style={{textAlign: 'center'}}>S.K.T</div>
          <div style={{textAlign: 'right'}}>Kullanılabilir</div>
          <div style={{textAlign: 'right'}}>Limit</div>
          <div style={{textAlign: 'center'}}>Durum</div>
        </div>
        {cards.map((card, index) => {
          const currentBalance = cardUsages[card.id] || 0;
          const available = card.limit_amount + currentBalance;
          const usagePercent = currentBalance < 0 ? (Math.abs(currentBalance) / card.limit_amount) * 100 : 0;
          
          return (
            <div key={card.id} onClick={() => onCardClick(card)} style={{display: 'grid', gridTemplateColumns: '150px 120px 80px 120px 100px 120px 120px 80px', gap: '16px', padding: '16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', alignItems: 'center', opacity: card.is_active ? 1 : 0.6}}>
              <p style={{fontWeight: 600, color: card.is_active ? '#111827' : '#6b7280'}}>{card.owner_name || card.name}</p>
              <p style={{fontFamily: 'monospace', textAlign: 'center', color: card.is_active ? '#111827' : '#6b7280'}}>**** {card.code.slice(-4)}</p>
              <div style={{textAlign: 'center', color: '#6b7280', fontSize: '14px'}}>{detectCardType(card.code)}</div>
              <p style={{color: card.is_active ? '#111827' : '#6b7280'}}>{card.bank}</p>
              <p style={{textAlign: 'center', color: card.is_active ? '#111827' : '#6b7280'}}>{card.expiry_date || '-'}</p>
              <p style={{fontWeight: 600, textAlign: 'right', color: usagePercent > 80 ? '#dc2626' : usagePercent > 50 ? '#ca8a04' : '#16a34a'}}>{available.toLocaleString('tr-TR')} ₺</p>
              <p style={{fontWeight: 600, textAlign: 'right', color: card.is_active ? '#111827' : '#6b7280'}}>{card.limit_amount.toLocaleString('tr-TR')} ₺</p>
              <div style={{textAlign: 'center'}}>
                <button
                  onClick={(e) => handleToggleActive(e, card)}
                  style={{padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: card.is_active ? '#dcfce7' : '#f3f4f6', color: card.is_active ? '#166534' : '#6b7280', border: 'none', cursor: 'pointer'}}
                >
                  {card.is_active ? 'Aktif' : 'İnaktif'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
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
        const available = card.limit_amount + currentBalance;
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
                      onClick={(e) => handleToggleActive(e, card)}
                      style={{position: 'absolute', top: '12px', right: '12px', zIndex: 20, padding: '8px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px', border: 'none', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s', opacity: 1, animation: 'fadeIn 0.2s ease-in'}}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                      title={card.is_active ? 'İnaktif Yap' : 'Aktif Yap'}
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
                        {card.code.replace(/-/g, ' ')}
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
                      onClick={(e) => handleToggleActive(e, card)}
                      style={{position: 'absolute', top: '8px', right: '8px', zIndex: 20, padding: '6px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px', border: 'none', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s', opacity: 1, animation: 'fadeIn 0.2s ease-in'}}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                      title={card.is_active ? 'İnaktif Yap' : 'Aktif Yap'}
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
                        {card.code.replace(/-/g, ' ')}
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
