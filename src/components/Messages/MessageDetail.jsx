import { useState, useEffect } from 'react';
import QuoteDetailModal from './QuoteDetailModal';
import { markMessageAsRead } from '../../firebase/firestore';

export default function MessageDetail({ selectedMessage, setSelectedMessage, handleStarMessage, handleDeleteMessage, showReply, setShowReply, replyBody, setReplyBody, handleReply, user }) {
  const [showQuoteDetail, setShowQuoteDetail] = useState(false);

  useEffect(() => {
    if (selectedMessage && !selectedMessage.read && selectedMessage.to === user.uid) {
      markMessageAsRead(selectedMessage.id);
    }
  }, [selectedMessage?.id]);

  if (!selectedMessage) return null;

  return (
    <div style={{padding: '24px'}}>
      <div style={{marginBottom: '16px'}}>
        <button
          onClick={() => setSelectedMessage(null)}
          style={{padding: '8px 16px', background: 'transparent', border: '1px solid #dadce0', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: '#5f6368', display: 'flex', alignItems: 'center', gap: '8px'}}
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
      {selectedMessage.quotes && selectedMessage.quotes.length > 0 && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px'}}>
          {selectedMessage.quotes.map((quote, index) => (
            <div 
              key={index}
              style={{
                padding: '16px',
                background: quote.type === 'payment' ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' :
                            quote.type === 'card' ? 'linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%)' :
                            'linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(254, 225, 64, 0.1) 100%)',
                borderLeft: quote.type === 'payment' ? '4px solid #667eea' :
                            quote.type === 'card' ? '4px solid #f5576c' :
                            '4px solid #fa709a',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <svg style={{ width: '20px', height: '20px', color: quote.type === 'payment' ? '#667eea' : quote.type === 'card' ? '#f5576c' : '#fa709a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {quote.type === 'payment' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                  {quote.type === 'card' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  )}
                  {quote.type === 'reminder' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  )}
                </svg>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  color: quote.type === 'payment' ? '#667eea' : quote.type === 'card' ? '#f5576c' : '#fa709a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {quote.type === 'payment' && 'Ödeme Alıntısı'}
                  {quote.type === 'card' && 'Kredi Kartı Alıntısı'}
                  {quote.type === 'reminder' && 'Hatırlatma Alıntısı'}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#202124' }}>
                {quote.type === 'payment' && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '8px' }}>
                      {quote.data.amount?.toLocaleString('tr-TR')} TL
                    </div>
                    <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                      📅 {quote.data.payment_date}
                    </div>
                    {quote.data.cari_name && (
                      <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                        🏢 {quote.data.cari_name}
                      </div>
                    )}
                    {quote.data.payment_type && (
                      <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                        📋 Tür: {quote.data.payment_type}
                      </div>
                    )}
                    {quote.data.payment_method && (
                      <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                        💳 Şekil: {quote.data.payment_method}
                      </div>
                    )}
                    {quote.data.description && (
                      <div style={{ fontSize: '13px', color: '#5f6368' }}>
                        📝 {quote.data.description}
                      </div>
                    )}
                  </div>
                )}
                {quote.type === 'card' && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
                      {quote.data.card_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                      💳 {quote.data.card_number}
                    </div>
                    <div style={{ fontSize: '13px', color: '#5f6368' }}>
                      🏦 {quote.data.bank_name} • Limit: {quote.data.card_limit?.toLocaleString('tr-TR')} TL
                    </div>
                  </div>
                )}
                {quote.type === 'reminder' && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
                      {quote.data.title}
                    </div>
                    {quote.data.description && (
                      <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                        📝 {quote.data.description}
                      </div>
                    )}
                    {quote.data.reminder_date && (
                      <div style={{ fontSize: '13px', color: '#5f6368' }}>
                        📅 {quote.data.reminder_date}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMessage.quoteData && (
        <div 
          style={{
            padding: '16px',
            background: selectedMessage.quoteType === 'payment' ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' :
                        selectedMessage.quoteType === 'card' ? 'linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%)' :
                        'linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(254, 225, 64, 0.1) 100%)',
            borderLeft: selectedMessage.quoteType === 'payment' ? '4px solid #667eea' :
                        selectedMessage.quoteType === 'card' ? '4px solid #f5576c' :
                        '4px solid #fa709a',
            borderRadius: '8px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <svg style={{ width: '20px', height: '20px', color: selectedMessage.quoteType === 'payment' ? '#667eea' : selectedMessage.quoteType === 'card' ? '#f5576c' : '#fa709a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {selectedMessage.quoteType === 'payment' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
              {selectedMessage.quoteType === 'card' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              )}
              {selectedMessage.quoteType === 'reminder' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              )}
            </svg>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: selectedMessage.quoteType === 'payment' ? '#667eea' : selectedMessage.quoteType === 'card' ? '#f5576c' : '#fa709a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {selectedMessage.quoteType === 'payment' && 'Ödeme Alıntısı'}
              {selectedMessage.quoteType === 'card' && 'Kredi Kartı Alıntısı'}
              {selectedMessage.quoteType === 'reminder' && 'Hatırlatma Alıntısı'}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#202124' }}>
            {selectedMessage.quoteType === 'payment' && (
              <div>
                <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '8px' }}>
                  {selectedMessage.quoteData.amount?.toLocaleString('tr-TR')} TL
                </div>
                <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                  📅 {selectedMessage.quoteData.payment_date}
                </div>
                {selectedMessage.quoteData.cari_name && (
                  <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                    🏢 {selectedMessage.quoteData.cari_name}
                  </div>
                )}
                {selectedMessage.quoteData.payment_type && (
                  <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                    📋 Tür: {selectedMessage.quoteData.payment_type}
                  </div>
                )}
                {selectedMessage.quoteData.payment_method && (
                  <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                    💳 Şekil: {selectedMessage.quoteData.payment_method}
                  </div>
                )}
                {selectedMessage.quoteData.description && (
                  <div style={{ fontSize: '13px', color: '#5f6368' }}>
                    📝 {selectedMessage.quoteData.description}
                  </div>
                )}
              </div>
            )}
            {selectedMessage.quoteType === 'card' && (
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
                  {selectedMessage.quoteData.card_name}
                </div>
                <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                  💳 {selectedMessage.quoteData.card_number}
                </div>
                <div style={{ fontSize: '13px', color: '#5f6368' }}>
                  🏦 {selectedMessage.quoteData.bank_name} • Limit: {selectedMessage.quoteData.card_limit?.toLocaleString('tr-TR')} TL
                </div>
              </div>
            )}
            {selectedMessage.quoteType === 'reminder' && (
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
                  {selectedMessage.quoteData.title}
                </div>
                {selectedMessage.quoteData.description && (
                  <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                    📝 {selectedMessage.quoteData.description}
                  </div>
                )}
                {selectedMessage.quoteData.reminder_date && (
                  <div style={{ fontSize: '13px', color: '#5f6368' }}>
                    📅 {selectedMessage.quoteData.reminder_date}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{fontSize: '14px', color: '#202124', lineHeight: '1.8', whiteSpace: 'pre-wrap'}}>
        {selectedMessage.body}
      </div>

      {selectedMessage.replies && selectedMessage.replies.length > 0 && (
        <div style={{marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e0e0e0'}}>
          {selectedMessage.replies.map((reply, idx) => (
            <div key={idx} style={{marginBottom: '16px', paddingLeft: '16px', borderLeft: '3px solid #e8f0fe'}}>
              <div style={{fontSize: '13px', color: '#5f6368', marginBottom: '8px'}}>
                <strong>{reply.fromUsername}</strong> - {new Date(reply.timestamp).toLocaleString('tr-TR')}
              </div>
              <div style={{fontSize: '14px', color: '#202124', lineHeight: '1.6', whiteSpace: 'pre-wrap'}}>
                {reply.body}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMessage.from !== user.uid && (
        <div style={{marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e0e0e0'}}>
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              style={{padding: '10px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}
            >
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Cevapla
            </button>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Cevabınızı yazın..."
                style={{padding: '12px', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '14px', resize: 'vertical', minHeight: '100px', outline: 'none', fontFamily: 'inherit'}}
              />
              <div style={{display: 'flex', gap: '8px'}}>
                <button
                  onClick={handleReply}
                  style={{padding: '10px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '14px'}}
                >
                  Gönder
                </button>
                <button
                  onClick={() => {
                    setShowReply(false);
                    setReplyBody('');
                  }}
                  style={{padding: '10px 24px', background: 'transparent', color: '#5f6368', border: '1px solid #dadce0', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}
                >
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <QuoteDetailModal
        show={showQuoteDetail}
        onClose={() => setShowQuoteDetail(false)}
        quoteType={selectedMessage.quoteType}
        quoteData={selectedMessage.quoteData}
      />
    </div>
  );
}
