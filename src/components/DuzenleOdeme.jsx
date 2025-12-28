import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import * as firestore from '../firebase/firestore';

export default function DuzenleOdeme({ payment, onClose, onCancel }) {
  const [formData, setFormData] = useState({
    payment_date: payment.payment_date,
    due_date: payment.due_date || '',
    amount: payment.amount,
    payment_method: payment.payment_method || '',
    bank_account_id: payment.bank_account_id || '',
    credit_card_id: payment.credit_card_id || '',
    cari_id: payment.cari_id || '',
    category_id: payment.category_id || '',
    description: payment.description || ''
  });

  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cariList, setCariList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [cariSearch, setCariSearch] = useState('');
  const [showCariDropdown, setShowCariDropdown] = useState(false);

  useEffect(() => {
    loadData();
    const handleClickOutside = (e) => {
      if (!e.target.closest('.card-search-container')) {
        setShowCardDropdown(false);
      }
      if (!e.target.closest('.category-search-container')) {
        setShowCategoryDropdown(false);
      }
      if (!e.target.closest('.cari-search-container')) {
        setShowCariDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    const cardsData = await firestore.getCreditCards(true);
    const accountsData = await firestore.getBankAccounts();
    const cariData = await firestore.getCari();
    const categoriesData = await firestore.getCategories();
    setCards(cardsData);
    setAccounts(accountsData);
    setCariList(cariData);
    setCategories(categoriesData);
    
    // Mevcut kartı search'e set et
    if (payment.credit_card_id) {
      const selectedCard = cardsData.find(c => c.id === payment.credit_card_id);
      if (selectedCard) {
        setCardSearch(`${selectedCard.code} - ${selectedCard.bank || 'Banka Yok'}`);
      }
    }
    
    // Mevcut kategoriyi search'e set et
    if (payment.category_id) {
      const selectedCategory = categoriesData.find(c => c.id === payment.category_id);
      if (selectedCategory) {
        setCategorySearch(selectedCategory.name);
      }
    }
    
    // Mevcut cariyi search'e set et
    if (payment.cari_id) {
      const selectedCari = cariData.find(c => c.id === payment.cari_id);
      if (selectedCari) {
        setCariSearch(selectedCari.name);
      }
    }
  };

  const updateReminders = async (payment) => {
    const reminders = await firestore.getReminders();
    const allCards = await firestore.getCreditCards();
    const allPayments = await firestore.getPayments({});
    const paymentDate = new Date(payment.payment_date);
    const paymentMonth = paymentDate.getMonth();
    const paymentYear = paymentDate.getFullYear();
    
    for (const reminder of reminders) {
      let shouldUpdate = false;
      const updates = {};
      
      if (reminder.type === 'creditCard' && payment.payment_type === 'kredi_karti') {
        const reminderCard = allCards.find(c => c.id === reminder.creditCardId);
        const paymentCard = allCards.find(c => c.id === payment.credit_card_id);
        
        if (reminderCard && paymentCard && reminderCard.code === paymentCard.code) {
          if (reminder.dayStart && reminder.dayEnd) {
            const dayStart = parseInt(reminder.dayStart);
            const dayEnd = parseInt(reminder.dayEnd);
            
            const hasPaymentInRange = allPayments.some(p => {
              if (p.payment_type !== 'kredi_karti' || p.credit_card_id !== payment.credit_card_id) return false;
              const pDate = new Date(p.payment_date);
              if (pDate.getMonth() !== paymentMonth || pDate.getFullYear() !== paymentYear) return false;
              const pDay = pDate.getDate();
              
              if (dayStart > dayEnd) {
                return pDay >= dayStart || pDay <= dayEnd;
              } else {
                return pDay >= dayStart && pDay <= dayEnd;
              }
            });
            
            if (hasPaymentInRange) {
              shouldUpdate = true;
            }
          } else {
            shouldUpdate = true;
          }
        }
      }
      
      if (reminder.type === 'cari' && payment.payment_type === 'cari' && payment.cari_id === reminder.cariId) {
        if (!reminder.paymentType || reminder.paymentType === payment.payment_method) {
          if (reminder.dayStart && reminder.dayEnd) {
            const dayStart = parseInt(reminder.dayStart);
            const dayEnd = parseInt(reminder.dayEnd);
            
            const hasPaymentInRange = allPayments.some(p => {
              if (p.payment_type !== 'cari' || p.cari_id !== payment.cari_id) return false;
              if (reminder.paymentType && p.payment_method !== reminder.paymentType) return false;
              const pDate = new Date(p.payment_date);
              if (pDate.getMonth() !== paymentMonth || pDate.getFullYear() !== paymentYear) return false;
              const pDay = pDate.getDate();
              
              if (dayStart > dayEnd) {
                return pDay >= dayStart || pDay <= dayEnd;
              } else {
                return pDay >= dayStart && pDay <= dayEnd;
              }
            });
            
            if (hasPaymentInRange) {
              shouldUpdate = true;
            }
          } else {
            shouldUpdate = true;
          }
        }
      }
      
      if (reminder.type === 'creditCard' && payment.payment_type === 'cari' && payment.payment_method === 'kredi_karti') {
        const reminderCard = allCards.find(c => c.id === reminder.creditCardId);
        const paymentCard = allCards.find(c => c.id === payment.credit_card_id);
        
        if (reminderCard && paymentCard && reminderCard.code === paymentCard.code) {
          if (reminder.dayStart && reminder.dayEnd) {
            const dayStart = parseInt(reminder.dayStart);
            const dayEnd = parseInt(reminder.dayEnd);
            
            const hasPaymentInRange = allPayments.some(p => {
              if (p.payment_method !== 'kredi_karti' || p.credit_card_id !== payment.credit_card_id) return false;
              const pDate = new Date(p.payment_date);
              if (pDate.getMonth() !== paymentMonth || pDate.getFullYear() !== paymentYear) return false;
              const pDay = pDate.getDate();
              
              if (dayStart > dayEnd) {
                return pDay >= dayStart || pDay <= dayEnd;
              } else {
                return pDay >= dayStart && pDay <= dayEnd;
              }
            });
            
            if (hasPaymentInRange) {
              shouldUpdate = true;
            }
          } else {
            shouldUpdate = true;
          }
        }
      }
      
      if (shouldUpdate) {
        if (reminder.repeatMonthly) {
          const currentCount = parseInt(reminder.remainingCount) || 0;
          updates.remainingCount = currentCount + 1;
        } else {
          const currentCount = parseInt(reminder.remainingCount) || 0;
          if (currentCount > 0) {
            updates.remainingCount = currentCount - 1;
          }
        }
        
        if (reminder.autoCloseOnPayment) {
          const newCount = updates.remainingCount !== undefined ? updates.remainingCount : (parseInt(reminder.remainingCount) || 0);
          if (newCount === 0 && !reminder.repeatMonthly) {
            updates.isActive = false;
          }
        } else {
          if (updates.remainingCount === 0 && !reminder.repeatMonthly) {
            updates.isActive = false;
          }
        }
        
        if (Object.keys(updates).length > 0) {
          await firestore.updateReminder(reminder.id, updates);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Eski ödeme bilgilerini sakla
      const oldPayment = { ...payment };
      
      await firestore.deletePayment(payment.id);
      
      const data = {
        ...formData,
        payment_type: payment.payment_type,
        amount: parseFloat(formData.amount),
        bank_account_id: formData.bank_account_id || null,
        credit_card_id: formData.credit_card_id || null,
        cari_id: formData.cari_id || null,
        category_id: formData.category_id || null,
        due_date: formData.due_date || null
      };

      // Çek ödemesinde payment_date'i değiştirme, sadece due_date'i güncelle
      if (formData.payment_method === 'cek' && formData.due_date) {
        data.payment_date = oldPayment.payment_date; // Eski payment_date'i koru
      }

      await firestore.addPayment(data);
      
      // Log kaydı oluştur
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        let logDetails = '';
        
        if (payment.payment_type === 'kredi_karti') {
          const card = cards.find(c => c.id === formData.credit_card_id);
          const account = accounts.find(a => a.id === formData.bank_account_id);
          logDetails = `Kredi Kartı: ${card?.code || '?'} | Hesap: ${account?.name || '?'} | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
        } else if (payment.payment_type === 'cari') {
          const cari = cariList.find(c => c.id === formData.cari_id);
          const paymentMethodText = formData.payment_method === 'nakit' ? 'Nakit' :
                                    formData.payment_method === 'dbs' ? 'DBS' :
                                    formData.payment_method === 'havale' ? 'Havale' :
                                    formData.payment_method === 'kredi_karti' ? 'Kredi Kartı' :
                                    formData.payment_method === 'cek' ? 'Çek' : '?';
          
          if (formData.payment_method === 'cek') {
            logDetails = `Cari: ${cari?.name || '?'} | Ödeme: Çek | Kesim: ${formData.payment_date} | Vade: ${formData.due_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
          } else if (formData.payment_method === 'kredi_karti') {
            const card = cards.find(c => c.id === formData.credit_card_id);
            logDetails = `Cari: ${cari?.name || '?'} | Ödeme: Kredi Kartı (${card?.code || '?'}) | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
          } else {
            logDetails = `Cari: ${cari?.name || '?'} | Ödeme: ${paymentMethodText} | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
          }
        } else {
          logDetails = `Serbest Ödeme | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺ | Açıklama: ${formData.description || '-'}`;
        }
        
        await firestore.addLog(user.username, 'Ödeme Düzenlendi', logDetails);
      }
      
      await updateReminders(data);
      window.dispatchEvent(new Event('reminderUpdated'));
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50}}>
      <div className="bg-white rounded-lg shadow-2xl w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Ödeme Düzenle</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm font-medium">
              Ödeme Türü: <span className="font-bold">{payment.payment_type === 'kredi_karti' ? 'Kredi Kartı' : 'Cari'}</span>
            </p>
          </div>

          {payment.payment_type === 'kredi_karti' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kredi Kartı</label>
                <div className="relative card-search-container">
                  <input
                    type="text"
                    value={cardSearch}
                    onChange={(e) => {
                      setCardSearch(e.target.value);
                      if (e.target.value.trim()) {
                        setShowCardDropdown(true);
                      }
                    }}
                    placeholder="Kart numarası veya banka ara..."
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg"
                    required={!formData.credit_card_id}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCardDropdown(!showCardDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  {showCardDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {cards
                        .filter(card => 
                          card.code.toLowerCase().includes(cardSearch.toLowerCase()) ||
                          (card.bank || '').toLowerCase().includes(cardSearch.toLowerCase())
                        )
                        .map(card => (
                          <div
                            key={card.id}
                            onClick={() => {
                              setFormData({ ...formData, credit_card_id: card.id });
                              setCardSearch(`${card.code} - ${card.bank || 'Banka Yok'}`);
                              setShowCardDropdown(false);
                            }}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-mono text-sm">{card.code}</div>
                            <div className="text-xs text-gray-600">{card.bank || 'Banka Yok'}</div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yapılacak Hesap</label>
                <select
                  value={formData.bank_account_id}
                  onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Seçiniz</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {payment.payment_type === 'cari' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cari İsmi</label>
                <div className="relative cari-search-container">
                  <input
                    type="text"
                    value={cariSearch}
                    onChange={(e) => {
                      setCariSearch(e.target.value);
                      if (e.target.value.trim()) {
                        setShowCariDropdown(true);
                      }
                    }}
                    placeholder="Cari ara..."
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg"
                    required={!formData.cari_id}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCariDropdown(!showCariDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  {showCariDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {cariList
                        .filter(cari => 
                          cari.name.toLowerCase().includes(cariSearch.toLowerCase())
                        )
                        .map(cari => (
                          <div
                            key={cari.id}
                            onClick={() => {
                              setFormData({ ...formData, cari_id: cari.id });
                              setCariSearch(cari.name);
                              setShowCariDropdown(false);
                            }}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="text-sm">{cari.name}</div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Kategorisi</label>
                <div className="relative category-search-container">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      if (e.target.value.trim()) {
                        setShowCategoryDropdown(true);
                      }
                    }}
                    placeholder="Kategori ara..."
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {categories
                        .filter(cat => 
                          cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                        )
                        .map(cat => (
                          <div
                            key={cat.id}
                            onClick={() => {
                              setFormData({ ...formData, category_id: cat.id });
                              setCategorySearch(cat.name);
                              setShowCategoryDropdown(false);
                            }}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="text-sm">{cat.name}</div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Şekli</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Seçiniz</option>
                  <option value="nakit">Nakit</option>
                  <option value="dbs">DBS</option>
                  <option value="kredi_karti">Kredi Kartı</option>
                  <option value="cek">Çek</option>
                </select>
              </div>
              {formData.payment_method === 'kredi_karti' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kredi Kartı</label>
                  <div className="relative card-search-container">
                    <input
                      type="text"
                      value={cardSearch}
                      onChange={(e) => {
                        setCardSearch(e.target.value);
                        if (e.target.value.trim()) {
                          setShowCardDropdown(true);
                        }
                      }}
                      placeholder="Kart numarası veya banka ara..."
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg"
                      required={!formData.credit_card_id}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCardDropdown(!showCardDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    {showCardDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {cards
                          .filter(card => 
                            card.code.toLowerCase().includes(cardSearch.toLowerCase()) ||
                            (card.bank || '').toLowerCase().includes(cardSearch.toLowerCase())
                          )
                          .map(card => (
                            <div
                              key={card.id}
                              onClick={() => {
                                setFormData({ ...formData, credit_card_id: card.id });
                                setCardSearch(`${card.code} - ${card.bank || 'Banka Yok'}`);
                                setShowCardDropdown(false);
                              }}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                            >
                              <div className="font-mono text-sm">{card.code}</div>
                              <div className="text-xs text-gray-600">{card.bank || 'Banka Yok'}</div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
              {formData.payment_method === 'dbs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yapılacak Hesap</label>
                  <select
                    value={formData.bank_account_id}
                    onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {formData.payment_method === 'cek' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kayıt Tarihi (Çek Kesim)</label>
                      <input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        lang="tr"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vade Tarihi (Çekilecek Gün)</label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        lang="tr"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Çekin Çekileceği Hesap</label>
                      <select
                        value={formData.bank_account_id}
                        onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                          outline: 'none',
                          background: 'white'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        required
                      >
                        <option value="">Seçiniz</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tutar</label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows="3"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {payment.payment_type === 'cari' && formData.payment_method !== 'cek' && formData.payment_method && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Tarihi</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    lang="tr"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tutar</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
            </>
          )}

          {payment.payment_type === 'kredi_karti' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Tarihi</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    lang="tr"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tutar</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Güncelle
            </button>
            <button
              type="button"
              onClick={onCancel || onClose}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
