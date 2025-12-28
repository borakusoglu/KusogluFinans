import { useState } from 'react';
import * as firestore from '../firebase/firestore';

export default function ReminderHistory({ show, onClose, historyReminders, cards, cariList }) {
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [reminderLogs, setReminderLogs] = useState([]);

  if (!show) return null;

  const handleSelectHistory = async (reminder) => {
    setSelectedHistory(reminder);
    const allPayments = await firestore.getPayments();
    const filtered = allPayments.filter(p => p.reminderId === reminder.id);
    setReminderLogs(filtered);
  };

  const filteredReminders = historyReminders.filter(r => {
    const card = cards.find(c => c.id === r.creditCardId);
    const cari = cariList.find(c => c.id === r.cariId);
    const searchLower = historySearch.toLowerCase();
    return !historySearch || 
      r.title?.toLowerCase().includes(searchLower) ||
      card?.code?.toLowerCase().includes(searchLower) ||
      card?.name?.toLowerCase().includes(searchLower) ||
      cari?.name?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100]" style={{padding: '20px'}}>
      <div className="absolute inset-0 bg-black/50" onClick={() => {
        onClose();
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
            onClose();
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
            {filteredReminders.length === 0 ? (
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
                  {filteredReminders.map(reminder => {
                    const card = cards.find(c => c.id === reminder.creditCardId);
                    const cari = cariList.find(c => c.id === reminder.cariId);
                    
                    return (
                      <tr 
                        key={reminder.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${selectedHistory?.id === reminder.id ? 'bg-blue-50' : ''}`}
                        onClick={() => handleSelectHistory(reminder)}
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
                          {reminder.type === 'creditCard' && (card?.owner_name || card?.name) && (
                            <div className="text-xs text-gray-500">{card.owner_name || card.name}</div>
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
                        {(card.owner_name || card.name) && <p className="text-xs text-gray-600">{card.owner_name || card.name}</p>}
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
                  <p className="text-sm text-gray-500">Ödeme kaydı bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reminderLogs.map((payment, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-700">
                            {new Date(payment.payment_date).toLocaleDateString('tr-TR', {day: '2-digit', month: 'long', year: 'numeric'})}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {payment.amount?.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                      {payment.description && (
                        <p className="text-xs text-gray-600 ml-6">{payment.description}</p>
                      )}
                      {payment.createdAt && (
                        <p className="text-xs text-gray-400 ml-6 mt-1">
                          {new Date(payment.createdAt.seconds * 1000).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
