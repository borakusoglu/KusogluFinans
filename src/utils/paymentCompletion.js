import * as firestore from '../firebase/firestore';

export const handlePaymentCompletion = async (payment, loadPayments) => {
  const newCompletedStatus = !payment.is_completed;
  await firestore.updatePayment(payment.id, { is_completed: newCompletedStatus });
  loadPayments();
  window.dispatchEvent(new Event('cardDetailUpdated'));
};
