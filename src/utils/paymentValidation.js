import * as firestore from '../firebase/firestore';
import { calculateCardBalance } from './cardBalanceCalculator';

export const validateCreditCardPayment = async (formData, cards, amount) => {
  const selectedCard = cards.find(c => c.id === formData.credit_card_id);
  if (!selectedCard) return null;

  const cardPayments = await firestore.getPayments({});
  const cardTransactions = cardPayments.filter(p => p.credit_card_id === formData.credit_card_id && (p.is_completed === true || p.payment_method === 'devir'));
  
  const currentBalance = calculateCardBalance(cardTransactions);
  const availableLimit = Math.min(selectedCard.limit_amount, selectedCard.limit_amount + currentBalance);
  const maxPayment = (-1) * currentBalance;
  
  if (amount > maxPayment) {
    return {
      cardName: selectedCard.name,
      limit: selectedCard.limit_amount,
      currentBalance: currentBalance,
      availableLimit: availableLimit,
      requestedAmount: amount,
      exceededAmount: amount - maxPayment,
      isLimitExceeded: false,
      isCreditCardPayment: false
    };
  }
  
  return null;
};

export const validateCariCreditCardPayment = async (formData, cards, amount) => {
  const selectedCard = cards.find(c => c.id === formData.credit_card_id);
  if (!selectedCard) return null;

  const cardPayments = await firestore.getPayments({});
  const cardTransactions = cardPayments.filter(p => p.credit_card_id === formData.credit_card_id && (p.is_completed === true || p.payment_method === 'devir'));
  
  const currentBalance = calculateCardBalance(cardTransactions);
  const availableLimit = Math.min(selectedCard.limit_amount, selectedCard.limit_amount + currentBalance);
  
  if (amount > availableLimit) {
    return {
      cardName: selectedCard.name,
      limit: selectedCard.limit_amount,
      currentBalance: currentBalance,
      availableLimit: availableLimit,
      requestedAmount: amount,
      exceededAmount: amount - availableLimit,
      isLimitExceeded: true,
      isCreditCardPayment: true
    };
  }
  
  return null;
};
