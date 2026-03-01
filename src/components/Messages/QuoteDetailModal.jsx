export default function QuoteDetailModal({ show, onClose, quoteType, quoteData }) {
  if (!show || !quoteData) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: quoteType === 'payment' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                      quoteType === 'card' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {quoteType === 'payment' && (
              <>
                <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ödeme Detayı
              </>
            )}
            {quoteType === 'card' && (
              <>
                <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Kredi Kartı Detayı
              </>
            )}
            {quoteType === 'reminder' && (
              <>
                <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Hatırlatma Detayı
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'white',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {quoteType === 'payment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tutar</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                    {quoteData.amount?.toLocaleString('tr-TR')} TL
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ 
                  background: '#e0e7ff',
                  padding: '10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="#667eea" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tarih</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                    {quoteData.payment_date}
                  </div>
                </div>
              </div>

              {quoteData.cari_name && (
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ 
                    background: '#e0e7ff',
                    padding: '10px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg style={{width: '20px', height: '20px'}} fill="none" stroke="#667eea" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Cari</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                      {quoteData.cari_name}
                    </div>
                  </div>
                </div>
              )}

              {quoteData.description && (
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ 
                    background: '#e0e7ff',
                    padding: '10px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg style={{width: '20px', height: '20px'}} fill="none" stroke="#667eea" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Açıklama</div>
                    <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                      {quoteData.description}
                    </div>
                  </div>
                </div>
              )}

              {quoteData.payment_type && (
                <div style={{ 
                  background: '#f3f4f6',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Ödeme Türü</span>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    color: '#1f2937',
                    background: 'white',
                    padding: '4px 12px',
                    borderRadius: '6px'
                  }}>
                    {quoteData.payment_type}
                  </span>
                </div>
              )}

              {quoteData.payment_method && (
                <div style={{ 
                  background: '#f3f4f6',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Ödeme Şekli</span>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    color: '#1f2937',
                    background: 'white',
                    padding: '4px 12px',
                    borderRadius: '6px'
                  }}>
                    {quoteData.payment_method}
                  </span>
                </div>
              )}
            </div>
          )}

          {quoteType === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  padding: '10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Kart Adı</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>
                    {quoteData.card_name}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ 
                  background: '#fce7f3',
                  padding: '10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="#f5576c" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Kart Numarası</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', letterSpacing: '1px' }}>
                    {quoteData.card_number}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ 
                  background: '#fce7f3',
                  padding: '10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="#f5576c" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Banka</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                    {quoteData.bank_name}
                  </div>
                </div>
              </div>

              <div style={{ 
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Limit</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                    {quoteData.card_limit?.toLocaleString('tr-TR')} TL
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Kullanılan</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>
                    {quoteData.used_limit?.toLocaleString('tr-TR')} TL
                  </div>
                </div>
              </div>

              {quoteData.card_limit && quoteData.used_limit !== undefined && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Kullanım Oranı</div>
                  <div style={{ 
                    background: '#e5e7eb',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
                      height: '100%',
                      width: `${Math.min((quoteData.used_limit / quoteData.card_limit) * 100, 100)}%`,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', textAlign: 'right' }}>
                    %{((quoteData.used_limit / quoteData.card_limit) * 100).toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          )}

          {quoteType === 'reminder' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  padding: '10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Başlık</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>
                    {quoteData.title}
                  </div>
                </div>
              </div>

              {quoteData.description && (
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ 
                    background: '#fef3c7',
                    padding: '10px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg style={{width: '20px', height: '20px'}} fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Açıklama</div>
                    <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                      {quoteData.description}
                    </div>
                  </div>
                </div>
              )}

              {quoteData.reminder_date && (
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ 
                    background: '#fef3c7',
                    padding: '10px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg style={{width: '20px', height: '20px'}} fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Hatırlatma Tarihi</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                      {quoteData.reminder_date}
                    </div>
                  </div>
                </div>
              )}

              {quoteData.amount && (
                <div style={{ 
                  background: '#f3f4f6',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Tutar</span>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    color: '#1f2937',
                    background: 'white',
                    padding: '6px 16px',
                    borderRadius: '6px'
                  }}>
                    {quoteData.amount?.toLocaleString('tr-TR')} TL
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
