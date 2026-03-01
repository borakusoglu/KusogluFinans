import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import GrafikAnaliz from '../components/GrafikAnaliz';
import * as firestore from '../firebase/firestore';

export default function Istatistikler() {
  const [timeRange, setTimeRange] = useState('1ay');
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [openDropdown, setOpenDropdown] = useState(null);
  const [stats, setStats] = useState({
    totalPayments: 0,
    paymentCount: 0,
    avgPayment: 0,
    maxPayment: 0,
    minPayment: 0,
    byType: {},
    byMethod: {},
    topCari: [],
    checkStats: { total: 0, count: 0, avgDays: 0 },
    monthlyComparison: [],
    cardUsage: [],
    dailyTrend: [],
    categoryStats: [],
    paymentFrequency: {},
    limitUsage: []
  });

  useEffect(() => {
    loadStatistics();
  }, [timeRange, startMonth, startYear, endMonth, endYear]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const calculatePeriods = () => {
    const now = new Date();
    const periods = [];

    if (timeRange === 'ozel') {
      const start = new Date(startYear, startMonth - 1, 1);
      const end = new Date(endYear, endMonth - 1, 1);
      
      let current = new Date(start);
      while (current <= end) {
        const monthStart = startOfMonth(current);
        const monthEnd = endOfMonth(current);
        periods.push({
          start: format(monthStart, 'yyyy-MM-dd'),
          end: format(monthEnd, 'yyyy-MM-dd'),
          label: format(current, 'MMM yyyy')
        });
        current = new Date(current.setMonth(current.getMonth() + 1));
      }
      return periods;
    }

    if (timeRange.includes('hafta')) {
      const weeks = parseInt(timeRange);
      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        periods.push({
          start: format(weekStart, 'yyyy-MM-dd'),
          end: format(weekEnd, 'yyyy-MM-dd'),
          label: `${format(weekStart, 'dd MMM')}`
        });
      }
    } else {
      const months = parseInt(timeRange.replace('ay', '').replace('hafta', ''));
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        periods.push({
          start: format(monthStart, 'yyyy-MM-dd'),
          end: format(monthEnd, 'yyyy-MM-dd'),
          label: format(monthDate, 'MMM yyyy')
        });
      }
    }

    return periods;
  };

  const loadStatistics = async () => {
    const periods = calculatePeriods();
    const firstPeriod = periods[0];
    const lastPeriod = periods[periods.length - 1];
    
    const allPayments = await firestore.getPayments({ 
      startDate: firstPeriod.start, 
      endDate: lastPeriod.end 
    });

    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
    const userPayments = isAdmin ? allPayments : allPayments.filter(p => !p.is_admin_only);

    const filteredPayments = userPayments.filter(p => {
      if (p.payment_method === 'devir') return false;
      const compareDate = p.payment_method === 'cek' && p.due_date ? p.due_date : p.payment_date;
      return compareDate >= firstPeriod.start && compareDate <= lastPeriod.end;
    });

    const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const count = filteredPayments.length;
    const avg = count > 0 ? total / count : 0;
    const amounts = filteredPayments.map(p => p.amount).sort((a, b) => b - a);
    const maxPayment = amounts.length > 0 ? amounts[0] : 0;
    const minPayment = amounts.length > 0 ? amounts[amounts.length - 1] : 0;

    const byType = filteredPayments.reduce((acc, p) => {
      acc[p.payment_type] = (acc[p.payment_type] || 0) + p.amount;
      return acc;
    }, {});

    const byMethod = filteredPayments.reduce((acc, p) => {
      const method = p.payment_method || 'Diğer';
      if (method === 'devir') return acc;
      acc[method] = (acc[method] || 0) + p.amount;
      return acc;
    }, {});

    // Cari analizi
    const cariPayments = filteredPayments.filter(p => p.payment_type === 'cari' && p.cari_name);
    const cariGroups = cariPayments.reduce((acc, p) => {
      if (!acc[p.cari_name]) {
        acc[p.cari_name] = { name: p.cari_name, total: 0, count: 0 };
      }
      acc[p.cari_name].total += p.amount;
      acc[p.cari_name].count += 1;
      return acc;
    }, {});
    const topCari = Object.values(cariGroups).sort((a, b) => b.total - a.total).slice(0, 10);

    // Çek analizi
    const checks = filteredPayments.filter(p => p.payment_method === 'cek');
    const checkDays = checks.map(c => {
      if (c.payment_date && c.due_date) {
        const issue = new Date(c.payment_date);
        const due = new Date(c.due_date);
        return Math.floor((due - issue) / (1000 * 60 * 60 * 24));
      }
      return 0;
    }).filter(d => d > 0);
    const avgCheckDays = checkDays.length > 0 ? checkDays.reduce((a, b) => a + b, 0) / checkDays.length : 0;

    const checkStats = {
      total: checks.reduce((sum, p) => sum + p.amount, 0),
      count: checks.length,
      avgDays: Math.round(avgCheckDays)
    };

    // Kredi kartı kullanım analizi
    const cards = await firestore.getCreditCards();
    const cardUsage = cards.filter(c => c.is_active !== false).map(card => {
      const cardPayments = filteredPayments.filter(p => 
        (p.payment_type === 'kredi_karti' && p.credit_card_id === card.id) ||
        (p.payment_type === 'cari' && p.payment_method === 'kredi_karti' && p.credit_card_id === card.id)
      );
      const cardTotal = cardPayments.reduce((sum, p) => sum + p.amount, 0);
      const usagePercent = card.limit_amount > 0 ? (cardTotal / card.limit_amount) * 100 : 0;
      
      return {
        name: card.name || card.code?.slice(-4) || 'Kart',
        total: cardTotal,
        limit: card.limit_amount,
        usagePercent: Math.min(usagePercent, 100),
        count: cardPayments.length
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    // Günlük trend
    const dailyGroups = {};
    filteredPayments.forEach(p => {
      const date = p.payment_method === 'cek' && p.due_date ? p.due_date : p.payment_date;
      if (!dailyGroups[date]) {
        dailyGroups[date] = 0;
      }
      dailyGroups[date] += p.amount;
    });
    const dailyTrend = Object.entries(dailyGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        date: format(new Date(date), 'dd MMM'),
        amount
      }));

    // Ödeme sıklığı (haftanın günleri)
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const paymentFrequency = {};
    
    // Önce tüm günleri 0 ile başlat
    dayNames.forEach(day => {
      paymentFrequency[day] = 0;
    });
    
    // Sonra ödemeleri say
    filteredPayments.forEach(p => {
      const date = new Date(p.payment_method === 'cek' && p.due_date ? p.due_date : p.payment_date);
      const day = date.getDay();
      const dayNamesMap = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const dayName = dayNamesMap[day];
      paymentFrequency[dayName] = (paymentFrequency[dayName] || 0) + 1;
    });

    // Kategori istatistikleri
    const categories = await firestore.getCategories();
    const categoryStats = categories.map(cat => {
      const catPayments = filteredPayments.filter(p => p.category_id === cat.id);
      return {
        name: cat.name,
        total: catPayments.reduce((sum, p) => sum + p.amount, 0),
        count: catPayments.length
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    // Aylık karşılaştırma
    const monthlyComparison = [];
    for (const period of periods) {
      const periodPayments = filteredPayments.filter(p => {
        const compareDate = p.payment_method === 'cek' && p.due_date ? p.due_date : p.payment_date;
        return compareDate >= period.start && compareDate <= period.end;
      });
      const periodTotal = periodPayments.reduce((sum, p) => sum + p.amount, 0);
      monthlyComparison.push({
        month: period.label,
        total: periodTotal,
        count: periodPayments.length
      });
    }

    setStats({
      totalPayments: total,
      paymentCount: count,
      avgPayment: avg,
      maxPayment,
      minPayment,
      byType,
      byMethod,
      topCari,
      checkStats,
      monthlyComparison,
      cardUsage,
      dailyTrend,
      categoryStats,
      paymentFrequency,
      limitUsage: cardUsage
    });
  };

  const getTypeLabel = (type) => {
    return type === 'kredi_karti' ? 'Kredi Kartı' : type === 'cari' ? 'Cari' : type;
  };

  const getMethodLabel = (method) => {
    const labels = {
      'nakit': 'Nakit',
      'dbs': 'DBS',
      'havale': 'Havale',
      'kredi_karti': 'Kredi Kartı',
      'cek': 'Çek'
    };
    return labels[method] || method;
  };

  const months = [
    { value: 1, label: 'Ocak' },
    { value: 2, label: 'Şubat' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' },
    { value: 5, label: 'Mayıs' },
    { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' },
    { value: 8, label: 'Ağustos' },
    { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' },
    { value: 11, label: 'Kasım' },
    { value: 12, label: 'Aralık' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const timeRangeOptions = [
    { value: '1hafta', label: '1 Hafta' },
    { value: '2hafta', label: '2 Hafta' },
    { value: '4hafta', label: '4 Hafta' },
    { value: '1ay', label: '1 Ay' },
    { value: '3ay', label: '3 Ay' },
    { value: '6ay', label: '6 Ay' },
    { value: '12ay', label: '12 Ay' },
    { value: 'ozel', label: 'Özel Aralık' }
  ];

  const summaryCards = [
    {
      title: 'Toplam Ödeme',
      value: `${stats.totalPayments.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`,
      subtitle: `${stats.paymentCount} işlem`,
      gradient: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
      textColor: 'rgba(191, 219, 254, 1)',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Ortalama Ödeme',
      value: `${stats.avgPayment.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`,
      subtitle: 'İşlem başına',
      gradient: 'linear-gradient(135deg, #6b21a8, #7e22ce)',
      textColor: 'rgba(233, 213, 255, 1)',
      icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    },
    {
      title: 'En Yüksek Ödeme',
      value: `${stats.maxPayment.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`,
      subtitle: 'Tek seferde',
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      textColor: 'rgba(167, 243, 208, 1)',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
    },
    {
      title: 'En Düşük Ödeme',
      value: `${stats.minPayment.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`,
      subtitle: 'Minimum tutar',
      gradient: 'linear-gradient(135deg, #0f766e, #0d9488)',
      textColor: 'rgba(153, 246, 228, 1)',
      icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
    },
    {
      title: 'Çek Ödemeleri',
      value: `${stats.checkStats.total.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`,
      subtitle: `${stats.checkStats.count} çek • Ort. ${stats.checkStats.avgDays} gün vade`,
      gradient: 'linear-gradient(135deg, #c2410c, #ea580c)',
      textColor: 'rgba(254, 215, 170, 1)',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      title: 'İşlem Sayısı',
      value: stats.paymentCount,
      subtitle: 'Toplam işlem',
      gradient: 'linear-gradient(135deg, #be123c, #e11d48)',
      textColor: 'rgba(254, 202, 202, 1)',
      icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
    }
  ];

  const detailSections = [
    {
      title: 'Ödeme Türleri',
      data: Object.entries(stats.byType).map(([type, amount]) => ({
        label: getTypeLabel(type),
        amount: amount,
        percentage: (amount / stats.totalPayments) * 100,
        gradient: 'linear-gradient(to right, #3b82f6, #9333ea)'
      }))
    },
    {
      title: 'Ödeme Şekilleri',
      data: Object.entries(stats.byMethod)
        .filter(([method]) => method !== 'devir')
        .map(([method, amount]) => ({
          label: getMethodLabel(method),
          amount: amount,
          percentage: (amount / stats.totalPayments) * 100,
          gradient: 'linear-gradient(to right, #14b8a6, #06b6d4)'
        }))
    }
  ];

  return (
    <div style={{height: '100%', background: 'linear-gradient(to bottom right, #f8fafc, #dbeafe)', padding: '32px', overflowY: 'auto', animation: 'pageFadeIn 0.3s ease-out'}}>
      <div style={{maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px'}}>
        {/* Header */}
        <div style={{marginBottom: 0}}>
          <h1 style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '36px', fontWeight: 'bold', background: 'linear-gradient(to right, #0d9488, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            <svg style={{width: '40px', height: '40px', color: '#0d9488'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Detaylı İstatistikler
          </h1>
          <p style={{color: '#374151', marginTop: '8px', fontSize: '18px'}}>Finansal analiz ve raporlama</p>
        </div>

        {/* Zaman Aralığı Seçici */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Zaman Aralığı</h3>
          <div className="flex flex-wrap items-center" style={{gap: '12px'}}>
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  timeRange === option.value
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {timeRange === 'ozel' && (
            <div className="mt-4">
              <div className="flex items-end" style={{gap: '24px'}}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                  <div className="flex" style={{gap: '12px'}}>
                    <div className="relative" style={{width: '140px'}}>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'startMonth' ? null : 'startMonth')}
                        className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl font-semibold bg-white text-left flex items-center justify-between hover:border-blue-600 transition-all"
                      >
                        <span>{months.find(m => m.value === startMonth)?.label}</span>
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openDropdown === 'startMonth' && (
                        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-blue-500 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {months.map(m => (
                            <div
                              key={m.value}
                              onClick={() => { setStartMonth(m.value); setOpenDropdown(null); }}
                              className="px-4 py-3 hover:bg-blue-50 cursor-pointer font-semibold transition-colors"
                            >
                              {m.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative" style={{width: '100px'}}>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'startYear' ? null : 'startYear')}
                        className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl font-semibold bg-white flex items-center justify-between hover:border-blue-600 transition-all"
                      >
                        <span>{startYear}</span>
                        <svg className="w-5 h-5 text-blue-600 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openDropdown === 'startYear' && (
                        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-blue-500 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {years.map(y => (
                            <div
                              key={y}
                              onClick={() => { setStartYear(y); setOpenDropdown(null); }}
                              className="px-4 py-3 hover:bg-blue-50 cursor-pointer font-semibold transition-colors"
                            >
                              {y}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                  <div className="flex" style={{gap: '12px'}}>
                    <div className="relative" style={{width: '140px'}}>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'endMonth' ? null : 'endMonth')}
                        className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl font-semibold bg-white text-left flex items-center justify-between hover:border-blue-600 transition-all"
                      >
                        <span>{months.find(m => m.value === endMonth)?.label}</span>
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openDropdown === 'endMonth' && (
                        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-blue-500 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {months.map(m => (
                            <div
                              key={m.value}
                              onClick={() => { setEndMonth(m.value); setOpenDropdown(null); }}
                              className="px-4 py-3 hover:bg-blue-50 cursor-pointer font-semibold transition-colors"
                            >
                              {m.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative" style={{width: '100px'}}>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'endYear' ? null : 'endYear')}
                        className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl font-semibold bg-white flex items-center justify-between hover:border-blue-600 transition-all"
                      >
                        <span>{endYear}</span>
                        <svg className="w-5 h-5 text-blue-600 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openDropdown === 'endYear' && (
                        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-blue-500 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {years.map(y => (
                            <div
                              key={y}
                              onClick={() => { setEndYear(y); setOpenDropdown(null); }}
                              className="px-4 py-3 hover:bg-blue-50 cursor-pointer font-semibold transition-colors"
                            >
                              {y}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPI Kartları */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px'}}>
          {summaryCards.map((card, index) => (
            <div 
              key={index}
              style={{
                background: card.gradient,
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
                <p style={{color: card.textColor, fontSize: '14px', fontWeight: 500}}>{card.title}</p>
                <svg style={{width: '24px', height: '24px', opacity: 0.8}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
              <p style={{fontSize: '32px', fontWeight: 'bold', marginTop: '8px', marginBottom: '8px'}}>{card.value}</p>
              <p style={{color: card.textColor, fontSize: '13px'}}>{card.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Trend Grafikleri */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
          {/* Aylık Karşılaştırma */}
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Dönemsel Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.monthlyComparison}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px' }}
                  formatter={(value) => `${value.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL`}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ödeme Sıklığı */}
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Ödeme Sıklığı (Günlere Göre)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(day => ({ 
                day, 
                count: stats.paymentFrequency[day] || 0 
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px' }}
                  formatter={(value) => `${value} işlem`}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kredi Kartı Kullanım Analizi */}
        {stats.cardUsage.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Kredi Kartı Kullanım Analizi</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {stats.cardUsage.map((card, index) => (
                <div key={index} style={{padding: '16px', background: '#f9fafb', borderRadius: '12px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <div>
                      <p style={{fontWeight: 'bold', color: '#111827', fontSize: '16px'}}>{card.name}</p>
                      <p style={{fontSize: '13px', color: '#6b7280'}}>{card.count} işlem</p>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <p style={{fontSize: '20px', fontWeight: 'bold', color: '#111827'}}>{card.total.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</p>
                      <p style={{fontSize: '13px', color: '#6b7280'}}>Limit: {card.limit.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</p>
                    </div>
                  </div>
                  <div style={{width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '12px', position: 'relative'}}>
                    <div 
                      style={{
                        background: card.usagePercent > 80 ? 'linear-gradient(to right, #ef4444, #dc2626)' : 
                                   card.usagePercent > 50 ? 'linear-gradient(to right, #f59e0b, #d97706)' : 
                                   'linear-gradient(to right, #10b981, #059669)',
                        width: `${card.usagePercent}%`, 
                        height: '12px', 
                        borderRadius: '9999px', 
                        transition: 'all 0.5s'
                      }}
                    ></div>
                    <span style={{position: 'absolute', right: '8px', top: '-2px', fontSize: '11px', fontWeight: 'bold', color: '#374151'}}>
                      %{card.usagePercent.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detay Bölümleri */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
          {detailSections.map((section, idx) => (
            <div key={idx} style={{background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
              <h3 style={{fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px'}}>{section.title}</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {section.data.map((item, i) => (
                  <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '12px'}}>
                    <span style={{color: '#111827', fontWeight: 600}}>{item.label}</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                      <div style={{width: '120px', background: '#e5e7eb', borderRadius: '9999px', height: '10px'}}>
                        <div style={{background: item.gradient, width: `${item.percentage}%`, height: '10px', borderRadius: '9999px', transition: 'all 0.5s'}}></div>
                      </div>
                      <span style={{color: '#111827', fontWeight: 'bold', width: '140px', textAlign: 'right'}}>{item.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Kategori İstatistikleri */}
        {stats.categoryStats.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Kategori Bazlı Analiz</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px'}}>
              {stats.categoryStats.map((cat, index) => (
                <div key={index} style={{padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb'}}>
                  <p style={{fontWeight: 'bold', color: '#111827', fontSize: '16px', marginBottom: '8px'}}>{cat.name}</p>
                  <p style={{fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px'}}>{cat.total.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</p>
                  <p style={{fontSize: '13px', color: '#6b7280'}}>{cat.count} işlem</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* En Çok Ödeme Yapılan Cariler */}
        {stats.topCari.length > 0 && (
          <div style={{background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
            <h3 style={{fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px'}}>En Çok Ödeme Yapılan Cariler (Top 10)</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {stats.topCari.map((cari, index) => (
                <div key={cari.name} style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f9fafb', borderRadius: '12px'}}>
                  <div style={{
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                    background: index < 3 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6b7280, #4b5563)'
                  }}>
                    <span style={{color: 'white', fontWeight: 'bold', fontSize: '18px'}}>{index + 1}</span>
                  </div>
                  <div style={{flex: 1}}>
                    <p style={{fontWeight: 'bold', color: '#111827', fontSize: '18px'}}>{cari.name}</p>
                    <p style={{fontSize: '14px', color: '#4b5563'}}>{cari.count} işlem</p>
                  </div>
                  <p style={{fontSize: '24px', fontWeight: 'bold', color: '#111827'}}>{cari.total.toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grafik Analiz Bileşeni */}
        <GrafikAnaliz />
      </div>
    </div>
  );
}
