import * as firestore from '../firebase/firestore';

const checkPaymentInRange = (allPayments, payment, dayStart, dayEnd, paymentMonth, paymentYear, filterCondition) => {
  return allPayments.some(p => {
    if (!filterCondition(p)) return false;
    const pDate = new Date(p.payment_date);
    if (pDate.getMonth() !== paymentMonth || pDate.getFullYear() !== paymentYear) return false;
    const pDay = pDate.getDate();
    
    if (dayStart > dayEnd) {
      return pDay >= dayStart || pDay <= dayEnd;
    } else {
      return pDay >= dayStart && pDay <= dayEnd;
    }
  });
};

const shouldUpdateCreditCardReminder = (reminder, payment, allCards, allPayments, paymentMonth, paymentYear) => {
  const reminderCard = allCards.find(c => c.id === reminder.creditCardId);
  const paymentCard = allCards.find(c => c.id === payment.credit_card_id);
  
  if (!reminderCard || !paymentCard || reminderCard.code !== paymentCard.code) return false;
  
  if (reminder.dayStart && reminder.dayEnd) {
    const dayStart = parseInt(reminder.dayStart);
    const dayEnd = parseInt(reminder.dayEnd);
    
    return checkPaymentInRange(
      allPayments,
      payment,
      dayStart,
      dayEnd,
      paymentMonth,
      paymentYear,
      (p) => p.payment_type === 'kredi_karti' && p.credit_card_id === payment.credit_card_id
    );
  }
  
  return true;
};

const shouldUpdateCariReminder = (reminder, payment, allPayments, paymentMonth, paymentYear) => {
  if (reminder.paymentType && reminder.paymentType !== payment.payment_method) return false;
  
  if (reminder.dayStart && reminder.dayEnd) {
    const dayStart = parseInt(reminder.dayStart);
    const dayEnd = parseInt(reminder.dayEnd);
    
    return checkPaymentInRange(
      allPayments,
      payment,
      dayStart,
      dayEnd,
      paymentMonth,
      paymentYear,
      (p) => {
        if (p.payment_type !== 'cari' || p.cari_id !== payment.cari_id) return false;
        if (reminder.paymentType && p.payment_method !== reminder.paymentType) return false;
        return true;
      }
    );
  }
  
  return true;
};

const shouldUpdateCreditCardReminderForCariPayment = (reminder, payment, allCards, allPayments, paymentMonth, paymentYear) => {
  const reminderCard = allCards.find(c => c.id === reminder.creditCardId);
  const paymentCard = allCards.find(c => c.id === payment.credit_card_id);
  
  if (!reminderCard || !paymentCard || reminderCard.code !== paymentCard.code) return false;
  
  if (reminder.dayStart && reminder.dayEnd) {
    const dayStart = parseInt(reminder.dayStart);
    const dayEnd = parseInt(reminder.dayEnd);
    
    return checkPaymentInRange(
      allPayments,
      payment,
      dayStart,
      dayEnd,
      paymentMonth,
      paymentYear,
      (p) => p.payment_method === 'kredi_karti' && p.credit_card_id === payment.credit_card_id
    );
  }
  
  return true;
};

export const updateReminders = async (payment) => {
  const reminders = await firestore.getReminders();
  const allCards = await firestore.getCreditCards();
  const allPayments = await firestore.getPayments({});
  const paymentDate = new Date(payment.payment_date);
  const paymentMonth = paymentDate.getMonth();
  const paymentYear = paymentDate.getFullYear();
  
  for (const reminder of reminders) {
    let shouldUpdate = false;
    const updates = {};
    
    if (reminder.type === 'creditCard' && payment.payment_type === 'kredi_karti') {
      shouldUpdate = shouldUpdateCreditCardReminder(reminder, payment, allCards, allPayments, paymentMonth, paymentYear);
    }
    
    if (reminder.type === 'cari' && payment.payment_type === 'cari' && payment.cari_id === reminder.cariId) {
      shouldUpdate = shouldUpdateCariReminder(reminder, payment, allPayments, paymentMonth, paymentYear);
    }
    
    if (reminder.type === 'creditCard' && payment.payment_type === 'cari' && payment.payment_method === 'kredi_karti') {
      shouldUpdate = shouldUpdateCreditCardReminderForCariPayment(reminder, payment, allCards, allPayments, paymentMonth, paymentYear);
    }
    
    if (shouldUpdate) {
      if (reminder.repeatMonthly) {
        const currentCount = parseInt(reminder.remainingCount) || 0;
        updates.remainingCount = currentCount + 1;
      } else {
        const currentCount = parseInt(reminder.remainingCount) || 0;
        if (currentCount > 0) {
          updates.remainingCount = currentCount - 1;
        }
      }
      
      if (reminder.autoCloseOnPayment) {
        const newCount = updates.remainingCount !== undefined ? updates.remainingCount : (parseInt(reminder.remainingCount) || 0);
        if (newCount === 0 && !reminder.repeatMonthly) {
          updates.isActive = false;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await firestore.updateReminder(reminder.id, updates);
        await firestore.addReminderLog({
          action: 'payment',
          reminderType: reminder.type,
          reminderId: reminder.id,
          paymentDate: payment.payment_date,
          paymentAmount: payment.amount,
          details: `Ödeme yapıldı - ${payment.amount.toLocaleString('tr-TR')} ₺`
        });
      }
    }
  }
};
