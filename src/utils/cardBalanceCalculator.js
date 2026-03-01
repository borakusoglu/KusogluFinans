export const calculateCardBalance = (cardTransactions) => {
  const sortedPayments = cardTransactions.sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
  
  if (sortedPayments.length === 0) return 0;
  
  const calculateBalanceForUsage = (index) => {
    const payment = sortedPayments[index];
    if (payment.payment_method === 'devir') {
      return payment.amount * -1;
    }
    if (index === 0) return 0;
    const prevBalance = calculateBalanceForUsage(index - 1);
    const debit = payment.payment_type === 'kredi_karti' ? payment.amount : 0;
    const credit = payment.payment_type === 'cari' ? payment.amount : 0;
    return prevBalance + debit - credit;
  };
  
  return calculateBalanceForUsage(sortedPayments.length - 1);
};
