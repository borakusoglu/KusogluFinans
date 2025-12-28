import { useState } from 'react';
import { useCardData } from '../hooks/useCardData';
import CardFilters from '../components/CreditCard/CardFilters';
import CardList from '../components/CreditCard/CardList';
import CardDetail from '../components/CreditCard/CardDetail';
import YeniOdeme from '../components/YeniOdeme';

export default function KrediKarti({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedCardCategory, setSelectedCardCategory] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('cardViewMode') || 'large');
  const [showInactive, setShowInactive] = useState(() => localStorage.getItem('showInactiveCards') === 'true');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showNewPayment, setShowNewPayment] = useState(false);

  const { cards, cardUsages, usagesLoaded, loadCards } = useCardData(showInactive);

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor';

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('cardViewMode', mode);
  };

  const availableBanks = [...new Set(cards.map(card => card.bank).filter(Boolean))].sort();

  const filteredCards = cards.filter(card => {
    const matchesSearch = (card.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (card.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (card.bank || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBank = !selectedBank || card.bank === selectedBank;
    const matchesCategory = !selectedCardCategory || card.card_category === selectedCardCategory;
    return matchesSearch && matchesBank && matchesCategory;
  });

  if (!usagesLoaded) {
    return (
      <div style={{padding: '24px'}}>
        <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', textAlign: 'center'}}>
          <p style={{color: '#4b5563'}}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div style={{padding: '24px'}}>
        <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px', textAlign: 'center'}}>
          <p style={{color: '#4b5563'}}>Henüz kredi kartı tanımlanmamış.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!selectedCard ? (
        <div style={{height: '100%', background: 'linear-gradient(to bottom right, #f8fafc, #dbeafe)', padding: '32px', overflowY: 'auto'}}>
          <div style={{minWidth: '1200px', margin: '0 auto'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', minWidth: '1000px'}}>
              <h1 style={{fontSize: '36px', fontWeight: 'bold', color: '#111827', width: '400px'}}>Kredi Kartları</h1>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: '200px'}}>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setShowInactive(newValue);
                    localStorage.setItem('showInactiveCards', newValue.toString());
                  }}
                  style={{width: '16px', height: '16px'}}
                />
                <span style={{fontSize: '14px', fontWeight: 500, color: '#374151'}}>İnaktif kartları göster</span>
              </label>
            </div>

            <CardFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedBank={selectedBank}
              setSelectedBank={setSelectedBank}
              selectedCardCategory={selectedCardCategory}
              setSelectedCardCategory={setSelectedCardCategory}
              availableBanks={availableBanks}
              viewMode={viewMode}
              handleViewModeChange={handleViewModeChange}
            />

            <div style={{marginBottom: '16px', color: '#4b5563'}}>
              {filteredCards.length} kart görüntüleniyor {cards.length !== filteredCards.length && `(${cards.length} toplam)`}
            </div>

            <CardList
              cards={filteredCards}
              cardUsages={cardUsages}
              viewMode={viewMode}
              onCardClick={setSelectedCard}
              canEdit={canEdit}
            />
          </div>
        </div>
      ) : (
        <div style={{height: '100%', background: 'linear-gradient(to bottom right, #f8fafc, #dbeafe)', padding: '32px', overflowY: 'auto'}}>
          <div style={{minWidth: '1000px', margin: '0 auto'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px'}}>
              <div>
                <h1 style={{fontSize: '36px', fontWeight: 'bold', color: '#111827'}}>{selectedCard.name}</h1>
                <p style={{fontSize: '18px', color: '#4b5563', marginTop: '8px'}}>
                  {selectedCard.bank} - {user?.role === 'superadmin' || user?.role === 'admin' 
                    ? selectedCard.code 
                    : '****-****-****-' + selectedCard.code.slice(-4)}
                </p>
              </div>
              <div style={{display: 'flex', gap: '12px'}}>
                {canEdit && (
                <button
                  onClick={() => setShowNewPayment(true)}
                  style={{padding: '12px 24px', background: '#16a34a', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}
                >
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Yeni Ödeme
                </button>
                )}
                <button
                  onClick={() => setSelectedCard(null)}
                  style={{padding: '12px 24px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}
                >
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Kartlara Dön
                </button>
              </div>
            </div>

            <CardDetail
              card={selectedCard}
              onBack={() => setSelectedCard(null)}
              onReload={loadCards}
              canEdit={canEdit}
            />
          </div>
        </div>
      )}

      {showNewPayment && selectedCard && (
        <YeniOdeme 
          selectedDate={new Date()} 
          onClose={() => {
            setShowNewPayment(false);
            loadCards();
            window.dispatchEvent(new Event('reminderUpdated'));
          }}
          preSelectedCard={selectedCard.id}
        />
      )}
    </>
  );
}
