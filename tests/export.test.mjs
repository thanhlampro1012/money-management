import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../dist/finance.js';
import { makeExcel, excelDateSerial, excelFilename, EXCEL_MIME } from '../dist/export.js';

const FIXED = { generatedAt: new Date('2026-11-26T18:30:15Z'), timeZone: 'Asia/Ho_Chi_Minh', scopeLabel: 'Tháng 11/2026', filterLabel: 'Tất cả giao dịch' };
const decoder = new TextDecoder();

function readZip(bytes) {
  assert.ok(bytes instanceof Uint8Array);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50, 'XLSX must begin with a ZIP local header');
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, 'ZIP end record exists');
  const count = view.getUint16(end + 10, true), centralSize = view.getUint32(end + 12, true);
  let central = view.getUint32(end + 16, true);
  assert.equal(central + centralSize, end);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(central, true), 0x02014b50);
    const method = view.getUint16(central + 10, true), size = view.getUint32(central + 24, true);
    const nameLength = view.getUint16(central + 28, true), extra = view.getUint16(central + 30, true), comment = view.getUint16(central + 32, true);
    const local = view.getUint32(central + 42, true);
    const name = decoder.decode(bytes.subarray(central + 46, central + 46 + nameLength));
    assert.equal(method, 0, 'self-contained browser export uses ZIP STORE');
    assert.equal(view.getUint32(local, true), 0x04034b50);
    assert.equal(view.getUint32(local + 22, true), size);
    assert.equal(view.getUint32(local + 14, true), view.getUint32(central + 16, true), 'matching local and central CRC');
    const localNameLength = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true);
    assert.equal(decoder.decode(bytes.subarray(local + 30, local + 30 + localNameLength)), name);
    const start = local + 30 + localNameLength + localExtra;
    assert.ok(start + size <= view.getUint32(end + 16, true));
    entries.set(name, decoder.decode(bytes.subarray(start, start + size)));
    central += 46 + nameLength + extra + comment;
  }
  assert.equal(entries.size, count, 'no duplicate ZIP entry names');
  return entries;
}
function cell(sheet, address) {
  const match = sheet.match(new RegExp(`<c\\b([^>]*\\br="${address}"[^>]*)>([\\s\\S]*?)<\\/c>`));
  assert.ok(match, `Cell ${address} is present`);
  return {
    attributes: match[1], body: match[2],
    number: Number(match[2].match(/<v>(.*?)<\/v>/)?.[1]),
    formula: match[2].match(/<f>(.*?)<\/f>/)?.[1],
    text: match[2].match(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/)?.[1],
  };
}
function fixture() {
  const state = createEmptyState('2026-11-26');
  state.accounts.push({ id: 'bank', name: 'Ngân hàng', initialBalance: 1000000, color: '#13705c', icon: 'bank' });
  const transaction = (id, type, amount, date, categoryId, extra = {}) => ({ id, type, amount, date, categoryId, accountId: 'cash', note: id, createdAt: `${date}T08:00:00.000Z`, ...extra });
  state.transactions = [
    transaction('expense-2', 'expense', 150000, '2026-11-02', 'transport'),
    transaction('income-1', 'income', 20000000, '2026-11-01', 'salary'),
    transaction('transfer-1', 'transfer', 1000000, '2026-11-02', 'transfer', { accountId: 'bank', transferToAccountId: 'cash' }),
    transaction('expense-1', 'expense', 85000, '2026-11-01', 'food', { createdAt: '2026-11-01T12:00:00Z' }),
    transaction('income-2', 'income', 500000, '2026-11-02', 'freelance'),
  ];
  return state;
}
function report(state = fixture(), transactions = state.transactions, options = {}) {
  return readZip(makeExcel(state, transactions, { ...FIXED, ...options }));
}

test('XLSX is a complete ZIP package with 2 worksheets, typed styles and no external relationships', () => {
  const files = report();
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'docProps/core.xml', 'docProps/app.xml']) assert.ok(files.has(name), name);
  assert.match(files.get('xl/workbook.xml'), /name="Theo ngày"/);
  assert.match(files.get('xl/workbook.xml'), /name="Giao dịch"/);
  assert.match(files.get('xl/workbook.xml'), /fullCalcOnLoad="1"/);
  assert.match(files.get('xl/styles.xml'), /dd\/mm\/yyyy/);
  for (const [name, xml] of files) {
    assert.ok(!xml.includes('TargetMode="External"'), name);
    assert.ok(!name.includes('vbaProject'));
    assert.match(xml, /^<\?xml/);
  }
  assert.equal(EXCEL_MIME, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('detail rows include every supplied transaction sorted by numeric date and creation time', () => {
  const state = fixture(), original = structuredClone(state.transactions), files = report(state);
  const sheet = files.get('xl/worksheets/sheet2.xml');
  assert.equal(cell(sheet, 'G10').text, 'income-1');
  assert.equal(cell(sheet, 'G11').text, 'expense-1');
  for (let r = 10; r <= 14; r++) {
    assert.match(cell(sheet, `B${r}`).attributes, /t="n"/);
    assert.match(cell(sheet, `H${r}`).attributes, /t="n"/);
    assert.match(cell(sheet, `I${r}`).attributes, /t="n"/);
    assert.match(cell(sheet, `J${r}`).attributes, /t="n"/);
  }
  assert.equal(cell(sheet, 'B10').number, excelDateSerial('2026-11-01'));
  assert.equal(cell(sheet, 'B14').number, excelDateSerial('2026-11-02'));
  assert.equal(cell(sheet, 'G15').text, 'Tổng cộng (5 giao dịch)');
  assert.deepEqual(state.transactions, original, 'export never reorders the caller ledger');
});

test('daily SUMIFS/COUNTIFS formulas and bottom totals reconcile while transfers remain separate', () => {
  const files = report(), daily = files.get('xl/worksheets/sheet1.xml'), detail = files.get('xl/worksheets/sheet2.xml');
  assert.equal(cell(daily, 'B10').number, 2);
  assert.equal(cell(daily, 'C10').number, 20000000);
  assert.equal(cell(daily, 'D10').number, 85000);
  assert.equal(cell(daily, 'E10').number, 0);
  assert.equal(cell(daily, 'B11').number, 3);
  assert.equal(cell(daily, 'E11').number, 1000000);
  assert.equal(cell(daily, 'F11').number, 350000);
  assert.equal(cell(daily, 'B12').number, 5);
  assert.equal(cell(daily, 'C12').number, 20500000);
  assert.equal(cell(daily, 'D12').number, 235000);
  assert.equal(cell(daily, 'E12').number, 1000000);
  assert.equal(cell(daily, 'F12').number, 20265000);
  assert.match(cell(daily, 'D10').formula, /^SUMIFS\(/);
  assert.match(cell(daily, 'B10').formula, /^COUNTIFS\(/);
  assert.equal(cell(daily, 'F11').formula, 'C11-D11');
  assert.equal(cell(detail, 'H15').formula, 'SUM(H10:H14)');
  assert.equal(cell(detail, 'I15').number, 235000);
  assert.equal(cell(detail, 'J15').number, 1000000);
});

test('filtered subsets drive the entire workbook and export is independent of pagination', () => {
  const state = fixture(), onlyExpenses = state.transactions.filter(transaction => transaction.type === 'expense');
  const files = report(state, onlyExpenses, { scopeLabel: '01/11–02/11/2026', filterLabel: 'Chỉ chi tiêu; ví Tiền mặt' });
  const detail = files.get('xl/worksheets/sheet2.xml');
  assert.equal(cell(detail, 'G12').text, 'Tổng cộng (2 giao dịch)');
  assert.equal(cell(detail, 'H12').number, 0);
  assert.equal(cell(detail, 'I12').number, 235000);
  assert.equal(cell(detail, 'J12').number, 0);
  assert.match(cell(detail, 'A4').text, /Chỉ chi tiêu; ví Tiền mặt/);
  const many = Array.from({ length: 137 }, (_, index) => ({ ...onlyExpenses[0], id: `row-${index}`, note: `Giao dịch ${index}` }));
  const large = report(state, many).get('xl/worksheets/sheet2.xml');
  assert.equal(cell(large, 'G147').text, 'Tổng cộng (137 giao dịch)');
  assert.equal(cell(large, 'I147').number, 137 * 150000);
});

test('empty exports have safe zero totals, clear scope and a header-only filter', () => {
  const files = report(createEmptyState(), []);
  for (const [name, columns] of [['xl/worksheets/sheet1.xml', 'BCDEF'], ['xl/worksheets/sheet2.xml', 'HIJ']]) {
    const sheet = files.get(name);
    for (const column of columns) assert.equal(cell(sheet, `${column}11`).number, 0);
    assert.ok(!/#REF!|NaN|undefined/.test(sheet));
  }
  assert.match(files.get('xl/worksheets/sheet2.xml'), /autoFilter ref="A9:J9"/);
  assert.match(files.get('xl/worksheets/sheet1.xml'), /Không có giao dịch/);
});

test('dates use the Excel 1900 calendar and transaction days never shift with export timezone', () => {
  assert.equal(excelDateSerial('1900-01-01'), 1);
  assert.equal(excelDateSerial('1900-02-28'), 59);
  assert.equal(excelDateSerial('1900-03-01'), 61);
  assert.equal(excelDateSerial('1970-01-01'), 25569);
  assert.equal(excelDateSerial('2024-02-29'), 45351);
  assert.equal(excelDateSerial('9999-12-31'), 2958465);
  assert.throws(() => excelDateSerial('2026-02-29'));
  const state = fixture(), local = report(state), utc = report(state, state.transactions, { timeZone: 'UTC' });
  assert.equal(cell(local.get('xl/worksheets/sheet2.xml'), 'B10').number, cell(utc.get('xl/worksheets/sheet2.xml'), 'B10').number);
  assert.equal(cell(local.get('xl/worksheets/sheet1.xml'), 'B5').number, excelDateSerial('2026-11-27') + (3600 + 30 * 60 + 15) / 86400);
  assert.match(cell(local.get('xl/worksheets/sheet1.xml'), 'D5').text, /Asia\/Ho_Chi_Minh/);
});

test('notes and labels are literal strings even with formula prefixes, XML and OOXML escapes', () => {
  const state = fixture(), dangerous = ['=HYPERLINK("https://example.invalid","click")', '+SUM(1,2)', '-1+2', '@SUM(A1:A3)', '\t=CMD()', '<f>1+1</f>&"\'\n_x000A_\u000b'];
  const records = dangerous.map((note, index) => ({ ...state.transactions[0], id: `unsafe-${index}`, note }));
  const sheet = report(state, records, { scopeLabel: '=IMPORTXML("x")' }).get('xl/worksheets/sheet2.xml');
  for (let i = 0; i < dangerous.length; i++) {
    const noteCell = cell(sheet, `G${10 + i}`);
    assert.match(noteCell.attributes, /t="inlineStr"/);
    assert.equal(noteCell.formula, undefined);
  }
  assert.match(sheet, /&lt;f&gt;1\+1&lt;\/f&gt;&amp;/);
  assert.match(sheet, /_x005F_x000A_/);
  assert.match(sheet, /_x000B_/);
  assert.equal(cell(sheet, 'A3').formula, undefined);
  assert.ok(!sheet.includes('<hyperlinks>'));
});

test('custom category names are included from schema3 state or explicit category metadata', () => {
  const state = fixture();
  state.customCategories = [{ id: 'custom-tools', name: 'Dụng cụ cá nhân', type: 'expense', icon: 'wallet', color: '#123456' }];
  const record = { ...state.transactions[0], categoryId: 'custom-tools' };
  assert.equal(cell(report(state, [record]).get('xl/worksheets/sheet2.xml'), 'D10').text, 'Dụng cụ cá nhân');
  assert.equal(cell(report(state, [record], { categories: [{ ...state.customCategories[0], name: 'Tên được cung cấp' }] }).get('xl/worksheets/sheet2.xml'), 'D10').text, 'Tên được cung cấp');
});

test('frozen headings, identifier columns, filters and bottom totals have distinct ranges', () => {
  const files = report(), detail = files.get('xl/worksheets/sheet2.xml'), daily = files.get('xl/worksheets/sheet1.xml');
  assert.match(detail, /xSplit="2" ySplit="9" topLeftCell="C10"/);
  assert.match(daily, /xSplit="1" ySplit="9" topLeftCell="B10"/);
  assert.match(detail, /autoFilter ref="A9:J14"/);
  assert.match(detail, /dimension ref="A1:J15"/);
  assert.match(daily, /autoFilter ref="A9:F11"/);
  assert.match(daily, /dimension ref="A1:F12"/);
  assert.match(detail, /showGridLines="0"/);
});

test('invalid records and totals beyond Excel exact integer precision fail explicitly', () => {
  const state = fixture(), record = state.transactions[0];
  for (const patch of [{ amount: -1 }, { amount: 1.5 }, { date: '2026-02-31' }, { type: '__proto__' }, { accountId: 'missing' }, { categoryId: 'salary' }]) assert.throws(() => report(state, [{ ...record, ...patch }]));
  assert.throws(() => report(state, [record, record]), /trùng/);
  assert.throws(() => report(state, [{ ...state.transactions[2], transferToAccountId: 'bank' }]), /ví/);
  assert.throws(() => report(state, [record], { timeZone: 'Invalid/Zone' }), /Múi giờ/);
  const huge = Array.from({ length: 1000 }, (_, index) => ({ ...record, id: `huge-${index}`, amount: 1_000_000_000_000 }));
  assert.throws(() => report(state, huge), /15 chữ số/);
});

test('filename helper supports the UI scope-string contract and always returns a safe xlsx name', () => {
  for (const scope of ['2026-11', '2026-10-01_2026-11-27', 'tat-ca', 'Tháng 11 / ghi chú']) {
    const filename = excelFilename(scope, FIXED.generatedAt);
    assert.match(filename, /^money-management-[a-z0-9-]+-2026-11-\d{2}\.xlsx$/);
    assert.ok(!filename.includes('/'));
  }
});
