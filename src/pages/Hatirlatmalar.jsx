import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';
import OdemeListesi from '../components/OdemeListesi';
import ReminderForm from '../components/ReminderForm';
import ReminderHistory from '../components/ReminderHistory';
import YeniOdeme from '../components/YeniOdeme';

export default function Hatirlatmalar({ user }) {
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [expiringCards, setExpiringCards] = useState([]);
  const [customReminders, setCustomReminders] = useState([]);
  const [historyReminders, setHistoryReminders] = useState([]);
  const [cards, setCards] = useState([]);
  const [cariList, setCariList] = useState([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('reminderViewMode') || 'card');
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    loadAll();
    window.addEventListener('reminderUpdated', loadAll);
    return () => window.removeEventListener('reminderUpdated', loadAll);
  }, []);

  const loadAll = () => {
    loadReminders();
    loadCustomReminders();
    loadCards();
    loadCari();
  };

  const loadCards = async () => {
    const data = await firestore.getCreditCards();
    setCards(data);
  };

  const loadCari = async () => {
    const data = await firestore.getCari();
    setCariList(data);
  };

  const loadReminders = async () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const payments = await firestore.getPayments({
      startDate: today.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0]
    });
    
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
    const filteredPayments = isAdmin ? payments : payments.filter(p => !p.is_admin_only);
    
    setUpcomingPayments(filteredPayments.filter(p => p.payment_method !== 'devir').slice(0, 5));

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
  };

  const handleSaveReminder = async (formData) => {
    const reminderData = { ...formData };
    if (reminderData.paymentCount) reminderData.paymentCount = parseInt(reminderData.paymentCount);
    
    if (formData.type === 'creditCard' || formData.type === 'cari') {
      if (editingReminder) {
        if (reminderData.repeatMonthly) {
          reminderData.remainingCount = editingReminder.remainingCount || 0;
        } else {
          const completedPayments = (editingReminder.paymentCount || 0) - (editingReminder.remainingCount || 0);
          reminderData.remainingCount = Math.max(0, reminderData.paymentCount - completedPayments);
        }
      } else {
        reminderData.remainingCount = reminderData.repeatMonthly ? 0 : (reminderData.paymentCount || 0);
      }
    }
    
    if (editingReminder) {
      await firestore.updateReminder(editingReminder.id, reminderData);
      if (user) {
        let logDetails = '';
        if (formData.type === 'creditCard') {
          const card = cards.find(c => c.id === formData.creditCardId);
          logDetails = `Kart: ${card?.code || '?'} | Gün: ${formData.dayStart || '?'}-${formData.dayEnd || '?'}`;
        } else if (formData.type === 'cari') {
          const cari = cariList.find(c => c.id === formData.cariId);
          logDetails = `Cari: ${cari?.name || '?'} | Gün: ${formData.dayStart || '?'}-${formData.dayEnd || '?'}`;
        } else {
          logDetails = `Başlık: ${formData.title}`;
        }
        await firestore.addLog(user.username, 'Hatırlatma Düzenlendi', logDetails);
      }
    } else {
      await firestore.addReminder(reminderData);
      if (user) {
        let logDetails = '';
        if (formData.type === 'creditCard') {
          const card = cards.find(c => c.id === formData.creditCardId);
          logDetails = `Kart: ${card?.code || '?'} | Gün: ${formData.dayStart || '?'}-${formData.dayEnd || '?'}`;
        } else if (formData.type === 'cari') {
          const cari = cariList.find(c => c.id === formData.cariId);
          logDetails = `Cari: ${cari?.name || '?'} | Gün: ${formData.dayStart || '?'}-${formData.dayEnd || '?'}`;
        } else {
          logDetails = `Başlık: ${formData.title}`;
        }
        await firestore.addLog(user.username, 'Hatırlatma Eklendi', logDetails);
      }
    }
    
    setEditingReminder(null);
    setShowAddReminder(false);
    loadCustomReminders();
  };

  const handleDeleteReminder = async (id) => {
    const reminderToDelete = customReminders.find(r => r.id === id);
    await firestore.deleteReminder(id);
    
    if (user && reminderToDelete) {
      let logDetails = '';
      if (reminderToDelete.type === 'creditCard') {
        const card = cards.find(c => c.id === reminderToDelete.creditCardId);
        logDetails = `Kart: ${card?.code || '?'} | Gün: ${reminderToDelete.dayStart || '?'}-${reminderToDelete.dayEnd || '?'}`;
      } else if (reminderToDelete.type === 'cari') {
        const cari = cariList.find(c => c.id === reminderToDelete.cariId);
        logDetails = `Cari: ${cari?.name || '?'} | Gün: ${reminderToDelete.dayStart || '?'}-${reminderToDelete.dayEnd || '?'}`;
      } else {
        logDetails = `Başlık: ${reminderToDelete.title}`;
      }
      await firestore.addLog(user.username, 'Hatırlatma Silindi', logDetails);
    }
    
    loadCustomReminders();
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setShowAddReminder(true);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto">
      <div className="w-[1200px] mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Hatırlatmalar</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-200 rounded-xl p-1">
                <button
                  onClick={() => {
                    setViewMode('card');
                    localStorage.setItem('reminderViewMode', 'card');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-white shadow-sm' : 'hover:bg-gray-300'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    localStorage.setItem('reminderViewMode', 'list');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-300'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Geçmiş</span>
              </button>
              {canEdit && (
              <button
                onClick={() => {
                  setEditingReminder(null);
                  setShowAddReminder(true);
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Yeni Hatırlatma</span>
              </button>
              )}
            </div>
          </div>

          {viewMode === 'card' ? (
          <div className="grid grid-cols-4 gap-4">
            {customReminders.filter(r => !r.repeatMonthly).length > 0 && (
              <div className="col-span-3">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <h4 className="font-semibold text-gray-700">Özel Hatırlatmalar</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {customReminders.filter(r => !r.repeatMonthly).map(reminder => {
                    const card = cards.find(c => c.id === reminder.creditCardId);
                    const cari = cariList.find(c => c.id === reminder.cariId);
                    
                    let displayTitle = reminder.title;
                    if (reminder.type === 'creditCard') {
                      displayTitle = `${card?.owner_name || card?.name || 'Kart'} Ödeme Hatırlatması`;
                    } else if (reminder.type === 'cari') {
                      const paymentMethod = reminder.paymentType ? ` (${reminder.paymentType.toUpperCase()})` : '';
                      displayTitle = `${cari?.name || 'Cari'} Ödeme Hatırlatması${paymentMethod}`;
                    }
                    
                    return (
                      <div key={reminder.id} className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 group relative hover:shadow-md transition-shadow">
                        {canEdit && (
                        <div className="absolute top-1.5 right-1.5 flex gap-1">
                          {(reminder.type === 'creditCard' || reminder.type === 'cari') && (
                            <button
                              onClick={() => {
                                setSelectedReminder(reminder);
                                setShowNewPayment(true);
                              }}
                              className="p-1 bg-green-500 hover:bg-green-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Ödeme Yap"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleEditReminder(reminder)}
                            className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        )}
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
                        <p className="font-medium text-gray-800 text-xs pr-8 mb-1.5 line-clamp-1">{displayTitle}</p>
                        
                        <div className="space-y-0.5 mb-1.5">
                          {reminder.type === 'creditCard' && card && (
                            <>
                              <div className="flex items-center gap-1 text-xs text-gray-700">
                                <svg className="w-3 h-3 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span className="truncate font-semibold">
                                  {user?.role === 'superadmin' || user?.role === 'admin' 
                                    ? card.code 
                                    : '****-****-****-' + card.code.slice(-4)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">{card.bank || 'Banka Yok'}</span>
                              </div>
                              {(card.owner_name || card.name) && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  <span className="truncate">{card.owner_name || card.name}</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {reminder.type === 'cari' && cari && (
                            <>
                              <div className="flex items-center gap-1 text-xs text-gray-700">
                                <svg className="w-3 h-3 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="truncate font-semibold">{cari.name}</span>
                              </div>
                              {reminder.paymentType && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="truncate">{reminder.paymentType.toUpperCase()}</span>
                                </div>
                              )}
                              {reminder.amount && (
                                <div className="flex items-center gap-1 text-xs text-gray-700">
                                  <svg className="w-3 h-3 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="truncate font-semibold">{parseFloat(reminder.amount).toLocaleString('tr-TR')} ₺</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {(reminder.dayStart || reminder.dayEnd) && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">Gün: {reminder.dayStart}-{reminder.dayEnd}</span>
                            </div>
                          )}
                        </div>
                        
                        {reminder.description && reminder.type === 'general' && (
                          <p className="text-xs text-gray-600 mb-1.5 line-clamp-2">{reminder.description}</p>
                        )}
                        
                        {reminder.remainingCount !== undefined && !reminder.repeatMonthly && (
                          <div className="mt-1.5 pt-1.5 border-t border-purple-300">
                            <p className="text-xs text-gray-700 font-semibold">
                              Kalan Ödeme: {reminder.remainingCount} / {reminder.paymentCount || '?'}
                            </p>
                          </div>
                        )}
                        {reminder.repeatMonthly && reminder.paymentCount && (
                          <div className="mt-1.5 pt-1.5 border-t border-purple-300">
                            <p className="text-xs text-gray-700 font-semibold">
                              Bu Ay Yapılan: {reminder.remainingCount || 0} / {reminder.paymentCount}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {customReminders.filter(r => r.repeatMonthly && (r.remainingCount || 0) < (r.paymentCount || 1)).length > 0 && (
              <div className="col-span-3">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <h4 className="font-semibold text-gray-700">Döngüsel Hatırlatmalar</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {customReminders.filter(r => r.repeatMonthly && (r.remainingCount || 0) < (r.paymentCount || 1)).map(reminder => {
                    const card = cards.find(c => c.id === reminder.creditCardId);
                    const cari = cariList.find(c => c.id === reminder.cariId);
                    
                    let displayTitle = reminder.title;
                    if (reminder.type === 'creditCard') {
                      displayTitle = `${card?.owner_name || card?.name || 'Kart'} Ödeme Hatırlatması`;
                    } else if (reminder.type === 'cari') {
                      const paymentMethod = reminder.paymentType ? ` (${reminder.paymentType.toUpperCase()})` : '';
                      displayTitle = `${cari?.name || 'Cari'} Ödeme Hatırlatması${paymentMethod}`;
                    }
                    
                    return (
                      <div key={reminder.id} className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 group relative hover:shadow-md transition-shadow">
                        {canEdit && (
                        <div className="absolute top-1.5 right-1.5 flex gap-1">
                          {(reminder.type === 'creditCard' || reminder.type === 'cari') && (
                            <button
                              onClick={() => {
                                setSelectedReminder(reminder);
                                setShowNewPayment(true);
                              }}
                              className="p-1 bg-green-500 hover:bg-green-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Ödeme Yap"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleEditReminder(reminder)}
                            className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-200 text-blue-700 rounded text-xs font-semibold">
                            {reminder.type === 'general' ? 'Genel' :
                             reminder.type === 'creditCard' ? 'Kredi Kartı' : 'Cari'}
                          </span>
                          {reminder.autoCloseOnPayment && (
                            <span className="px-2 py-0.5 bg-green-200 text-green-700 rounded text-xs font-semibold">
                              Oto. Kapat
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-800 text-xs pr-8 mb-1.5 line-clamp-1">{displayTitle}</p>
                        
                        <div className="space-y-0.5 mb-1.5">
                          {reminder.type === 'creditCard' && card && (
                            <>
                              <div className="flex items-center gap-1 text-xs text-gray-700">
                                <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span className="truncate font-semibold">
                                  {user?.role === 'superadmin' || user?.role === 'admin' 
                                    ? card.code 
                                    : '****-****-****-' + card.code.slice(-4)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">{card.bank || 'Banka Yok'}</span>
                              </div>
                              {(card.owner_name || card.name) && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  <span className="truncate">{card.owner_name || card.name}</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {reminder.type === 'cari' && cari && (
                            <>
                              <div className="flex items-center gap-1 text-xs text-gray-700">
                                <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="truncate font-semibold">{cari.name}</span>
                              </div>
                              {reminder.paymentType && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="truncate">{reminder.paymentType.toUpperCase()}</span>
                                </div>
                              )}
                              {reminder.amount && (
                                <div className="flex items-center gap-1 text-xs text-gray-700">
                                  <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="truncate font-semibold">{parseFloat(reminder.amount).toLocaleString('tr-TR')} ₺</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {(reminder.dayStart || reminder.dayEnd) && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">Gün: {reminder.dayStart}-{reminder.dayEnd}</span>
                            </div>
                          )}
                        </div>
                        
                        {reminder.description && reminder.type === 'general' && (
                          <p className="text-xs text-gray-600 mb-1.5 line-clamp-2">{reminder.description}</p>
                        )}
                        
                        {reminder.paymentCount && (
                          <div className="mt-1.5 pt-1.5 border-t border-blue-300">
                            <p className="text-xs text-gray-700 font-semibold">
                              Kalan Ödeme: {reminder.remainingCount || 0} / {reminder.paymentCount}
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
              <div>
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
              <div className="col-span-4 text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg">Hatırlatma yok</p>
              </div>
            )}
          </div>
          ) : (
            <div className="space-y-4">
              {customReminders.filter(r => !r.repeatMonthly).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Özel Hatırlatmalar
                  </h4>
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-purple-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700" style={{minWidth: '110px'}}>Tip</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Başlık</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Detay</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Gün Aralığı</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Durum</th>
                          {canEdit && <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">İşlem</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {customReminders.filter(r => !r.repeatMonthly).map((reminder, idx) => {
                          const card = cards.find(c => c.id === reminder.creditCardId);
                          const cari = cariList.find(c => c.id === reminder.cariId);
                          let displayTitle = reminder.title;
                          if (reminder.type === 'creditCard') {
                            displayTitle = `${card?.owner_name || card?.name || 'Kart'} Ödeme Hatırlatması`;
                          } else if (reminder.type === 'cari') {
                            const paymentMethod = reminder.paymentType ? ` (${reminder.paymentType.toUpperCase()})` : '';
                            displayTitle = `${cari?.name || 'Cari'} Ödeme Hatırlatması${paymentMethod}`;
                          }
                          return (
                            <tr key={reminder.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 text-xs">
                                <span className="px-2 py-1 bg-purple-200 text-purple-700 rounded font-semibold">
                                  {reminder.type === 'general' ? 'Genel' : reminder.type === 'creditCard' ? 'Kredi Kartı' : 'Cari'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">{displayTitle}</td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {reminder.type === 'creditCard' && card && `${user?.role === 'superadmin' || user?.role === 'admin' ? card.code : '****-****-****-' + card.code.slice(-4)} - ${card.bank}`}
                                {reminder.type === 'cari' && cari && (
                                  <>
                                    {cari.name}
                                    {reminder.amount && ` - ${parseFloat(reminder.amount).toLocaleString('tr-TR')} ₺`}
                                  </>
                                )}
                                {reminder.type === 'general' && reminder.description}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {reminder.dayStart && reminder.dayEnd ? `${reminder.dayStart}-${reminder.dayEnd}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                                {reminder.remainingCount !== undefined ? `${reminder.remainingCount}/${reminder.paymentCount}` : '-'}
                              </td>
                              {canEdit && (
                              <td className="px-4 py-3 text-center">
                                {(reminder.type === 'creditCard' || reminder.type === 'cari') && (
                                  <button onClick={() => { setSelectedReminder(reminder); setShowNewPayment(true); }} className="p-1 bg-green-500 hover:bg-green-600 text-white rounded mr-1" title="Ödeme Yap">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                )}
                                <button onClick={() => handleEditReminder(reminder)} className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded mr-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button onClick={() => handleDeleteReminder(reminder.id)} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {customReminders.filter(r => r.repeatMonthly && (r.remainingCount || 0) < (r.paymentCount || 1)).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Döngüsel Hatırlatmalar
                  </h4>
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700" style={{minWidth: '110px'}}>Tip</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Başlık</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Detay</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Gün Aralığı</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Durum</th>
                          {canEdit && <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">İşlem</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {customReminders.filter(r => r.repeatMonthly && (r.remainingCount || 0) < (r.paymentCount || 1)).map((reminder, idx) => {
                          const card = cards.find(c => c.id === reminder.creditCardId);
                          const cari = cariList.find(c => c.id === reminder.cariId);
                          let displayTitle = reminder.title;
                          if (reminder.type === 'creditCard') {
                            displayTitle = `${card?.owner_name || card?.name || 'Kart'} Ödeme Hatırlatması`;
                          } else if (reminder.type === 'cari') {
                            const paymentMethod = reminder.paymentType ? ` (${reminder.paymentType.toUpperCase()})` : '';
                            displayTitle = `${cari?.name || 'Cari'} Ödeme Hatırlatması${paymentMethod}`;
                          }
                          return (
                            <tr key={reminder.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 text-xs">
                                <span className="px-2 py-1 bg-blue-200 text-blue-700 rounded font-semibold">
                                  {reminder.type === 'general' ? 'Genel' : reminder.type === 'creditCard' ? 'Kredi Kartı' : 'Cari'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">{displayTitle}</td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {reminder.type === 'creditCard' && card && `${user?.role === 'superadmin' || user?.role === 'admin' ? card.code : '****-****-****-' + card.code.slice(-4)} - ${card.bank}`}
                                {reminder.type === 'cari' && cari && (
                                  <>
                                    {cari.name}
                                    {reminder.amount && ` - ${parseFloat(reminder.amount).toLocaleString('tr-TR')} ₺`}
                                  </>
                                )}
                                {reminder.type === 'general' && reminder.description}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {reminder.dayStart && reminder.dayEnd ? `${reminder.dayStart}-${reminder.dayEnd}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                                {reminder.paymentCount ? `${reminder.remainingCount || 0}/${reminder.paymentCount}` : '-'}
                              </td>
                              {canEdit && (
                              <td className="px-4 py-3 text-center">
                                {(reminder.type === 'creditCard' || reminder.type === 'cari') && (
                                  <button onClick={() => { setSelectedReminder(reminder); setShowNewPayment(true); }} className="p-1 bg-green-500 hover:bg-green-600 text-white rounded mr-1" title="Ödeme Yap">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                )}
                                <button onClick={() => handleEditReminder(reminder)} className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded mr-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button onClick={() => handleDeleteReminder(reminder.id)} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ReminderForm
        show={showAddReminder}
        onClose={() => {
          setShowAddReminder(false);
          setEditingReminder(null);
        }}
        reminder={editingReminder}
        onSave={handleSaveReminder}
        cards={cards}
        cariList={cariList}
      />

      <ReminderHistory
        show={showHistory}
        onClose={() => setShowHistory(false)}
        historyReminders={historyReminders}
        cards={cards}
        cariList={cariList}
      />

      {showPaymentModal && (
        <OdemeListesi
          selectedDate={selectedPaymentDate}
          payments={selectedPayments}
          onClose={() => {
            setShowPaymentModal(false);
            loadReminders();
          }}
          onEdit={() => setShowPaymentModal(false)}
          canEdit={canEdit}
        />
      )}

      {showNewPayment && selectedReminder && (
        <YeniOdeme
          selectedDate={new Date()}
          onClose={() => {
            setShowNewPayment(false);
            setSelectedReminder(null);
            loadAll();
            window.dispatchEvent(new Event('reminderUpdated'));
          }}
          preSelectedCard={selectedReminder.type === 'creditCard' ? selectedReminder.creditCardId : null}
          preSelectedCari={selectedReminder.type === 'cari' ? selectedReminder.cariId : null}
        />
      )}
    </div>
  );
}
