import { useState, useEffect, useRef } from 'react';
import * as firestore from '../firebase/firestore';
import * as XLSX from 'xlsx';

const TURKISH_BANKS = [
  'Akbank', 'Alternatif Bank', 'Anadolubank', 'Fibabanka', 'Şekerbank',
  'Turkish Bank', 'Türk Ekonomi Bankası', 'Türkiye İş Bankası', 'Yapı Kredi',
  'Ziraat Bankası', 'Halkbank', 'Vakıfbank', 'Garanti BBVA', 'QNB Finansbank',
  'ING', 'Denizbank', 'HSBC', 'Odeabank', 'Burgan Bank', 'ICBC Turkey',
  'Citibank', 'Rabobank', 'Bank of Tokyo-Mitsubishi', 'Intesa Sanpaolo',
  'Deutsche Bank', 'BNP Paribas', 'Societe Generale', 'JPMorgan Chase'
];

export default function Tanimlamalar({ user }) {
  const [activeTab, setActiveTab] = useState('kredi-karti');
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cariList, setCariList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor';

  const [formData, setFormData] = useState({ code: '', owner_name: '', card_category: '', bank: '', expiry_month: '', expiry_year: '', limit_amount: '', balance: '', current_debt: '', name: '', iban: '' });
  const [cardType, setCardType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });
  const [successModal, setSuccessModal] = useState({ show: false, message: '' });
  const [conflictModal, setConflictModal] = useState({ show: false, conflicts: [], pendingData: [] });
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const detectCardType = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('9')) return 'Troy';
    return '';
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    const parts = cleaned.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const formatIBAN = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 24);
    const parts = cleaned.match(/.{1,4}/g) || [];
    return 'TR' + parts.join(' ');
  };

  const handleIBANChange = (e) => {
    const value = e.target.value.replace(/^TR/i, '');
    setFormData({ ...formData, iban: formatIBAN(value) });
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData({ ...formData, code: formatted });
    setCardType(detectCardType(formatted));
  };

  const loadData = async () => {
    setCards(await firestore.getCreditCards(true));
    setAccounts(await firestore.getBankAccounts());
    setCategories(await firestore.getCategories());
    setCariList(await firestore.getCari());
  };

  const getFilteredData = () => {
    const term = searchTerm.toLowerCase();
    let data = [];
    
    if (activeTab === 'kredi-karti') {
      data = cards.filter(item => 
        String(item.code || '').toLowerCase().includes(term) ||
        String(item.owner_name || '').toLowerCase().includes(term) ||
        String(item.bank || '').toLowerCase().includes(term)
      );
    } else if (activeTab === 'banka-hesabi') {
      data = accounts.filter(item => 
        String(item.code || '').toLowerCase().includes(term) ||
        String(item.name || '').toLowerCase().includes(term)
      );
    } else if (activeTab === 'kategori') {
      data = categories.filter(item => 
        String(item.code || '').toLowerCase().includes(term) ||
        String(item.name || '').toLowerCase().includes(term)
      );
    } else if (activeTab === 'cari') {
      data = cariList.filter(item => 
        String(item.code || '').toLowerCase().includes(term) ||
        String(item.name || '').toLowerCase().includes(term)
      );
    }
    
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return data;
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredData = getFilteredData();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canEdit) {
      setErrorModal({ show: true, message: 'Düzenleme yetkiniz yok!' });
      return;
    }
    
    try {
      if (activeTab === 'kredi-karti') {
        const cardNumber = formData.code.replace(/\D/g, '');
        if (cardNumber.length !== 16) {
          setErrorModal({ show: true, message: 'Kart numarası 16 hane olmalıdır!' });
          return;
        }
        const data = { 
          code: formData.code,
          owner_name: formData.owner_name,
          card_category: formData.card_category,
          bank: formData.bank,
          card_type: cardType,
          expiry_date: `${formData.expiry_month}/${formData.expiry_year}`,
          limit_amount: parseFloat(formData.limit_amount)
        };
        if (editingId) {
          await firestore.updateDocument('creditCards', editingId, data);
          if (user) {
            await firestore.addLog(user.username, 'Kredi Kartı Düzenlendi', `Kart: ${formData.code} | Banka: ${formData.bank}`);
          }
        } else {
          const cardId = await firestore.addCreditCard({ ...data, created_at: new Date().toISOString() });
          
          const debtAmount = parseFloat(formData.current_debt);
          await firestore.addPaymentWithId(`Devir_${cardId}`, {
            payment_date: new Date().toISOString().split('T')[0],
            amount: debtAmount,
            payment_type: 'kredi_karti',
            payment_method: 'devir',
            credit_card_id: cardId,
            description: 'Devir',
            bank_account_id: null,
            cari_id: null,
            category_id: null
          });
          if (user) {
            await firestore.addLog(user.username, 'Kredi Kartı Eklendi', `Kart: ${formData.code} | Banka: ${formData.bank} | Limit: ${parseFloat(formData.limit_amount).toLocaleString('tr-TR')} ₺`);
          }
        }
      } else if (activeTab === 'banka-hesabi') {
        const ibanNumber = formData.iban.replace(/^TR/i, '');
        if (ibanNumber.length !== 24) {
          setErrorModal({ show: true, message: 'IBAN 24 haneli olmalıdır!' });
          return;
        }
        const data = { 
          code: formData.code,
          name: formData.name,
          iban: formData.iban,
          balance: parseFloat(formData.balance || 0)
        };
        if (editingId) {
          await firestore.updateDocument('bankAccounts', editingId, data);
          if (user) {
            await firestore.addLog(user.username, 'Banka Hesabı Düzenlendi', `Kod: ${formData.code} | İsim: ${formData.name}`);
          }
        } else {
          await firestore.addBankAccount(data);
          if (user) {
            await firestore.addLog(user.username, 'Banka Hesabı Eklendi', `Kod: ${formData.code} | İsim: ${formData.name}`);
          }
        }
      } else if (activeTab === 'kategori') {
        const data = {
          code: formData.code,
          name: formData.name
        };
        if (editingId) {
          await firestore.updateDocument('categories', editingId, data);
          if (user) {
            await firestore.addLog(user.username, 'Kategori Düzenlendi', `Kod: ${formData.code} | İsim: ${formData.name}`);
          }
        } else {
          await firestore.addCategory(data);
          if (user) {
            await firestore.addLog(user.username, 'Kategori Eklendi', `Kod: ${formData.code} | İsim: ${formData.name}`);
          }
        }
      } else if (activeTab === 'cari') {
        const data = {
          code: formData.code,
          name: formData.name
        };
        if (editingId) {
          await firestore.updateDocument('cari', editingId, data);
          if (user) {
            await firestore.addLog(user.username, 'Cari Düzenlendi', `Kod: ${formData.code} | İsim: ${formData.name}`);
          }
        } else {
          await firestore.addCari(data);
          if (user) {
            await firestore.addLog(user.username, 'Cari Eklendi', `Kod: ${formData.code} | İsim: ${formData.name}`);
          }
        }
      }
    } catch (error) {
      setErrorModal({ show: true, message: error.message });
      return;
    }

    setFormData({ code: '', owner_name: '', card_category: '', bank: '', expiry_month: '', expiry_year: '', limit_amount: '', balance: '', current_debt: '', name: '', iban: '' });
    setCardType('');
    setEditingId(null);
    loadData();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    if (activeTab === 'kredi-karti') {
      const [month, year] = (item.expiry_date || '/').split('/');
      setFormData({
        code: item.code,
        owner_name: item.owner_name || '',
        card_category: item.card_category || '',
        bank: item.bank || '',
        expiry_month: month || '',
        expiry_year: year || '',
        limit_amount: item.limit_amount?.toString() || '',
        balance: '',
        current_debt: '',
        name: ''
      });
      setCardType(item.card_type || detectCardType(item.code));
    } else if (activeTab === 'banka-hesabi') {
      setFormData({
        code: item.code,
        name: item.name,
        iban: item.iban || '',
        owner_name: '',
        card_category: '',
        bank: '',
        expiry_month: '',
        expiry_year: '',
        limit_amount: '',
        balance: item.balance?.toString() || '',
        current_debt: ''
      });
    } else {
      setFormData({
        code: item.code || '',
        name: item.name,
        iban: '',
        owner_name: '',
        card_category: '',
        bank: '',
        expiry_month: '',
        expiry_year: '',
        limit_amount: '',
        balance: '',
        current_debt: ''
      });
    }
  };

  const handleDelete = async (collection, id) => {
    if (user?.role !== 'superadmin' && user?.role !== 'admin' && user?.role !== 'editor') {
      setErrorModal({ show: true, message: 'Silme yetkiniz yok!' });
      return;
    }
    
    if (confirm('Silmek istediğinize emin misiniz?')) {
      let itemToDelete = null;
      if (collection === 'creditCards') itemToDelete = cards.find(c => c.id === id);
      else if (collection === 'bankAccounts') itemToDelete = accounts.find(a => a.id === id);
      else if (collection === 'categories') itemToDelete = categories.find(c => c.id === id);
      else if (collection === 'cari') itemToDelete = cariList.find(c => c.id === id);
      
      await firestore.deleteDocument(collection, id);
      
      if (user && itemToDelete) {
        let logAction = '';
        let logDetails = '';
        if (collection === 'creditCards') {
          logAction = 'Kredi Kartı Silindi';
          logDetails = `Kart: ${itemToDelete.code} | Banka: ${itemToDelete.bank || '?'}`;
        } else if (collection === 'bankAccounts') {
          logAction = 'Banka Hesabı Silindi';
          logDetails = `Kod: ${itemToDelete.code} | İsim: ${itemToDelete.name}`;
        } else if (collection === 'categories') {
          logAction = 'Kategori Silindi';
          logDetails = `Kod: ${itemToDelete.code || '-'} | İsim: ${itemToDelete.name}`;
        } else if (collection === 'cari') {
          logAction = 'Cari Silindi';
          logDetails = `Kod: ${itemToDelete.code || '-'} | İsim: ${itemToDelete.name}`;
        }
        await firestore.addLog(user.username, logAction, logDetails);
      }
      
      loadData();
    }
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const conflicts = [];
      const pendingData = [];

      for (const row of jsonData) {
        let itemData, identifier;
        
        if (activeTab === 'cari') {
          itemData = {
            code: row['Kod'] || row['kod'] || '',
            name: row['İsim'] || row['isim'] || row['Ad'] || row['ad'] || ''
          };
          if (!itemData.code && !itemData.name) continue;
          identifier = itemData.code;
          const existing = cariList.find(c => c.code === identifier);
          if (existing) conflicts.push({ existing, new: itemData, type: 'cari' });
        } else if (activeTab === 'kategori') {
          itemData = {
            code: row['Kod'] || row['kod'] || '',
            name: row['İsim'] || row['isim'] || row['Ad'] || row['ad'] || ''
          };
          if (!itemData.code && !itemData.name) continue;
          identifier = itemData.code;
          const existing = categories.find(c => c.code === identifier);
          if (existing) conflicts.push({ existing, new: itemData, type: 'kategori' });
        } else if (activeTab === 'banka-hesabi') {
          itemData = {
            code: row['Kod'] || row['kod'] || '',
            name: row['İsim'] || row['isim'] || row['Ad'] || row['ad'] || '',
            iban: row['IBAN'] || row['iban'] || '',
            balance: parseFloat(row['Bakiye'] || row['bakiye'] || 0)
          };
          if (!itemData.code && !itemData.name) continue;
          identifier = itemData.code;
          const existing = accounts.find(a => a.code === identifier);
          if (existing) conflicts.push({ existing, new: itemData, type: 'banka-hesabi' });
        } else if (activeTab === 'kredi-karti') {
          const cardNumber = (row['Kart Numarası'] || row['kart numarası'] || row['Numara'] || row['numara'] || '').replace(/\D/g, '');
          if (cardNumber.length !== 16) continue;
          const formatted = cardNumber.match(/.{1,4}/g).join('-');
          itemData = {
            code: formatted,
            owner_name: row['Kullanıcı'] || row['kullanıcı'] || row['Kullanıcı İsmi'] || '',
            card_category: row['Tür'] || row['tür'] || row['Kart Türü'] || 'bireysel',
            bank: row['Banka'] || row['banka'] || '',
            card_type: detectCardType(formatted),
            expiry_date: row['S.K.T'] || row['skt'] || row['Son Kullanma'] || '',
            limit_amount: parseFloat(row['Limit'] || row['limit'] || 0),
            current_debt: parseFloat(row['Güncel Borç'] || row['güncel borç'] || row['Devir'] || row['devir'] || 0),
            created_at: new Date().toISOString()
          };
          identifier = formatted;
          const existing = cards.find(c => c.code === identifier);
          if (existing) conflicts.push({ existing, new: itemData, type: 'kredi-karti' });
        }

        pendingData.push({ data: itemData, identifier });
      }

      if (conflicts.length > 0) {
        setConflictModal({ show: true, conflicts, pendingData });
      } else {
        await processImport(pendingData);
      }
    } catch (error) {
      setErrorModal({ show: true, message: 'Excel dosyası okunamadı: ' + error.message });
    }

    e.target.value = '';
  };

  const processImport = async (pendingData, replaceConflicts = false) => {
    let successCount = 0;
    let errorCount = 0;

    for (const { data: itemData, identifier } of pendingData) {
      try {
        if (!itemData) {
          errorCount++;
          continue;
        }

        let existing = null;
        if (activeTab === 'cari') {
          existing = cariList.find(c => c.code === identifier);
          if (existing && replaceConflicts) {
            await firestore.updateDocument('cari', existing.id, itemData);
          } else if (!existing) {
            await firestore.addCari(itemData);
          } else {
            continue;
          }
        } else if (activeTab === 'kategori') {
          existing = categories.find(c => c.code === identifier);
          if (existing && replaceConflicts) {
            await firestore.updateDocument('categories', existing.id, itemData);
          } else if (!existing) {
            await firestore.addCategory(itemData);
          } else {
            continue;
          }
        } else if (activeTab === 'banka-hesabi') {
          existing = accounts.find(a => a.code === identifier);
          if (existing && replaceConflicts) {
            await firestore.updateDocument('bankAccounts', existing.id, itemData);
          } else if (!existing) {
            await firestore.addBankAccount(itemData);
          } else {
            continue;
          }
        } else if (activeTab === 'kredi-karti') {
          existing = cards.find(c => c.code === identifier);
          if (existing && replaceConflicts) {
            await firestore.updateDocument('creditCards', existing.id, {
              code: itemData.code,
              owner_name: itemData.owner_name,
              card_category: itemData.card_category,
              bank: itemData.bank,
              card_type: itemData.card_type,
              expiry_date: itemData.expiry_date,
              limit_amount: itemData.limit_amount
            });
            if (itemData.current_debt !== undefined) {
              await firestore.addPaymentWithId(`Devir_${existing.id}`, {
                payment_date: new Date().toISOString().split('T')[0],
                amount: itemData.current_debt,
                payment_type: 'kredi_karti',
                payment_method: 'devir',
                credit_card_id: existing.id,
                description: 'Devir',
                bank_account_id: null,
                cari_id: null,
                category_id: null
              });
            }
          } else if (!existing) {
            const cardId = await firestore.addCreditCard({
              code: itemData.code,
              owner_name: itemData.owner_name,
              card_category: itemData.card_category,
              bank: itemData.bank,
              card_type: itemData.card_type,
              expiry_date: itemData.expiry_date,
              limit_amount: itemData.limit_amount,
              created_at: itemData.created_at
            });
            if (itemData.current_debt !== undefined) {
              await firestore.addPaymentWithId(`Devir_${cardId}`, {
                payment_date: new Date().toISOString().split('T')[0],
                amount: itemData.current_debt,
                payment_type: 'kredi_karti',
                payment_method: 'devir',
                credit_card_id: cardId,
                description: 'Devir',
                bank_account_id: null,
                cari_id: null,
                category_id: null
              });
            }
          } else {
            continue;
          }
        }

        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    setSuccessModal({ 
      show: true, 
      message: `İçe aktarma tamamlandı!\n${successCount} kayıt eklendi${errorCount > 0 ? `, ${errorCount} kayıt başarısız` : ''}` 
    });
    loadData();
  };

  const handleExcelExport = async () => {
    let data = [];
    let filename = '';

    if (activeTab === 'kredi-karti') {
      const payments = await firestore.getPayments();
      data = cards.map(item => {
        const devirPayment = payments.find(p => p.id === `Devir_${item.id}`);
        return {
          'Kart Numarası': item.code,
          'Kullanıcı': item.owner_name,
          'Tür': item.card_category === 'bireysel' ? 'Bireysel' : 'Şirket',
          'Banka': item.bank,
          'Kart Tipi': item.card_type,
          'S.K.T': item.expiry_date,
          'Limit': item.limit_amount,
          'Güncel Borç': devirPayment?.amount || 0
        };
      });
      filename = 'kredi-kartlari.xlsx';
    } else if (activeTab === 'banka-hesabi') {
      data = accounts.map(item => ({
        'Kod': item.code,
        'İsim': item.name,
        'IBAN': item.iban || '',
        'Bakiye': item.balance
      }));
      filename = 'banka-hesaplari.xlsx';
    } else if (activeTab === 'kategori') {
      data = categories.map(item => ({
        'Kod': item.code || '',
        'İsim': item.name
      }));
      filename = 'kategoriler.xlsx';
    } else if (activeTab === 'cari') {
      data = cariList.map(item => ({
        'Kod': item.code || '',
        'İsim': item.name
      }));
      filename = 'cariler.xlsx';
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sayfa1');
    
    try {
      if (window.__TAURI__) {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        
        const filePath = await save({
          defaultPath: filename,
          filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        });

        if (filePath) {
          const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
          await writeFile(filePath, new Uint8Array(excelBuffer));
          setSuccessModal({ show: true, message: 'Dışarı aktarıldı' });
        }
      } else if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Excel Dosyası',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }]
        });
        
        const writable = await handle.createWritable();
        const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        await writable.write(excelBuffer);
        await writable.close();
        setSuccessModal({ show: true, message: 'Dışarı aktarıldı' });
      } else {
        XLSX.writeFile(workbook, filename);
        setSuccessModal({ show: true, message: 'Dışarı aktarıldı' });
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      setErrorModal({ show: true, message: 'Dosya kaydedilemedi: ' + error.message });
    }
  };

  return (
    <div style={{height: '100%', background: 'linear-gradient(to bottom right, #f9fafb, #dbeafe)', padding: '32px', overflowY: 'scroll', animation: 'pageFadeIn 0.3s ease-out'}}>
      {conflictModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={{ animation: 'fadeInBlur 0.3s ease-out forwards' }}
            onClick={() => setConflictModal({ show: false, conflicts: [], pendingData: [] })}
          ></div>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-[600px] p-6 relative z-10 max-h-[80vh] overflow-y-auto"
            style={{ animation: 'scaleIn 0.3s ease-out forwards' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Çakışma Tespit Edildi</h2>
              <button
                onClick={() => setConflictModal({ show: false, conflicts: [], pendingData: [] })}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <p className="text-gray-700">
                {conflictModal.conflicts.length} adet kayıt zaten mevcut. Bu kayıtları güncellemek istiyor musunuz?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                {conflictModal.conflicts.map((conflict, idx) => (
                  <div key={idx} className="text-sm text-gray-600 py-1">
                    • {conflict.type === 'kredi-karti' ? conflict.new.code : conflict.new.code || conflict.new.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  processImport(conflictModal.pendingData, true);
                  setConflictModal({ show: false, conflicts: [], pendingData: [] });
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
              >
                Evet, Güncelle
              </button>
              <button
                onClick={() => {
                  const nonConflictData = conflictModal.pendingData.filter(pd => 
                    !conflictModal.conflicts.some(c => 
                      (c.type === 'kredi-karti' ? c.new.code : c.new.code) === pd.identifier
                    )
                  );
                  processImport(nonConflictData, false);
                  setConflictModal({ show: false, conflicts: [], pendingData: [] });
                }}
                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all font-semibold shadow-lg"
              >
                Hayır, Atla
              </button>
            </div>
          </div>
        </div>
      )}
      {successModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={{ animation: 'fadeInBlur 0.3s ease-out forwards' }}
            onClick={() => setSuccessModal({ show: false, message: '' })}
          ></div>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-[500px] p-6 relative z-10"
            style={{ animation: 'scaleIn 0.3s ease-out forwards' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Başarılı</h2>
              <button
                onClick={() => setSuccessModal({ show: false, message: '' })}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-700 text-lg">{successModal.message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setSuccessModal({ show: false, message: '' })}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
      {errorModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={{
              animation: 'fadeInBlur 0.3s ease-out forwards'
            }}
            onClick={() => setErrorModal({ show: false, message: '' })}
          ></div>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-[500px] p-6 relative z-10"
            style={{
              animation: 'scaleIn 0.3s ease-out forwards'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Uyarı</h2>
              <button
                onClick={() => setErrorModal({ show: false, message: '' })}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-gray-700 text-lg">{errorModal.message}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setErrorModal({ show: false, message: '' })}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{maxWidth: '1000px', margin: '0 auto'}}>
        <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px'}}>
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('kredi-karti')}
            className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'kredi-karti' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Kredi Kartı
          </button>
          <button
            onClick={() => setActiveTab('banka-hesabi')}
            className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'banka-hesabi' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            Banka Hesabı
          </button>
          <button
            onClick={() => setActiveTab('kategori')}
            className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'kategori' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Ödeme Kategorisi
          </button>
          <button
            onClick={() => setActiveTab('cari')}
            className={`flex items-center gap-2 px-4 py-2 ${activeTab === 'cari' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Cari
          </button>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '40% 60%', gap: '24px'}}>
          {canEdit && (
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              İçe Aktar
            </button>
            <button
              type="button"
              onClick={handleExcelExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
              </svg>
              Dışa Aktar
            </button>
          </div>
          {activeTab === 'kredi-karti' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kart Numarası</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.code}
                  onChange={handleCardNumberChange}
                  placeholder="****-****-****-****"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                  required
                />
                {cardType && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600">
                    {cardType}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">16 haneli kart numaranızı girin</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kod</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          )}
          {activeTab !== 'kredi-karti' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İsim</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          )}
          {activeTab === 'kredi-karti' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı İsmi</label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Kart sahibinin adı"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kart Türü</label>
                <select
                  value={formData.card_category}
                  onChange={(e) => setFormData({ ...formData, card_category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Seçiniz</option>
                  <option value="bireysel">Bireysel</option>
                  <option value="sirket">Şirket</option>
                </select>
              </div>
            </>
          )}
          {activeTab === 'kredi-karti' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banka</label>
              <select
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Banka Seçin</option>
                {TURKISH_BANKS.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'kredi-karti' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Son Kullanma Tarihi</label>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={formData.expiry_month}
                  onChange={(e) => setFormData({ ...formData, expiry_month: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Ay</option>
                  {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                <select
                  value={formData.expiry_year}
                  onChange={(e) => setFormData({ ...formData, expiry_year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Yıl</option>
                  {Array.from({ length: 15 }, (_, i) => {
                    const year = (new Date().getFullYear() % 100) + i;
                    return <option key={year} value={year.toString().padStart(2, '0')}>{year}</option>;
                  })}
                </select>
              </div>
            </div>
          )}
          {activeTab === 'kredi-karti' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
              <input
                type="number"
                value={formData.limit_amount}
                onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          )}
          {activeTab === 'kredi-karti' && !editingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Güncel Borç</label>
              <input
                type="number"
                value={formData.current_debt}
                onChange={(e) => setFormData({ ...formData, current_debt: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Mevcut borç tutarını girin"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Bu değer devir kaydı olarak tabloya eklenecektir</p>
            </div>
          )}
          {activeTab === 'banka-hesabi' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={handleIBANChange}
                  placeholder="TR + 24 haneli numara"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">TR ile başlayan 26 karakterli IBAN numaranızı girin</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bakiye</label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </>
          )}
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {editingId ? 'Güncelle' : 'Kaydet'}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={() => {
                setEditingId(null);
                setFormData({ code: '', owner_name: '', card_category: '', bank: '', expiry_month: '', expiry_year: '', limit_amount: '', balance: '', current_debt: '', name: '', iban: '' });
                setCardType('');
              }}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              İptal
            </button>
          )}
        </form>

          </div>
          )}

          <div style={{gridColumn: canEdit ? 'auto' : '1 / -1'}}>
            <div className="mb-4">
              <div className="relative" style={{maxWidth: '450px'}}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ara..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="mb-3 text-sm text-gray-600">
              {filteredData.length} kayıt görüntüleniyor
            </div>

            <div className="overflow-x-auto" style={{maxHeight: '400px', overflowY: 'auto'}}>
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => handleSort('code')} className="px-3 py-2 text-left text-xs font-semibold cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">
                    {activeTab === 'kredi-karti' ? 'Kart Numarası' : 'Kod'}
                    {sortConfig.key === 'code' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                {activeTab !== 'kredi-karti' && (
                  <th onClick={() => handleSort('name')} className="px-3 py-2 text-left text-xs font-semibold cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      İsim
                      {sortConfig.key === 'name' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                )}
                {activeTab === 'banka-hesabi' && (
                  <th onClick={() => handleSort('iban')} className="px-3 py-2 text-left text-xs font-semibold cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      IBAN
                      {sortConfig.key === 'iban' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                )}
                {activeTab === 'kredi-karti' && (
                  <th onClick={() => handleSort('owner_name')} className="px-3 py-2 text-left text-xs font-semibold cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Kullanıcı
                      {sortConfig.key === 'owner_name' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                )}
                {activeTab === 'kredi-karti' && (
                  <th onClick={() => handleSort('bank')} className="px-3 py-2 text-left text-xs font-semibold cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center gap-1">
                      Banka
                      {sortConfig.key === 'bank' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                )}
                {activeTab === 'kredi-karti' && <th className="px-3 py-2 text-left text-xs font-semibold">S.K.T</th>}
                {activeTab === 'kredi-karti' && (
                  <th onClick={() => handleSort('limit_amount')} className="px-3 py-2 text-right text-xs font-semibold cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-end gap-1">
                      Limit
                      {sortConfig.key === 'limit_amount' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                )}
                {activeTab === 'banka-hesabi' && (
                  <th onClick={() => handleSort('balance')} className="px-3 py-2 text-right text-xs font-semibold cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-end gap-1">
                      Bakiye
                      {sortConfig.key === 'balance' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                )}
                {canEdit && <th className="px-3 py-2 text-right text-xs font-semibold">İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'kredi-karti' && filteredData.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">
                    {user?.role === 'superadmin' || user?.role === 'admin' 
                      ? item.code 
                      : '****-****-****-' + item.code.slice(-4)}
                  </td>
                  <td className="px-3 py-2 text-sm">{item.owner_name || '-'}</td>
                  <td className="px-3 py-2 text-sm">{item.bank || '-'}</td>
                  <td className="px-3 py-2 text-sm">{item.expiry_date || '-'}</td>
                  <td className="px-3 py-2 text-right text-sm">{item.limit_amount.toLocaleString('tr-TR')} ₺</td>
                  {canEdit && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-1.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 mr-1"
                      title="Düzenle"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor') && (
                      <button
                        onClick={() => handleDelete('creditCards', item.id)}
                        className="px-1.5 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        title="Sil"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                  )}
                </tr>
              ))}
              {activeTab === 'banka-hesabi' && filteredData.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{item.code}</td>
                  <td className="px-3 py-2 text-sm">{item.name}</td>
                  <td className="px-3 py-2 text-sm font-mono">{item.iban || '-'}</td>
                  <td className="px-3 py-2 text-right text-sm">{item.balance.toLocaleString('tr-TR')} ₺</td>
                  {canEdit && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-1.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 mr-1"
                      title="Düzenle"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor') && (
                      <button
                        onClick={() => handleDelete('bankAccounts', item.id)}
                        className="px-1.5 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        title="Sil"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                  )}
                </tr>
              ))}
              {activeTab === 'kategori' && filteredData.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{item.code}</td>
                  <td className="px-3 py-2 text-sm">{item.name}</td>
                  {canEdit && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-1.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 mr-1"
                      title="Düzenle"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor') && (
                      <button
                        onClick={() => handleDelete('categories', item.id)}
                        className="px-1.5 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        title="Sil"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                  )}
                </tr>
              ))}
              {activeTab === 'cari' && filteredData.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{item.code || '-'}</td>
                  <td className="px-3 py-2 text-sm">{item.name}</td>
                  {canEdit && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-1.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 mr-1"
                      title="Düzenle"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor') && (
                      <button
                        onClick={() => handleDelete('cari', item.id)}
                        className="px-1.5 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        title="Sil"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>
        </div>
        </div>
      </div>

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
    </div>
  );
}
