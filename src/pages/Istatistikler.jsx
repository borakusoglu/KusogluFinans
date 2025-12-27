import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import GrafikAnaliz from '../components/GrafikAnaliz';
import * as firestore from '../firebase/firestore';

export default function Istatistikler() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({
    totalPayments: 0,
    paymentCount: 0,
    avgPayment: 0,
    byType: {},
    byMethod: {},
    topCari: [],
    checkStats: { total: 0, count: 0 },
    monthlyComparison: []
  });

  useEffect(() => {
    loadStatistics();
  }, [currentMonth]);

  const loadStatistics = async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const payments = await firestore.getPayments({ startDate: start, endDate: end });

    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const count = payments.length;
    const avg = count > 0 ? total / count : 0;

    const byType = payments.reduce((acc, p) => {
      acc[p.payment_type] = (acc[p.payment_type] || 0) + p.amount;
      return acc;
    }, {});

    const byMethod = payments.reduce((acc, p) => {
      const method = p.payment_method || 'Diğer';
      acc[method] = (acc[method] || 0) + p.amount;
      return acc;
    }, {});

    const cariPayments = payments.filter(p => p.payment_type === 'cari' && p.cari_name);
    const cariGroups = cariPayments.reduce((acc, p) => {
      if (!acc[p.cari_name]) {
        acc[p.cari_name] = { name: p.cari_name, total: 0, count: 0 };
      }
      acc[p.cari_name].total += p.amount;
      acc[p.cari_name].count += 1;
      return acc;
    }, {});
    const topCari = Object.values(cariGroups).sort((a, b) => b.total - a.total).slice(0, 5);

    const checks = payments.filter(p => p.payment_method === 'cek');
    const checkStats = {
      total: checks.reduce((sum, p) => sum + p.amount, 0),
      count: checks.length
    };

    const monthlyComparison = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentMonth, i);
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      const monthPayments = await firestore.getPayments({ startDate: monthStart, endDate: monthEnd });
      const monthTotal = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      monthlyComparison.push({
        month: format(monthDate, 'MMM'),
        total: monthTotal
      });
    }

    setStats({
      totalPayments: total,
      paymentCount: count,
      avgPayment: avg,
      byType,
      byMethod,
      topCari,
      checkStats,
      monthlyComparison
    });
  };

  const getTypeLabel = (type) => {
    return type === 'kredi_karti' ? 'Kredi Kartı' : type === 'cari' ? 'Cari' : type;
  };

  const getMethodLabel = (method) => {
    const labels = {
      'nakit': 'Nakit',
      'dbs': 'DBS',
      'kredi_karti': 'Kredi Kartı',
      'cek': 'Çek'
    };
    return labels[method] || method;
  };

  const summaryCards = [
    {
      title: 'Toplam Ödeme',
      value: `${stats.totalPayments.toLocaleString('tr-TR')} TL`,
      subtitle: `${stats.paymentCount} işlem`,
      gradient: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
      textColor: 'rgba(191, 219, 254, 1)'
    },
    {
      title: 'Ortalama Ödeme',
      value: `${stats.avgPayment.toLocaleString('tr-TR')} TL`,
      subtitle: 'İşlem başına',
      gradient: 'linear-gradient(135deg, #6b21a8, #7e22ce)',
      textColor: 'rgba(233, 213, 255, 1)'
    },
    {
      title: 'Çek Ödemeleri',
      value: `${stats.checkStats.total.toLocaleString('tr-TR')} TL`,
      subtitle: `${stats.checkStats.count} çek`,
      gradient: 'linear-gradient(135deg, #0f766e, #0d9488)',
      textColor: 'rgba(153, 246, 228, 1)'
    },
    {
      title: 'İşlem Sayısı',
      value: stats.paymentCount,
      subtitle: 'Bu ay',
      gradient: 'linear-gradient(135deg, #c2410c, #ea580c)',
      textColor: 'rgba(254, 215, 170, 1)'
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
      data: Object.entries(stats.byMethod).map(([method, amount]) => ({
        label: getMethodLabel(method),
        amount: amount,
        percentage: (amount / stats.totalPayments) * 100,
        gradient: 'linear-gradient(to right, #14b8a6, #06b6d4)'
      }))
    }
  ];

  return (
    <div style={{height: '100%', background: 'linear-gradient(to bottom right, #f8fafc, #dbeafe)', padding: '32px', overflowY: 'auto', animation: 'pageFadeIn 0.3s ease-out'}}>
      <div style={{maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px'}}>
        <div style={{marginBottom: 0}}>
          <h1 style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '36px', fontWeight: 'bold', background: 'linear-gradient(to right, #0d9488, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            <svg style={{width: '40px', height: '40px', color: '#0d9488'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            İstatistikler
          </h1>
          <p style={{color: '#374151', marginTop: '8px', fontSize: '18px'}}>{format(currentMonth, 'MMMM yyyy')} dönemi</p>
        </div>

        <div style={{display: 'flex', flexWrap: 'wrap', gap: '24px'}}>
          {summaryCards.map((card, index) => (
            <div 
              key={index}
              style={{
                background: card.gradient,
                flex: '1',
                minWidth: '280px',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
              }}
            >
              <p style={{color: card.textColor, fontSize: '14px', fontWeight: 500}}>{card.title}</p>
              <p style={{fontSize: '36px', fontWeight: 'bold', marginTop: '12px'}}>{card.value}</p>
              <p style={{color: card.textColor, fontSize: '14px', marginTop: '12px'}}>{card.subtitle}</p>
            </div>
          ))}
        </div>

        <div style={{display: 'flex', flexWrap: 'wrap', gap: '24px'}}>
          {detailSections.map((section, idx) => (
            <div key={idx} style={{background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', flex: '1', minWidth: '500px'}}>
              <h3 style={{fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px'}}>{section.title}</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {section.data.map((item, i) => (
                  <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '12px'}}>
                    <span style={{color: '#111827', fontWeight: 600}}>{item.label}</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                      <div style={{width: '160px', background: '#e5e7eb', borderRadius: '9999px', height: '12px'}}>
                        <div style={{background: item.gradient, width: `${item.percentage}%`, height: '12px', borderRadius: '9999px', transition: 'all 0.5s'}}></div>
                      </div>
                      <span style={{color: '#111827', fontWeight: 'bold', width: '144px', textAlign: 'right'}}>{item.amount.toLocaleString('tr-TR')} TL</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {stats.topCari.length > 0 && (
          <div style={{background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}>
            <h3 style={{fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px'}}>En Çok Ödeme Yapılan Cariler (Top 5)</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {stats.topCari.map((cari, index) => (
                <div key={cari.name} style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f9fafb', borderRadius: '12px'}}>
                  <div style={{width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', background: 'linear-gradient(135deg, #c2410c, #ea580c)'}}>
                    <span style={{color: 'white', fontWeight: 'bold', fontSize: '18px'}}>{index + 1}</span>
                  </div>
                  <div style={{flex: 1}}>
                    <p style={{fontWeight: 'bold', color: '#111827', fontSize: '18px'}}>{cari.name}</p>
                    <p style={{fontSize: '14px', color: '#4b5563'}}>{cari.count} işlem</p>
                  </div>
                  <p style={{fontSize: '24px', fontWeight: 'bold', color: '#111827'}}>{cari.total.toLocaleString('tr-TR')} TL</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <GrafikAnaliz />
      </div>
    </div>
  );
}
