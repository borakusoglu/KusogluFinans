import { useState, useEffect } from 'react';
import * as firestore from '../firebase/firestore';

export default function useQuoteData() {
  const [payments, setPayments] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadQuoteData = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const allPayments = await firestore.getPayments({});
      const allCards = await firestore.getCreditCards();
      const allReminders = await firestore.getReminders();
      setPayments(allPayments);
      setCreditCards(allCards);
      setReminders(allReminders);
    } catch (error) {
      console.error('Quote data yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return { payments, creditCards, reminders, loadQuoteData, loading };
}
