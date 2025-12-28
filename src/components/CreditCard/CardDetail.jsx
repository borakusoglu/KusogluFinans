import { useState, useEffect } from 'react';
import * as firestore from '../../firebase/firestore';
import React from 'react';

const CurrencyInput = ({ value, onChange, required }) => {
  const inputRef = React.useRef(null);

  const handleChange = (e) => {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    let inputValue = input.value;
    
    inputValue = inputValue.replace(/[^0-9,]/g, '');
    
    const commaCount = (inputValue.match(/,/g) || []).length;
    if (commaCount > 1) {
      const firstCommaIndex = inputValue.indexOf(',');
      inputValue = inputValue.substring(0, firstCommaIndex + 1) + inputValue.substring(firstCommaIndex + 1).replace(/,/g, '');
    }
    
    const commaIndex = inputValue.indexOf(',');
    let displayValue = '';
    let numericValue = '';
    
    if (commaIndex !== -1) {
      let beforeComma = inputValue.substring(0, commaIndex);
      let afterComma = inputValue.substring(commaIndex + 1).substring(0, 2);
      const formattedInt = beforeComma.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      displayValue = formattedInt + ',' + afterComma;
      numericValue = beforeComma + '.' + afterComma;
    } else {
      const formattedInt = inputValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      displayValue = formattedInt;
      numericValue = inputValue;
    }
    
    input.value = displayValue;
    const newCursorPosition = cursorPosition + (displayValue.length - inputValue.length);
    input.setSelectionRange(newCursorPosition, newCursorPosition);
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

export default function CardDetail({ card, onBack, onReload, canEdit = true }) {
  const [cardPayments, setCardPayments] = useState([]);
  const [editingPayment, setEditingPayment] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loaded, setLoaded] = useState(false);
  const [showDevirModal, setShowDevirModal] = useState(false);
  const [devirData, setDevirData] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const allPayments = await firestore.getPayments();
    const filtered = allPayments
      .filter(p => p.credit_card_id === card.id)
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
    setCardPayments(filtered);
    setLoaded(true);
  };

  const handleDeletePayment = async (paymentId) => {
    if (confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) {
      const paymentToDelete = cardPayments.find(p => p.id === paymentId);
      
      await firestore.deleteDocument('payments', paymentId);
      
      // Log kaydı
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && paymentToDelete) {
        const logDetails = `Kart: ${card.code} | ${paymentToDelete.payment_type === 'kredi_karti' ? 'Borç' : 'Alacak'} | Tarih: ${paymentToDelete.payment_date} | Tutar: ${paymentToDelete.amount.toLocaleString('tr-TR')} ₺`;
        await firestore.addLog(user.username, 'Kart Ödemesi Silindi', logDetails);
      }
      
      loadPayments();
      onReload();
    }
  };

  const handleSavePayment = async (paymentId, newAmount, newDescription, newDate) => {
    const cleanAmount = newAmount.replace(/\./g, '').replace(',', '.');
    const payment = cardPayments.find(p => p.id === paymentId);
    const updates = {
      amount: parseFloat(cleanAmount),
      description: payment?.payment_method === 'devir' ? 'Devir' : newDescription
    };
    
    if (newDate) {
      updates.payment_date = newDate;
    }
    
    await firestore.updatePayment(paymentId, updates);
    
    // Log kaydı
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      const logDetails = `Kart: ${card.code} | ${payment?.payment_type === 'kredi_karti' ? 'Borç' : 'Alacak'} | Tarih: ${newDate || payment.payment_date} | Tutar: ${parseFloat(cleanAmount).toLocaleString('tr-TR')} ₺`;
      await firestore.addLog(user.username, 'Kart Ödemesi Düzenlendi', logDetails);
    }
    
    setEditingPayment(null);
    loadPayments();
    onReload();
  };

  const handleSaveDevir = async () => {
    if (!devirData.amount || parseFloat(devirData.amount) <= 0) {
      alert('Lütfen geçerli bir tutar girin');
      return;
    }

    await firestore.addPaymentWithId(`Devir_${card.id}`, {
      payment_date: devirData.date,
      amount: parseFloat(devirData.amount),
      payment_type: 'kredi_karti',
      payment_method: 'devir',
      credit_card_id: card.id,
      description: 'Devir',
      bank_account_id: null,
      cari_id: null,
      category_id: null
    });
    
    // Log kaydı
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      const logDetails = `Kart: ${card.code} | Devir | Tarih: ${devirData.date} | Tutar: ${parseFloat(devirData.amount).toLocaleString('tr-TR')} ₺`;
      await firestore.addLog(user.username, 'Devir Eklendi', logDetails);
    }

    setShowDevirModal(false);
    setDevirData({ amount: '', date: new Date().toISOString().split('T')[0] });
    loadPayments();
    onReload();
  };

  const hasDevir = cardPayments.some(p => p.payment_method === 'devir');

  const calculateBalance = (payments, index) => {
    const payment = payments[index];
    
    if (payment.payment_method === 'devir') {
      return payment.amount * -1;
    }
    
    if (index === 0) return 0;
    
    const prevBalance = calculateBalance(payments, index - 1);
    const debit = payment.payment_type === 'kredi_karti' ? payment.amount : 0;
    const credit = payment.payment_type === 'cari' ? payment.amount : 0;
    
    return prevBalance + debit - credit;
  };

  const filteredPayments = cardPayments.filter(payment => {
    const searchText = filterText.toLowerCase();
    const matchesText = (
      new Date(payment.payment_date).toLocaleDateString('tr-TR').includes(searchText) ||
      (payment.description || '').toLowerCase().includes(searchText) ||
      (payment.cari_name || '').toLowerCase().includes(searchText) ||
      payment.amount.toString().includes(searchText)
    );

    if (!matchesText) return false;

    if (dateRange.start || dateRange.end) {
      const paymentDate = new Date(payment.payment_date);
      if (dateRange.start && paymentDate < new Date(dateRange.start)) return false;
      if (dateRange.end && paymentDate > new Date(dateRange.end)) return false;
    }

    return true;
  });

  if (!loaded) {
    return <div style={{padding: '48px', textAlign: 'center', color: '#6b7280', fontSize: '18px'}}>Yükleniyor...</div>;
  }

  return (
    <>
      {showDevirModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDevirModal(false)}
          ></div>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Devir Ekle</h2>
              <button
                onClick={() => setShowDevirModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devir Tutarı</label>
                <CurrencyInput
                  value={devirData.amount}
                  onChange={(value) => setDevirData({ ...devirData, amount: value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devir Tarihi</label>
                <input
                  type="date"
                  value={devirData.date}
                  onChange={(e) => setDevirData({ ...devirData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveDevir}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
              >
                Kaydet
              </button>
              <button
                onClick={() => setShowDevirModal(false)}
                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all font-semibold shadow-lg"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
      {cardPayments.length > 0 && (
        <div style={{marginBottom: '24px'}}>
          <div style={{display: 'flex', gap: '16px'}}>
            <div style={{flex: 1, position: 'relative'}}>
              <svg style={{position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Filtrele (tarih, açıklama, tutar)..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{width: '100%', paddingLeft: '48px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px'}}
              />
            </div>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                style={{padding: '12px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', width: '160px'}}
              />
              <span style={{color: '#6b7280', fontWeight: 600}}>-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                style={{padding: '12px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', width: '160px'}}
              />
              {(dateRange.start || dateRange.end) && (
                <button
                  onClick={() => setDateRange({ start: '', end: '' })}
                  style={{padding: '12px 16px', background: '#ef4444', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600}}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {cardPayments.length === 0 ? (
        <div style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '64px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
          <div style={{background: 'rgba(255, 255, 255, 0.2)', borderRadius: '50%', width: '120px', height: '120px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <svg style={{width: '64px', height: '64px', color: 'white'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p style={{fontSize: '24px', color: 'white', fontWeight: 600, marginBottom: '8px'}}>Henüz ödeme kaydı yok</p>
          <p style={{fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '24px'}}>Bu kart için ilk ödemeyi ekleyin</p>
          {canEdit && (
          <button
            onClick={() => setShowDevirModal(true)}
            style={{padding: '12px 24px', background: 'white', color: '#667eea', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '16px'}}
          >
            Devir Ekle
          </button>
          )}
        </div>
      ) : (
        <>
          {!hasDevir && canEdit && (
            <div style={{marginBottom: '16px', padding: '12px 16px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <span style={{color: '#92400e', fontWeight: 500}}>Bu kart için devir kaydı bulunmuyor</span>
              <button
                onClick={() => setShowDevirModal(true)}
                style={{padding: '8px 16px', background: '#f59e0b', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600}}
              >
                Devir Ekle
              </button>
            </div>
          )}
        <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', minWidth: '1000px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '100px 1fr 140px 140px 140px 120px', gap: '16px', padding: '8px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151'}}>
            <div>Tarih</div>
            <div>Açıklama</div>
            <div style={{textAlign: 'right'}}>Borç</div>
            <div style={{textAlign: 'right'}}>Alacak</div>
            <div style={{textAlign: 'right'}}>Bakiye</div>
            {canEdit && <div style={{textAlign: 'center'}}>İşlem</div>}
          </div>
          {filteredPayments.map((payment, index) => {
            const balance = calculateBalance(filteredPayments, index);
            const isDebit = payment.payment_type === 'kredi_karti';
            const isCredit = payment.payment_type === 'cari';
            const isEditing = editingPayment === payment.id;
            
            return (
              <div key={payment.id} style={{display: 'grid', gridTemplateColumns: canEdit ? '100px 1fr 140px 140px 140px 120px' : '100px 1fr 140px 140px 140px', gap: '16px', padding: '8px 16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center', background: index % 2 === 0 ? '#f3f4f6' : 'white'}}>
                <div style={{fontSize: '13px', color: '#374151', fontWeight: 500}}>
                  {new Date(payment.payment_date).toLocaleDateString('tr-TR')}
                </div>
                <div style={{fontSize: '13px', color: '#111827'}}>
                  {isEditing ? (
                    payment.payment_method === 'devir' ? (
                      <input
                        type="date"
                        defaultValue={payment.payment_date}
                        style={{width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px'}}
                        id={`date-${payment.id}`}
                      />
                    ) : (
                      <input
                        type="text"
                        defaultValue={payment.description || payment.cari_name || ''}
                        style={{width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px'}}
                        id={`desc-${payment.id}`}
                      />
                    )
                  ) : (
                    <span style={{fontWeight: 500}}>{payment.description || payment.cari_name || '-'}</span>
                  )}
                </div>
                <div style={{fontSize: '14px', textAlign: 'right', fontWeight: 600, color: '#dc2626'}}>
                  {isDebit && payment.payment_method !== 'devir' ? (
                    isEditing ? (
                      <input
                        type="text"
                        defaultValue={payment.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                        style={{width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'right', fontSize: '13px'}}
                        id={`amount-${payment.id}`}
                      />
                    ) : (
                      `${payment.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺`
                    )
                  ) : ''}
                </div>
                <div style={{fontSize: '14px', textAlign: 'right', fontWeight: 600, color: '#16a34a'}}>
                  {isCredit || payment.payment_method === 'devir' ? (
                    isEditing ? (
                      <input
                        type="text"
                        defaultValue={payment.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                        style={{width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'right', fontSize: '13px'}}
                        id={`amount-${payment.id}`}
                      />
                    ) : (
                      `${payment.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺`
                    )
                  ) : ''}
                </div>
                <p style={{fontSize: '14px', textAlign: 'right', fontWeight: 700, color: balance < 0 ? '#dc2626' : '#059669'}}>
                  {balance.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺
                </p>
                {canEdit && (
                <div style={{textAlign: 'center'}}>
                  {isEditing ? (
                    <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
                      <button
                        onClick={() => {
                          const amount = document.getElementById(`amount-${payment.id}`).value;
                          const desc = document.getElementById(`desc-${payment.id}`)?.value;
                          const date = document.getElementById(`date-${payment.id}`)?.value;
                          handleSavePayment(payment.id, amount, desc || '', date);
                        }}
                        style={{padding: '6px 10px', background: '#16a34a', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer'}}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingPayment(null)}
                        style={{padding: '6px 10px', background: '#6b7280', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer'}}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
                      <button
                        onClick={() => setEditingPayment(payment.id)}
                        style={{padding: '6px 10px', background: '#3b82f6', color: 'white', borderRadius: '4px', fontSize: '16px', border: 'none', cursor: 'pointer'}}
                      >
                        ✎
                      </button>
                      {payment.payment_method !== 'devir' && (
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          style={{padding: '6px 10px', background: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '16px', border: 'none', cursor: 'pointer'}}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}
    </>
  );
}
