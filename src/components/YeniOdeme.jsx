import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import * as firestore from '../firebase/firestore';
import React from 'react';

const CurrencyInput = ({ value, onChange, required }) => {
  const inputRef = React.useRef(null);

  const handleChange = (e) => {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    let inputValue = input.value;
    
    // Sadece rakam ve virgül kabul et
    inputValue = inputValue.replace(/[^0-9,]/g, '');
    
    // Birden fazla virgül kontrolü
    const commaCount = (inputValue.match(/,/g) || []).length;
    if (commaCount > 1) {
      const firstCommaIndex = inputValue.indexOf(',');
      inputValue = inputValue.substring(0, firstCommaIndex + 1) + inputValue.substring(firstCommaIndex + 1).replace(/,/g, '');
    }
    
    const commaIndex = inputValue.indexOf(',');
    let displayValue = '';
    let numericValue = '';
    
    if (commaIndex !== -1) {
      // Virgül var
      let beforeComma = inputValue.substring(0, commaIndex);
      let afterComma = inputValue.substring(commaIndex + 1).substring(0, 2);
      
      // Binlik ayraç ekle
      const formattedInt = beforeComma.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      displayValue = formattedInt + ',' + afterComma;
      numericValue = beforeComma + '.' + afterComma;
    } else {
      // Virgül yok
      const formattedInt = inputValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      displayValue = formattedInt;
      numericValue = inputValue;
    }
    
    // Input değerini güncelle
    input.value = displayValue;
    
    // Cursor pozisyonunu ayarla
    const newCursorPosition = cursorPosition + (displayValue.length - inputValue.length);
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    
    // Parent'a numeric değeri gönder
    onChange(numericValue);
  };

  return (
    <div style={{position: 'relative'}}>
      <input
        ref={inputRef}
        type="text"
        onChange={handleChange}
        className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg"
        placeholder="0,00"
        required={required}
      />
      <span style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontWeight: 600}}>₺</span>
    </div>
  );
};

export default function YeniOdeme({ selectedDate, onClose, preSelectedCard, preSelectedCari }) {
  const [paymentType, setPaymentType] = useState('kredi_karti');
  const [formData, setFormData] = useState({
    payment_date: format(selectedDate, 'yyyy-MM-dd'),
    due_date: '',
    amount: '',
    payment_method: '',
    bank_account_id: '',
    credit_card_id: preSelectedCard || '',
    cari_id: preSelectedCari || '',
    category_id: '',
    description: '',
    is_admin_only: false
  });

  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cariList, setCariList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [limitWarningData, setLimitWarningData] = useState(null);
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
    const cardsData = await firestore.getCreditCards();
    const accountsData = await firestore.getBankAccounts();
    const cariData = await firestore.getCari();
    const categoriesData = await firestore.getCategories();
    const user = JSON.parse(localStorage.getItem('user'));
    
    console.log('Loaded accounts:', accountsData);
    console.log('Loaded cards:', cardsData);
    console.log('Loaded cari:', cariData);
    console.log('Loaded categories:', categoriesData);
    
    setCards(cardsData);
    setAccounts(accountsData);
    setCariList(cariData);
    setCategories(categoriesData);
    
    if (preSelectedCard) {
      const selectedCard = cardsData.find(c => c.id === preSelectedCard);
      if (selectedCard) {
        const displayCode = user?.role === 'superadmin' || user?.role === 'admin' 
          ? selectedCard.code 
          : '****-****-****-' + selectedCard.code.slice(-4);
        setCardSearch(`${displayCode} - ${selectedCard.bank || 'Banka Yok'}`);
      }
    }
    
    if (preSelectedCari) {
      setPaymentType('cari');
      const selectedCari = cariData.find(c => c.id === preSelectedCari);
      if (selectedCari) {
        setCariSearch(selectedCari.name);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(formData.amount);

    // Kredi kartı ödeme türünde (banka hesabına ödeme) fazla ödeme kontrolü
    if (paymentType === 'kredi_karti' && formData.credit_card_id) {
      const selectedCard = cards.find(c => c.id === formData.credit_card_id);
      if (selectedCard) {
        const cardPayments = await firestore.getPayments({});
        const cardTransactions = cardPayments.filter(p => p.credit_card_id === formData.credit_card_id);
        
        // Güncel bakiyeyi hesapla
        const sortedPayments = cardTransactions.sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
        let currentBalance = 0;
        
        if (sortedPayments.length > 0) {
          const calculateBalanceForUsage = (index) => {
            const payment = sortedPayments[index];
            if (payment.payment_method === 'devir') {
              return payment.amount * -1;
            }
            if (index === 0) return 0;
            const prevBalance = calculateBalanceForUsage(index - 1);
            const debit = payment.payment_type === 'kredi_karti' ? payment.amount : 0;
            const credit = payment.payment_type === 'cari' ? payment.amount : 0;
            return prevBalance + debit - credit;
          };
          currentBalance = calculateBalanceForUsage(sortedPayments.length - 1);
        }

        const availableLimit = selectedCard.limit_amount + currentBalance;
        
        // Fazla ödeme kontrolü: girilen tutar > güncel bakiye * -1
        const g = currentBalance;
        const maxPayment = (-1) * g;
        
        if (amount > maxPayment) {
          setLimitWarningData({
            cardName: selectedCard.name,
            limit: selectedCard.limit_amount,
            currentBalance: currentBalance,
            availableLimit: availableLimit,
            requestedAmount: amount,
            exceededAmount: amount - maxPayment,
            isLimitExceeded: false,
            isCreditCardPayment: false
          });
          setShowLimitWarning(true);
          return;
        }
      }
    }

    // Cari ödemede kredi kartı ile ödeme yapılırken kontroller
    if (paymentType === 'cari' && formData.payment_method === 'kredi_karti' && formData.credit_card_id) {
      const selectedCard = cards.find(c => c.id === formData.credit_card_id);
      if (selectedCard) {
        const cardPayments = await firestore.getPayments({});
        const cardTransactions = cardPayments.filter(p => p.credit_card_id === formData.credit_card_id);
        
        // Güncel bakiyeyi hesapla
        const sortedPayments = cardTransactions.sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
        let currentBalance = 0;
        
        if (sortedPayments.length > 0) {
          const calculateBalanceForUsage = (index) => {
            const payment = sortedPayments[index];
            if (payment.payment_method === 'devir') {
              return payment.amount * -1;
            }
            if (index === 0) return 0;
            const prevBalance = calculateBalanceForUsage(index - 1);
            const debit = payment.payment_type === 'kredi_karti' ? payment.amount : 0;
            const credit = payment.payment_type === 'cari' ? payment.amount : 0;
            return prevBalance + debit - credit;
          };
          currentBalance = calculateBalanceForUsage(sortedPayments.length - 1);
        }

        const availableLimit = selectedCard.limit_amount + currentBalance;
        
        // Limit aşımı kontrolü
        if (amount > availableLimit) {
          setLimitWarningData({
            cardName: selectedCard.name,
            limit: selectedCard.limit_amount,
            currentBalance: currentBalance,
            availableLimit: availableLimit,
            requestedAmount: amount,
            exceededAmount: amount - availableLimit,
            isLimitExceeded: true,
            isCreditCardPayment: true
          });
          setShowLimitWarning(true);
          return;
        }
      }
    }

    await savePayment();
  };

  const savePayment = async () => {
    const data = {
      ...formData,
      payment_type: paymentType,
      amount: parseFloat(formData.amount),
      bank_account_id: formData.bank_account_id || null,
      credit_card_id: formData.credit_card_id || null,
      cari_id: formData.cari_id || null,
      category_id: formData.category_id || null
    };

    try {
      await firestore.addPayment(data);
      
      // Detaylı log kaydı oluştur
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        let logDetails = '';
        
        if (paymentType === 'kredi_karti') {
          const card = cards.find(c => c.id === formData.credit_card_id);
          const account = accounts.find(a => a.id === formData.bank_account_id);
          logDetails = `Kredi Kartı: ${card?.code || '?'} | Hesap: ${account?.name || '?'} | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
        } else if (paymentType === 'cari') {
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
        
        await firestore.addLog(user.username, 'Ödeme Eklendi', logDetails);
      }
      
      await updateReminders(data);
      window.dispatchEvent(new Event('reminderUpdated'));
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateReminders = async (payment) => {
    const reminders = await firestore.getReminders();
    const allCards = await firestore.getCreditCards();
    const allPayments = await firestore.getPayments({});
    const paymentDate = new Date(payment.payment_date);
    const paymentMonth = paymentDate.getMonth();
    const paymentYear = paymentDate.getFullYear();
    
    console.log('=== UPDATE REMINDERS DEBUG ===');
    console.log('Payment:', payment);
    console.log('All Reminders:', reminders);
    
    for (const reminder of reminders) {
      let shouldUpdate = false;
      const updates = {};
      
      console.log('\nChecking reminder:', reminder.id, reminder.type);
      
      if (reminder.type === 'creditCard' && payment.payment_type === 'kredi_karti') {
        const reminderCard = allCards.find(c => c.id === reminder.creditCardId);
        const paymentCard = allCards.find(c => c.id === payment.credit_card_id);
        
        if (reminderCard && paymentCard && reminderCard.code === paymentCard.code) {
          if (reminder.dayStart && reminder.dayEnd) {
            const dayStart = parseInt(reminder.dayStart);
            const dayEnd = parseInt(reminder.dayEnd);
            
            // Bu ay içinde bu kart için belirlenen gün aralığında ödeme var mı kontrol et
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
            
            // Bu ay içinde bu cari için belirlenen gün aralığında ödeme var mı kontrol et
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
      
      // Cari ödemede kredi kartı ile ödeme yapıldıysa, kredi kartı hatırlatmasını da güncelle
      if (reminder.type === 'creditCard' && payment.payment_type === 'cari' && payment.payment_method === 'kredi_karti') {
        const reminderCard = allCards.find(c => c.id === reminder.creditCardId);
        const paymentCard = allCards.find(c => c.id === payment.credit_card_id);
        
        if (reminderCard && paymentCard && reminderCard.code === paymentCard.code) {
          if (reminder.dayStart && reminder.dayEnd) {
            const dayStart = parseInt(reminder.dayStart);
            const dayEnd = parseInt(reminder.dayEnd);
            
            // Bu ay içinde bu kart için belirlenen gün aralığında ödeme var mı kontrol et
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
        console.log('Should update! Current remainingCount:', reminder.remainingCount);
        
        // Döngü varsa remainingCount'u artır (0'dan başlıyor, her ödeme ile artıyor)
        // Döngü yoksa remainingCount'u azalt (paymentCount'tan başlıyor, her ödeme ile azalıyor)
        if (reminder.repeatMonthly) {
          const currentCount = parseInt(reminder.remainingCount) || 0;
          updates.remainingCount = currentCount + 1;
          console.log('Repeat monthly: incrementing', currentCount, '->', updates.remainingCount);
        } else {
          // Döngü yoksa her zaman azalt (0 olsa bile güncelleme yapılmalı)
          const currentCount = parseInt(reminder.remainingCount) || 0;
          if (currentCount > 0) {
            updates.remainingCount = currentCount - 1;
            console.log('No repeat: decrementing', currentCount, '->', updates.remainingCount);
          } else {
            console.log('Count is already 0, not decrementing');
          }
        }
        
        // Eğer otomatik kapanma aktifse ve kalan sayı 0 olacaksa veya zaten 0 ise kapat
        if (reminder.autoCloseOnPayment) {
          const newCount = updates.remainingCount !== undefined ? updates.remainingCount : (parseInt(reminder.remainingCount) || 0);
          if (newCount === 0 && !reminder.repeatMonthly) {
            updates.isActive = false;
          }
        } else {
          // Otomatik kapanma yoksa, sadece her ay tekrarla değilse ve ödeme tamamlandıysa kapat
          if (updates.remainingCount === 0 && !reminder.repeatMonthly) {
            updates.isActive = false;
          }
        }
        
        if (Object.keys(updates).length > 0) {
          console.log('Updating reminder with:', updates);
          await firestore.updateReminder(reminder.id, updates);
          await firestore.addReminderLog({
            action: 'payment',
            reminderType: reminder.type,
            reminderId: reminder.id,
            paymentDate: payment.payment_date,
            paymentAmount: payment.amount,
            details: `Ödeme yapıldı - ${payment.amount.toLocaleString('tr-TR')} ₺`
          });
        } else {
          console.log('No updates to apply');
        }
      } else {
        console.log('Should NOT update');
      }
    }
    console.log('=== END UPDATE REMINDERS ===\n');
  };

  return (
    <>
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{
          animation: 'fadeInBlur 0.3s ease-out forwards'
        }}
        onClick={onClose}
      ></div>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-[900px] max-h-[90vh] overflow-y-auto relative z-10"
        style={{
          animation: 'scaleIn 0.3s ease-out forwards'
        }}
      >
        <div style={{background: 'linear-gradient(to right, #2563eb, #9333ea)', padding: '24px', borderTopLeftRadius: '16px', borderTopRightRadius: '16px'}}>
          <h2 style={{fontSize: '28px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <svg style={{width: '32px', height: '32px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Yeni Ödeme
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Türü</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('kredi_karti')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: paymentType === 'kredi_karti' ? '#2563eb' : '#e5e7eb',
                  background: paymentType === 'kredi_karti' ? 'linear-gradient(to bottom, #eff6ff, #dbeafe)' : 'white',
                  color: paymentType === 'kredi_karti' ? '#1e40af' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: paymentType === 'kredi_karti' ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none'
                }}
              >
                <svg style={{width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span style={{fontSize: '14px', fontWeight: 600}}>Kredi Kartı</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('cari')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: paymentType === 'cari' ? '#16a34a' : '#e5e7eb',
                  background: paymentType === 'cari' ? 'linear-gradient(to bottom, #f0fdf4, #dcfce7)' : 'white',
                  color: paymentType === 'cari' ? '#15803d' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: paymentType === 'cari' ? '0 4px 6px -1px rgba(22, 163, 74, 0.1)' : 'none'
                }}
              >
                <svg style={{width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span style={{fontSize: '14px', fontWeight: 600}}>Cari</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('serbest')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: paymentType === 'serbest' ? '#9333ea' : '#e5e7eb',
                  background: paymentType === 'serbest' ? 'linear-gradient(to bottom, #faf5ff, #f3e8ff)' : 'white',
                  color: paymentType === 'serbest' ? '#7e22ce' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: paymentType === 'serbest' ? '0 4px 6px -1px rgba(147, 51, 234, 0.1)' : 'none'
                }}
              >
                <svg style={{width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span style={{fontSize: '14px', fontWeight: 600}}>Serbest</span>
              </button>
            </div>
          </div>

          {paymentType === 'kredi_karti' && (
            <>
            <div className="grid grid-cols-2 gap-4">
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
                      {(() => {
                        const user = JSON.parse(localStorage.getItem('user'));
                        return cards
                          .filter(card => 
                            card.is_active !== false &&
                            (card.code.toLowerCase().includes(cardSearch.toLowerCase()) ||
                            (card.bank || '').toLowerCase().includes(cardSearch.toLowerCase()))
                          )
                          .map(card => {
                            const displayCode = user?.role === 'superadmin' || user?.role === 'admin' 
                              ? card.code 
                              : '****-****-****-' + card.code.slice(-4);
                            return (
                              <div
                                key={card.id}
                                onClick={() => {
                                  setFormData({ ...formData, credit_card_id: card.id });
                                  setCardSearch(`${displayCode} - ${card.bank || 'Banka Yok'}`);
                                  setShowCardDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                              >
                                <div className="font-mono text-sm">{displayCode}</div>
                                <div className="text-xs text-gray-600">{card.bank || 'Banka Yok'}</div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yapılacak Hesap</label>
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
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  required
                >
                  <option value="">Seçiniz</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
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
                <CurrencyInput
                  value={formData.amount}
                  onChange={(value) => setFormData({ ...formData, amount: value })}
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

          {paymentType === 'cari' && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Şekli</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
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
                  <option value="nakit">Nakit</option>
                  <option value="dbs">DBS</option>
                  <option value="havale">Havale</option>
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
                        {(() => {
                          const user = JSON.parse(localStorage.getItem('user'));
                          return cards
                            .filter(card => 
                              card.is_active !== false &&
                              (card.code.toLowerCase().includes(cardSearch.toLowerCase()) ||
                              (card.bank || '').toLowerCase().includes(cardSearch.toLowerCase()))
                            )
                            .map(card => {
                              const displayCode = user?.role === 'superadmin' || user?.role === 'admin' 
                                ? card.code 
                                : '****-****-****-' + card.code.slice(-4);
                              return (
                                <div
                                  key={card.id}
                                  onClick={() => {
                                    setFormData({ ...formData, credit_card_id: card.id });
                                    setCardSearch(`${displayCode} - ${card.bank || 'Banka Yok'}`);
                                    setShowCardDropdown(false);
                                  }}
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                >
                                  <div className="font-mono text-sm">{displayCode}</div>
                                  <div className="text-xs text-gray-600">{card.bank || 'Banka Yok'}</div>
                                </div>
                              );
                            });
                        })()}
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
              {formData.payment_method === 'havale' && (
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
                      <CurrencyInput
                        value={formData.amount}
                        onChange={(value) => setFormData({ ...formData, amount: value })}
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {paymentType === 'serbest' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
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
                  <CurrencyInput
                    value={formData.amount}
                    onChange={(value) => setFormData({ ...formData, amount: value })}
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
                  required
                />
              </div>
            </>
          )}

          {paymentType === 'cari' && formData.payment_method !== 'cek' && formData.payment_method && (
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
              <CurrencyInput
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value })}
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

          {paymentType === 'cari' && formData.payment_method === 'cek' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="3"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {(() => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user?.role === 'superadmin' || user?.role === 'admin') {
              return (
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '8px', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={formData.is_admin_only}
                    onChange={(e) => setFormData({ ...formData, is_admin_only: e.target.checked })}
                    style={{width: '18px', height: '18px', cursor: 'pointer'}}
                  />
                  <span style={{fontSize: '14px', fontWeight: 600, color: '#92400e'}}>Admin Ödeme (Sadece adminler görebilir)</span>
                </label>
              );
            }
            return null;
          })()}

          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '14px 24px',
                background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: '#f3f4f6',
                color: '#374151',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Limit Uyarı Modalı */}
    {showLimitWarning && limitWarningData && (
      <div className="fixed inset-0 flex items-center justify-center z-[60]">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          style={{
            animation: 'fadeInBlur 0.3s ease-out forwards'
          }}
        ></div>
        <div 
          className="bg-white rounded-2xl shadow-2xl w-[500px] overflow-hidden relative z-10"
          style={{
            animation: 'scaleIn 0.3s ease-out forwards'
          }}
        >
          <div className={`p-6 text-white ${limitWarningData.isLimitExceeded ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-2xl font-bold">{limitWarningData.isLimitExceeded ? 'Limit Aşımı Uyarısı' : 'Fazla Ödeme Uyarısı'}</h3>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {limitWarningData.isLimitExceeded ? (
              <>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-gray-800 font-semibold mb-2">
                    <span className="font-bold">{limitWarningData.cardName}</span> kartının kullanılabilir limiti aşılacak!
                  </p>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kart Limiti:</span>
                    <span className="font-bold text-gray-900">{limitWarningData.limit.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Güncel Bakiye:</span>
                    <span className={`font-bold ${limitWarningData.currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {limitWarningData.currentBalance.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Kullanılabilir Limit:</span>
                    <span className="font-bold text-blue-600">{limitWarningData.availableLimit.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Harcama Tutarı:</span>
                    <span className="font-bold text-orange-600">{limitWarningData.requestedAmount.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between bg-red-100 -mx-4 -mb-4 mt-2 p-4 rounded-b-lg">
                    <span className="text-gray-700 font-semibold">Aşılan Tutar:</span>
                    <span className="font-bold text-red-700 text-lg">{limitWarningData.exceededAmount.toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-gray-800 font-semibold mb-2">
                    <span className="font-bold">{limitWarningData.cardName}</span> kartında borcunuzdan daha fazla ödeme yapıyorsunuz!
                  </p>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kart Limiti:</span>
                    <span className="font-bold text-gray-900">{limitWarningData.limit.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Güncel Bakiye:</span>
                    <span className={`font-bold ${limitWarningData.currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {limitWarningData.currentBalance.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Kullanılabilir Limit:</span>
                    <span className="font-bold text-blue-600">{limitWarningData.availableLimit.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between bg-orange-100 -mx-4 -mb-4 mt-2 p-4 rounded-b-lg">
                    <span className="text-gray-700 font-semibold">Girilmeye Çalışılan Fazla Tutar:</span>
                    <span className="font-bold text-orange-700 text-lg">{limitWarningData.exceededAmount.toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              {limitWarningData.isCreditCardPayment ? (
                <button
                  onClick={() => setShowLimitWarning(false)}
                  className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold transition-all"
                >
                  İptal Et
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowLimitWarning(false);
                      savePayment();
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all"
                  >
                    Anladım
                  </button>
                  <button
                    onClick={() => setShowLimitWarning(false)}
                    className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold transition-all"
                  >
                    İptal Et
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    <style>{`
      @keyframes fadeInBlur {
        from {
          opacity: 0;
          backdrop-filter: blur(0px);
        }
        to {
          opacity: 1;
          backdrop-filter: blur(8px);
        }
      }
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `}</style>
    </>
  );
}
