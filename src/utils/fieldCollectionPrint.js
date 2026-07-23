import { invoke } from '@tauri-apps/api/core';

const LAST_PRINT_KEY = 'kdepo_field_collection_last_auto_print';
let scheduledPrintPromise = null;

const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const money = (amount) => Number(amount || 0).toLocaleString('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pad = (value, length) => String(value ?? '').slice(0, length).padEnd(length, ' ');

export function buildSalespersonReport(plasiyerCode, rows, printedAt = new Date()) {
  const titleDate = printedAt.toLocaleString('tr-TR');
  const divider = '-'.repeat(108);
  const lines = [
    'KUSOGLU - PLASIYER TAHSILAT RAPORU',
    `Plasiyer: ${plasiyerCode || 'BELIRSIZ'}    Yazdirma: ${titleDate}`,
    divider,
    `${pad('Tarih', 17)} ${pad('Belge No', 14)} ${pad('Cari Kod', 14)} ${pad('Musteri', 27)} ${pad('Odeme', 16)} ${'Tutar'.padStart(13)}`,
    divider,
  ];

  rows.forEach((row) => {
    const created = row.created_at ? new Date(row.created_at.replace(' ', 'T')) : null;
    const date = created && !Number.isNaN(created.getTime())
      ? created.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : row.created_at || '-';
    lines.push(
      `${pad(date, 17)} ${pad(row.document_no, 14)} ${pad(row.cari_kod, 14)} ${pad(row.customer_name, 27)} ${pad(row.payment_type_label, 16)} ${money(row.amount).padStart(13)}`,
    );
    if (row.description) lines.push(`  Aciklama: ${row.description}`);
  });

  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  lines.push(divider, `${rows.length} tahsilat`.padEnd(91, ' ') + `${money(total)} TL`.padStart(17), '', 'Finans Kontrol: ____________________', '');
  return lines.join('\r\n');
}
export async function printFieldCollections(rows, printedBy) {
  const printable = rows.filter((row) => ['pending', 'failed'].includes(row.status));
  if (!printable.length) return { groups: 0, count: 0 };

  const groups = printable.reduce((result, row) => {
    const key = row.plasiyer_kodu || 'BELIRSIZ';
    if (!result[key]) result[key] = [];
    result[key].push(row);
    return result;
  }, {});

  let printedCount = 0;
  for (const [plasiyerCode, groupRows] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
    await invoke('print_collection_report', {
      report: buildSalespersonReport(plasiyerCode, groupRows),
    });
    await invoke('mark_field_collections_printed', {
      ids: groupRows.map((row) => Number(row.id_tahsilat)),
      printedBy: printedBy || 'finans',
    });
    printedCount += groupRows.length;
  }

  return { groups: Object.keys(groups).length, count: printedCount };
}

export async function runScheduledCollectionPrint(user, { force = false } = {}) {
  if (scheduledPrintPromise) return scheduledPrintPromise;

  scheduledPrintPromise = (async () => {
    const now = new Date();
    const today = dateKey(now);
    const afterPrintTime = now.getHours() > 7 || (now.getHours() === 7 && now.getMinutes() >= 30);
    if (!force && (!afterPrintTime || localStorage.getItem(LAST_PRINT_KEY) === today)) {
      return { skipped: true, groups: 0, count: 0 };
    }

    const response = await invoke('get_field_collections', { status: 'all' });
    const rows = (response.collections || []).filter((row) =>
      ['pending', 'failed'].includes(row.status) && !row.printed_at,
    );
    const result = await printFieldCollections(rows, user?.username || user?.email || 'finans');
    localStorage.setItem(LAST_PRINT_KEY, today);
    return { ...result, skipped: false };
  })();

  try {
    return await scheduledPrintPromise;
  } finally {
    scheduledPrintPromise = null;
  }
}
