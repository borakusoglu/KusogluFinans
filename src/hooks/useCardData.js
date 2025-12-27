import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';

export const useCardData = (showInactive) => {
  const [cards, setCards] = useState([]);
  const [cardUsages, setCardUsages] = useState({});
  const [usagesLoaded, setUsagesLoaded] = useState(false);

  const calculateCardUsage = (cardId, payments) => {
    const cardPayments = payments.filter(p => p.credit_card_id === cardId);
    if (cardPayments.length === 0) return 0;
    
    const sortedPayments = cardPayments.sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
    const lastIndex = sortedPayments.length - 1;
    
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
    
    return calculateBalanceForUsage(lastIndex);
  };

  const loadCards = async () => {
    const data = await firestore.getCreditCards(showInactive);
    setCards(data);
    setUsagesLoaded(false);
  };

  const loadCardUsages = async () => {
    const payments = await firestore.getPayments();
    const usages = {};
    
    cards.forEach(card => {
      usages[card.id] = calculateCardUsage(card.id, payments);
    });
    
    setCardUsages(usages);
    setUsagesLoaded(true);
  };

  useEffect(() => {
    loadCards();
  }, [showInactive]);

  useEffect(() => {
    if (cards.length > 0) {
      loadCardUsages();
    } else {
      setUsagesLoaded(true);
    }
  }, [cards]);

  return { cards, cardUsages, usagesLoaded, loadCards };
};
