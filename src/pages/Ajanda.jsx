import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import YeniOdeme from '../components/YeniOdeme';
import OdemeListesi from '../components/OdemeListesi';
import * as firestore from '../firebase/firestore';
import { cleanDuplicates } from '../utils/cleanDuplicates';

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

export default function Ajanda({ user }) {
  const [viewMode, setViewMode] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDateFilter, setEndDateFilter] = useState('');
  const [cards, setCards] = useState([]);
  const [cariList, setCariList] = useState([]);
  const [cardSearch, setCardSearch] = useState('');
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const [cariSearch, setCariSearch] = useState('');
  const [showCariDropdown, setShowCariDropdown] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedCariId, setSelectedCariId] = useState(null);
  const [sortField, setSortField] = useState('payment_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [showNewModal, setShowNewModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayPayments, setSelectedDayPayments] = useState([]);
  const [showLabel, setShowLabel] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [theme, setTheme] = useState(null);
  const [showPastDateWarning, setShowPastDateWarning] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);
  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    const loadFilterData = async () => {
      const cardsData = await firestore.getCreditCards();
      const cariData = await firestore.getCari();
      setCards(cardsData);
      setCariList(cariData);
    };
    loadFilterData();

    const handleClickOutside = (e) => {
      if (!e.target.closest('.card-search-container')) {
        setShowCardDropdown(false);
      }
      if (!e.target.closest('.cari-search-container')) {
        setShowCariDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    if (viewMode === 'calendar') {
      loadPayments();
    } else {
      loadAllPayments();
    }
  }, [currentDate, viewMode]);

  const loadPayments = async () => {
    cleanDuplicates();
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
    
    // Çek kesim tarihleri için önceki ayı da dahil et
    const prevMonthStart = format(subMonths(startOfMonth(currentDate), 1), 'yyyy-MM-dd');
    
    const data = await firestore.getPayments({ startDate: prevMonthStart, endDate: end });
    
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
    
    const filteredData = isAdmin ? data : data.filter(p => !p.is_admin_only);
    setPayments(filteredData);
  };

  const loadAllPayments = async () => {
    const data = await firestore.getPayments();
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
    const filteredData = isAdmin ? data : data.filter(p => !p.is_admin_only);
    setPayments(filteredData.filter(p => p.payment_method !== 'devir'));
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
    
    return dayPayments.sort((a, b) => {
      if (a.payment_method === 'cek' && b.payment_method === 'cek') {
        const dateCompare = new Date(a.payment_date) - new Date(b.payment_date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(a.due_date) - new Date(b.due_date);
      }
      if (a.payment_method === 'cek') return -1;
      if (b.payment_method === 'cek') return 1;
      return new Date(a.payment_date) - new Date(b.payment_date);
    });
  };
  
  const getCheckIssueDatesForDay = (day) => {
    const checks = payments.filter(p => 
      p.payment_method === 'cek' && 
      p.payment_date && 
      isSameDay(new Date(p.payment_date), day)
    );
    
    return checks;
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
    const checkIssueDates = getCheckIssueDatesForDay(day);
    
    if (dayPayments.length > 0 || checkIssueDates.length > 0) {
      setSelectedDate(day);
      setSelectedDayPayments([...dayPayments, ...checkIssueDates]);
      setShowListModal(true);
    } else if (canEdit) {
      const today = new Date();
      const selectedDay = new Date(day);
      today.setHours(0, 0, 0, 0);
      selectedDay.setHours(0, 0, 0, 0);
      
      if (selectedDay.getTime() < today.getTime()) {
        setPendingDate(day);
        setShowPastDateWarning(true);
        return;
      }
      
      setSelectedDate(day);
      setShowNewModal(true);
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.amount || '').toString().includes(searchTerm);
    const matchesType = filterType === 'all' || p.payment_type === filterType;
    const matchesMethod = filterMethod === 'all' || p.payment_method === filterMethod;
    
    const matchesCard = !cardSearch.trim() || 
      (p.credit_card_code || '').toLowerCase().includes(cardSearch.toLowerCase()) ||
      (p.credit_card_name || '').toLowerCase().includes(cardSearch.toLowerCase());
    
    const matchesCari = !cariSearch.trim() || 
      (p.cari_name || '').toLowerCase().includes(cariSearch.toLowerCase());
    
    const displayDate = p.payment_method === 'cek' && p.due_date ? p.due_date : p.payment_date;
    const matchesDateRange = (!startDateFilter || displayDate >= startDateFilter) && (!endDateFilter || displayDate <= endDateFilter);
    return matchesSearch && matchesType && matchesMethod && matchesCard && matchesCari && matchesDateRange;
  }).sort((a, b) => {
    let aVal, bVal;
    
    if (sortField === 'payment_date') {
      aVal = a.payment_method === 'cek' && a.due_date ? a.due_date : a.payment_date;
      bVal = b.payment_method === 'cek' && b.due_date ? b.due_date : b.payment_date;
      return sortDirection === 'asc' ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
    }
    
    if (sortField === 'cari_kart') {
      aVal = a.payment_type === 'cari' ? (a.cari_name || '') : (a.credit_card_code || '');
      bVal = b.payment_type === 'cari' ? (b.cari_name || '') : (b.credit_card_code || '');
      return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'tr') : bVal.localeCompare(aVal, 'tr');
    }
    
    if (sortField === 'payment_type') {
      const typeOrder = { kredi_karti: 1, cari: 2, serbest: 3 };
      aVal = typeOrder[a.payment_type] || 999;
      bVal = typeOrder[b.payment_type] || 999;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    if (sortField === 'payment_method') {
      const methodOrder = { nakit: 1, dbs: 2, havale: 3, cek: 4 };
      aVal = methodOrder[a.payment_method] || 999;
      bVal = methodOrder[b.payment_method] || 999;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    if (sortField === 'amount') {
      return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    
    return 0;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <svg style={{width: '14px', height: '14px', opacity: 0.3}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return sortDirection === 'asc' 
      ? <svg style={{width: '14px', height: '14px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      : <svg style={{width: '14px', height: '14px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom right, #f9fafb, #dbeafe)', animation: 'pageFadeIn 0.3s ease-out', padding: '20px', overflow: 'auto'}}>
      {!theme ? (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%'}}>
          <p style={{fontSize: '18px', color: '#6b7280'}}>Yükleniyor...</p>
        </div>
      ) : (
      <>
        {/* Üst panel - Navigasyon */}
        {viewMode === 'list' && (
        <div style={{background: themeGradients[theme].sidebar, borderRadius: '12px', padding: '16px 24px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxWidth: '1200px', margin: '0 auto 20px', width: '100%'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
            <h2 style={{fontSize: '24px', fontWeight: 'bold', color: 'white'}}>Ödeme Listesi</h2>
            <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
            <div className="card-search-container" style={{position: 'relative', width: '180px'}}>
              <input
                type="text"
                value={cardSearch}
                onChange={(e) => {
                  setCardSearch(e.target.value);
                  if (!e.target.value.trim()) {
                    setSelectedCardId(null);
                  }
                }}
                placeholder="Kredi kartı ara..."
                style={{width: '100%', padding: '8px 32px 8px 8px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white'}}
              />
              <button
                type="button"
                onClick={() => setShowCardDropdown(!showCardDropdown)}
                style={{position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px'}}
              >
                <svg style={{width: '18px', height: '18px', color: 'rgba(255,255,255,0.6)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {showCardDropdown && (
                <div style={{position: 'absolute', zIndex: 10, width: '100%', marginTop: '4px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxHeight: '200px', overflowY: 'auto'}}>
                  <div onClick={() => { setSelectedCardId(null); setCardSearch(''); setShowCardDropdown(false); }} style={{padding: '8px', cursor: 'pointer', color: '#374151', fontSize: '13px', borderBottom: '1px solid #f3f4f6'}}>Tümü</div>
                  {(() => {
                    const user = JSON.parse(localStorage.getItem('user'));
                    return cards
                      .filter(card => 
                        card.is_active !== false &&
                        (card.code.toLowerCase().includes(cardSearch.toLowerCase()) ||
                        (card.bank || '').toLowerCase().includes(cardSearch.toLowerCase()))
                      )
                      .map(card => {
                        const displayCode = user?.role === 'superadmin' || user?.role === 'admin' 
                          ? card.code 
                          : '****-****-****-' + card.code.slice(-4);
                        return (
                          <div
                            key={card.id}
                            onClick={() => {
                              setSelectedCardId(card.id);
                              setCardSearch(`${displayCode} - ${card.bank || 'Banka Yok'}`);
                              setShowCardDropdown(false);
                            }}
                            style={{padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6'}}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div style={{fontWeight: 600, fontSize: '13px', color: '#374151'}}>{displayCode}</div>
                            <div style={{fontSize: '11px', color: '#6b7280'}}>{card.bank || 'Banka Yok'}</div>
                          </div>
                        );
                      });
                  })()}
                </div>
              )}
            </div>
            <div className="cari-search-container" style={{position: 'relative', width: '180px'}}>
              <input
                type="text"
                value={cariSearch}
                onChange={(e) => {
                  setCariSearch(e.target.value);
                  if (!e.target.value.trim()) {
                    setSelectedCariId(null);
                  }
                }}
                placeholder="Cari ara..."
                style={{width: '100%', padding: '8px 32px 8px 8px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white'}}
              />
              <button
                type="button"
                onClick={() => setShowCariDropdown(!showCariDropdown)}
                style={{position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px'}}
              >
                <svg style={{width: '18px', height: '18px', color: 'rgba(255,255,255,0.6)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {showCariDropdown && (
                <div style={{position: 'absolute', zIndex: 10, width: '100%', marginTop: '4px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxHeight: '200px', overflowY: 'auto'}}>
                  <div onClick={() => { setSelectedCariId(null); setCariSearch(''); setShowCariDropdown(false); }} style={{padding: '8px', cursor: 'pointer', color: '#374151', fontSize: '13px', borderBottom: '1px solid #f3f4f6'}}>Tümü</div>
                  {cariList
                    .filter(cari => 
                      cari.name.toLowerCase().includes(cariSearch.toLowerCase())
                    )
                    .map(cari => (
                      <div
                        key={cari.id}
                        onClick={() => {
                          setSelectedCariId(cari.id);
                          setCariSearch(cari.name);
                          setShowCariDropdown(false);
                        }}
                        style={{padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6'}}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{fontSize: '13px', color: '#374151', fontWeight: 600}}>{cari.name}</div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            {canEdit && (
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowNewModal(true);
              }}
              style={{padding: '10px 16px', background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', borderRadius: '8px', transition: 'all 0.2s', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}
            >
              <svg style={{width: '18px', height: '18px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Yeni Ödeme
            </button>
            )}
            <button
              onClick={() => setViewMode('calendar')}
              style={{padding: '10px 16px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', color: 'white', borderRadius: '8px', transition: 'all 0.2s', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'}}
            >
              <svg style={{width: '18px', height: '18px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Takvim
            </button>
            </div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '200px 200px 1fr 180px 180px', gap: '12px', alignItems: 'end'}}>
            <div>
              <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} placeholder="Başlangıç" style={{width: '100%', padding: '8px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white'}} />
            </div>
            <div>
              <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} placeholder="Bitiş" style={{width: '100%', padding: '8px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white'}} />
            </div>
            <div style={{position: 'relative'}}>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Ara..." 
                style={{width: '100%', padding: '8px 8px 8px 32px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white'}} 
              />
              <svg style={{position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'rgba(255,255,255,0.6)', pointerEvents: 'none'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{padding: '8px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white'}}>
              <option value="all" style={{color: '#000'}}>Tüm Tipler</option>
              <option value="kredi_karti" style={{color: '#000'}}>Kredi Kartı</option>
              <option value="cari" style={{color: '#000'}}>Cari</option>
              <option value="serbest" style={{color: '#000'}}>Serbest</option>
            </select>
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} style={{padding: '8px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white'}}>
              <option value="all" style={{color: '#000'}}>Tüm Yöntemler</option>
              <option value="nakit" style={{color: '#000'}}>Nakit</option>
              <option value="dbs" style={{color: '#000'}}>DBS</option>
              <option value="havale" style={{color: '#000'}}>Havale</option>
              <option value="cek" style={{color: '#000'}}>Çek</option>
            </select>
          </div>
        </div>
        )}

        {viewMode === 'calendar' && (
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
          {canEdit && (
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
          )}

          {/* Görünüm Değiştir */}
          <button
            onClick={() => setViewMode('list')}
            style={{padding: '14px 20px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', color: 'white', borderRadius: '12px', transition: 'all 0.2s', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px'}}
          >
            <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Liste Görünümü
          </button>
          
          {/* Ay Özeti */}
          <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div style={{background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)'}}>
              <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', fontWeight: 500}}>Toplam Ödeme</div>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: 'white'}}>
                {payments.filter(p => {
                  if (p.payment_method !== 'devir') {
                    if (p.payment_method === 'cek' && p.due_date) {
                      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
                      return p.due_date >= start && p.due_date <= end;
                    }
                    return true;
                  }
                  return false;
                }).reduce((sum, p) => sum + p.amount, 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺
              </div>
            </div>
            <div style={{background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.2)'}}>
              <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', fontWeight: 500}}>Ödeme Sayısı</div>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: 'white'}}>
                {payments.filter(p => {
                  if (p.payment_method !== 'devir') {
                    if (p.payment_method === 'cek' && p.due_date) {
                      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
                      return p.due_date >= start && p.due_date <= end;
                    }
                    return true;
                  }
                  return false;
                }).length}
              </div>
            </div>
            <div style={{background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.2)'}}>
              <div style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', fontWeight: 500}}>Ödeme Tipleri</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                {(() => {
                  const filteredPayments = payments.filter(p => {
                    if (p.payment_method !== 'devir') {
                      if (p.payment_method === 'cek' && p.due_date) {
                        const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                        const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
                        return p.due_date >= start && p.due_date <= end;
                      }
                      return true;
                    }
                    return false;
                  });
                  const krediKarti = filteredPayments.filter(p => p.payment_type === 'kredi_karti').length;
                  const cari = filteredPayments.filter(p => p.payment_type === 'cari').length;
                  const serbest = filteredPayments.filter(p => p.payment_type === 'serbest').length;
                  const nakit = filteredPayments.filter(p => p.payment_method === 'nakit').length;
                  const dbs = filteredPayments.filter(p => p.payment_method === 'dbs').length;
                  const havale = filteredPayments.filter(p => p.payment_method === 'havale').length;
                  const cek = filteredPayments.filter(p => p.payment_method === 'cek').length;
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
        <div style={{background: themeGradients[theme].calendar, backgroundSize: themeGradients[theme].backgroundSize, backgroundRepeat: themeGradients[theme].backgroundRepeat, borderRadius: '0 16px 16px 0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '918px', minHeight: '100%'}}>
          <div style={{padding: '24px'}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: gridGap, marginBottom: gridGap}}>
              {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(day => (
                <div key={day} style={{textAlign: 'center', fontWeight: 'bold', color: '#374151', padding: '8px', fontSize: isCompact ? '11px' : '13px', width: daySize}}>{day}</div>
              ))}
          
          {Array.from({ length: emptyDays }).map((_, i) => (
            <div key={`empty-${i}`} style={{height: daySize, width: daySize, background: '#f9fafb', borderRadius: '8px', flexShrink: 0}}></div>
          ))}

          {days.map(day => {
            const dayPayments = getPaymentsForDay(day);
            const checkIssueDates = getCheckIssueDatesForDay(day);
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
                    <div style={{position: 'absolute', bottom: '-5px', left: '-4px', right: '-4px', display: 'flex', flexDirection: 'column', gap: isCompact ? '2px' : '4px'}}>
                      {/* Ödenmemiş Tutar - Kırmızı */}
                      {(() => {
                        const unpaidTotal = dayPayments.filter(p => !p.is_completed).reduce((sum, p) => sum + p.amount, 0);
                        if (unpaidTotal > 0) {
                          return (
                            <div style={{fontSize: amountFontSize, fontWeight: 'bold', padding: isCompact ? '1px 3px' : '2px 5px', borderRadius: '4px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', whiteSpace: 'nowrap', overflow: 'hidden', ...(isToday ? {background: 'rgba(255, 255, 255, 0.3)', color: 'white'} : {background: 'linear-gradient(to right, #ef4444, #ec4899)', color: 'white'})}}>
                              {unpaidTotal.toLocaleString('tr-TR')} ₺
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Ödenmiş Tutar - Yeşil */}
                      {(() => {
                        const completedTotal = dayPayments.filter(p => p.is_completed).reduce((sum, p) => sum + p.amount, 0);
                        if (completedTotal > 0) {
                          return (
                            <div style={{fontSize: amountFontSize, fontWeight: 'bold', padding: isCompact ? '1px 3px' : '2px 5px', borderRadius: '4px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', whiteSpace: 'nowrap', overflow: 'hidden', background: 'linear-gradient(to right, #10b981, #059669)', color: 'white'}}>
                              {completedTotal.toLocaleString('tr-TR')} ₺
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      <div style={{fontSize: countFontSize, fontWeight: 600, textAlign: 'center', color: isToday ? 'rgba(255, 255, 255, 0.95)' : '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '2px'}}>
                        <span>{dayPayments.length} ödeme</span>
                        {/* Çek kesim tarihi ikonu - Ödeme yazısının yanında */}
                        {checkIssueDates.length > 0 && (
                          <div style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '3px',
                            background: 'rgba(124, 58, 237, 0.95)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 6px rgba(124, 58, 237, 0.4)'
                          }}>
                            <svg style={{width: '12px', height: '12px', color: 'white'}} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                            </svg>
                            <span style={{fontSize: '9px', fontWeight: 700, color: 'white'}}>{checkIssueDates.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Çek kesim tarihi ikonu - Ödeme yoksa tek başına göster */}
                  {dayPayments.length === 0 && checkIssueDates.length > 0 && (
                    <div style={{
                      position: 'absolute', 
                      bottom: isCompact ? '10px' : '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '3px',
                      background: 'rgba(124, 58, 237, 0.95)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 6px rgba(124, 58, 237, 0.4)',
                      zIndex: 15
                    }}>
                      <svg style={{width: '14px', height: '14px', color: 'white'}} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                      <span style={{fontSize: '10px', fontWeight: 700, color: 'white'}}>{checkIssueDates.length}</span>
                    </div>
                  )}
                </div>
                
                {/* + butonu sağ üst köşede */}
                {canEdit && hoveredDay && isSameDay(hoveredDay, day) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      
                      const today = new Date();
                      const selectedDay = new Date(day);
                      today.setHours(0, 0, 0, 0);
                      selectedDay.setHours(0, 0, 0, 0);
                      
                      if (selectedDay.getTime() < today.getTime()) {
                        setPendingDate(day);
                        setShowPastDateWarning(true);
                        return;
                      }
                      
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
        )}

        {viewMode === 'list' && (
          <div style={{background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '24px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxWidth: '1200px', margin: '0 auto', width: '100%'}}>
            <div style={{marginBottom: '16px', padding: '12px', background: 'linear-gradient(to right, #eff6ff, #dbeafe)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: '14px', color: '#4b5563', fontWeight: 500}}>{filteredPayments.length} ödeme</span>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{padding: '6px 12px', background: currentPage === 1 ? '#e5e7eb' : '#3b82f6', color: currentPage === 1 ? '#9ca3af' : 'white', borderRadius: '6px', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600}}>←</button>
                <span style={{fontSize: '14px', color: '#4b5563', fontWeight: 500}}>Sayfa {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{padding: '6px 12px', background: currentPage === totalPages ? '#e5e7eb' : '#3b82f6', color: currentPage === totalPages ? '#9ca3af' : 'white', borderRadius: '6px', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600}}>→</button>
              </div>
              <span style={{fontSize: '16px', fontWeight: 'bold', color: '#1f2937'}}>Toplam: {totalAmount.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</span>
            </div>
            <div style={{flex: 1, overflowY: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead style={{position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10}}>
                  <tr>
                    <th style={{padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', width: '50px'}}>✓</th>
                    <th onClick={() => handleSort('payment_date')} style={{padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', width: '100px', cursor: 'pointer', userSelect: 'none'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>Tarih <SortIcon field="payment_date" /></div>
                    </th>
                    <th onClick={() => handleSort('cari_kart')} style={{padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', width: '220px', cursor: 'pointer', userSelect: 'none'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>Cari/Kart <SortIcon field="cari_kart" /></div>
                    </th>
                    <th style={{padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb'}}>Açıklama</th>
                    <th onClick={() => handleSort('payment_type')} style={{padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', width: '120px', cursor: 'pointer', userSelect: 'none'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>Tip <SortIcon field="payment_type" /></div>
                    </th>
                    <th onClick={() => handleSort('payment_method')} style={{padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', width: '100px', cursor: 'pointer', userSelect: 'none'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>Yöntem <SortIcon field="payment_method" /></div>
                    </th>
                    <th onClick={() => handleSort('amount')} style={{padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', width: '120px', cursor: 'pointer', userSelect: 'none'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px'}}>Tutar <SortIcon field="amount" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment) => {
                    const displayDate = payment.payment_method === 'cek' && payment.due_date ? payment.due_date : payment.payment_date;
                    let cariKartInfo = '-';
                    if (payment.payment_type === 'cari' && payment.cari_name) {
                      cariKartInfo = payment.cari_name;
                    } else if (payment.payment_type === 'kredi_karti' && payment.credit_card_code) {
                      cariKartInfo = `${payment.credit_card_code} ${payment.credit_card_name || ''}`;
                    }
                    return (
                      <tr key={payment.id} style={{borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.2s', background: payment.is_completed ? '#fef3c7' : 'transparent'}} className="hover:bg-gray-50">
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          <input
                            type="checkbox"
                            checked={payment.is_completed || false}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const newCompletedStatus = !payment.is_completed;
                              await firestore.updatePayment(payment.id, { is_completed: newCompletedStatus });
                              
                              // Kredi kartı ödemesi ise ve tik atıldıysa limitten düş
                              if (payment.payment_type === 'kredi_karti' && newCompletedStatus && payment.credit_card_id) {
                                const cards = await firestore.getCreditCards(true);
                                const card = cards.find(c => c.id === payment.credit_card_id);
                                if (card) {
                                  const newBalance = (card.balance || 0) - payment.amount;
                                  await firestore.updateDocument('creditCards', payment.credit_card_id, { balance: newBalance });
                                }
                              }
                              // Tik kaldırıldıysa limiti geri ekle
                              else if (payment.payment_type === 'kredi_karti' && !newCompletedStatus && payment.credit_card_id) {
                                const cards = await firestore.getCreditCards(true);
                                const card = cards.find(c => c.id === payment.credit_card_id);
                                if (card) {
                                  const newBalance = (card.balance || 0) + payment.amount;
                                  await firestore.updateDocument('creditCards', payment.credit_card_id, { balance: newBalance });
                                }
                              }
                              
                              loadAllPayments();
                            }}
                            style={{width: '18px', height: '18px', cursor: 'pointer'}}
                          />
                        </td>
                        <td style={{padding: '12px', fontSize: '14px', color: '#1f2937'}} onClick={() => {
                          setSelectedDate(new Date(displayDate));
                          setSelectedDayPayments([payment]);
                          setShowListModal(true);
                        }}>{format(new Date(displayDate), 'dd.MM.yyyy')}</td>
                        <td style={{padding: '12px', fontSize: '13px', color: '#4b5563'}} onClick={() => {
                          setSelectedDate(new Date(displayDate));
                          setSelectedDayPayments([payment]);
                          setShowListModal(true);
                        }}>{cariKartInfo}</td>
                        <td style={{padding: '12px', fontSize: '14px', color: '#1f2937'}} onClick={() => {
                          setSelectedDate(new Date(displayDate));
                          setSelectedDayPayments([payment]);
                          setShowListModal(true);
                        }}>
                          {payment.payment_method === 'cek' ? '-' : 
                           (payment.payment_method === 'dbs' || payment.payment_method === 'havale') && payment.bank_account_name ? 
                           payment.bank_account_name : 
                           (payment.description || '-')}
                        </td>
                        <td style={{padding: '12px', fontSize: '14px'}} onClick={() => {
                          setSelectedDate(new Date(displayDate));
                          setSelectedDayPayments([payment]);
                          setShowListModal(true);
                        }}>
                          <span style={{padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: payment.payment_type === 'kredi_karti' ? '#dbeafe' : payment.payment_type === 'cari' ? '#fef3c7' : '#e0e7ff', color: payment.payment_type === 'kredi_karti' ? '#1e40af' : payment.payment_type === 'cari' ? '#92400e' : '#4338ca', whiteSpace: 'nowrap'}}>
                            {payment.payment_type === 'kredi_karti' ? 'Kredi Kartı' : payment.payment_type === 'cari' ? 'Cari' : 'Serbest'}
                          </span>
                        </td>
                        <td style={{padding: '12px', fontSize: '14px'}} onClick={() => {
                          setSelectedDate(new Date(displayDate));
                          setSelectedDayPayments([payment]);
                          setShowListModal(true);
                        }}>
                          <span style={{padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#f3f4f6', color: '#374151', whiteSpace: 'nowrap'}}>
                            {payment.payment_method === 'nakit' ? 'Nakit' : payment.payment_method === 'dbs' ? 'DBS' : payment.payment_method === 'havale' ? 'Havale' : 'Çek'}
                          </span>
                        </td>
                        <td style={{padding: '12px', fontSize: '16px', fontWeight: 600, color: '#dc2626', textAlign: 'right'}} onClick={() => {
                          setSelectedDate(new Date(displayDate));
                          setSelectedDayPayments([payment]);
                          setShowListModal(true);
                        }}>{payment.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
      )}

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
          canEdit={canEdit}
        />
      )}

      {showPastDateWarning && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPastDateWarning(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] relative z-10">
            <div className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-2xl font-bold">Geçmiş Tarih Uyarısı</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-800 text-lg mb-6">Geçmiş bir tarihe ödeme girişi yapıyorsunuz. Devam etmek istiyor musunuz?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPastDateWarning(false);
                    setSelectedDate(pendingDate);
                    setShowNewModal(true);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all"
                >
                  Devam Et
                </button>
                <button
                  onClick={() => setShowPastDateWarning(false)}
                  className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold transition-all"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
