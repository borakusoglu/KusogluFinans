import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DuzenleOdeme from './DuzenleOdeme';
import * as firestore from '../firebase/firestore';

export default function OdemeListesi({ selectedDate, payments: initialPayments, onClose, canEdit = true }) {
  const [editingPayment, setEditingPayment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [payments, setPayments] = useState(initialPayments);

  useEffect(() => {
    const handleUpdate = () => {
      loadPayments();
    };
    window.addEventListener('reminderUpdated', handleUpdate);
    return () => window.removeEventListener('reminderUpdated', handleUpdate);
  }, [selectedDate]);

  const loadPayments = async () => {
    const allPayments = await firestore.getPayments({});
    const dayPayments = allPayments.filter(p => {
      if (p.payment_method === 'devir') return false;
      const compareDate = p.payment_method === 'cek' && p.due_date ? p.due_date : p.payment_date;
      return new Date(compareDate).toDateString() === selectedDate.toDateString();
    });
    const checkIssueDates = allPayments.filter(p => 
      p.payment_method === 'cek' && 
      p.payment_date && 
      new Date(p.payment_date).toDateString() === selectedDate.toDateString()
    );
    setPayments([...dayPayments, ...checkIssueDates]);
  };

  const handleDelete = async (id) => {
    setPaymentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;
    
    const payment = payments.find(p => p.id === paymentToDelete);
    await firestore.deletePayment(paymentToDelete);
      
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && payment) {
      let logDetails = '';
      
      if (payment.payment_type === 'kredi_karti') {
        logDetails = `Kredi Kartı: ${payment.credit_card_code || '?'} | Hesap: ${payment.bank_account_name || '?'} | Tarih: ${payment.payment_date} | Tutar: ${payment.amount.toLocaleString('tr-TR')} ₺`;
      } else if (payment.payment_type === 'cari') {
        const paymentMethodText = payment.payment_method === 'nakit' ? 'Nakit' :
                                  payment.payment_method === 'dbs' ? 'DBS' :
                                  payment.payment_method === 'havale' ? 'Havale' :
                                  payment.payment_method === 'kredi_karti' ? 'Kredi Kartı' :
                                  payment.payment_method === 'cek' ? 'Çek' : '?';
        
        if (payment.payment_method === 'cek') {
          logDetails = `Cari: ${payment.cari_name || '?'} | Ödeme: Çek | Kesim: ${payment.payment_date} | Vade: ${payment.due_date} | Tutar: ${payment.amount.toLocaleString('tr-TR')} ₺`;
        } else if (payment.payment_method === 'kredi_karti') {
          logDetails = `Cari: ${payment.cari_name || '?'} | Ödeme: Kredi Kartı (${payment.credit_card_code || '?'}) | Tarih: ${payment.payment_date} | Tutar: ${payment.amount.toLocaleString('tr-TR')} ₺`;
        } else {
          logDetails = `Cari: ${payment.cari_name || '?'} | Ödeme: ${paymentMethodText} | Tarih: ${payment.payment_date} | Tutar: ${payment.amount.toLocaleString('tr-TR')} ₺`;
        }
      } else {
        logDetails = `Serbest Ödeme | Tarih: ${payment.payment_date} | Tutar: ${payment.amount.toLocaleString('tr-TR')} ₺ | Açıklama: ${payment.description || '-'}`;
      }
      await firestore.addLog(user.username, 'Ödeme Silindi', logDetails);
    }
    
    setShowDeleteConfirm(false);
    setPaymentToDelete(null);
    loadPayments();
  };

  if (editingPayment) {
    return (
      <DuzenleOdeme
        payment={editingPayment}
        onClose={() => {
          setEditingPayment(null);
          loadPayments();
        }}
        onCancel={() => setEditingPayment(null)}
      />
    );
  }

  return (
    <>
    {showDeleteConfirm && (
      <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
        <div style={{backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%'}}>
          <h3 style={{fontSize: '18px', fontWeight: 600, color: '#1f2937', marginBottom: '12px'}}>Ödemeyi Sil</h3>
          <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '20px'}}>Bu ödemeyi silmek istediğinize emin misiniz?</p>
          <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
            <button
              onClick={() => { setShowDeleteConfirm(false); setPaymentToDelete(null); }}
              style={{padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer'}}
            >
              İptal
            </button>
            <button
              onClick={confirmDelete}
              style={{padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 500, cursor: 'pointer'}}
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    )}
    <div 
      style={{position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)'}}
      onClick={onClose}
    >
      <div style={{position: 'relative', zIndex: 10, display: 'flex', gap: '24px', maxHeight: '90vh'}}>
        {/* Sol Card - Ödeme Listesi */}
        <div style={{width: '800px', maxHeight: '750px', background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column'}} onClick={(e) => e.stopPropagation()}>
          <div style={{padding: '16px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(to right, #2563eb, #9333ea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2 style={{fontSize: '16px', fontWeight: 600, color: 'white'}}>
              {format(selectedDate, 'd.M.yyyy')}
            </h2>
            <button
              onClick={onClose}
              style={{color: 'white', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', border: 'none', cursor: 'pointer'}}
            >
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{flex: 1, overflowY: 'auto'}}>
            <div style={{display: 'grid', gridTemplateColumns: payments.some(p => p.payment_method === 'cek') ? (canEdit ? '50px 100px 180px 130px 1fr 100px 100px' : '50px 100px 180px 130px 1fr 100px') : (canEdit ? '50px 100px 210px 1fr 100px 100px' : '50px 100px 210px 1fr 100px'), gap: '8px', padding: '12px 16px', background: '#1e5a7d', color: 'white', fontWeight: 600, fontSize: '14px', position: 'sticky', top: 0}}>
              <div>#</div>
              <div>Ödeme Türü</div>
              <div>Kredi Kartı / Cari</div>
              {payments.some(p => p.payment_method === 'cek') && <div>Çek Tarihleri</div>}
              <div>Açıklama</div>
              <div style={{textAlign: 'right'}}>Tutar</div>
              {canEdit && <div style={{textAlign: 'center'}}>İşlem</div>}
            </div>
            {payments.map((payment, index) => {
              const isCheckIssueDate = payment.payment_method === 'cek' && 
                                       payment.payment_date && 
                                       new Date(payment.payment_date).toDateString() === selectedDate.toDateString();
              const isCheckDueDate = payment.payment_method === 'cek' && 
                                     payment.due_date && 
                                     new Date(payment.due_date).toDateString() === selectedDate.toDateString();
              
              return (
              <div key={payment.id} style={{display: 'grid', gridTemplateColumns: payments.some(p => p.payment_method === 'cek') ? (canEdit ? '50px 100px 180px 130px 1fr 100px 100px' : '50px 100px 180px 130px 1fr 100px') : (canEdit ? '50px 100px 210px 1fr 100px 100px' : '50px 100px 210px 1fr 100px'), gap: '8px', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', alignItems: 'center', background: index % 2 === 0 ? '#f3f4f6' : 'white'}}>
                <div style={{fontSize: '14px', fontWeight: 600, color: '#374151'}}>
                  {index + 1}
                </div>
                <div style={{fontSize: '13px', color: '#374151', fontWeight: 600}}>
                  {payment.payment_type === 'kredi_karti' ? 'Kredi Kartı' : isCheckIssueDate && !isCheckDueDate ? 'Çek Kesiliş' : 'Cari'}
                </div>
                <div style={{fontSize: '13px', color: '#111827'}}>
                  {payment.payment_type === 'kredi_karti' ? (
                    <div>
                      <div style={{fontWeight: 600, fontSize: '13px', marginBottom: '2px'}}>
                        {(() => {
                          const user = JSON.parse(localStorage.getItem('user'));
                          const code = payment.credit_card_code || payment.credit_card_name;
                          if (!code) return code;
                          if (user?.role === 'superadmin' || user?.role === 'admin') return code;
                          return '****-****-****-' + code.slice(-4);
                        })()}
                      </div>
                      <div style={{fontSize: '11px', color: '#6b7280'}}>{payment.bank_account_name}</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontWeight: 600, fontSize: '13px', marginBottom: '2px'}}>{payment.cari_name}</div>
                      <div style={{fontSize: '11px', color: '#6b7280'}}>
                        {payment.payment_method?.toUpperCase()}
                        {payment.payment_method === 'kredi_karti' && payment.credit_card_code && (() => {
                          const user = JSON.parse(localStorage.getItem('user'));
                          const code = payment.credit_card_code;
                          if (user?.role === 'superadmin' || user?.role === 'admin') return ` - ${code}`;
                          return ` - ****-****-****-${code.slice(-4)}`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                {payments.some(p => p.payment_method === 'cek') && (
                  <div style={{fontSize: '11px', color: '#374151'}}>
                    {payment.payment_method === 'cek' ? (
                      <div>
                        <div style={{color: '#6b7280'}}>Kesim: {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('tr-TR') : '-'}</div>
                        <div style={{color: '#7c3aed', fontWeight: 600, marginTop: '2px'}}>Vade: {payment.due_date ? new Date(payment.due_date).toLocaleDateString('tr-TR') : '-'}</div>
                      </div>
                    ) : '-'}
                  </div>
                )}
                <div style={{fontSize: '13px', color: '#374151'}}>
                  {payment.payment_method === 'cek' ? '-' : (payment.description || '-')}
                </div>
                <div style={{fontSize: '14px', textAlign: 'right', fontWeight: 600, color: '#111827'}}>
                  {isCheckIssueDate && !isCheckDueDate ? '-' : `${payment.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`}
                </div>
                {canEdit && (
                <div style={{textAlign: 'center', display: 'flex', gap: '6px', justifyContent: 'center'}}>
                  {!isCheckIssueDate || isCheckDueDate ? (
                    <>
                      <button
                        onClick={() => setEditingPayment(payment)}
                        style={{padding: '6px 10px', background: '#3b82f6', color: 'white', borderRadius: '4px', fontSize: '16px', border: 'none', cursor: 'pointer', width: '36px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                        title="Düzenle"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        style={{padding: '6px 10px', background: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '16px', border: 'none', cursor: 'pointer', width: '36px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                        title="Sil"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span style={{fontSize: '11px', color: '#7c3aed', fontWeight: 600}}>Kesiliş</span>
                  )}
                </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* Sağ Card - Notlar */}
        <div style={{width: '360px', flexShrink: 0, background: 'linear-gradient(to bottom, #ffffff, #f8fafc)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e5e7eb', padding: '24px', height: 'fit-content'}} onClick={(e) => e.stopPropagation()}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb'}}>
            <div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)'}}></div>
            <h3 style={{fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: 0}}>Notlar</h3>
          </div>
          
          {/* Toplam Ödeme */}
          <div style={{background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'}}>
            <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', fontWeight: 500}}>Toplam Ödeme</div>
            <div style={{fontSize: '30px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em'}}>
              {payments.reduce((sum, p) => {
                const isCheckIssueDate = p.payment_method === 'cek' && 
                                         p.payment_date && 
                                         new Date(p.payment_date).toDateString() === selectedDate.toDateString();
                const isCheckDueDate = p.payment_method === 'cek' && 
                                       p.due_date && 
                                       new Date(p.due_date).toDateString() === selectedDate.toDateString();
                if (isCheckIssueDate && !isCheckDueDate) return sum;
                return sum + p.amount;
              }, 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}
              <span style={{fontSize: '16px', fontWeight: 600, marginLeft: '4px'}}>TL</span>
            </div>
          </div>

          {/* Hesaplarda Bulunması Gereken */}
          <div>
            <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '12px', fontWeight: 600}}>Hesaplarda Bulunması Gereken</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {(() => {
                const accountSummary = {};
                let kasaTotal = 0;
                let havaleTotal = 0;
                let cariKrediKartiTotal = 0;
                
                payments.forEach(payment => {
                  // Çek kesiliş tarihlerini toplama dahil etme
                  const isCheckIssueDate = payment.payment_method === 'cek' && 
                                           payment.payment_date && 
                                           new Date(payment.payment_date).toDateString() === selectedDate.toDateString();
                  const isCheckDueDate = payment.payment_method === 'cek' && 
                                         payment.due_date && 
                                         new Date(payment.due_date).toDateString() === selectedDate.toDateString();
                  
                  if (isCheckIssueDate && !isCheckDueDate) {
                    return; // Sadece kesiliş tarihiyse toplama dahil etme
                  }
                  
                  if (payment.payment_type === 'kredi_karti') {
                    const account = payment.bank_account_name || 'Bilinmeyen Hesap';
                    accountSummary[account] = (accountSummary[account] || 0) + payment.amount;
                  } else if (payment.payment_type === 'cari') {
                    if (payment.payment_method === 'kredi_karti') {
                      cariKrediKartiTotal += payment.amount;
                    } else if (payment.payment_method === 'havale') {
                      havaleTotal += payment.amount;
                    } else if (payment.payment_method === 'cek') {
                      const account = payment.bank_account_name || 'Bilinmeyen Hesap';
                      accountSummary[account] = (accountSummary[account] || 0) + payment.amount;
                    } else if (payment.payment_method === 'dbs') {
                      const account = payment.bank_account_name || 'Bilinmeyen Hesap';
                      accountSummary[account] = (accountSummary[account] || 0) + payment.amount;
                    } else {
                      kasaTotal += payment.amount;
                    }
                  }
                });
                
                const hasData = Object.keys(accountSummary).length > 0 || kasaTotal > 0 || havaleTotal > 0 || cariKrediKartiTotal > 0;
                
                return hasData ? (
                  <>
                    {Object.entries(accountSummary).map(([account, amount]) => (
                      <div key={account} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'}}>
                        <span style={{fontSize: '13px', color: '#374151', fontWeight: 500}}>{account}</span>
                        <span style={{fontSize: '14px', color: '#1f2937', fontWeight: 700}}>{amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</span>
                      </div>
                    ))}
                    {kasaTotal > 0 && (
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'}}>
                        <span style={{fontSize: '13px', color: '#374151', fontWeight: 500}}>Kasa</span>
                        <span style={{fontSize: '14px', color: '#1f2937', fontWeight: 700}}>{kasaTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</span>
                      </div>
                    )}
                    {havaleTotal > 0 && (
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'}}>
                        <span style={{fontSize: '13px', color: '#374151', fontWeight: 500}}>Havale</span>
                        <span style={{fontSize: '14px', color: '#1f2937', fontWeight: 700}}>{havaleTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</span>
                      </div>
                    )}
                    {cariKrediKartiTotal > 0 && (
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'}}>
                        <span style={{fontSize: '13px', color: '#374151', fontWeight: 500}}>Cari (Kredi Kartı)</span>
                        <span style={{fontSize: '14px', color: '#1f2937', fontWeight: 700}}>{cariKrediKartiTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '16px', background: 'white', borderRadius: '8px', border: '1px dashed #e5e7eb'}}>Hesap bilgisi yok</div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
