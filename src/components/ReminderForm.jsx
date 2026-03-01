import { useState, useEffect } from 'react';
import React from 'react';

const CurrencyInput = ({ value, onChange, required }) => {
  const inputRef = React.useRef(null);

  useEffect(() => {
    if (value && inputRef.current) {
      const numericValue = value.toString().replace('.', ',');
      const parts = numericValue.split(',');
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const displayValue = parts[1] !== undefined ? `${intPart},${parts[1]}` : intPart;
      inputRef.current.value = displayValue;
    }
  }, [value]);

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
        className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        placeholder="0,00"
        required={required}
      />
      <span style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontWeight: 600}}>₺</span>
    </div>
  );
};

export default function ReminderForm({ 
  show, 
  onClose, 
  reminder, 
  onSave,
  cards,
  cariList 
}) {
  const [reminderType, setReminderType] = useState(reminder?.type || 'general');
  const [formData, setFormData] = useState(reminder || { 
    type: 'general',
    title: '', 
    description: '',
    dayStart: '',
    dayEnd: '',
    dateStart: '',
    dateEnd: '',
    creditCardId: '',
    cariId: '',
    paymentType: '',
    amount: '',
    repeatMonthly: false,
    autoCloseOnPayment: false,
    paymentCount: ''
  });
  const [cardSearch, setCardSearch] = useState('');
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const [cariSearch, setCariSearch] = useState('');
  const [showCariDropdown, setShowCariDropdown] = useState(false);

  useEffect(() => {
    if (reminder) {
      setFormData(reminder);
      setReminderType(reminder.type);
      const card = cards.find(c => c.id === reminder.creditCardId);
      const cari = cariList.find(c => c.id === reminder.cariId);
      if (card) setCardSearch(`${card.code} - ${card.bank || 'Banka Yok'}`);
      if (cari) setCariSearch(cari.name);
    }
  }, [reminder, cards, cariList]);

  if (!show) return null;

  const handleSubmit = () => {
    if (reminderType === 'general' && !formData.title.trim()) return;
    if (reminderType === 'creditCard' && !formData.creditCardId) return;
    if (reminderType === 'cari' && !formData.cariId) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-h-[90vh] overflow-y-auto p-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{reminder ? 'Hatırlatmayı Düzenle' : 'Yeni Hatırlatma'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Hatırlatma Tipi *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setReminderType('general');
                  setFormData({ ...formData, type: 'general' });
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: reminderType === 'general' ? '#9333ea' : '#e5e7eb',
                  background: reminderType === 'general' ? 'linear-gradient(to bottom, #faf5ff, #f3e8ff)' : 'white',
                  color: reminderType === 'general' ? '#7e22ce' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: reminderType === 'general' ? '0 4px 6px -1px rgba(147, 51, 234, 0.1)' : 'none'
                }}
              >
                <svg style={{width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span style={{fontSize: '14px', fontWeight: 600}}>Genel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReminderType('creditCard');
                  setFormData({ ...formData, type: 'creditCard' });
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: reminderType === 'creditCard' ? '#2563eb' : '#e5e7eb',
                  background: reminderType === 'creditCard' ? 'linear-gradient(to bottom, #eff6ff, #dbeafe)' : 'white',
                  color: reminderType === 'creditCard' ? '#1e40af' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: reminderType === 'creditCard' ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none'
                }}
              >
                <svg style={{width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span style={{fontSize: '14px', fontWeight: 600}}>Kredi Kartı</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReminderType('cari');
                  setFormData({ ...formData, type: 'cari' });
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: reminderType === 'cari' ? '#16a34a' : '#e5e7eb',
                  background: reminderType === 'cari' ? 'linear-gradient(to bottom, #f0fdf4, #dcfce7)' : 'white',
                  color: reminderType === 'cari' ? '#15803d' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: reminderType === 'cari' ? '0 4px 6px -1px rgba(22, 163, 74, 0.1)' : 'none'
                }}
              >
                <svg style={{width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span style={{fontSize: '14px', fontWeight: 600}}>Cari</span>
              </button>
            </div>
          </div>

          {reminderType === 'general' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Başlık *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  placeholder="Hatırlatma başlığı"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
                  placeholder="Detaylı açıklama"
                  rows="3"
                />
              </div>
            </>
          )}

          {reminderType === 'creditCard' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kredi Kartı *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardSearch}
                      onChange={(e) => {
                        setCardSearch(e.target.value);
                        if (e.target.value.trim()) setShowCardDropdown(true);
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
                                setFormData({ ...formData, creditCardId: card.id });
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ödeme Sayısı</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.paymentCount}
                    onChange={(e) => setFormData({ ...formData, paymentCount: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    placeholder="Kaç ödeme?"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kesim Tarihi (Gün)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayStart}
                    onChange={(e) => setFormData({ ...formData, dayStart: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    placeholder="1-31"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ödeme Tarihi (Gün)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayEnd}
                    onChange={(e) => setFormData({ ...formData, dayEnd: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    placeholder="1-31"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.repeatMonthly}
                    onChange={(e) => setFormData({ ...formData, repeatMonthly: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Her ay tekrarla</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoCloseOnPayment}
                    onChange={(e) => setFormData({ ...formData, autoCloseOnPayment: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Ödeme yapılınca otomatik kapat</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
                  placeholder="Hatırlatma açıklaması"
                  rows="2"
                />
              </div>
            </>
          )}

          {reminderType === 'cari' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cari *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cariSearch}
                      onChange={(e) => {
                        setCariSearch(e.target.value);
                        if (e.target.value.trim()) setShowCariDropdown(true);
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
                          .filter(cari => cari.name.toLowerCase().includes(cariSearch.toLowerCase()))
                          .map(cari => (
                            <div
                              key={cari.id}
                              onClick={() => {
                                setFormData({ ...formData, cariId: cari.id });
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
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
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
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tutar</label>
                  <CurrencyInput
                    value={formData.amount}
                    onChange={(value) => setFormData({ ...formData, amount: value })}
                    required={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hatırlatma Tarihi</label>
                  <input
                    type="date"
                    value={formData.dateStart}
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ödeme Sayısı (Opsiyonel)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.paymentCount}
                    onChange={(e) => setFormData({ ...formData, paymentCount: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    placeholder="Kaç ödeme?"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.repeatMonthly}
                    onChange={(e) => setFormData({ ...formData, repeatMonthly: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Her ay tekrarla</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoCloseOnPayment}
                    onChange={(e) => setFormData({ ...formData, autoCloseOnPayment: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Ödeme yapılınca otomatik kapat</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
                  placeholder="Hatırlatma açıklaması"
                  rows="2"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={
              (reminderType === 'general' && !formData.title.trim()) ||
              (reminderType === 'creditCard' && !formData.creditCardId) ||
              (reminderType === 'cari' && !formData.cariId)
            }
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reminder ? 'Güncelle' : 'Ekle'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
