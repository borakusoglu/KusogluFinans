export const createPaymentLog = (paymentType, formData, cards, accounts, cariList) => {
  if (paymentType === 'kredi_karti') {
    const card = cards.find(c => c.id === formData.credit_card_id);
    const account = accounts.find(a => a.id === formData.bank_account_id);
    return `Kredi Kartı: ${card?.code || '?'} | Hesap: ${account?.name || '?'} | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
  }
  
  if (paymentType === 'cari') {
    const cari = cariList.find(c => c.id === formData.cari_id);
    const paymentMethodText = {
      'nakit': 'Nakit',
      'dbs': 'DBS',
      'havale': 'Havale',
      'kredi_karti': 'Kredi Kartı',
      'cek': 'Çek'
    }[formData.payment_method] || '?';
    
    if (formData.payment_method === 'cek') {
      return `Cari: ${cari?.name || '?'} | Ödeme: Çek | Kesim: ${formData.payment_date} | Vade: ${formData.due_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
    }
    
    if (formData.payment_method === 'kredi_karti') {
      const card = cards.find(c => c.id === formData.credit_card_id);
      return `Cari: ${cari?.name || '?'} | Ödeme: Kredi Kartı (${card?.code || '?'}) | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
    }
    
    return `Cari: ${cari?.name || '?'} | Ödeme: ${paymentMethodText} | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺`;
  }
  
  return `Serbest Ödeme | Tarih: ${formData.payment_date} | Tutar: ${parseFloat(formData.amount).toLocaleString('tr-TR')} ₺ | Açıklama: ${formData.description || '-'}`;
};
