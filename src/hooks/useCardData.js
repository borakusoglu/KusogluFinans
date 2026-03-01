import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';

export const useCardData = (showInactive) => {
  const [cards, setCards] = useState([]);
  const [cardUsages, setCardUsages] = useState({});
  const [usagesLoaded, setUsagesLoaded] = useState(false);

  const calculateCardUsage = (cardId, payments, card) => {
    const cardPayments = payments.filter(p => p.credit_card_id === cardId && (p.is_completed === true || p.payment_method === 'devir'));
    if (cardPayments.length === 0) return 0;
    
    const today = new Date();
    const currentDay = today.getDate();
    const statementDay = card?.statement_day;
    
    // Kesim gününden önceyse, sadece önceki dönem borçlarını hesapla
    const relevantPayments = cardPayments.filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      
      // Kesim günü tanımlı değilse tüm ödemeleri dahil et
      if (!statementDay) return true;
      
      // Kesim gününden önceyse, bu ay kesim gününden önceki ödemeleri hariç tut
      if (currentDay < statementDay) {
        // Bu ayın kesim gününden önceki ödemeleri hariç tut
        if (paymentDate.getMonth() === today.getMonth() && 
            paymentDate.getFullYear() === today.getFullYear() &&
            paymentDate.getDate() < statementDay) {
          return false;
        }
      }
      
      return true;
    });
    
    if (relevantPayments.length === 0) return 0;
    
    const sortedPayments = relevantPayments.sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
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
      usages[card.id] = calculateCardUsage(card.id, payments, card);
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
