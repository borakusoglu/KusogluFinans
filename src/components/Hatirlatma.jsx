import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';
import OdemeListesi from './OdemeListesi';

export default function Hatirlatma() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [expiringCards, setExpiringCards] = useState([]);
  const [customReminders, setCustomReminders] = useState([]);
  const [cards, setCards] = useState([]);
  const [cariList, setCariList] = useState([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyReminders, setHistoryReminders] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [reminderLogs, setReminderLogs] = useState([]);
  const [reminderType, setReminderType] = useState('general');
  const [newReminder, setNewReminder] = useState({ 
    type: 'general',
    title: '', 
    description: '',
    startDate: '',
    endDate: '',
    dayStart: '',
    dayEnd: '',
    creditCardId: '',
    cariId: '',
    paymentType: '',
    repeatMonthly: false,
    autoCloseOnPayment: false,
    paymentCount: ''
  });
  const [cardSearch, setCardSearch] = useState('');
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [cariSearch, setCariSearch] = useState('');
  const [showCariDropdown, setShowCariDropdown] = useState(false);
  const [showBadge, setShowBadge] = useState(true);

  useEffect(() => {
    loadReminders();
    loadCustomReminders();
    loadCards();
    loadCari();
    loadBadgeSetting();

    // Ödeme değişikliklerini dinle
    const handlePaymentUpdate = () => {
      loadCustomReminders();
    };

    const handleBadgeChange = () => {
      loadBadgeSetting();
    };

    window.addEventListener('reminderUpdated', handlePaymentUpdate);
    window.addEventListener('reminderBadgeChanged', handleBadgeChange);
    return () => {
      window.removeEventListener('reminderUpdated', handlePaymentUpdate);
      window.removeEventListener('reminderBadgeChanged', handleBadgeChange);
    };
  }, []);

  const loadCards = async () => {
    const data = await firestore.getCreditCards();
    setCards(data);
  };

  const loadCari = async () => {
    const data = await firestore.getCari();
    setCariList(data);
  };

  const loadBadgeSetting = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.uid) {
      const settings = await firestore.getUserSettings(user.uid);
      setShowBadge(settings.showReminderBadge !== false);
    }
  };

  const loadReminders = async () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const payments = await firestore.getPayments({
      startDate: today.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0]
    });
    setUpcomingPayments(payments.filter(p => p.payment_method !== 'devir').slice(0, 5));

    const cards = await firestore.getCreditCards();
    const cardExpiryMonths = parseInt(localStorage.getItem('cardExpiryMonths')) || 3;
    const monthsLater = new Date(today.getFullYear(), today.getMonth() + cardExpiryMonths, today.getDate());
    const expiring = cards.filter(card => {
      if (!card.expiry_date) return false;
      const [month, year] = card.expiry_date.split('/');
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1, 1);
      return expiryDate <= monthsLater && expiryDate >= today;
    });
    setExpiringCards(expiring);
  };

  const loadCustomReminders = async () => {
    const reminders = await firestore.getReminders();
    setCustomReminders(reminders.filter(r => r.isActive !== false));
    setHistoryReminders(reminders.filter(r => r.isActive === false));
    
    if (selectedHistory) {
      const logs = await firestore.getReminderLogs();
      setReminderLogs(logs.filter(log => log.reminderId === selectedHistory.id));
    }
  };

  const handleAddReminder = async () => {
    if (newReminder.type === 'general' && !newReminder.title.trim()) return;
    if (newReminder.type === 'creditCard' && !newReminder.creditCardId) return;
    if (newReminder.type === 'cari' && !newReminder.cariId) return;
    
    const reminderData = { ...newReminder };
    if (reminderData.paymentCount) reminderData.paymentCount = parseInt(reminderData.paymentCount);
    
    if (newReminder.type === 'creditCard' || newReminder.type === 'cari') {
      // Eğer döngü varsa remainingCount'u sıfırla, yoksa paymentCount ile eşitle
      if (reminderData.repeatMonthly) {
        reminderData.remainingCount = 0;
      } else {
        reminderData.remainingCount = reminderData.paymentCount || 0;
      }
    }
    
    if (editingReminder) {
      await firestore.updateReminder(editingReminder.id, reminderData);
    } else {
      await firestore.addReminder(reminderData);
    }
    
    setNewReminder({ 
      type: 'general',
      title: '', 
      description: '',
      startDate: '',
      endDate: '',
      dayStart: '',
      dayEnd: '',
      creditCardId: '',
      cariId: '',
      paymentType: '',
      repeatMonthly: false,
      autoCloseOnPayment: false,
      paymentCount: ''
    });
    setReminderType('general');
    setEditingReminder(null);
    setShowAddReminder(false);
    loadCustomReminders();
  };

  const handleDeleteReminder = async (id) => {
    await firestore.deleteReminder(id);
    loadCustomReminders();
  };

  const handleOpenSidebar = async () => {
    setSidebarOpen(true);
    
    // Eğer badge gösterme ayarı açıksa ve hatırlatmalar varsa, badge'i gizle
    if (showBadge && customReminders.length > 0) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.uid) {
        const settings = await firestore.getUserSettings(user.uid);
        await firestore.saveUserSettings(user.uid, {
          ...settings,
          showReminderBadge: false
        });
        setShowBadge(false);
        window.dispatchEvent(new Event('reminderBadgeChanged'));
      }
    }
  };

  return (
    <>
      <div className="relative">
        {showBadge && customReminders.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">
            {customReminders.length}
          </div>
        )}
        <button
          onClick={handleOpenSidebar}
          className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
          title="Hatırlatmalar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>

      <div className={`fixed top-[81px] right-0 h-[calc(100%-81px)] bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 z-50 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      } w-[280px]`}>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Hatırlatmalar</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className="p-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                title="Geçmiş"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  loadCards();
                  loadCari();
                  setNewReminder({ 
                    type: 'general',
                    title: '', 
                    description: '',
                    startDate: '',
                    endDate: '',
                    dayStart: '',
                    dayEnd: '',
                    creditCardId: '',
                    cariId: '',
                    paymentType: '',
                    repeatMonthly: false,
                    autoCloseOnPayment: false,
                    paymentCount: ''
                  });
                  setReminderType('general');
                  setEditingReminder(null);
                  setCardSearch('');
                  setCariSearch('');
                  setShowAddReminder(true);
                }}
                className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                title="Hatırlatma Ekle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {customReminders.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <h4 className="font-semibold text-gray-700">Özel Hatırlatmalar</h4>
                </div>
                <div className="space-y-2">
                  {customReminders.map(reminder => {
                    const card = cards.find(c => c.id === reminder.creditCardId);
                    const cari = cariList.find(c => c.id === reminder.cariId);
                    
                    let displayTitle = reminder.title;
                    if (reminder.type === 'creditCard') {
                      displayTitle = `${card?.name || 'Kart'} Ödeme Hatırlatması`;
                    } else if (reminder.type === 'cari') {
                      const paymentMethod = reminder.paymentType ? ` (${reminder.paymentType.toUpperCase()})` : '';
                      displayTitle = `${cari?.name || 'Cari'} Ödeme Hatırlatması${paymentMethod}`;
                    }
                    
                    return (
                      <div key={reminder.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3 group relative">
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            onClick={() => {
                              const card = cards.find(c => c.id === reminder.creditCardId);
                              const cari = cariList.find(c => c.id === reminder.cariId);
                              
                              setEditingReminder(reminder);
                              setReminderType(reminder.type);
                              setNewReminder({
                                type: reminder.type,
                                title: reminder.title || '',
                                description: reminder.description || '',
                                startDate: reminder.startDate || '',
                                endDate: reminder.endDate || '',
                                dayStart: reminder.dayStart || '',
                                dayEnd: reminder.dayEnd || '',
                                creditCardId: reminder.creditCardId || '',
                                cariId: reminder.cariId || '',
                                paymentType: reminder.paymentType || '',
                                repeatMonthly: reminder.repeatMonthly || false,
                                autoCloseOnPayment: reminder.autoCloseOnPayment || false,
                                paymentCount: reminder.paymentCount || ''
                              });
                              
                              if (card) {
                                setCardSearch(`${card.code} - ${card.bank || 'Banka Yok'}`);
                              }
                              if (cari) {
                                setCariSearch(cari.name);
                              }
                              
                              setShowAddReminder(true);
                            }}
                            className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Düzenle"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Sil"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-purple-200 text-purple-700 rounded text-xs font-semibold">
                            {reminder.type === 'general' ? 'Genel' :
                             reminder.type === 'creditCard' ? 'Kredi Kartı' : 'Cari'}
                          </span>
                          {reminder.repeatMonthly && (
                            <span className="px-2 py-0.5 bg-blue-200 text-blue-700 rounded text-xs font-semibold">
                              Her Ay
                            </span>
                          )}
                          {reminder.autoCloseOnPayment && (
                            <span className="px-2 py-0.5 bg-green-200 text-green-700 rounded text-xs font-semibold">
                              Oto. Kapat
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-800 text-sm pr-8 mb-2">{displayTitle}</p>
                        {reminder.description && (
                          <p className="text-xs text-gray-600 mt-1 mb-2">{reminder.description}</p>
                        )}
                        
                        <div className="space-y-1">
                          {(reminder.dayStart || reminder.dayEnd) && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Gün: {reminder.dayStart || '?'} - {reminder.dayEnd || '?'}</span>
                            </div>
                          )}
                          
                          {reminder.type === 'creditCard' && card && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                              <span>{card.code} - {card.bank || 'Banka Yok'}</span>
                            </div>
                          )}
                          
                          {reminder.type === 'cari' && cari && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span>{cari.name}</span>
                            </div>
                          )}
                          
                          {reminder.paymentType && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Ödeme: {reminder.paymentType.toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        
                        {reminder.remainingCount !== undefined && !reminder.repeatMonthly && (
                          <div className="mt-2 pt-2 border-t border-purple-300">
                            <p className="text-xs text-gray-700 font-semibold">
                              Kalan Ödeme: {reminder.remainingCount} / {reminder.paymentCount || '?'}
                            </p>
                          </div>
                        )}
                        {reminder.repeatMonthly && reminder.paymentCount && (
                          <div className="mt-2 pt-2 border-t border-purple-300">
                            <p className="text-xs text-gray-700 font-semibold">
                              Bu Ay Yapılan: {(reminder.paymentCount - (reminder.remainingCount || 0))} / {reminder.paymentCount}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {expiringCards.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-semibold text-gray-700">Süresi Dolacak Kartlar</h4>
                </div>
                <div className="space-y-2">
                  {expiringCards.map(card => (
                    <div key={card.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="font-medium text-gray-800 text-sm">{card.name}</p>
                      <p className="text-xs text-gray-600">{card.bank}</p>
                      <p className="text-xs text-red-600 font-medium mt-1">Son: {card.expiry_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingPayments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="font-semibold text-gray-700">Önümüzdeki Ödemeler</h4>
                </div>
                <div className="space-y-2">
                  {upcomingPayments.map(payment => (
                    <div 
                      key={payment.id} 
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        setSelectedPaymentDate(new Date(payment.payment_date));
                        setSelectedPayments([payment]);
                        setShowPaymentModal(true);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">
                            {payment.payment_type === 'kredi_karti' ? payment.credit_card_name : payment.cari_name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-blue-600">
                          {payment.amount.toLocaleString('tr-TR')} ₺
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customReminders.length === 0 && expiringCards.length === 0 && upcomingPayments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Hatırlatma yok</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-l-lg p-2 shadow-lg hover:bg-gray-50 transition-colors z-40"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {showAddReminder && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <div className="absolute inset-0 bg-black/50" onClick={() => {
            setShowAddReminder(false);
            setEditingReminder(null);
          }}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-h-[90vh] overflow-y-auto p-6 relative z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{editingReminder ? 'Hatırlatmayı Düzenle' : 'Yeni Hatırlatma'}</h2>
              <button onClick={() => {
                setShowAddReminder(false);
                setEditingReminder(null);
              }} className="p-1 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hatırlatma Tipi *</label>
                <select
                  value={reminderType}
                  onChange={(e) => {
                    setReminderType(e.target.value);
                    setNewReminder({ ...newReminder, type: e.target.value });
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="general">Genel Hatırlatma</option>
                  <option value="creditCard">Kredi Kartı Hatırlatma</option>
                  <option value="cari">Cari Hatırlatma</option>
                </select>
              </div>

              {reminderType === 'general' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Başlık *</label>
                    <input
                      type="text"
                      value={newReminder.title}
                      onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      placeholder="Hatırlatma başlığı"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Açıklama</label>
                    <textarea
                      value={newReminder.description}
                      onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
                      placeholder="Detaylı açıklama"
                      rows="3"
                    />
                  </div>
                </>
              )}

              {reminderType === 'creditCard' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kredi Kartı *</label>
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
                        className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCardDropdown(!showCardDropdown)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                      {showCardDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {cards
                            .filter(card => 
                              card.is_active !== false &&
                              (card.code.toLowerCase().includes(cardSearch.toLowerCase()) ||
                              (card.bank || '').toLowerCase().includes(cardSearch.toLowerCase()))
                            )
                            .map(card => (
                              <div
                                key={card.id}
                                onClick={() => {
                                  setNewReminder({ ...newReminder, creditCardId: card.id });
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Başlangıç Günü</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newReminder.dayStart}
                        onChange={(e) => setNewReminder({ ...newReminder, dayStart: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                        placeholder="1-31"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bitiş Günü</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newReminder.dayEnd}
                        onChange={(e) => setNewReminder({ ...newReminder, dayEnd: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                        placeholder="1-31"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ödeme Sayısı</label>
                    <input
                      type="number"
                      min="1"
                      value={newReminder.paymentCount}
                      onChange={(e) => setNewReminder({ ...newReminder, paymentCount: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      placeholder="Kaç ödeme?"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReminder.repeatMonthly}
                      onChange={(e) => setNewReminder({ ...newReminder, repeatMonthly: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Her ay tekrarla</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReminder.autoCloseOnPayment}
                      onChange={(e) => setNewReminder({ ...newReminder, autoCloseOnPayment: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Ödeme yapılınca otomatik kapat</span>
                  </label>
                </>
              )}

              {reminderType === 'cari' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cari *</label>
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
                        className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCariDropdown(!showCariDropdown)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg"
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
                                  setNewReminder({ ...newReminder, cariId: cari.id });
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ödeme Şekli</label>
                    <select
                      value={newReminder.paymentType}
                      onChange={(e) => setNewReminder({ ...newReminder, paymentType: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="">Tüm Ödemeler</option>
                      <option value="nakit">Nakit</option>
                      <option value="dbs">DBS</option>
                      <option value="havale">Havale</option>
                      <option value="kredi_karti">Kredi Kartı</option>
                      <option value="cek">Çek</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Başlangıç Günü</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newReminder.dayStart}
                        onChange={(e) => setNewReminder({ ...newReminder, dayStart: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                        placeholder="1-31"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bitiş Günü</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newReminder.dayEnd}
                        onChange={(e) => setNewReminder({ ...newReminder, dayEnd: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                        placeholder="1-31"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ödeme Sayısı</label>
                    <input
                      type="number"
                      min="1"
                      value={newReminder.paymentCount}
                      onChange={(e) => setNewReminder({ ...newReminder, paymentCount: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      placeholder="Kaç ödeme?"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReminder.repeatMonthly}
                      onChange={(e) => setNewReminder({ ...newReminder, repeatMonthly: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Her ay tekrarla</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReminder.autoCloseOnPayment}
                      onChange={(e) => setNewReminder({ ...newReminder, autoCloseOnPayment: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Ödeme yapılınca otomatik kapat</span>
                  </label>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddReminder}
                disabled={
                  (reminderType === 'general' && !newReminder.title.trim()) ||
                  (reminderType === 'creditCard' && !newReminder.creditCardId) ||
                  (reminderType === 'cari' && !newReminder.cariId)
                }
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingReminder ? 'Güncelle' : 'Ekle'}
              </button>
              <button
                onClick={() => {
                  setShowAddReminder(false);
                  setEditingReminder(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <OdemeListesi
          selectedDate={selectedPaymentDate}
          payments={selectedPayments}
          onClose={() => {
            setShowPaymentModal(false);
            loadReminders();
          }}
          onEdit={() => {
            setShowPaymentModal(false);
          }}
        />
      )}

      {showHistory && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]" style={{padding: '20px'}}>
          <div className="absolute inset-0 bg-black/50" onClick={() => {
            setShowHistory(false);
            setSelectedHistory(null);
          }}></div>
          <div className="bg-white rounded-2xl shadow-2xl relative z-10" style={{width: selectedHistory ? '1000px' : '800px', height: '85vh', display: 'flex', flexDirection: 'column', transition: 'width 0.3s'}}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">Hatırlatma Geçmişi</h2>
                {historyReminders.length > 0 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                    {historyReminders.length} kayıt
                  </span>
                )}
              </div>
              <button onClick={() => {
                setShowHistory(false);
                setSelectedHistory(null);
              }} className="p-1 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Kart numarası, cari adı veya başlık ile ara..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div style={{flex: 1, overflow: 'hidden', display: 'flex'}}>
              <div style={{flex: selectedHistory ? '0 0 65%' : '1', overflow: 'auto', borderRight: selectedHistory ? '1px solid #e5e7eb' : 'none', transition: 'flex 0.3s'}}>
                {historyReminders.filter(r => {
                  const card = cards.find(c => c.id === r.creditCardId);
                  const cari = cariList.find(c => c.id === r.cariId);
                  const searchLower = historySearch.toLowerCase();
                  return !historySearch || 
                    r.title?.toLowerCase().includes(searchLower) ||
                    card?.code?.toLowerCase().includes(searchLower) ||
                    card?.name?.toLowerCase().includes(searchLower) ||
                    cari?.name?.toLowerCase().includes(searchLower);
                }).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>{historySearch ? 'Sonuç bulunamadı' : 'Geçmiş kaydı yok'}</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kart/Cari</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gün</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyReminders.filter(r => {
                        const card = cards.find(c => c.id === r.creditCardId);
                        const cari = cariList.find(c => c.id === r.cariId);
                        const searchLower = historySearch.toLowerCase();
                        return !historySearch || 
                          r.title?.toLowerCase().includes(searchLower) ||
                          card?.code?.toLowerCase().includes(searchLower) ||
                          card?.name?.toLowerCase().includes(searchLower) ||
                          cari?.name?.toLowerCase().includes(searchLower);
                      }).map(reminder => {
                        const card = cards.find(c => c.id === reminder.creditCardId);
                        const cari = cariList.find(c => c.id === reminder.cariId);
                        
                        return (
                          <tr 
                            key={reminder.id} 
                            className={`hover:bg-gray-50 cursor-pointer ${selectedHistory?.id === reminder.id ? 'bg-blue-50' : ''}`}
                            onClick={async () => {
                              setSelectedHistory(reminder);
                              const logs = await firestore.getReminderLogs();
                              setReminderLogs(logs.filter(log => log.reminderId === reminder.id));
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                                {reminder.type === 'general' ? 'Genel' :
                                 reminder.type === 'creditCard' ? 'Kart' : 'Cari'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {reminder.type === 'creditCard' && card ? card.code :
                                 reminder.type === 'cari' && cari ? cari.name :
                                 reminder.title || '-'}
                              </div>
                              {reminder.type === 'creditCard' && card?.name && (
                                <div className="text-xs text-gray-500">{card.name}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {reminder.dayStart && reminder.dayEnd ? `${reminder.dayStart}-${reminder.dayEnd}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {reminder.paymentCount ? `${reminder.paymentCount} ödeme` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Tamamlandı
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              
              {selectedHistory && (
                <div style={{flex: '0 0 35%', overflow: 'auto', padding: '20px', background: '#f9fafb'}}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Detaylar</h3>
                    <button
                      onClick={() => setSelectedHistory(null)}
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Kapat"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Tip</span>
                        <p className="text-sm font-medium mt-1">
                          {selectedHistory.type === 'general' ? 'Genel Hatırlatma' :
                           selectedHistory.type === 'creditCard' ? 'Kredi Kartı Hatırlatması' : 'Cari Hatırlatması'}
                        </p>
                      </div>
                      
                      {selectedHistory.type === 'creditCard' && (() => {
                        const card = cards.find(c => c.id === selectedHistory.creditCardId);
                        return card && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase">Kart</span>
                            <p className="text-sm font-medium mt-1">{card.code}</p>
                            {card.name && <p className="text-xs text-gray-600">{card.name}</p>}
                          </div>
                        );
                      })()}
                      
                      {selectedHistory.type === 'cari' && (() => {
                        const cari = cariList.find(c => c.id === selectedHistory.cariId);
                        return cari && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase">Cari</span>
                            <p className="text-sm font-medium mt-1">{cari.name}</p>
                          </div>
                        );
                      })()}
                      
                      {(selectedHistory.dayStart || selectedHistory.dayEnd) && (
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Gün Aralığı</span>
                          <p className="text-sm font-medium mt-1">
                            {selectedHistory.dayStart || '?'} - {selectedHistory.dayEnd || '?'}
                          </p>
                        </div>
                      )}
                      
                      {selectedHistory.paymentType && (
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Ödeme Şekli</span>
                          <p className="text-sm font-medium mt-1">{selectedHistory.paymentType.toUpperCase()}</p>
                        </div>
                      )}
                      
                      {selectedHistory.paymentCount && (
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Ödeme Sayısı</span>
                          <p className="text-sm font-medium mt-1">{selectedHistory.paymentCount} ödeme</p>
                        </div>
                      )}
                      
                      {selectedHistory.description && (
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Açıklama</span>
                          <p className="text-sm mt-1">{selectedHistory.description}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedHistory.repeatMonthly && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Her Ay Tekrar
                          </span>
                        )}
                        {selectedHistory.autoCloseOnPayment && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Oto. Kapat
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <h4 className="text-md font-bold text-gray-900 mb-3">Ödeme Geçmişi</h4>
                  {reminderLogs.length === 0 ? (
                    <div className="bg-white rounded-lg p-6 text-center">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">Kayıt bulunamadı</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reminderLogs.map((log, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-700">
                              {new Date(log.paymentDate).toLocaleDateString('tr-TR', {day: '2-digit', month: 'long', year: 'numeric'})}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 ml-6">{log.details}</p>
                          {log.createdAt && (
                            <p className="text-xs text-gray-400 ml-6 mt-1">
                              {new Date(log.createdAt.seconds * 1000).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
