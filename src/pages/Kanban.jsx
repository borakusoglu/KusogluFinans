import { useState, useEffect, useRef } from 'react';
import * as firestore from '../firebase/firestore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import ReminderForm from '../components/ReminderForm';
import YeniOdeme from '../components/YeniOdeme';

export default function Kanban({ user, hideHeader = false, cards: propCards, cariList: propCariList, onReminderClick: propOnReminderClick }) {
  const [reminders, setReminders] = useState({ planned: [], inProgress: [], completed: [] });
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [draggedReminder, setDraggedReminder] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownTime, setMouseDownTime] = useState(0);
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [cards, setCards] = useState([]);
  const [cariList, setCariList] = useState([]);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [paymentReminder, setPaymentReminder] = useState(null);
  const dragTimeoutRef = useRef(null);
  const columnRefs = useRef({});

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    loadReminders();
    if (!propCards) loadCards();
    else setCards(propCards);
    if (!propCariList) loadCari();
    else setCariList(propCariList);
    window.addEventListener('reminderUpdated', loadReminders);
    return () => window.removeEventListener('reminderUpdated', loadReminders);
  }, []);

  useEffect(() => {
    if (propCards) setCards(propCards);
  }, [propCards]);

  useEffect(() => {
    if (propCariList) setCariList(propCariList);
  }, [propCariList]);

  const loadCards = async () => {
    const data = await firestore.getCreditCards();
    setCards(data);
  };

  const loadCari = async () => {
    const data = await firestore.getCari();
    setCariList(data);
  };



  // Mouse move listener
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && draggedReminder) {
        setDragPosition({ x: e.clientX, y: e.clientY });
      } else if (mouseDownTime && !isDragging) {
        const distance = Math.sqrt(
          Math.pow(e.clientX - mouseDownPos.x, 2) + 
          Math.pow(e.clientY - mouseDownPos.y, 2)
        );
        if (distance > 5) {
          if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
          }
          setMouseDownTime(0);
        }
      }
    };

    const handleMouseUpGlobal = (e) => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }

      if (isDragging && draggedReminder) {
        let targetColumn = null;
        
        for (const [columnKey, ref] of Object.entries(columnRefs.current)) {
          if (ref) {
            const rect = ref.getBoundingClientRect();
            if (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            ) {
              targetColumn = columnKey;
              break;
            }
          }
        }

        if (targetColumn) {
          handleDrop(targetColumn);
        }

        setIsDragging(false);
        setDraggedReminder(null);
      }
      
      setMouseDownTime(0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUpGlobal);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [isDragging, draggedReminder, mouseDownTime, mouseDownPos]);

  const loadReminders = async () => {
    try {
      const allReminders = await firestore.getReminders();
      const [cards, cariList] = await Promise.all([
        firestore.getCreditCards(),
        firestore.getCari()
      ]);

      const planned = [];
      const inProgress = [];
      const completed = [];

      allReminders.forEach(reminder => {
        if (reminder.isActive === false) return;

        let title = reminder.title;
        let description = '';

        if (reminder.type === 'creditCard') {
          const card = cards.find(c => c.id === reminder.creditCardId);
          title = `${card?.owner_name || card?.name || 'Kart'} Ödemesi`;
          description = `Gün: ${reminder.dayStart}-${reminder.dayEnd}`;
        } else if (reminder.type === 'cari') {
          const cari = cariList.find(c => c.id === reminder.cariId);
          title = `${cari?.name || 'Cari'} Ödemesi`;
          
          // Tarih formatı için
          let dateInfo = '';
          if (reminder.dateStart && reminder.dateEnd) {
            const startDate = new Date(reminder.dateStart);
            const endDate = new Date(reminder.dateEnd);
            dateInfo = `${format(startDate, 'd MMM', { locale: tr })} - ${format(endDate, 'd MMM yyyy', { locale: tr })}`;
          } else if (reminder.dayStart && reminder.dayEnd) {
            dateInfo = `Gün: ${reminder.dayStart}-${reminder.dayEnd}`;
          }
          
          description = reminder.paymentType 
            ? `${reminder.paymentType} | ${dateInfo}` 
            : dateInfo;
        }

        const reminderCard = {
          id: reminder.id,
          title,
          description,
          amount: reminder.amount,
          remainingCount: reminder.remainingCount,
          paymentCount: reminder.paymentCount,
          type: reminder.type,
          status: reminder.status || 'planned',
          data: reminder
        };

        if (reminder.status === 'completed') {
          completed.push(reminderCard);
        } else if (reminder.status === 'inProgress') {
          inProgress.push(reminderCard);
        } else {
          planned.push(reminderCard);
        }
      });

      setReminders({ planned, inProgress, completed });
    } catch (error) {
      console.error('Hatırlatmalar yüklenirken hata:', error);
    }
  };

  const handleReminderClick = (reminder) => {
    if (propOnReminderClick) {
      propOnReminderClick(reminder.data);
    } else if (canEdit) {
      setSelectedReminder(reminder.data);
      setShowReminderForm(true);
    }
  };

  const handleEdit = (reminder) => {
    setSelectedReminder(reminder.data);
    setShowReminderForm(true);
  };

  const handleDelete = (reminder) => {
    setReminderToDelete(reminder);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reminderToDelete) return;

    try {
      await firestore.deleteReminder(reminderToDelete.id);
      setShowDeleteModal(false);
      setReminderToDelete(null);
      loadReminders();
      window.dispatchEvent(new Event('reminderUpdated'));
    } catch (error) {
      console.error('Hatırlatma silinirken hata:', error);
      alert('Hatırlatma silinirken bir hata oluştu.');
    }
  };

  const handleMouseDown = (reminder, e) => {
    if (!canEdit) return;
    
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    setMouseDownTime(now);
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    
    dragTimeoutRef.current = setTimeout(() => {
      setDraggedReminder(reminder);
      setDragPosition({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
    }, 250);
  };

  const handleMouseUp = (reminder) => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
      
      if (!isDragging) {
        const duration = Date.now() - mouseDownTime;
        if (duration < 250) {
          handleReminderClick(reminder);
        }
      }
    }
    
    setMouseDownTime(0);
  };

  const handleDrop = async (targetColumn) => {
    if (!draggedReminder) return;

    let sourceColumn = null;

    for (const [col, items] of Object.entries(reminders)) {
      if (items.find(r => r.id === draggedReminder.id)) {
        sourceColumn = col;
        break;
      }
    }

    if (!sourceColumn || sourceColumn === targetColumn) {
      return;
    }

    const newReminders = { ...reminders };
    newReminders[sourceColumn] = newReminders[sourceColumn].filter(r => r.id !== draggedReminder.id);
    
    let updatedItem = { ...draggedReminder };
    
    try {
      let newStatus = targetColumn;
      updatedItem.status = newStatus;
      updatedItem.data = { ...draggedReminder.data, status: newStatus };
      
      await firestore.updateReminder(draggedReminder.id, { status: newStatus });
      
      newReminders[targetColumn] = [...newReminders[targetColumn], updatedItem];
      setReminders(newReminders);
      
      window.dispatchEvent(new Event('reminderUpdated'));
    } catch (error) {
      console.error("Error moving reminder:", error);
      loadReminders();
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: hideHeader ? 'transparent' : 'linear-gradient(to bottom right, #f9fafb, #eff6ff)',
      overflow: 'auto',
      padding: hideHeader ? '0' : '24px',
      position: 'relative'
    }}>
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        {/* Header */}
        {!hideHeader && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div>
              <h1 style={{fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: 0}}>
                Hatırlatma Yönetimi
              </h1>
              <p style={{color: '#4b5563', marginTop: '4px', margin: 0}}>
                Hatırlatmalarınızı planlayın ve takip edin
              </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{textAlign: 'center', padding: '8px 16px', background: '#eff6ff', borderRadius: '8px'}}>
                <p style={{fontSize: '12px', color: '#4b5563', marginBottom: '4px', margin: 0}}>Toplam</p>
                <p style={{fontSize: '24px', fontWeight: 'bold', color: '#2563eb', margin: 0}}>
                  {reminders.planned.length + reminders.inProgress.length + reminders.completed.length}
                </p>
              </div>
              <div style={{textAlign: 'center', padding: '8px 16px', background: '#d1fae5', borderRadius: '8px'}}>
                <p style={{fontSize: '12px', color: '#4b5563', marginBottom: '4px', margin: 0}}>Tamamlanan</p>
                <p style={{fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: 0}}>
                  {reminders.completed.length}
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => {
                    setSelectedReminder(null);
                    setShowReminderForm(true);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(to right, #7c3aed, #6d28d9)',
                    color: 'white',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, #6d28d9, #5b21b6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, #7c3aed, #6d28d9)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Yeni Hatırlatma
                </button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Columns */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'}}>
          <Column
            title="Planlanan"
            reminders={reminders.planned}
            columnKey="planned"
            color="#7c3aed"
            bgColor="#ede9fe"
            textColor="#5b21b6"
            icon={
              <svg style={{width: '24px', height: '24px', color: '#7c3aed'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            draggedReminderId={draggedReminder?.id}
            onReminderClick={handleReminderClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            columnRef={(el) => columnRefs.current.planned = el}
            isDragging={isDragging}
            canEdit={canEdit}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPayment={(reminder) => {
              setPaymentReminder(reminder);
              setShowNewPayment(true);
            }}
          />
          <Column
            title="Devam Eden"
            reminders={reminders.inProgress}
            columnKey="inProgress"
            color="#f59e0b"
            bgColor="#fef3c7"
            textColor="#92400e"
            icon={
              <svg style={{width: '24px', height: '24px', color: '#f59e0b'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            draggedReminderId={draggedReminder?.id}
            onReminderClick={handleReminderClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            columnRef={(el) => columnRefs.current.inProgress = el}
            isDragging={isDragging}
            canEdit={canEdit}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPayment={(reminder) => {
              setPaymentReminder(reminder);
              setShowNewPayment(true);
            }}
          />
          <Column
            title="Tamamlanan"
            reminders={reminders.completed}
            columnKey="completed"
            color="#059669"
            bgColor="#d1fae5"
            textColor="#065f46"
            icon={
              <svg style={{width: '24px', height: '24px', color: '#059669'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            draggedReminderId={draggedReminder?.id}
            onReminderClick={handleReminderClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            columnRef={(el) => columnRefs.current.completed = el}
            isDragging={isDragging}
            canEdit={canEdit}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPayment={(reminder) => {
              setPaymentReminder(reminder);
              setShowNewPayment(true);
            }}
          />
        </div>
      </div>

      {/* Floating dragged card */}
      {isDragging && draggedReminder && (
        <div style={{
          position: 'fixed',
          left: dragPosition.x - 100,
          top: dragPosition.y - 30,
          width: '350px',
          background: 'white',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '2px solid #7c3aed',
          opacity: 0.9,
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'rotate(-2deg)'
        }}>
          <div style={{display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px'}}>
            <h4 style={{fontWeight: 600, color: '#1f2937', fontSize: '14px', flex: 1, margin: 0}}>
              {draggedReminder.title}
            </h4>
            <span style={{
              padding: '4px 8px',
              background: draggedReminder.type === 'creditCard' ? '#ede9fe' : '#fef3c7',
              color: draggedReminder.type === 'creditCard' ? '#5b21b6' : '#92400e',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              marginLeft: '8px'
            }}>
              {draggedReminder.type === 'creditCard' ? 'Kart' : 'Cari'}
            </span>
          </div>
          {draggedReminder.description && (
            <p style={{fontSize: '12px', color: '#4b5563', marginBottom: '8px', margin: '0 0 8px 0'}}>
              {draggedReminder.description}
            </p>
          )}
          {draggedReminder.amount && (
            <p style={{fontSize: '14px', fontWeight: 'bold', color: '#dc2626', margin: 0}}>
              {draggedReminder.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </p>
          )}
          <div style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            Kalan: {draggedReminder.remainingCount} / {draggedReminder.paymentCount}
          </div>
        </div>
      )}

      <ReminderForm
        show={showReminderForm}
        onClose={() => {
          setShowReminderForm(false);
          setSelectedReminder(null);
          loadReminders();
          window.dispatchEvent(new Event('reminderUpdated'));
        }}
        reminder={selectedReminder}
        onSave={async (formData) => {
          const reminderData = { ...formData };
          if (reminderData.paymentCount) reminderData.paymentCount = parseInt(reminderData.paymentCount);
          
          if (formData.type === 'creditCard' || formData.type === 'cari') {
            if (selectedReminder) {
              if (reminderData.repeatMonthly) {
                reminderData.remainingCount = selectedReminder.remainingCount || 0;
              } else {
                const completedPayments = (selectedReminder.paymentCount || 0) - (selectedReminder.remainingCount || 0);
                reminderData.remainingCount = Math.max(0, reminderData.paymentCount - completedPayments);
              }
            } else {
              reminderData.remainingCount = reminderData.repeatMonthly ? 0 : (reminderData.paymentCount || 0);
            }
          }
          
          if (selectedReminder) {
            await firestore.updateReminder(selectedReminder.id, reminderData);
            if (user) {
              let logDetails = '';
              if (formData.type === 'creditCard') {
                const card = cards.find(c => c.id === formData.creditCardId);
                logDetails = `Kart: ${card?.code || '?'} | Gün: ${formData.dayStart || '?'}-${formData.dayEnd || '?'}`;
              } else if (formData.type === 'cari') {
                const cari = cariList.find(c => c.id === formData.cariId);
                logDetails = `Cari: ${cari?.name || '?'} | Gün: ${formData.dayStart || '?'}-${formData.dayEnd || '?'}`;
              } else {
                logDetails = `Başlık: ${formData.title}`;
              }
              await firestore.addLog(user.username, 'Hatırlatma Düzenlendi', logDetails);
            }
          } else {
            await firestore.addReminder(reminderData);
            if (user) {
              let logDetails = '';
              if (formData.type === 'creditCard') {
                const card = cards.find(c => c.id === formData.creditCardId);
                logDetails = `Kart: ${card?.code || '?'} | Gün: ${formData.dayStart || '?'}-${formData.dayEnd || '?'}`;
              } else if (formData.type === 'cari') {
                const cari = cariList.find(c => c.id === formData.cariId);
                logDetails = `Cari: ${cari?.name || '?'} | Gün: ${formData.dayStart || '?'}-${formData.dayEnd || '?'}`;
              } else {
                logDetails = `Başlık: ${formData.title}`;
              }
              await firestore.addLog(user.username, 'Hatırlatma Eklendi', logDetails);
            }
          }
          
          setShowReminderForm(false);
          setSelectedReminder(null);
          loadReminders();
          window.dispatchEvent(new Event('reminderUpdated'));
        }}
        cards={cards}
        cariList={cariList}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && reminderToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{width: '24px', height: '24px', color: '#dc2626'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 style={{fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0}}>
                  Hatırlatmayı Sil
                </h3>
                <p style={{fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0'}}>
                  Bu işlem geri alınamaz
                </p>
              </div>
            </div>

            <p style={{fontSize: '14px', color: '#4b5563', marginBottom: '20px', lineHeight: '1.5'}}>
              <strong>"{reminderToDelete.title}"</strong> hatırlatmasını silmek istediğinize emin misiniz?
            </p>

            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setReminderToDelete(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewPayment && paymentReminder && (
        <YeniOdeme
          selectedDate={new Date()}
          onClose={() => {
            setShowNewPayment(false);
            setPaymentReminder(null);
            loadReminders();
            window.dispatchEvent(new Event('reminderUpdated'));
          }}
          preSelectedCard={paymentReminder.data.type === 'creditCard' ? paymentReminder.data.creditCardId : null}
          preSelectedCari={paymentReminder.data.type === 'cari' ? paymentReminder.data.cariId : null}
        />
      )}
    </div>
  );
}

function Column({ title, reminders, columnKey, color, bgColor, textColor, icon, draggedReminderId, onReminderClick, onMouseDown, onMouseUp, columnRef, isDragging, canEdit, onEdit, onDelete, onPayment }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={columnRef}
      onMouseEnter={() => isDragging && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flex: 1,
        background: isHovered && isDragging ? '#eff6ff' : '#f9fafb',
        borderRadius: '12px',
        padding: '16px',
        border: isHovered && isDragging ? `3px dashed ${color}` : '2px solid #e5e7eb',
        minHeight: '600px',
        transition: 'all 0.2s',
        boxShadow: isHovered && isDragging ? `0 0 20px ${color}40` : 'none'
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
        {icon}
        <h3 style={{fontWeight: 'bold', color: '#1f2937', fontSize: '18px', margin: 0}}>
          {title}
        </h3>
        <span style={{
          marginLeft: 'auto',
          padding: '4px 12px',
          background: bgColor,
          color: textColor,
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: 600
        }}>
          {reminders.length}
        </span>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
        {reminders.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 0',
            color: '#9ca3af'
          }}>
            <svg style={{width: '64px', height: '64px', marginBottom: '12px', opacity: 0.5}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p style={{fontSize: '14px', fontWeight: 500, margin: 0}}>Hatırlatma yok</p>
          </div>
        ) : (
          reminders.map(reminder => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              isDragging={draggedReminderId === reminder.id}
              onReminderClick={onReminderClick}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              onPayment={onPayment}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ReminderCard({ reminder, isDragging, onReminderClick, onMouseDown, onMouseUp, canEdit, onEdit, onDelete, onPayment }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseDown={(e) => {
        // Eğer butonlara tıklanmışsa drag başlatma
        if (e.target.closest('button')) return;
        canEdit && onMouseDown(reminder, e);
      }}
      onMouseUp={() => canEdit && onMouseUp(reminder)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#faf5ff',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: isHovered && !isDragging ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        border: isHovered && !isDragging ? '2px solid #c084fc' : '1px solid #e9d5ff',
        cursor: canEdit ? (isDragging ? 'grabbing' : 'pointer') : 'default',
        transition: 'all 0.2s',
        opacity: isDragging ? 0.3 : 1,
        userSelect: 'none',
        position: 'relative'
      }}
    >
      {/* Action Buttons */}
      {canEdit && (
        <div style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          display: 'flex',
          gap: '4px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s',
          zIndex: 10
        }}>
          {(reminder.type === 'creditCard' || reminder.type === 'cari') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onPayment(reminder);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              style={{
                padding: '4px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Ödeme Yap"
            >
              <svg style={{width: '12px', height: '12px', pointerEvents: 'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEdit(reminder);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{
              padding: '4px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Düzenle"
          >
            <svg style={{width: '12px', height: '12px', pointerEvents: 'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete(reminder);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{
              padding: '4px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Sil"
          >
            <svg style={{width: '12px', height: '12px', pointerEvents: 'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Badges */}
      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap', paddingRight: canEdit && isHovered ? '90px' : '0'}}>
        <span style={{
          padding: '2px 8px',
          background: '#e9d5ff',
          color: '#7c3aed',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600
        }}>
          {reminder.type === 'creditCard' ? 'Kredi Kartı' : 'Cari'}
        </span>
        {reminder.data.repeatMonthly && (
          <span style={{
            padding: '2px 8px',
            background: '#dbeafe',
            color: '#1d4ed8',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600
          }}>
            Her Ay
          </span>
        )}
        {reminder.data.autoCloseOnPayment && (
          <span style={{
            padding: '2px 8px',
            background: '#d1fae5',
            color: '#059669',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600
          }}>
            Oto. Kapat
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{
        fontWeight: 600,
        color: '#1f2937',
        fontSize: '13px',
        marginBottom: '6px',
        margin: '0 0 6px 0',
        lineHeight: '1.4',
        paddingRight: canEdit && isHovered ? '60px' : '0'
      }}>
        {reminder.title}
      </p>

      {/* Details */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px'}}>
        {reminder.description && (
          <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
            <svg style={{width: '12px', height: '12px', color: '#9333ea', flexShrink: 0}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span style={{fontSize: '11px', color: '#4b5563'}}>{reminder.description}</span>
          </div>
        )}
        
        {reminder.amount && (
          <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
            <svg style={{width: '12px', height: '12px', color: '#9333ea', flexShrink: 0}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{fontSize: '12px', color: '#dc2626', fontWeight: 'bold'}}>
              {reminder.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </span>
          </div>
        )}
      </div>

      {/* Footer - Kalan ödeme */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '6px',
        borderTop: '1px solid #e9d5ff',
        fontSize: '11px',
        color: '#6b7280'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
          <svg style={{width: '12px', height: '12px', color: '#9333ea'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Kalan ödeme</span>
        </div>
        <span style={{
          background: '#ede9fe',
          color: '#7c3aed',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '11px'
        }}>
          {reminder.remainingCount} / {reminder.paymentCount}
        </span>
      </div>
    </div>
  );
}
