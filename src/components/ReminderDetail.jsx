import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';

export default function ReminderDetail({ show, onClose, reminder, cards, cariList }) {
  const [logs, setLogs] = useState({ logs: [], payments: [] });
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (show && reminder) {
      loadLogs();
    }
  }, [show, reminder]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const allLogs = await firestore.getLogs();
    const allPayments = await firestore.getPayments();
    
    // Hatırlatma ile ilgili logları filtrele
    const relatedLogs = allLogs.filter(log => {
      if (!log.details) return false;
      return log.details.includes(reminder.id) || 
             (reminder.title && log.details.includes(reminder.title)) ||
             (reminder.type === 'creditCard' && reminder.creditCardId && log.details.includes(reminder.creditCardId)) ||
             (reminder.type === 'cari' && reminder.cariId && log.details.includes(reminder.cariId));
    });
    
    // Hatırlatma ile ilgili ödemeleri bul - sadece bu hatırlatmaya ait olanlar
    const relatedPayments = allPayments.filter(payment => {
      // reminderId ile eşleşenleri bul
      if (payment.reminderId === reminder.id) {
        return true;
      }
      // Eski ödemeler için tip ve ID kontrolü
      if (reminder.type === 'creditCard' && payment.payment_type === 'kredi_karti') {
        return payment.credit_card_id === reminder.creditCardId && payment.reminderId === reminder.id;
      }
      if (reminder.type === 'cari' && payment.payment_type === 'cari') {
        return payment.cari_id === reminder.cariId && payment.reminderId === reminder.id;
      }
      return false;
    });
    
    setLogs({ logs: relatedLogs, payments: relatedPayments });
    setLoadingLogs(false);
  };
  if (!show || !reminder) return null;

  const card = cards?.find(c => c.id === reminder.creditCardId);
  const cari = cariList?.find(c => c.id === reminder.cariId);

  const getTitle = () => {
    if (reminder.type === 'creditCard') {
      return card?.owner_name || card?.name || 'Kredi Kartı Ödemesi';
    } else if (reminder.type === 'cari') {
      return cari?.name || 'Cari Ödemesi';
    }
    return reminder.title || 'Hatırlatma';
  };

  const getTypeColor = () => {
    switch(reminder.type) {
      case 'creditCard': return '#2563eb';
      case 'cari': return '#16a34a';
      default: return '#9333ea';
    }
  };

  const getTypeName = () => {
    switch(reminder.type) {
      case 'creditCard': return 'Kredi Kartı';
      case 'cari': return 'Cari';
      default: return 'Genel';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${getTypeColor()}, ${getTypeColor()}dd)`,
          padding: '24px',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          color: 'white'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
            <div style={{flex: 1}}>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '12px'
              }}>
                {getTypeName()}
              </div>
              <h2 style={{fontSize: '24px', fontWeight: 'bold', margin: 0}}>
                {getTitle()}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{padding: '24px'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {/* Açıklama */}
            {reminder.description && (
              <div>
                <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600}}>
                  Açıklama
                </div>
                <div style={{
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#374151',
                  lineHeight: '1.5'
                }}>
                  {reminder.description}
                </div>
              </div>
            )}

            {/* Kredi Kartı Bilgileri */}
            {reminder.type === 'creditCard' && card && (
              <>
                <div>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600}}>
                    Kart Numarası
                  </div>
                  <div style={{fontSize: '14px', color: '#111827', fontFamily: 'monospace'}}>
                    {card.code}
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600}}>
                    Banka
                  </div>
                  <div style={{fontSize: '14px', color: '#111827'}}>
                    {card.bank || 'Belirtilmemiş'}
                  </div>
                </div>
              </>
            )}

            {/* Cari Bilgileri */}
            {reminder.type === 'cari' && (
              <>
                {reminder.paymentType && (
                  <div>
                    <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600}}>
                      Ödeme Şekli
                    </div>
                    <div style={{fontSize: '14px', color: '#111827', textTransform: 'uppercase'}}>
                      {reminder.paymentType}
                    </div>
                  </div>
                )}
                {reminder.amount && (
                  <div>
                    <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600}}>
                      Tutar
                    </div>
                    <div style={{fontSize: '20px', color: '#111827', fontWeight: 700}}>
                      {parseFloat(reminder.amount).toLocaleString('tr-TR')} ₺
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tarih Bilgileri */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              {reminder.dayStart && reminder.dayEnd && (
                <div>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600}}>
                    Gün Aralığı
                  </div>
                  <div style={{fontSize: '14px', color: '#111827', fontWeight: 600}}>
                    {reminder.dayStart} - {reminder.dayEnd}
                  </div>
                </div>
              )}
              {reminder.dateStart && (
                <div>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600}}>
                    Hatırlatma Tarihi
                  </div>
                  <div style={{fontSize: '14px', color: '#111827'}}>
                    {format(new Date(reminder.dateStart), 'd MMMM yyyy', { locale: tr })}
                  </div>
                </div>
              )}
            </div>

            {/* Ödeme Bilgileri */}
            {reminder.paymentCount && (
              <div style={{
                padding: '16px',
                background: `${getTypeColor()}10`,
                borderRadius: '12px',
                border: `2px solid ${getTypeColor()}30`
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: 600}}>
                      Kalan Ödeme
                    </div>
                    <div style={{fontSize: '24px', color: getTypeColor(), fontWeight: 700}}>
                      {reminder.remainingCount || 0} / {reminder.paymentCount}
                    </div>
                  </div>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: `${getTypeColor()}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getTypeColor(),
                    fontSize: '20px',
                    fontWeight: 700
                  }}>
                    {Math.round(((reminder.paymentCount - (reminder.remainingCount || 0)) / reminder.paymentCount) * 100)}%
                  </div>
                </div>
              </div>
            )}

            {/* Özellikler */}
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              {reminder.repeatMonthly && (
                <div style={{
                  padding: '6px 12px',
                  background: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  Her Ay Tekrarla
                </div>
              )}
              {reminder.autoCloseOnPayment && (
                <div style={{
                  padding: '6px 12px',
                  background: '#d1fae5',
                  color: '#065f46',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  Otomatik Kapat
                </div>
              )}
            </div>
          </div>
        </div>

        {/* İşlem Logları */}
        {logs.logs && logs.logs.length > 0 && (
          <div style={{padding: '24px', borderTop: '1px solid #e5e7eb'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              İşlem Geçmişi
            </h3>
            {loadingLogs ? (
              <div style={{textAlign: 'center', padding: '24px', color: '#9ca3af'}}>
                <div style={{width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite'}}></div>
                <p style={{fontSize: '14px'}}>Loglar yükleniyor...</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto'}}>
                {logs.logs.map((log, index) => (
                  <div key={index} style={{background: '#f9fafb', borderRadius: '8px', padding: '12px', border: '1px solid #e5e7eb'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span style={{fontSize: '13px', fontWeight: '600', color: '#1f2937'}}>{log.action}</span>
                        <span style={{fontSize: '12px', color: '#6b7280', fontWeight: '500'}}>- {log.username}</span>
                      </div>
                      <span style={{fontSize: '11px', color: '#9ca3af'}}>{log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString('tr-TR') : new Date(log.timestamp).toLocaleString('tr-TR')}</span>
                    </div>
                    {log.details && (
                      <p style={{fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: '1.4'}}>{log.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ödeme Özeti */}
        {logs.payments && logs.payments.length > 0 && (
          <div style={{padding: '24px', borderTop: '1px solid #e5e7eb'}}>
            <h3 style={{fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Ödeme Özeti
            </h3>
            <div style={{background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600}}>Toplam Ödenen</div>
                <div style={{fontSize: '24px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em'}}>
                  {logs.payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺
                </div>
              </div>
              <div style={{height: '1px', background: 'rgba(255, 255, 255, 0.3)', margin: '12px 0'}}></div>
              <div style={{fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)'}}>
                {logs.payments.length} ödeme yapıldı
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto'}}>
              {logs.payments.map((payment, index) => (
                <div key={index} style={{background: '#f0fdf4', borderRadius: '8px', padding: '12px', border: '1px solid #86efac'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px'}}>
                    <div>
                      <span style={{fontSize: '13px', fontWeight: '600', color: '#166534'}}>{payment.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</span>
                      <span style={{fontSize: '11px', color: '#16a34a', marginLeft: '8px'}}>{payment.payment_method?.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px'}}>
                    <span style={{fontSize: '12px', color: '#6b7280', fontWeight: '500'}}>{payment.username || 'Bilinmeyen'}</span>
                    <span style={{fontSize: '11px', color: '#9ca3af'}}>{payment.created_at ? new Date(payment.created_at).toLocaleString('tr-TR', {timeZone: 'Europe/Istanbul'}) : (payment.payment_date ? new Date(payment.payment_date).toLocaleString('tr-TR', {timeZone: 'Europe/Istanbul'}) : '-')}</span>
                  </div>
                  {payment.description && (
                    <p style={{fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0'}}>{payment.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Kapat
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
