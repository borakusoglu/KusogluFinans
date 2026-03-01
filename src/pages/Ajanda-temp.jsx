import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
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

export default function Ajanda({ user }) {
  const [viewMode, setViewMode] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayPayments, setSelectedDayPayments] = useState([]);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [theme, setTheme] = useState(null);
  const [showPastDateWarning, setShowPastDateWarning] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const loadTheme = async () => {
      if (user?.uid) {
        const settings = await firestore.getUserSettings(user.uid);
        setTheme(settings.calendarTheme || 'indigo');
      }
    };
    loadTheme();
    const handleThemeChange = () => loadTheme();
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  useEffect(() => {
    if (viewMode === 'calendar') {
      loadCalendarPayments();
    } else {
      loadAllPayments();
    }
  }, [currentDate, viewMode]);

  const loadCalendarPayments = async () => {
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
    const data = await firestore.getPayments({ startDate: start, endDate: end });
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
    const filteredData = isAdmin ? data : data.filter(p => !p.is_admin_only);
    setPayments(filteredData);
  };

  const loadAllPayments = async () => {
    const data = await firestore.getPayments();
    const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
    const filteredData = isAdmin ? data : data.filter(p => !p.is_admin_only);
    setPayments(filteredData.filter(p => p.payment_method !== 'devir'));
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.amount || '').toString().includes(searchTerm);
    const matchesType = filterType === 'all' || p.payment_type === filterType;
    const matchesMethod = filterMethod === 'all' || p.payment_method === filterMethod;
    return matchesSearch && matchesType && matchesMethod;
  }).sort((a, b) => {
    const dateA = a.payment_method === 'cek' && a.due_date ? a.due_date : a.payment_date;
    const dateB = b.payment_method === 'cek' && b.due_date ? b.due_date : b.payment_date;
    return new Date(dateB) - new Date(dateA);
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

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
    return payments.filter(p => 
      p.payment_method === 'cek' && 
      p.payment_date && 
      isSameDay(new Date(p.payment_date), day)
    );
  };

  const getTotalForDay = (day) => {
    return getPaymentsForDay(day).reduce((sum, p) => sum + p.amount, 0);
  };

  const isHoliday = (day) => {
    const month = day.getMonth() + 1;
    const date = day.getDate();
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0) return { type: 'sunday', name: 'Pazar', isClosedDay: true };
    if (month === 1 && date === 1) return { type: 'newyear', name: 'Yılbaşı', isClosedDay: true };
    if (month === 5 && date === 1) return { type: 'holiday', name: 'İşçi Bayramı', isClosedDay: true };
    if (month === 3 && (date === 30 || date === 31)) return { type: 'religious', name: 'Ramazan Bayramı', isClosedDay: true };
    if (month === 6 && (date === 6 || date === 7)) return { type: 'religious', name: 'Kurban Bayramı', isClosedDay: true };
    if (month === 3 && (date === 20 || date === 21)) return { type: 'religious', name: 'Ramazan Bayramı', isClosedDay: true };
    if (month === 5 && (date === 27 || date === 28)) return { type: 'religious', name: 'Kurban Bayramı', isClosedDay: true };
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

  if (viewMode === 'list') {
