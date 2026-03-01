import { useState } from 'react';

export default function QuoteModal({ showQuoteModal, setShowQuoteModal, payments, creditCards, reminders, newMessage, setNewMessage }) {
  const [activeTab, setActiveTab] = useState('payments');
  const [searchTerm, setSearchTerm] = useState('');

  if (!showQuoteModal) return null;

  const filteredPayments = payments
    .filter(p => p.payment_method !== 'devir' && searchTerm)
    .filter(p => {
      const search = searchTerm.toLowerCase();
      return p.amount?.toString().includes(search) || p.payment_date?.toLowerCase().includes(search) || p.description?.toLowerCase().includes(search) || p.cari_name?.toLowerCase().includes(search);
    })
    .slice(0, 10);

  const filteredCards = creditCards
    .filter(c => c.is_active !== false && searchTerm)
    .filter(c => {
      const search = searchTerm.toLowerCase();
      return c.name?.toLowerCase().includes(search) || c.code?.toLowerCase().includes(search) || c.bank?.toLowerCase().includes(search);
    })
    .slice(0, 10);

  const filteredReminders = reminders
    .filter(r => r.isActive !== false && searchTerm)
    .filter(r => {
      const search = searchTerm.toLowerCase();
      const title = r.type === 'creditCard' ? 'kredi kartı' : r.type === 'cari' ? 'cari' : r.title?.toLowerCase() || '';
      return title.includes(search);
    })
    .slice(0, 10);

  const tabs = [
    { id: 'payments', label: 'Ödemeler', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: '#1a73e8' },
    { id: 'cards', label: 'Kredi Kartları', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: '#9333ea' },
    { id: 'reminders', label: 'Hatırlatmalar', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: '#f59e0b' }
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)'}}>
      <div style={{background: 'white', borderRadius: '16px', width: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'}}>
        <div style={{padding: '24px', borderBottom: '2px solid #f1f3f4'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div>
                <h3 style={{margin: 0, fontSize: '22px', fontWeight: 700, color: '#1f2937'}}>Alıntı Ekle</h3>
                <p style={{margin: 0, fontSize: '13px', color: '#6b7280', marginTop: '2px'}}>Arama yaparak ekleyin</p>
              </div>
            </div>
            <button onClick={() => { setShowQuoteModal(false); setSearchTerm(''); setActiveTab('payments'); }} style={{background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280', padding: '8px', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>×</button>
          </div>

          <div style={{display: 'flex', gap: '8px'}}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }} style={{flex: 1, padding: '12px 16px', background: activeTab === tab.id ? `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)` : '#f9fafb', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: activeTab === tab.id ? 'white' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: activeTab === tab.id ? `0 4px 12px ${tab.color}40` : 'none'}}>
                <svg style={{width: '18px', height: '18px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{padding: '20px 24px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
          <div style={{position: 'relative'}}>
            <svg style={{position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: currentTab.color}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={activeTab === 'payments' ? 'Tutar, tarih, açıklama ara...' : activeTab === 'cards' ? 'Kart adı, numara, banka ara...' : 'Hatırlatma ara...'} style={{width: '100%', padding: '14px 48px 14px 52px', background: 'white', border: `2px solid ${searchTerm ? currentTab.color : '#e5e7eb'}`, borderRadius: '12px', fontSize: '14px', outline: 'none', fontWeight: 500}} autoFocus />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: '#f3f4f6', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '18px', padding: '6px', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>×</button>}
          </div>
        </div>

        <div style={{padding: '20px 24px', overflowY: 'auto', flex: 1, minHeight: '350px', maxHeight: '450px'}}>
          {!searchTerm ? (
            <div style={{textAlign: 'center', padding: '60px 20px', color: '#9ca3af'}}>
              <div style={{width: '80px', height: '80px', margin: '0 auto 20px', borderRadius: '20px', background: `${currentTab.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '40px', height: '40px', color: currentTab.color}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentTab.icon} />
                </svg>
              </div>
              <p style={{fontSize: '16px', fontWeight: 600, color: '#6b7280', marginBottom: '8px'}}>
                {activeTab === 'payments' ? 'Ödeme Ara' : activeTab === 'cards' ? 'Kredi Kartı Ara' : 'Hatırlatma Ara'}
              </p>
              <p style={{fontSize: '14px', color: '#9ca3af'}}>Yukarıdaki arama kutusunu kullanın</p>
            </div>
          ) : (
            <>
              {activeTab === 'payments' && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {filteredPayments.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '60px 20px'}}><p style={{fontSize: '15px', fontWeight: 600, color: '#6b7280'}}>Sonuç bulunamadı</p></div>
                  ) : (
                    filteredPayments.map(p => (
                      <div key={p.id} onClick={() => { 
                        setNewMessage({...newMessage, quotes: [...(newMessage.quotes || []), {type: 'payment', data: p}]}); 
                        setShowQuoteModal(false); 
                        setSearchTerm(''); 
                      }} style={{padding: '16px', background: 'white', borderRadius: '12px', cursor: 'pointer', border: '2px solid #e5e7eb'}}>
                        <div style={{fontWeight: 700, fontSize: '18px', color: '#1a73e8'}}>{p.amount?.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</div>
                        <div style={{fontSize: '13px', color: '#1f2937', marginTop: '4px', fontWeight: 600}}>{p.payment_type === 'cari' && p.cari_name ? p.cari_name : 'Ödeme'}</div>
                        <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>{p.payment_date}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'cards' && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {filteredCards.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '60px 20px'}}><p style={{fontSize: '15px', fontWeight: 600, color: '#6b7280'}}>Sonuç bulunamadı</p></div>
                  ) : (
                    filteredCards.map(c => (
                      <div key={c.id} onClick={() => { 
                        setNewMessage({
                          ...newMessage, 
                          quotes: [...(newMessage.quotes || []), {
                            type: 'card',
                            data: {
                              card_name: c.name || c.code, 
                              card_number: c.code || c.name,
                              card_limit: c.limit_amount,
                              used_limit: c.used_limit || 0,
                              bank_name: c.bank
                            }
                          }]
                        }); 
                        setShowQuoteModal(false); 
                        setSearchTerm(''); 
                      }} style={{padding: '16px', background: 'white', borderRadius: '12px', cursor: 'pointer', border: '2px solid #e5e7eb'}}>
                        <div style={{fontWeight: 700, fontSize: '16px', color: '#1f2937'}}>{c.name || c.code}</div>
                        <div style={{fontSize: '13px', color: '#6b7280', marginTop: '4px'}}>{c.bank}</div>
                        <div style={{fontSize: '14px', color: '#9333ea', fontWeight: 700, marginTop: '4px'}}>Limit: {c.limit_amount?.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'reminders' && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {filteredReminders.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '60px 20px'}}><p style={{fontSize: '15px', fontWeight: 600, color: '#6b7280'}}>Sonuç bulunamadı</p></div>
                  ) : (
                    filteredReminders.map(r => (
                      <div key={r.id} onClick={() => { 
                        setNewMessage({
                          ...newMessage, 
                          quotes: [...(newMessage.quotes || []), {
                            type: 'reminder',
                            data: {
                              title: r.type === 'creditCard' ? 'Kredi Kartı Hatırlatması' : r.type === 'cari' ? 'Cari Hatırlatması' : r.title || 'Hatırlatma', 
                              description: r.type === 'creditCard' || r.type === 'cari' ? `Gün Aralığı: ${r.dayStart}-${r.dayEnd}` : r.description || '-',
                              reminder_date: r.reminder_date || null,
                              amount: r.amount || null
                            }
                          }]
                        }); 
                        setShowQuoteModal(false); 
                        setSearchTerm(''); 
                      }} style={{padding: '16px', background: 'white', borderRadius: '12px', cursor: 'pointer', border: '2px solid #e5e7eb'}}>
                        <div style={{fontWeight: 700, fontSize: '16px', color: '#1f2937'}}>{r.type === 'creditCard' ? 'Kredi Kartı Hatırlatması' : r.type === 'cari' ? 'Cari Hatırlatması' : r.title || 'Hatırlatma'}</div>
                        <div style={{fontSize: '13px', color: '#6b7280', marginTop: '4px'}}>{r.type === 'creditCard' || r.type === 'cari' ? `Gün: ${r.dayStart}-${r.dayEnd}` : r.description || '-'}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
