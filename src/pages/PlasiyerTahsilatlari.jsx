import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { printFieldCollections } from '../utils/fieldCollectionPrint';

const SELECTED_DATE_STORAGE_KEY = 'kdepo_field_collection_date';
const LEGACY_DATE_RANGE_STORAGE_KEY = 'kdepo_field_collection_date_range';

const STATUS = {
  pending: { label: 'Finans Bekliyor', bg: '#fef3c7', color: '#92400e' },
  processing: { label: 'Aktarılıyor', bg: '#dbeafe', color: '#1e40af' },
  failed: { label: 'Hatalı', bg: '#fee2e2', color: '#991b1b' },
  sent: { label: "Netsis'e Aktarıldı", bg: '#dcfce7', color: '#166534' },
  deleted: { label: 'Silindi', bg: '#f3f4f6', color: '#4b5563' },
};

const fieldStyle = { width: '100%', padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: '9px', fontSize: '13px', boxSizing: 'border-box' };
const buttonStyle = { border: 0, borderRadius: '9px', padding: '9px 13px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' };

const money = (value) => Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const localDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const isDateValue = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const readSelectedDate = () => {
  const today = localDateValue();
  try {
    const saved = JSON.parse(localStorage.getItem(SELECTED_DATE_STORAGE_KEY) || 'null');
    if (isDateValue(saved)) return saved;
    const legacyRange = JSON.parse(localStorage.getItem(LEGACY_DATE_RANGE_STORAGE_KEY) || 'null');
    if (isDateValue(legacyRange?.end)) return legacyRange.end;
  } catch {
    // Bozuk/eski kayıt varsa güvenli varsayılana dön.
  }
  return today;
};
const collectionDateValue = (value) => {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('tr-TR');
};
const salespersonName = (row) => row.app_user_name?.trim()
  || row.plasiyer_kodu?.trim()
  || 'Plasiyer bilgisi yok';

function Modal({ title, children, onClose, actions }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 'min(620px,90vw)', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,.28)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
          <strong style={{ fontSize: '18px', color: '#0f172a' }}>{title}</strong>
          <button onClick={onClose} style={{ ...buttonStyle, marginLeft: 'auto', background: '#f1f5f9', color: '#475569' }}>Kapat</button>
        </div>
        <div style={{ padding: '20px 22px' }}>{children}</div>
        {actions && <div style={{ padding: '14px 22px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '9px' }}>{actions}</div>}
      </div>
    </div>
  );
}

export default function PlasiyerTahsilatlari({ user }) {
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printStatus, setPrintStatus] = useState('unprinted');
  const [search, setSearch] = useState('');
  const [salesperson, setSalesperson] = useState('all');
  const [selectedDate, setSelectedDate] = useState(readSelectedDate);
  const [selected, setSelected] = useState(new Set());
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const transferLockRef = useRef(false);
  const transferredIdsRef = useRef(new Set());
  const actor = user?.username || user?.email || 'finans';

  const load = useCallback(async () => {
    if (!isAdmin) {
      setRows([]);
      setSelected(new Set());
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await invoke('get_field_collections', { status: 'all' });
      setRows(response.collections || []);
      setSelected(new Set());
    } catch (reason) {
      setRows([]);
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_DATE_STORAGE_KEY, JSON.stringify(selectedDate));
    } catch {
      // Depolama kullanılamasa da tarih filtresi oturum boyunca çalışmaya devam eder.
    }
  }, [selectedDate]);

  const salespersonOptions = useMemo(
    () => Array.from(new Set(rows.map(salespersonName)))
      .sort((a, b) => a.localeCompare(b, 'tr')),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    return rows.filter((row) => {
      const rowDate = collectionDateValue(row.created_at);
      const matchesDate = rowDate === selectedDate;
      const matchesPrintStatus = printStatus === 'all'
        || (printStatus === 'printed' ? Boolean(row.printed_at) : !row.printed_at);
      const matchesSalesperson = salesperson === 'all' || salespersonName(row) === salesperson;
      const matchesSearch = !needle
        || [row.document_no, row.customer_name, row.cari_kod, row.plasiyer_kodu, row.app_user_name, row.payment_type_label]
          .some((value) => String(value || '').toLocaleLowerCase('tr-TR').includes(needle));
      return matchesDate && matchesPrintStatus && matchesSalesperson && matchesSearch;
    });
  }, [rows, search, salesperson, selectedDate, printStatus]);

  const actionable = filtered.filter((row) => (
    ['pending', 'failed'].includes(row.status)
    && !transferredIdsRef.current.has(Number(row.id_tahsilat))
  ));
  const selectedRows = filtered.filter((row) => selected.has(row.id_tahsilat));
  const total = filtered.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pendingTotal = actionable.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const toggle = (id) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const changeSelectedDate = (date) => {
    if (!isDateValue(date)) return;
    setSelectedDate(date);
    setSelected(new Set());
  };

  const saveEdit = async () => {
    if (!isAdmin) { setToast('Bu işlem yalnızca admin yetkisiyle yapılabilir.'); return; }
    if (!editRow || !editRow.document_no?.trim() || !editRow.cari_kod?.trim() || Number(editRow.amount) <= 0) {
      setToast('Belge no, cari kod ve pozitif tutar zorunludur.');
      return;
    }
    setBusy(true);
    try {
      await invoke('update_field_collection', { collection: editRow, editedBy: actor });
      setEditRow(null);
      setToast('Tahsilat güncellendi. Değişiklik nedeniyle yeniden yazdırılması gerekecek.');
      await load();
    } catch (reason) { setToast(String(reason)); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!isAdmin) { setToast('Bu işlem yalnızca admin yetkisiyle yapılabilir.'); return; }
    if (!deleteRow || !deleteReason.trim()) return;
    setBusy(true);
    try {
      await invoke('delete_field_collection', {
        idTahsilat: Number(deleteRow.id_tahsilat),
        reason: deleteReason.trim(),
        deletedBy: actor,
      });
      setDeleteRow(null);
      setDeleteReason('');
      setToast('Tahsilat finans kuyruğundan silindi.');
      await load();
    } catch (reason) { setToast(String(reason)); } finally { setBusy(false); }
  };

  const printReport = async () => {
    if (!isAdmin) { setToast('Bu işlem yalnızca admin yetkisiyle yapılabilir.'); return; }
    const targets = selectedRows.length ? selectedRows : actionable;
    if (!targets.length) { setToast('Yazdırılacak bekleyen tahsilat yok.'); return; }
    setBusy(true);
    try {
      const result = await printFieldCollections(targets, actor);
      setToast(`${result.groups} plasiyer için ${result.count} tahsilat varsayılan yazıcıya gönderildi.`);
      await load();
    } catch (reason) { setToast(`Yazdırma başarısız: ${reason}`); } finally { setBusy(false); }
  };

  const sendRows = async () => {
    if (!isAdmin) { setToast('Bu işlem yalnızca admin yetkisiyle yapılabilir.'); return; }
    if (transferLockRef.current) {
      setToast("Netsis aktarımı zaten devam ediyor. Aynı kayıtlar tekrar gönderilmedi.");
      return;
    }
    const targets = Array.from(new Map(
      selectedRows
        .filter((row) => ['pending', 'failed'].includes(row.status))
        .filter((row) => !transferredIdsRef.current.has(Number(row.id_tahsilat)))
        .map((row) => [Number(row.id_tahsilat), row]),
    ).values());
    if (!targets.length) { setToast('Aktarılacak tahsilatları seçin.'); return; }
    const unprinted = targets.filter((row) => !row.printed_at);
    if (unprinted.length) { setToast(`${unprinted.length} tahsilat yazdırılmadan aktarılamaz.`); return; }
    transferLockRef.current = true;
    setBusy(true);
    let success = 0;
    let alreadySent = 0;
    const errors = [];
    try {
      for (const row of targets) {
        const idTahsilat = Number(row.id_tahsilat);
        try {
          const response = await invoke('send_field_collection', { idTahsilat, sentBy: actor });
          transferredIdsRef.current.add(idTahsilat);
          if (response?.already_sent) alreadySent += 1; else success += 1;
        } catch (reason) {
          errors.push(`${row.document_no}: ${reason}`);
        }
      }
      await load();
    } finally {
      transferLockRef.current = false;
      setBusy(false);
    }
    const duplicateNote = alreadySent ? ` ${alreadySent} kayıt zaten aktarılmıştı; tekrar gönderilmedi.` : '';
    setToast(errors.length
      ? `${success} aktarıldı, ${errors.length} hata.${duplicateNote} ${errors[0]}`
      : `${success} tahsilat Netsis'e aktarıldı.${duplicateNote}`);
  };

  if (!isAdmin) {
    return <div style={{ padding: '50px', textAlign: 'center', color: '#991b1b' }}>Bu sayfaya yalnızca admin kullanıcıları erişebilir.</div>;
  }

  return (
    <div style={{ height: '100%', padding: '18px 22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        {[
          ['Görünen Kayıt', filtered.length, '#2563eb'],
          ['Görünen Toplam', money(total), '#0f766e'],
          ['Finans Bekleyen', actionable.length, '#d97706'],
          ['Bekleyen Tutar', money(pendingTotal), '#7c3aed'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ flex: 1, background: 'white', border: '1px solid #e5e7eb', borderTop: `4px solid ${color}`, borderRadius: '12px', padding: '12px 16px' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
            <div style={{ fontSize: '21px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '12px', fontWeight: 700 }}>
          Tarih
          <input type="date" value={selectedDate} onChange={(event) => changeSelectedDate(event.target.value)} style={{ ...fieldStyle, width: '135px', background: 'white' }} />
        </label>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Belge, müşteri, cari veya plasiyer ara..." style={{ ...fieldStyle, width: '260px' }} />
        <select value={salesperson} onChange={(event) => { setSalesperson(event.target.value); setSelected(new Set()); }} style={{ ...fieldStyle, width: '210px', background: 'white' }}>
          <option value="all">Tüm plasiyerler</option>
          {salespersonOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={printStatus} onChange={(event) => { setPrintStatus(event.target.value); setSalesperson('all'); setSelected(new Set()); }} style={{ ...fieldStyle, width: '180px', background: 'white' }}>
          <option value="unprinted">Yazdırılmadı</option><option value="printed">Yazdırıldı</option><option value="all">Tümü</option>
        </select>
        <button onClick={load} disabled={busy} style={{ ...buttonStyle, background: '#e2e8f0', color: '#334155' }}>Yenile</button>
        <button onClick={printReport} disabled={busy || !actionable.length} style={{ ...buttonStyle, background: '#7c3aed', color: 'white' }}>Plasiyer Çıktısı</button>
        <button onClick={sendRows} disabled={busy || !selectedRows.length} style={{ ...buttonStyle, background: '#059669', color: 'white' }}>{transferLockRef.current ? "Netsis'e Aktarılıyor..." : "Seçilenleri Netsis'e Aktar"}</button>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>{selected.size} seçili</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
        {loading ? <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Tahsilatlar yükleniyor...</div>
          : error ? <div style={{ padding: '30px', textAlign: 'center', color: '#991b1b' }}><strong>Sunucu bağlantısı kurulamadı.</strong><div style={{ marginTop: '8px', fontSize: '12px' }}>{error}</div></div>
            : filtered.length === 0 ? <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Bu filtrede tahsilat yok.</div>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}><tr>
                    <th style={{ padding: '10px' }}><input type="checkbox" checked={actionable.length > 0 && actionable.every((row) => selected.has(row.id_tahsilat))} onChange={(event) => setSelected(event.target.checked ? new Set(actionable.map((row) => row.id_tahsilat)) : new Set())} /></th>
                    {['Tarih', 'Durum', 'Plasiyer', 'Belge No', 'Cari / Müşteri', 'Ödeme', 'Tutar', 'Yazdırma', 'İşlem'].map((label) => <th key={label} style={{ padding: '10px 8px', textAlign: label === 'Tutar' ? 'right' : 'left', color: '#475569', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{label}</th>)}
                  </tr></thead>
                  <tbody>{filtered.map((row) => {
                    const canEdit = isAdmin
                      && ['pending', 'failed'].includes(row.status)
                      && !transferredIdsRef.current.has(Number(row.id_tahsilat));
                    const statusStyle = STATUS[row.status] || STATUS.pending;
                    return <tr key={row.id_tahsilat} style={{ borderBottom: '1px solid #f1f5f9', background: selected.has(row.id_tahsilat) ? '#f0fdf4' : 'white' }}>
                      <td style={{ padding: '9px 10px' }}><input type="checkbox" disabled={!canEdit} checked={selected.has(row.id_tahsilat)} onChange={() => toggle(row.id_tahsilat)} /></td>
                      <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                      <td style={{ padding: '9px 8px' }}><span style={{ padding: '4px 8px', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{statusStyle.label}</span>{row.netsis_error && <div title={row.netsis_error} style={{ color: '#b91c1c', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '3px' }}>{row.netsis_error}</div>}</td>
                      <td style={{ padding: '9px 8px' }}><strong>{salespersonName(row)}</strong><div style={{ color: '#94a3b8' }}>{row.plasiyer_kodu || '-'}</div></td>
                      <td style={{ padding: '9px 8px' }}>{row.document_no}</td>
                      <td style={{ padding: '9px 8px', maxWidth: '220px' }}><strong>{row.cari_kod}</strong><div style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.customer_name || '-'}</div><div style={{ color: '#94a3b8' }}>{row.app_user_name || '-'}</div></td>
                      <td style={{ padding: '9px 8px' }}>{row.payment_type_label || '-'}<div style={{ color: '#94a3b8' }}>{row.payment_type_code}</div></td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap' }}>{money(row.amount)}</td>
                      <td style={{ padding: '9px 8px', color: row.printed_at ? '#166534' : '#b45309', whiteSpace: 'nowrap' }}>{row.printed_at ? formatDate(row.printed_at) : 'Yazdırılmadı'}</td>
                      <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>{canEdit && <><button onClick={() => setEditRow({ ...row, amount: String(row.amount) })} style={{ ...buttonStyle, padding: '6px 9px', background: '#dbeafe', color: '#1d4ed8', marginRight: '4px' }}>Düzenle</button><button onClick={() => { setDeleteRow(row); setDeleteReason(''); }} style={{ ...buttonStyle, padding: '6px 9px', background: '#fee2e2', color: '#b91c1c' }}>Sil</button></>}</td>
                    </tr>;
                  })}</tbody>
                </table>
              )}
      </div>

      {toast && <div style={{ position: 'fixed', right: '24px', bottom: '24px', zIndex: 150, maxWidth: '520px', background: '#0f172a', color: 'white', padding: '13px 17px', borderRadius: '11px', boxShadow: '0 12px 28px rgba(0,0,0,.28)', fontSize: '13px' }}>{toast}</div>}

      {editRow && <Modal title={`Tahsilat Düzenle - ${editRow.document_no}`} onClose={() => !busy && setEditRow(null)} actions={<><button onClick={() => setEditRow(null)} disabled={busy} style={{ ...buttonStyle, background: '#e2e8f0' }}>Vazgeç</button><button onClick={saveEdit} disabled={busy} style={{ ...buttonStyle, background: '#2563eb', color: 'white' }}>Kaydet</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
          {[['document_no', 'Belge No'], ['cari_kod', 'Cari Kod'], ['customer_name', 'Müşteri'], ['plasiyer_kodu', 'Plasiyer Kodu'], ['amount', 'Tutar'], ['payment_type_label', 'Ödeme Tipi'], ['payment_type_code', 'Ödeme Tipi Kodu']].map(([key, label]) => <label key={key} style={{ fontSize: '12px', color: '#475569' }}>{label}<input type={key === 'amount' ? 'number' : 'text'} step={key === 'amount' ? '0.01' : undefined} value={editRow[key] ?? ''} onChange={(event) => setEditRow((current) => ({ ...current, [key]: event.target.value }))} style={{ ...fieldStyle, marginTop: '5px' }} /></label>)}
          <label style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#475569' }}>Açıklama<textarea value={editRow.description || ''} onChange={(event) => setEditRow((current) => ({ ...current, description: event.target.value }))} rows={3} style={{ ...fieldStyle, marginTop: '5px', resize: 'vertical' }} /></label>
        </div>
      </Modal>}

      {deleteRow && <Modal title="Tahsilatı Sil" onClose={() => !busy && setDeleteRow(null)} actions={<><button onClick={() => setDeleteRow(null)} disabled={busy} style={{ ...buttonStyle, background: '#e2e8f0' }}>Vazgeç</button><button onClick={remove} disabled={busy || !deleteReason.trim()} style={{ ...buttonStyle, background: '#dc2626', color: 'white' }}>Sil</button></>}>
        <p><strong>{deleteRow.document_no}</strong> numaralı, <strong>{money(deleteRow.amount)}</strong> tutarındaki tahsilat finans kuyruğundan silinecek. İşlem kayıt altında tutulur.</p>
        <label style={{ fontSize: '12px', color: '#475569' }}>Silme nedeni<textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} rows={3} style={{ ...fieldStyle, marginTop: '5px', resize: 'vertical' }} /></label>
      </Modal>}
    </div>
  );
}
