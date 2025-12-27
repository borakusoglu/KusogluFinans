import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import YeniOdeme from '../components/YeniOdeme';
import OdemeListesi from '../components/OdemeListesi';
import * as firestore from '../firebase/firestore';

const themeGradients = {
  indigo: { calendar: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', sidebar: 'linear-gradient(to bottom, #4f46e5, #7c3aed)' },
  blue: { calendar: 'linear-gradient(135deg, #dbeafe, #93c5fd)', sidebar: 'linear-gradient(to bottom, #2563eb, #1d4ed8)' },
  purple: { calendar: 'linear-gradient(135deg, #f3e8ff, #d8b4fe)', sidebar: 'linear-gradient(to bottom, #9333ea, #7e22ce)' },
  pink: { calendar: 'linear-gradient(135deg, #fce7f3, #f9a8d4)', sidebar: 'linear-gradient(to bottom, #ec4899, #db2777)' },
  green: { calendar: 'linear-gradient(135deg, #d1fae5, #6ee7b7)', sidebar: 'linear-gradient(to bottom, #10b981, #059669)' },
  orange: { calendar: 'linear-gradient(135deg, #fffaf0, #fff5e6)', sidebar: 'linear-gradient(to bottom, #fec89a, #fb923c)' },
  stars: { calendar: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 5l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z\' fill=\'%23d1d5db\' opacity=\'0.3\'/%3E%3C/svg%3E"), linear-gradient(135deg, #f9fafb, #f3f4f6)', sidebar: 'linear-gradient(to bottom, #6b7280, #4b5563)' },
  tiles: { calendar: 'repeating-linear-gradient(45deg, #f0f9ff 0px, #f0f9ff 20px, #e0f2fe 20px, #e0f2fe 40px), repeating-linear-gradient(-45deg, #f0f9ff 0px, #f0f9ff 20px, #e0f2fe 20px, #e0f2fe 40px)', sidebar: 'linear-gradient(to bottom, #0ea5e9, #0284c7)' },
  dots: { calendar: 'radial-gradient(circle at 2px 2px, #d1d5db 1px, transparent 1px), linear-gradient(135deg, #f9fafb, #f3f4f6)', sidebar: 'linear-gradient(to bottom, #6b7280, #4b5563)', backgroundSize: '20px 20px' },
};

export default function Ajanda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payments, setPayments] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayPayments, setSelectedDayPayments] = useState([]);
  const [showLabel, setShowLabel] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [theme, setTheme] = useState('indigo');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    const loadTheme = async () => {
      if (user?.uid) {
        const settings = await firestore.getUserSettings(user.uid);
        setTheme(settings.calendarTheme || 'indigo');
      }
    };
    
    loadTheme();

    const handleThemeChange = () => {
      loadTheme();
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  useEffect(() => {
    loadPayments();
  }, [currentDate]);

  const loadPayments = async () => {
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
    const data = await firestore.getPayments({ startDate: start, endDate: end });
    setPayments(data);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const emptyDays = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
  const totalCells = emptyDays + days.length;
  const rowCount = Math.ceil(totalCells / 7);
  const isCompact = rowCount === 6;
  const daySize = isCompact ? '95px' : '115px';
  const dayFontSize = isCompact ? '17px' : '20px';
  const amountFontSize = isCompact ? '10px' : '12px';
  const countFontSize = isCompact ? '9px' : '11px';
  const dayPadding = isCompact ? '7px' : '10px';
  const gridGap = isCompact ? '8px' : '10px';

  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const currentMonthName = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const getPaymentsForDay = (day) => {
    const dayPayments = payments.filter(p => {
      if (p.payment_method === 'devir') return false;
      const compareDate = p.payment_method === 'cek' && p.due_date ? p.due_date : p.payment_date;
      return isSameDay(new Date(compareDate), day);
    });
    
    // Çekler için kayıt tarihi ve vade tarihine göre sıralama
    return dayPayments.sort((a, b) => {
      if (a.payment_method === 'cek' && b.payment_method === 'cek') {
        // Her ikisi de çekse, önce kayıt tarihine göre sırala
        const dateCompare = new Date(a.payment_date) - new Date(b.payment_date);
        if (dateCompare !== 0) return dateCompare;
        // Kayıt tarihleri aynıysa vade tarihine göre sırala
        return new Date(a.due_date) - new Date(b.due_date);
      }
      if (a.payment_method === 'cek') return -1; // Çekler önce
      if (b.payment_method === 'cek') return 1;
      // Diğerleri için ödeme tarihine göre sırala
      return new Date(a.payment_date) - new Date(b.payment_date);
    });
  };

  const getTotalForDay = (day) => {
    return getPaymentsForDay(day).reduce((sum, p) => sum + p.amount, 0);
  };

  const isHoliday = (day) => {
    const month = day.getMonth() + 1;
    const date = day.getDate();
    const dayOfWeek = day.getDay();
    
    // Pazar günleri
    if (dayOfWeek === 0) return { type: 'sunday', name: 'Pazar', isClosedDay: true };
    
    // 1 Ocak - Yılbaşı
    if (month === 1 && date === 1) return { type: 'newyear', name: 'Yılbaşı', isClosedDay: true };
    
    // 1 Mayıs - İşçi Bayramı
    if (month === 5 && date === 1) return { type: 'holiday', name: 'İşçi Bayramı', isClosedDay: true };
    
    // Ramazan Bayramı 2025: 30-31 Mart
    if (month === 3 && (date === 30 || date === 31)) return { type: 'religious', name: 'Ramazan Bayramı', isClosedDay: true };
    
    // Kurban Bayramı 2025: 6-7 Haziran
    if (month === 6 && (date === 6 || date === 7)) return { type: 'religious', name: 'Kurban Bayramı', isClosedDay: true };
    
    // Ramazan Bayramı 2026: 20-21 Mart
    if (month === 3 && (date === 20 || date === 21)) return { type: 'religious', name: 'Ramazan Bayramı', isClosedDay: true };
    
    // Kurban Bayramı 2026: 27-28 Mayıs
    if (month === 5 && (date === 27 || date === 28)) return { type: 'religious', name: 'Kurban Bayramı', isClosedDay: true };
    
    // Özel Günler (Tatil değil)
    if (month === 4 && date === 23) return { type: 'special', name: '23 Nisan', isClosedDay: false };
    if (month === 5 && date === 19) return { type: 'special', name: '19 Mayıs', isClosedDay: false };
    if (month === 7 && date === 15) return { type: 'special', name: '15 Temmuz', isClosedDay: false };
    if (month === 8 && date === 30) return { type: 'special', name: '30 Ağustos', isClosedDay: false };
    if (month === 10 && date === 29) return { type: 'special', name: '29 Ekim', isClosedDay: false };
    
    return null;
  };

  const handleDayClick = (day) => {
    const dayPayments = getPaymentsForDay(day);
    if (dayPayments.length > 0) {
      setSelectedDate(day);
      setSelectedDayPayments(dayPayments);
      setShowListModal(true);
    } else {
      setSelectedDate(day);
      setShowNewModal(true);
    }
  };

  return (
    <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '50px', background: 'linear-gradient(to bottom right, #f9fafb, #dbeafe)', animation: 'pageFadeIn 0.3s ease-out'}}>
      <div style={{display: 'flex', gap: '0'}}>
        {/* Sol panel - Navigasyon ve Ay */}
        <div style={{background: themeGradients[theme].sidebar, borderRadius: '16px 0 0 16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '250px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
          <h2 style={{fontSize: '30px', fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: '12px'}}>{currentMonthName} {currentYear}</h2>
          
          <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))} 
              style={{padding: '16px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', color: 'white', borderRadius: '12px', transition: 'all 0.2s', border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
            >
              <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))} 
              style={{padding: '16px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', color: 'white', borderRadius: '12px', transition: 'all 0.2s', border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
            >
              <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          
          {/* Yeni Ödeme Butonu */}
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setShowNewModal(true);
            }}
            style={{padding: '14px 20px', background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', borderRadius: '12px', transition: 'all 0.2s', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'}}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Ödeme
          </button>
          
          {/* Ay Özeti */}
          <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div style={{background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)'}}>
              <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', fontWeight: 500}}>Toplam Ödeme</div>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: 'white'}}>
                {payments.reduce((sum, p) => p.payment_method !== 'devir' ? sum + p.amount : sum, 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺
              </div>
            </div>
            <div style={{background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)'}}>
              <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', fontWeight: 500}}>Ödeme Sayısı</div>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: 'white'}}>
                {payments.filter(p => p.payment_method !== 'devir').length}
              </div>
            </div>
            <div style={{background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.2)'}}>
              <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', fontWeight: 500}}>Ödeme Tipleri</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                {(() => {
                  const krediKarti = payments.filter(p => p.payment_type === 'kredi_karti' && p.payment_method !== 'devir').length;
                  const cari = payments.filter(p => p.payment_type === 'cari' && p.payment_method !== 'devir').length;
                  const serbest = payments.filter(p => p.payment_type === 'serbest').length;
                  const nakit = payments.filter(p => p.payment_method === 'nakit').length;
                  const dbs = payments.filter(p => p.payment_method === 'dbs').length;
                  const havale = payments.filter(p => p.payment_method === 'havale').length;
                  const cek = payments.filter(p => p.payment_method === 'cek').length;
                  return (
                    <>
                      {krediKarti > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'white'}}>
                          <span>Kredi Kartı</span>
                          <span style={{fontWeight: 'bold'}}>{krediKarti}</span>
                        </div>
                      )}
                      {cari > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'white'}}>
                          <span>Cari</span>
                          <span style={{fontWeight: 'bold'}}>{cari}</span>
                        </div>
                      )}
                      {serbest > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'white'}}>
                          <span>Serbest</span>
                          <span style={{fontWeight: 'bold'}}>{serbest}</span>
                        </div>
                      )}
                      {nakit > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'white'}}>
                          <span>Nakit</span>
                          <span style={{fontWeight: 'bold'}}>{nakit}</span>
                        </div>
                      )}
                      {dbs > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'white'}}>
                          <span>DBS</span>
                          <span style={{fontWeight: 'bold'}}>{dbs}</span>
                        </div>
                      )}
                      {havale > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'white'}}>
                          <span>Havale</span>
                          <span style={{fontWeight: 'bold'}}>{havale}</span>
                        </div>
                      )}
                      {cek > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'white'}}>
                          <span>Çek</span>
                          <span style={{fontWeight: 'bold'}}>{cek}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Sağ panel - Ajanda */}
        <div style={{background: 'white', borderRadius: '0 16px 16px 0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '918px'}}>

          <div style={{padding: '24px', background: themeGradients[theme].calendar, backgroundSize: themeGradients[theme].backgroundSize, backgroundRepeat: themeGradients[theme].backgroundRepeat}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: gridGap, marginBottom: gridGap}}>
              {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(day => (
                <div key={day} style={{textAlign: 'center', fontWeight: 'bold', color: '#374151', padding: '8px', fontSize: isCompact ? '11px' : '13px', width: daySize}}>{day}</div>
              ))}
          
          {Array.from({ length: emptyDays }).map((_, i) => (
            <div key={`empty-${i}`} style={{height: daySize, width: daySize, background: '#f9fafb', borderRadius: '8px', flexShrink: 0}}></div>
          ))}

          {days.map(day => {
            const dayPayments = getPaymentsForDay(day);
            const total = getTotalForDay(day);
            const isToday = isSameDay(day, new Date());
            const holiday = isHoliday(day);
            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{
                  height: daySize,
                  width: daySize,
                  borderRadius: '8px',
                  padding: dayPadding,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative',
                  flexShrink: 0,
                  overflow: 'hidden',
                  ...(isToday 
                    ? {background: 'linear-gradient(to bottom right, #3b82f6, #9333ea)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', transform: 'scale(1.05)', border: '2px solid #93c5fd'}
                    : dayPayments.length > 0 
                      ? {background: 'linear-gradient(to bottom right, #fef2f2, #fce7f3)', border: '2px solid #fca5a5'}
                      : {background: 'linear-gradient(to bottom right, white, #f9fafb)', border: '2px solid #e5e7eb'})
                }}
                className="group"
                title={holiday ? holiday.name : ''}
              >
                {/* Tatil şeridi */}
                {holiday && holiday.isClosedDay && (
                  <div style={{position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1}}>
                    <div style={{position: 'absolute', top: '-50%', right: '-50%', width: '200%', height: '8px', background: 'rgba(239, 68, 68, 0.4)', transform: 'rotate(45deg)', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'}}></div>
                  </div>
                )}
                
                {/* Dekoratif arka plan efekti */}
                <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), transparent)', opacity: 0, transition: 'opacity 0.3s'}} className="group-hover-opacity"></div>
                
                <div style={{position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px'}}>
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '6px'}}>
                      <div style={{fontWeight: 'bold', fontSize: dayFontSize, color: isToday ? 'white' : '#1f2937'}}>
                        {format(day, 'd')}
                      </div>
                      {holiday && holiday.type !== 'sunday' && (
                        <div style={{fontSize: '7px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: '2px'}}>
                          {holiday.name}
                        </div>
                      )}
                    </div>
                    {/* Tatil ikonu */}
                    {holiday && holiday.type === 'newyear' && (
                      <div style={{marginTop: '-2px'}}>
                        <svg style={{width: '18px', height: '18px', color: '#3b82f6'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M2 12h20M6.34 6.34l11.32 11.32M17.66 6.34L6.34 17.66M12 6l-2 2m4 0l-2-2m0 12l-2-2m4 0l-2 2M6 12l-2-2m0 4l2-2m12 0l2 2m0-4l-2 2" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {dayPayments.length > 0 && (
                    <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: isCompact ? '2px' : '4px', marginLeft: '-4px', marginRight: '-4px'}}>
                      <div style={{fontSize: amountFontSize, fontWeight: 'bold', padding: isCompact ? '3px 5px' : '5px 8px', borderRadius: '6px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', whiteSpace: 'nowrap', overflow: 'hidden', ...(isToday ? {background: 'rgba(255, 255, 255, 0.3)', color: 'white'} : {background: 'linear-gradient(to right, #ef4444, #ec4899)', color: 'white'})}}>
                        {total.toLocaleString('tr-TR')} ₺
                      </div>
                      <div style={{fontSize: countFontSize, fontWeight: 500, textAlign: 'center', color: isToday ? 'rgba(255, 255, 255, 0.9)' : '#4b5563'}}>
                        {dayPayments.length} ödeme
                      </div>
                    </div>
                  )}
                </div>
                
                {/* + butonu sağ üst köşede */}
                {hoveredDay && isSameDay(hoveredDay, day) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(day);
                      setShowNewModal(true);
                    }}
                    style={{position: 'absolute', top: '4px', right: '4px', width: isCompact ? '22px' : '26px', height: isCompact ? '22px' : '26px', background: 'linear-gradient(to bottom right, #4ade80, #16a34a)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isCompact ? '14px' : '16px', fontWeight: 'bold', transition: 'all 0.3s', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 20, border: 'none', cursor: 'pointer'}}
                    title="Yeni ödeme ekle"
                  >
                    <span style={{ position: 'relative', top: '-1px' }}>+</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>

      {showNewModal && (
        <YeniOdeme
          selectedDate={selectedDate}
          onClose={() => {
            setShowNewModal(false);
            loadPayments();
            window.dispatchEvent(new Event('reminderUpdated'));
          }}
        />
      )}

      {showListModal && (
        <OdemeListesi
          selectedDate={selectedDate}
          payments={selectedDayPayments}
          onClose={() => {
            setShowListModal(false);
            loadPayments();
          }}
          onEdit={(payment) => {
            setShowListModal(false);
            // Edit modal will be handled in OdemeListesi
          }}
        />
      )}
    </div>
  );
}
