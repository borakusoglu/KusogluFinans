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
      <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-h-[90vh] overflow-y-auto p-6 relative z-10">
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hatırlatma Tipi *</label>
            <select
              value={reminderType}
              onChange={(e) => {
                setReminderType(e.target.value);
                setFormData({ ...formData, type: e.target.value });
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Başlangıç Günü</label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bitiş Günü</label>
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
            </>
          )}

          {reminderType === 'cari' && (
            <>
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tutar</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  placeholder="Ödeme tutarı"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Başlangıç Günü</label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bitiş Günü</label>
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

import { useState, useEffect } from 'react';
