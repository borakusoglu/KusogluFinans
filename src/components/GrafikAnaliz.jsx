import { useState, useEffect } from 'react';
import { format, subMonths, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as firestore from '../firebase/firestore';

const COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#ec4899'];

export default function GrafikAnaliz() {
  const [timeRange, setTimeRange] = useState('6ay');
  const [customValue, setCustomValue] = useState(6);
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [chartData, setChartData] = useState({ timeline: [], paymentMethods: [] });
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    loadChartData();
  }, [timeRange, customValue, startMonth, startYear, endMonth, endYear]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadChartData = async () => {
    const periods = calculatePeriods();
    const timelineData = [];
    const methodTotals = {};

    for (const period of periods) {
      const payments = await firestore.getPayments({ 
        startDate: period.start, 
        endDate: period.end 
      });
      
      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      timelineData.push({
        name: period.label,
        tutar: total
      });

      // Ödeme şekillerini topla
      payments.forEach(p => {
        const method = p.payment_method || 'Diğer';
        methodTotals[method] = (methodTotals[method] || 0) + p.amount;
      });
    }

    const paymentMethods = Object.entries(methodTotals).map(([name, value]) => ({
      name: getMethodLabel(name),
      value
    }));

    setChartData({ timeline: timelineData, paymentMethods });
  };

  const calculatePeriods = () => {
    const now = new Date();
    const periods = [];

    if (timeRange === 'ozel') {
      // Özel tarih aralığı
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
          label: `${i + 1}. Hafta`
        });
      }
    } else {
      const months = timeRange === 'custom' ? customValue : parseInt(timeRange);
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

  const getMethodLabel = (method) => {
    const labels = {
      'nakit': 'Nakit',
      'dbs': 'Havale/DBS',
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
  const years = Array.from({ length: currentYear - 2024 }, (_, i) => currentYear - i);

  const timeRangeOptions = [
    { value: '1hafta', label: '1 Hafta' },
    { value: '2hafta', label: '2 Hafta' },
    { value: '3hafta', label: '3 Hafta' },
    { value: '4hafta', label: '4 Hafta' },
    { value: '1ay', label: '1 Ay' },
    { value: '2ay', label: '2 Ay' },
    { value: '3ay', label: '3 Ay' },
    { value: '6ay', label: '6 Ay' },
    { value: 'ozel', label: 'Özel Aralık' }
  ];

  return (
    <div className="flex flex-col" style={{gap: '24px'}}>
      {/* Zaman Aralığı Seçici */}
      <div className="bg-white rounded-2xl p-6 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Zaman Aralığı</h3>
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

      {/* Çubuk Grafik - Zaman Çizelgesi */}
      <div className="bg-white rounded-2xl p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Ödeme Trendi</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData.timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px' }}
              formatter={(value) => `${value.toLocaleString('tr-TR')} TL`}
            />
            <Bar dataKey="tutar" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pasta Grafik - Ödeme Şekilleri */}
      <div className="bg-white rounded-2xl p-8 shadow-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Ödeme Şekilleri Dağılımı</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData.paymentMethods}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={150}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.paymentMethods.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value.toLocaleString('tr-TR')} TL`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
