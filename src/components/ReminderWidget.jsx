import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import ReminderForm from './ReminderForm';
import YeniOdeme from './YeniOdeme';
import ReminderDetail from './ReminderDetail';

export default function ReminderWidget({ isOpen, onToggle }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [cariList, setCariList] = useState([]);
  const [cardUsages, setCardUsages] = useState({});
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [paymentReminder, setPaymentReminder] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailReminder, setDetailReminder] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));
  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor';

  const getReminderColor = (type) => {
    switch(type) {
      case 'creditCard': return '#2563eb';
      case 'cari': return '#16a34a';
      default: return '#9333ea';
    }
  };

  const getReminderIcon = (type) => {
    if (type === 'creditCard') {
      return (
        <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    } else if (type === 'cari') {
      return (
        <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    }
    return (
      <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    );
  };

  const getReminderTitle = (reminder) => {
    if (reminder.type === 'creditCard') {
      return reminder.cardName || 'Kredi Kartı Ödemesi';
    } else if (reminder.type === 'cari') {
      return reminder.cariName || 'Cari Ödemesi';
    }
    return reminder.title || 'Hatırlatma';
  };

  useEffect(() => {
    if (isOpen) {
      loadReminders();
    }
  }, [isOpen]);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const allReminders = await firestore.getReminders();
      const cardsData = await firestore.getCreditCards();
      const cariData = await firestore.getCari();
      const allPayments = await firestore.getPayments();
      const today = new Date().getDate();
      
      const usages = {};
      allPayments.forEach(payment => {
        if (payment.credit_card_id) {
          usages[payment.credit_card_id] = (usages[payment.credit_card_id] || 0) + payment.amount;
        }
      });
      
      const activeReminders = [];
      
      allReminders.forEach(r => {
        if (r.isActive === false) return;
        if (r.status === 'completed') return;
        if (r.paymentCount && r.remainingCount !== undefined && r.remainingCount === 0 && !r.repeatMonthly) return;
        
        // Cari ve kart bilgilerini ekle
        const enrichedReminder = { ...r };
        
        if (r.type === 'creditCard') {
          const card = cardsData.find(c => c.id === r.creditCardId);
          if (card) {
            enrichedReminder.cardName = card.owner_name || card.name;
            enrichedReminder.cardCode = card.code;
            enrichedReminder.cardBank = card.bank;
            enrichedReminder.debt = Math.abs(usages[card.id] || 0);
          }
        } else if (r.type === 'cari') {
          const cari = cariData.find(c => c.id === r.cariId);
          if (cari) {
            enrichedReminder.cariName = cari.name;
          }
        }
        
        if (r.type === 'creditCard' || r.type === 'cari') {
          const startDay = parseInt(r.dayStart) || 0;
          const endDay = parseInt(r.dayEnd) || 0;
          
          if (startDay && endDay) {
            const reminderStart = startDay - 5;
            const reminderEnd = endDay + 5;
            
            let isInRange = false;
            
            if (reminderStart >= 1 && reminderEnd <= 31) {
              isInRange = today >= reminderStart && today <= reminderEnd;
            } else if (reminderStart < 1) {
              isInRange = today >= (31 + reminderStart) || today <= reminderEnd;
            } else if (reminderEnd > 31) {
              isInRange = today >= reminderStart || today <= (reminderEnd - 31);
            }
            
            if (isInRange) {
              activeReminders.push(enrichedReminder);
            }
          } else {
            activeReminders.push(enrichedReminder);
          }
        } else {
          activeReminders.push(enrichedReminder);
        }
      });
      
      setCards(cardsData);
      setCariList(cariData);
      setCardUsages(usages);
      setReminders(activeReminders);
    } catch (error) {
      console.error('Hatırlatmalar yüklenirken hata:', error);
    }
    setLoading(false);
  };

  const handleEdit = (reminder) => {
    setSelectedReminder(reminder);
    setShowReminderForm(true);
  };

  const handleDelete = (reminder) => {
    setReminderToDelete(reminder);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reminderToDelete) return;
    try {
      await firestore.deleteReminder(reminderToDelete.id);
      setShowDeleteModal(false);
      setReminderToDelete(null);
      loadReminders();
      window.dispatchEvent(new Event('reminderUpdated'));
    } catch (error) {
      console.error('Hatırlatma silinirken hata:', error);
    }
  };

  const handlePayment = (reminder) => {
    setPaymentReminder(reminder);
    setShowNewPayment(true);
  };

  const getActiveReminders = () => reminders.filter(r => !r.repeatMonthly);
  const getRecurringReminders = () => reminders.filter(r => r.repeatMonthly && (r.remainingCount || 0) < (r.paymentCount || 1));

  return (
    <>
      {/* Açma Butonu - Sağ üstte yuvarlak ikon (sadece kapalıyken göster) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          style={{
            position: 'fixed',
            right: '20px',
            top: '110px',
            width: '48px',
            height: '48px',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
            e.currentTarget.style.borderColor = '#9333ea';
            e.currentTarget.style.color = '#9333ea';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.color = '#6b7280';
          }}
          title="Hatırlatmaları Aç"
        >
          <svg 
            style={{
              width: '24px', 
              height: '24px'
            }} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      )}

      {/* Widget Panel - Boşluksuz */}
      <div
        style={{
          position: 'fixed',
          right: isOpen ? '0' : '-280px',
          top: '80px',
          width: '280px',
          height: 'calc(100vh - 101px)',
          background: 'white',
          boxShadow: isOpen ? '-2px 0 10px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'right 0.3s ease',
          zIndex: 998,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #e5e7eb'
        }}
      >
        {/* Header - Minimal, boşluksuz */}
        <div style={{
          padding: '12px',
          borderBottom: '1px solid #e5e7eb',
          background: 'white'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <svg style={{width: '16px', height: '16px', color: '#9333ea'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 style={{margin: 0, fontSize: '13px', fontWeight: 700, color: '#111827'}}>Hatırlatmalar</h3>
              {reminders.length > 0 && (
                <span style={{
                  background: '#ede9fe',
                  color: '#7c3aed',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 600
                }}>
                  {reminders.length}
                </span>
              )}
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}>
              <button
                onClick={loadReminders}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Yenile"
              >
                <svg style={{width: '14px', height: '14px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={onToggle}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Kapat"
              >
                <svg style={{width: '14px', height: '14px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content - Boşluksuz, üstten başlıyor */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0',
          margin: '0'
        }}>
          {loading ? (
            <div style={{textAlign: 'center', padding: '40px 20px', color: '#9ca3af'}}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #f3f4f6',
                borderTop: '3px solid #667eea',
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{fontSize: '13px'}}>Yükleniyor...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px 20px', color: '#9ca3af'}}>
              <svg style={{width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.4}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p style={{fontSize: '14px', fontWeight: 500, color: '#6b7280'}}>
                Hatırlatma Yok
              </p>
            </div>
          ) : (
            <div style={{padding: '8px'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {reminders.map(reminder => (
                <div
                  key={reminder.id}
                  onClick={() => {
                    setDetailReminder(reminder);
                    setShowDetail(true);
                  }}
                  style={{
                    padding: '10px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = getReminderColor(reminder.type);
                    const buttons = e.currentTarget.querySelector('.action-buttons');
                    if (buttons) buttons.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    const buttons = e.currentTarget.querySelector('.action-buttons');
                    if (buttons) buttons.style.opacity = '0';
                  }}
                >
                  {canEdit && (
                    <div 
                      className="action-buttons"
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        display: 'flex',
                        gap: '2px',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        zIndex: 10
                      }}
                    >
                      {(reminder.type === 'creditCard' || reminder.type === 'cari') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePayment(reminder);
                          }}
                          style={{
                            padding: '3px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Ödeme Yap"
                        >
                          <svg style={{width: '10px', height: '10px', pointerEvents: 'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(reminder);
                        }}
                        style={{
                          padding: '3px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Düzenle"
                      >
                        <svg style={{width: '10px', height: '10px', pointerEvents: 'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(reminder);
                        }}
                        style={{
                          padding: '3px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Sil"
                      >
                        <svg style={{width: '10px', height: '10px', pointerEvents: 'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div style={{display: 'flex', alignItems: 'start', gap: '8px', marginBottom: '8px'}}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      background: `${getReminderColor(reminder.type)}15`,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getReminderColor(reminder.type),
                      flexShrink: 0
                    }}>
                      <div style={{width: '14px', height: '14px'}}>
                        {getReminderIcon(reminder.type)}
                      </div>
                    </div>
                    <div style={{flex: 1, minWidth: 0, paddingRight: canEdit ? '70px' : '0'}}>
                      <div style={{fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '2px', lineHeight: '1.3'}}>
                        {getReminderTitle(reminder)}
                      </div>
                      {reminder.type === 'creditCard' && reminder.cardBank && (
                        <div style={{fontSize: '10px', color: '#9ca3af', marginBottom: '2px'}}>
                          {reminder.cardBank}
                        </div>
                      )}
                      {reminder.description && (
                        <div style={{fontSize: '10px', color: '#6b7280', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                          {reminder.description.substring(0, 20)}{reminder.description.length > 20 ? '...' : ''}
                        </div>
                      )}
                      <div style={{fontSize: '10px', color: '#6b7280'}}>
                        {reminder.type === 'cari' && reminder.dateStart ? (
                          format(new Date(reminder.dateStart), 'd MMM yyyy', { locale: tr })
                        ) : (
                          `${reminder.dayStart}-${reminder.dayEnd}`
                        )}
                      </div>
                    </div>
                  </div>

                  {(reminder.amount || reminder.debt) && (
                    <div style={{
                      padding: '6px 8px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        {reminder.amount && (
                          <div style={{fontSize: '11px', fontWeight: 600, color: '#111827'}}>
                            {reminder.amount?.toLocaleString('tr-TR')} ₺
                          </div>
                        )}
                        {reminder.debt && (
                          <div style={{fontSize: '10px', fontWeight: 600, color: '#dc2626', marginTop: reminder.amount ? '2px' : '0'}}>
                            Borç: {reminder.debt?.toLocaleString('tr-TR')} ₺
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(reminder.remainingCount !== undefined || reminder.paymentCount) && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      borderTop: '1px solid #f3f4f6'
                    }}>
                      <div style={{fontSize: '10px', color: '#6b7280'}}>
                        Kalan
                      </div>
                      <div style={{
                        background: `${getReminderColor(reminder.type)}15`,
                        color: getReminderColor(reminder.type),
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {reminder.remainingCount || 0}/{reminder.paymentCount || reminder.remainingCount || 0}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ReminderForm
        show={showReminderForm}
        onClose={() => {
          setShowReminderForm(false);
          setSelectedReminder(null);
          loadReminders();
          window.dispatchEvent(new Event('reminderUpdated'));
        }}
        reminder={selectedReminder}
        onSave={async (formData) => {
          const reminderData = { ...formData };
          if (reminderData.paymentCount) reminderData.paymentCount = parseInt(reminderData.paymentCount);
          
          if (formData.type === 'creditCard' || formData.type === 'cari') {
            if (selectedReminder) {
              if (reminderData.repeatMonthly) {
                reminderData.remainingCount = selectedReminder.remainingCount || 0;
              } else {
                const completedPayments = (selectedReminder.paymentCount || 0) - (selectedReminder.remainingCount || 0);
                reminderData.remainingCount = Math.max(0, reminderData.paymentCount - completedPayments);
              }
            } else {
              reminderData.remainingCount = reminderData.repeatMonthly ? 0 : (reminderData.paymentCount || 0);
            }
          }
          
          if (selectedReminder) {
            await firestore.updateReminder(selectedReminder.id, reminderData);
          } else {
            await firestore.addReminder(reminderData);
          }
          
          setShowReminderForm(false);
          setSelectedReminder(null);
          loadReminders();
          window.dispatchEvent(new Event('reminderUpdated'));
        }}
        cards={cards}
        cariList={cariList}
      />

      {showNewPayment && paymentReminder && (
        <YeniOdeme
          selectedDate={new Date()}
          onClose={() => {
            setShowNewPayment(false);
            setPaymentReminder(null);
            loadReminders();
            window.dispatchEvent(new Event('reminderUpdated'));
          }}
          preSelectedCard={paymentReminder.type === 'creditCard' ? paymentReminder.creditCardId : null}
          preSelectedCari={paymentReminder.type === 'cari' ? paymentReminder.cariId : null}
        />
      )}

      {showDeleteModal && reminderToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{width: '24px', height: '24px', color: '#dc2626'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 style={{fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0}}>
                  Hatırlatmayı Sil
                </h3>
                <p style={{fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0'}}>
                  Bu işlem geri alınamaz
                </p>
              </div>
            </div>

            <p style={{fontSize: '14px', color: '#4b5563', marginBottom: '20px', lineHeight: '1.5'}}>
              <strong>"{getReminderTitle(reminderToDelete)}"</strong> hatırlatmasını silmek istediğinize emin misiniz?
            </p>

            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setReminderToDelete(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      <ReminderDetail
        show={showDetail}
        onClose={() => {
          setShowDetail(false);
          setDetailReminder(null);
        }}
        reminder={detailReminder}
        cards={cards}
        cariList={cariList}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
