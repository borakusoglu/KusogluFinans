import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeDB } from '../firebase/config';
import { ref, onValue, update } from 'firebase/database';

const RECEIPT_URL = 'https://k-depo.com/kusoglu-tahsilat-makbuz';

const openUrl = (url) => {
  try {
    if (window.__TAURI__) {
      window.__TAURI__.core.invoke('plugin:opener|open_url', { url });
    } else {
      window.open(url, '_blank');
    }
  } catch { window.open(url, '_blank'); }
};

const STATUS_MAP = {
  success:    { label: 'Ba\u015Far\u0131l\u0131',      bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  failed:     { label: 'Ba\u015Far\u0131s\u0131z',     bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  voided:     { label: '\u0130ptal',         bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  refunded:   { label: '\u0130ade',          bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' },
  pending:    { label: 'Bekliyor',      bg: '#fef9c3', color: '#854d0e', border: '#fef08a' },
  processing: { label: '3D \u0130\u015Fleniyor',  bg: '#e0f2fe', color: '#075985', border: '#bae6fd' },
};

function fmt(amount) {
  return Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20BA';
}
function fmtDate(d) {
  if (!d) return '-';
  try { const dt = new Date(d); return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); } catch { return d; }
}
function toDS(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

export default function Tahsilat() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [sortField, setSortField] = useState('dateAdd');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const logsRef = ref(realtimeDB, 'payment_logs');
    const unsub = onValue(logsRef, (snap) => {
      if (!snap.exists()) { setLogs([]); setLoading(false); return; }
      const arr = Object.values(snap.val());
      arr.sort((a, b) => (b.dateAdd || '').localeCompare(a.dateAdd || ''));
      setLogs(arr);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  const handleVoid = (log) => {
    if (!log.orderId || log.status === 'voided') return;
    setConfirmDlg({
      message: log.orderId + ' numaral\u0131 i\u015Flemi iptal etmek istedi\u011Finize emin misiniz?',
      onConfirm: async () => {
        setConfirmDlg(null);
        setVoiding(true);
        try {
          const logRef = ref(realtimeDB, 'payment_logs/' + log.orderId);
          await update(logRef, { status: 'voided', voidedAt: new Date().toISOString(), voidedBy: 'finans-app' });
          setToast({ message: '\u0130\u015Flem iptal edildi.', type: 'success' });
          setSelected(null);
        } catch (e) {
          setToast({ message: '\u0130ptal ba\u015Far\u0131s\u0131z: ' + e.message, type: 'error' });
        } finally { setVoiding(false); }
      },
    });
  };

  const handleRestore = (log) => {
    if (!log.orderId || log.status !== 'voided') return;
    setConfirmDlg({
      message: log.orderId + ' numaral\u0131 i\u015Flemin iptalini geri almak istedi\u011Finize emin misiniz?',
      onConfirm: async () => {
        setConfirmDlg(null);
        setVoiding(true);
        try {
          const logRef = ref(realtimeDB, 'payment_logs/' + log.orderId);
          await update(logRef, { status: 'success', voidedAt: null, voidedBy: null, restoredAt: new Date().toISOString() });
          setToast({ message: '\u0130ptal geri al\u0131nd\u0131.', type: 'success' });
          setSelected(null);
        } catch (e) {
          setToast({ message: 'Geri alma ba\u015Far\u0131s\u0131z: ' + e.message, type: 'error' });
        } finally { setVoiding(false); }
      },
    });
  };

  const filtered = logs.filter(log => {
    if (statusF !== 'all' && log.status !== statusF) return false;
    if (dateFrom && (log.dateAdd || '').substring(0,10) < dateFrom) return false;
    if (dateTo && (log.dateAdd || '').substring(0,10) > dateTo) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return [log.orderId, log.transId, log.customerFirstname, log.customerLastname, log.companyName, log.maskedCard, log.cardBank, log.customerEmail, log.description, log.referenceNumber]
      .some(v => (v || '').toLowerCase().includes(s));
  });

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField] ?? '', vb = b[sortField] ?? '';
    if (sortField === 'amount') { va = Number(va); vb = Number(vb); }
    return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
  });

  const doSort = (f) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc'); } };
  const setQD = (days) => { const n = new Date(); const f = new Date(n); f.setDate(f.getDate()-days); setDateFrom(toDS(f)); setDateTo(toDS(n)); };

  const totalSuccess = filtered.filter(l => l.status === 'success').reduce((s, l) => s + Number(l.amount || 0), 0);
  const totalFailed = filtered.filter(l => l.status === 'failed').length;

  const cols = [
    { key: 'dateAdd', label: 'Tarih', w: '130px' },
    { key: 'status', label: 'Durum', w: '100px' },
    { key: 'companyName', label: 'Firma', w: '150px' },
    { key: 'amount', label: 'Tutar', w: '100px' },
    { key: 'maskedCard', label: 'Kart', w: '150px' },
    { key: 'cardBank', label: 'Banka', w: '120px' },
    { key: 'description', label: 'A\u00E7\u0131klama', w: '150px' },
    { key: 'authCode', label: 'Provizyon', w: '90px' },
    { key: '_actions', label: '', w: '70px' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 24px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexShrink: 0 }}>
        {[['Toplam Tahsilat', fmt(totalSuccess), '#10b981,#059669'], ['Toplam \u0130\u015Flem', filtered.length, '#3b82f6,#2563eb'], ['Ba\u015Far\u0131s\u0131z', totalFailed, '#ef4444,#dc2626']].map(([l, v, g]) => (
          <div key={l} style={{ flex: 1, background: `linear-gradient(135deg,${g})`, borderRadius: '12px', padding: '16px 20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>{l}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '320px' }}>
          <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '9px 10px 9px 34px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px', outline: 'none', background: 'white' }} />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px', background: 'white', cursor: 'pointer' }}>
          <option value="all">T\u00FCm Durumlar</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '12px', background: 'white' }} />
        <span style={{ color: '#9ca3af' }}>-</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '12px', background: 'white' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {[['Bug\u00FCn',0],['7G',7],['30G',30],['90G',90]].map(([l,d]) => (
            <button key={l} onClick={() => d===0 ? (setDateFrom(toDS(new Date())),setDateTo(toDS(new Date()))) : setQD(d)} style={{ padding: '5px 9px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '11px', background: 'white', cursor: 'pointer', color: '#374151' }}>{l}</button>
          ))}
          {(dateFrom||dateTo) && <button onClick={() => {setDateFrom('');setDateTo('');}} style={{ padding: '5px 9px', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '11px', background: '#fef2f2', cursor: 'pointer', color: '#991b1b' }}>X</button>}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#9ca3af' }}>{sorted.length} kay\u0131t</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb', background: 'white' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTop: '3px solid #10b981', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <p>Y\u00FCkleniyor...</p>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#9ca3af' }}>Tahsilat kayd\u0131 bulunamad\u0131</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 1 }}>
                {cols.map(c => c.key === '_actions' ? (
                  <th key="_actions" style={{ padding: '10px 8px', width: c.w, background: '#f8fafc' }} />
                ) : (
                  <th key={c.key} onClick={() => doSort(c.key)} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', width: c.w, background: '#f8fafc' }}>
                    {c.label}{sortField === c.key && <span style={{ marginLeft: '4px', fontSize: '10px' }}>{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((log, i) => {
                const st = STATUS_MAP[log.status] || { label: log.status, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
                return (
                  <tr key={log.orderId || i} onClick={() => setSelected(log)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s', background: i%2===0 ? 'white' : '#fafbfc' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'} onMouseLeave={e => e.currentTarget.style.background=i%2===0?'white':'#fafbfc'}>
                    <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>{fmtDate(log.dateAdd)}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '9px 10px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.companyName || `${log.customerFirstname||''} ${log.customerLastname||''}`.trim() || '-'}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 600, whiteSpace: 'nowrap', color: log.status==='success' ? '#059669' : log.status==='failed' ? '#dc2626' : '#374151' }}>{fmt(log.amount)}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>{log.maskedCard || '-'}</td>
                    <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.cardBank || '-'}</td>
                    <td style={{ padding: '9px 10px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description || '-'}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontSize: '11px' }}>{log.authCode || '-'}</td>
                    <td style={{ padding: '9px 6px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      {log.status === 'success' && log.referenceNumber && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openUrl(RECEIPT_URL + '?ref=' + encodeURIComponent(log.referenceNumber))} title="PDF \u0130ndir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', padding: '2px' }}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </button>
                          <button onClick={() => openUrl(RECEIPT_URL + '?ref=' + encodeURIComponent(log.referenceNumber))} title="Yazd\u0131r" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', padding: '2px' }}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)} />
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '600px', maxHeight: '80vh', overflow: 'auto', padding: '24px', position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{'\u0130\u015Flem Detay\u0131'}</h3>
              <button onClick={() => setSelected(null)} style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <svg width="24" height="24" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['Sipari\u015F No', selected.orderId], ['\u0130\u015Flem No', selected.transId],
                ['Durum', (STATUS_MAP[selected.status]||{}).label || selected.status], ['Tarih', fmtDate(selected.dateAdd)],
                ['Tutar', fmt(selected.amount)], ['Kart No', selected.maskedCard],
                ['Kart Markas\u0131', selected.cardBrand], ['Banka', selected.cardBank],
                ['Provizyon No', selected.authCode], ['Banka Ref No', selected.hostRefNum],
                ['Firma', selected.companyName], ['M\u00FC\u015Fteri', (selected.customerFirstname||'') + ' ' + (selected.customerLastname||'')],
                ['E-posta', selected.customerEmail], ['Referans No', selected.referenceNumber],
                ['A\u00E7\u0131klama', selected.description], ['\u0130\u015Flem Tipi', selected.transactionType],
              ].filter(([,v]) => v).map(([l,v]) => (
                <div key={l} style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>{l}</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827', wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
              {selected.status === 'failed' && selected.errorMessage && (
                <div style={{ gridColumn: '1/-1', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '2px' }}>Hata</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#991b1b' }}>{selected.errorCode ? '['+selected.errorCode+'] ' : ''}{selected.errorMessage}</div>
                </div>
              )}
            </div>
            {selected.status === 'success' && selected.orderId && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                <button onClick={() => handleVoid(selected)} disabled={voiding}
                  style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: voiding ? '#d1d5db' : '#fef3c7', color: '#92400e', border: '1px solid #fde68a', cursor: voiding ? 'not-allowed' : 'pointer' }}>
                  {voiding ? '\u0130ptal ediliyor...' : '\u0130\u015Flemi \u0130ptal Et'}
                </button>
              </div>
            )}
            {selected.status === 'voided' && selected.orderId && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                <button onClick={() => handleRestore(selected)} disabled={voiding}
                  style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: voiding ? '#d1d5db' : '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', cursor: voiding ? 'not-allowed' : 'pointer' }}>
                  {voiding ? 'Geri al\u0131n\u0131yor...' : '\u0130ptali Geri Al'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {confirmDlg && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDlg(null)} />
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '420px', padding: '24px', position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{'\u0130\u015Flem \u0130ptali'}</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.5 }}>{confirmDlg.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDlg(null)} style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer' }}>{'Vazge\u00E7'}</button>
              <button onClick={confirmDlg.onConfirm} style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', cursor: 'pointer' }}>{'Evet, \u0130ptal Et'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 300, padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '10px', background: toast.type==='success' ? '#dcfce7' : '#fee2e2', color: toast.type==='success' ? '#166534' : '#991b1b', border: '1px solid ' + (toast.type==='success' ? '#bbf7d0' : '#fecaca'), animation: 'slideIn 0.3s ease' }}>
          <span>{toast.type==='success' ? 'OK' : 'X'}</span><span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit', marginLeft: '8px' }}>X</button>
        </div>
      )}
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}
