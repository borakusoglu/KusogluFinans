import { useState } from 'react';
import QuoteDetailModal from './QuoteDetailModal';

export default function ComposeModal({ showCompose, setShowCompose, newMessage, setNewMessage, users, handleSendMessage, setShowQuoteModal }) {
  const [showQuoteDetail, setShowQuoteDetail] = useState(false);

  if (!showCompose) return null;

  return (
    <div style={{position: 'fixed', bottom: '24px', right: '24px', width: '500px', background: 'white', borderRadius: '8px', boxShadow: '0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.2)', zIndex: 100}}>
      <div style={{padding: '12px 16px', background: '#404040', color: 'white', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span style={{fontSize: '14px', fontWeight: 500}}>Yeni Mesaj</span>
        <button onClick={() => setShowCompose(false)} style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px'}}>
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

        <div style={{display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
          <button
            onClick={() => setShowQuoteModal()}
            style={{padding: '6px 12px', background: '#f1f3f4', color: '#5f6368', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'}}
          >
            <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Alıntı Ekle
          </button>
        </div>

        {newMessage.quotes && newMessage.quotes.length > 0 && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px'}}>
            {newMessage.quotes.map((quote, index) => (
              <div 
                key={index}
                style={{
                  padding: '12px', 
                  background: quote.type === 'payment' ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' :
                              quote.type === 'card' ? 'linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%)' :
                              'linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(254, 225, 64, 0.1) 100%)',
                  borderLeft: quote.type === 'payment' ? '3px solid #667eea' :
                              quote.type === 'card' ? '3px solid #f5576c' :
                              '3px solid #fa709a',
                  borderRadius: '4px', 
                  fontSize: '13px',
                  position: 'relative'
                }}
              >
                <button 
                  onClick={() => setNewMessage({...newMessage, quotes: newMessage.quotes.filter((_, i) => i !== index)})}
                  style={{position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#374151', fontSize: '16px', lineHeight: '1', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '6px'}}
                >
                  ×
                </button>
                {quote.type === 'payment' && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#667eea' }}>💰 Ödeme Alıntısı</div>
                    <div><strong>Tutar:</strong> {quote.data.amount?.toLocaleString('tr-TR')} TL</div>
                    <div><strong>Tarih:</strong> {quote.data.payment_date}</div>
                    {quote.data.cari_name && <div><strong>Cari:</strong> {quote.data.cari_name}</div>}
                    {quote.data.payment_type && <div><strong>Tür:</strong> {quote.data.payment_type}</div>}
                    {quote.data.payment_method && <div><strong>Şekil:</strong> {quote.data.payment_method}</div>}
                    {quote.data.description && <div><strong>Açıklama:</strong> {quote.data.description}</div>}
                  </div>
                )}
                {quote.type === 'card' && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#f5576c' }}>💳 Kredi Kartı Alıntısı</div>
                    <div><strong>Kart:</strong> {quote.data.card_name}</div>
                    <div><strong>Limit:</strong> {quote.data.card_limit?.toLocaleString('tr-TR')} TL</div>
                    <div><strong>Banka:</strong> {quote.data.bank_name}</div>
                  </div>
                )}
                {quote.type === 'reminder' && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#fa709a' }}>🔔 Hatırlatma Alıntısı</div>
                    <div><strong>Hatırlatma:</strong> {quote.data.title}</div>
                    {quote.data.description && <div><strong>Açıklama:</strong> {quote.data.description}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <textarea
          value={newMessage.body}
          onChange={(e) => setNewMessage({...newMessage, body: e.target.value})}
          placeholder="Mesajınızı yazın..."
          style={{padding: '8px', border: 'none', fontSize: '14px', resize: 'none', height: '200px', outline: 'none'}}
        />

        <button
          onClick={handleSendMessage}
          style={{padding: '10px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', alignSelf: 'flex-start'}}
        >
          Gönder
        </button>
      </div>

      <QuoteDetailModal
        show={showQuoteDetail}
        onClose={() => setShowQuoteDetail(false)}
        quoteType={newMessage.quoteType}
        quoteData={newMessage.quoteData}
      />
    </div>
  );
}
