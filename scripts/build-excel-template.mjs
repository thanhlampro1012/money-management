/**
 * Author the export design with @oai/artifact-tool in the bundled primary runtime.
 * Run a copy of this script from an OS temporary directory whose node_modules
 * symlink points to CODEX_PRIMARY_RUNTIME_NODE_MODULES. Arguments: repo, output.
 * The generated dist/export-template.js makes browser exports dependency-free.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { Workbook, SpreadsheetFile, FileBlob } from '@oai/artifact-tool';

const repo = process.argv[2];
const outputDir = process.argv[3];
if (!repo || !outputDir) throw new Error('Pass absolute repository and output directories.');
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const daily = workbook.worksheets.add('Theo ngày');
const detail = workbook.worksheets.add('Giao dịch');
const moneyFormat = '#,##0;[Red](#,##0);"-"';
const dark = '#173f36';

function prepare(sheet, lastColumn, widths) {
  sheet.showGridLines = false;
  sheet.tabColor = sheet === daily ? dark : '#7a9e91';
  sheet.getRange(`A1:${lastColumn}16`).format = {
    font: { name: 'Arial', size: 11, color: '#21372f' },
    verticalAlignment: 'center', rowHeight: 25,
  };
  sheet.getRange(`A1:${lastColumn}1`).format.rowHeight = 10;
  widths.forEach((width, index) => { sheet.getRange(`${String.fromCharCode(65 + index)}1`).format.columnWidth = width; });
  sheet.getRange('A2').format = { font: { name: 'Arial', size: 16, bold: true, color: dark }, rowHeight: 32 };
  for (const row of [3, 4, 6, 7]) {
    sheet.mergeCells(`A${row}:${lastColumn}${row}`);
    sheet.getRange(`A${row}`).format = { font: { name: 'Arial', size: 10, color: '#53685e', italic: row >= 6 }, wrapText: true };
  }
  sheet.getRange(`A4:${lastColumn}4`).format.rowHeight = 30;
  sheet.getRange(`A6:${lastColumn}7`).format.rowHeight = 23;
  sheet.getRange(`A8:${lastColumn}8`).format.rowHeight = 10;
  sheet.getRange(`A9:${lastColumn}9`).format = {
    fill: dark, font: { name: 'Arial', size: 11, bold: true, color: '#ffffff' },
    horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true,
    rowHeight: 34, borders: { insideVertical: { style: 'thin', color: '#ffffff' } },
  };
  sheet.getRange('A3').values = [['Phạm vi: Tháng 11/2026']];
  sheet.getRange('A4').values = [['Bộ lọc: Tất cả loại giao dịch, danh mục và ví.']];
  sheet.getRange('A6').values = [['Nguồn: Sổ cá nhân trong Money Management. Đơn vị: VND.']];
  sheet.getRange('A7').values = [['Chuyển giữa ví không tính vào thu nhập hoặc chi tiêu. Ngày giao dịch giữ nguyên ngày đã nhập.']];
  sheet.freezePanes.freezeRows(9);
}

prepare(daily, 'F', [17, 19, 24, 24, 24, 24]);
prepare(detail, 'J', [7, 16, 19, 25, 28, 28, 58, 24, 24, 24]);
daily.getRange('A2').values = [['Thu chi theo ngày']];
detail.getRange('A2').values = [['Chi tiết giao dịch']];
daily.getRange('A5').values = [['Xuất lúc']];
daily.mergeCells('B5:C5');
daily.getRange('B5').values = [[new Date('2026-11-26T23:00:00Z')]];
daily.getRange('B5').setNumberFormat('dd/mm/yyyy hh:mm:ss');
daily.getRange('B5').format.horizontalAlignment = 'left';
daily.mergeCells('D5:F5');
daily.getRange('D5').values = [['Múi giờ: Asia/Ho_Chi_Minh']];
detail.mergeCells('A5:C5'); detail.getRange('A5').values = [['Xuất lúc']];
detail.mergeCells('D5:F5'); detail.getRange('D5').values = [[new Date('2026-11-26T23:00:00Z')]];
detail.getRange('D5').setNumberFormat('dd/mm/yyyy hh:mm:ss');
detail.getRange('D5').format.horizontalAlignment = 'left';
detail.mergeCells('G5:J5'); detail.getRange('G5').values = [['Múi giờ: Asia/Ho_Chi_Minh']];
for (const sheet of [daily, detail]) {
  sheet.getRange(`A5:${sheet === daily ? 'F' : 'J'}5`).format.font = { name: 'Arial', size: 10, color: '#53685e' };
}

detail.getRange('A9:J12').values = [
  ['STT', 'Ngày', 'Loại', 'Danh mục', 'Ví', 'Ví nhận chuyển', 'Ghi chú', 'Thu nhập (VND)', 'Chi tiêu (VND)', 'Chuyển ví (VND)'],
  [1, new Date('2026-11-01T00:00:00Z'), 'Thu nhập', 'Lương', 'Ngân hàng', '', 'Lương tháng 11', 25000000, 0, 0],
  [2, new Date('2026-11-02T00:00:00Z'), 'Chi tiêu', 'Ăn uống', 'Tiền mặt', '', 'Bữa trưa', 0, 85000, 0],
  [3, new Date('2026-11-02T00:00:00Z'), 'Chuyển giữa ví', 'Chuyển giữa ví', 'Ngân hàng', 'Tiền mặt', 'Rút tiền mặt', 0, 0, 1000000],
];
detail.getRange('A10:A12').setNumberFormat('#,##0');
detail.getRange('A10:B12').format.horizontalAlignment = 'center';
detail.getRange('B10:B12').setNumberFormat('dd/mm/yyyy');
detail.getRange('H10:J12').setNumberFormat(moneyFormat);
detail.getRange('H10:J12').format.font.color = '#245d91';
detail.getRange('H10:J12').format.horizontalAlignment = 'right';
detail.getRange('G10:G12').format = { wrapText: true, verticalAlignment: 'top' };
detail.getRange('C10:F12').format = { wrapText: true, verticalAlignment: 'center' };
detail.getRange('A11:J11').format.fill = '#f4f8f5';
detail.getRange('A10:J12').format.rowHeight = 31;
detail.getRange('G13').values = [['Tổng cộng (3 giao dịch)']];
detail.getRange('H13:J13').formulas = [['=SUM(H10:H12)', '=SUM(I10:I12)', '=SUM(J10:J12)']];
detail.getRange('A13:J13').format = {
  fill: '#e4eee8', font: { name: 'Arial', size: 11, bold: true, color: dark },
  rowHeight: 32, borders: { top: { style: 'thin', color: '#759587' } },
};
detail.getRange('G13:J13').format.horizontalAlignment = 'right';
detail.getRange('H13:J13').setNumberFormat(moneyFormat);

daily.getRange('A9:F11').values = [
  ['Ngày', 'Số giao dịch', 'Thu nhập (VND)', 'Chi tiêu (VND)', 'Chuyển ví (VND)', 'Thu − chi (VND)'],
  [new Date('2026-11-01T00:00:00Z'), null, null, null, null, null],
  [new Date('2026-11-02T00:00:00Z'), null, null, null, null, null],
];
for (let row = 10; row <= 11; row++) {
  daily.getRange(`B${row}:F${row}`).formulas = [[
    `=COUNTIFS('Giao dịch'!$B$10:$B$12,$A${row})`,
    `=SUMIFS('Giao dịch'!$H$10:$H$12,'Giao dịch'!$B$10:$B$12,$A${row})`,
    `=SUMIFS('Giao dịch'!$I$10:$I$12,'Giao dịch'!$B$10:$B$12,$A${row})`,
    `=SUMIFS('Giao dịch'!$J$10:$J$12,'Giao dịch'!$B$10:$B$12,$A${row})`,
    `=C${row}-D${row}`,
  ]];
}
daily.getRange('A10:A11').setNumberFormat('dd/mm/yyyy');
daily.getRange('A10:A11').format.horizontalAlignment = 'center';
daily.getRange('B10:B11').setNumberFormat('#,##0');
daily.getRange('B10:F11').format.horizontalAlignment = 'right';
daily.getRange('C10:F11').setNumberFormat(moneyFormat);
daily.getRange('A11:F11').format.fill = '#f4f8f5';
daily.getRange('A10:F11').format.rowHeight = 29;
daily.getRange('A12').values = [['Tổng cộng']];
daily.getRange('B12:F12').formulas = [['=SUM(B10:B11)', '=SUM(C10:C11)', '=SUM(D10:D11)', '=SUM(E10:E11)', '=SUM(F10:F11)']];
daily.getRange('A12:F12').format = {
  fill: '#e4eee8', font: { name: 'Arial', size: 11, bold: true, color: dark },
  rowHeight: 32, borders: { top: { style: 'thin', color: '#759587' } },
};
daily.getRange('B12:F12').format.horizontalAlignment = 'right';
daily.getRange('B12').setNumberFormat('#,##0');
daily.getRange('C12:F12').setNumberFormat(moneyFormat);

workbook.recalculate();
const control = daily.getRange('C12:F12').values[0];
if (control.join(',') !== '25000000,85000,1000000,24915000') throw new Error(`Template totals did not reconcile: ${control}`);
detail.getRange('I11').values = [[100000]];
workbook.recalculate();
if (daily.getRange('D12').values[0][0] !== 100000 || daily.getRange('F12').values[0][0] !== 24900000) throw new Error('Template recalculation failed.');
detail.getRange('I11').values = [[85000]];
workbook.recalculate();
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 20 }, maxChars: 1800 });
console.log(errors.ndjson);
for (const [sheetName, range, name] of [['Theo ngày', 'A1:F14', 'daily'], ['Giao dịch', 'A1:J15', 'detail']]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(path.join(outputDir, `${name}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
const templatePath = path.join(outputDir, 'money-management-template.xlsx');
await xlsx.save(templatePath);

// Read only the generated OOXML package; no library internals are inspected.
function unzip(buffer) {
  const entries = new Map();
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Template ZIP central directory missing.');
  let cursor = buffer.readUInt32LE(end + 16);
  const count = buffer.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid central directory.');
    const method = buffer.readUInt16LE(cursor + 10), size = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength), local = buffer.readUInt32LE(cursor + 42);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    entries.set(name, (method === 8 ? inflateRawSync(data) : data).toString('utf8'));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
const parts = unzip(await fs.readFile(templatePath));
const summaryXml = parts.get('xl/worksheets/sheet1.xml');
const detailXml = parts.get('xl/worksheets/sheet2.xml');
function style(xml, address) {
  const cell = [...xml.matchAll(/<(?:\w+:)?c\b([^>]*)>/g)].find(match => new RegExp(`\\br="${address}"`).test(match[1]));
  if (!cell) throw new Error(`Missing template style cell ${address}.`);
  return Number(cell[1].match(/\bs="(\d+)"/)?.[1] || 0);
}
const styles = {
  title: style(detailXml, 'A2'), context: style(detailXml, 'A3'), contextLabel: style(detailXml, 'A5'),
  dateTime: style(detailXml, 'D5'), note: style(detailXml, 'A6'), header: style(detailXml, 'A9'),
  text: [style(detailXml, 'C10'), style(detailXml, 'C11')],
  wrapped: [style(detailXml, 'G10'), style(detailXml, 'G11')],
  date: [style(detailXml, 'B10'), style(detailXml, 'B11')],
  count: [style(detailXml, 'A10'), style(detailXml, 'A11')],
  money: [style(detailXml, 'H10'), style(detailXml, 'H11')],
  summaryMoney: [style(summaryXml, 'C10'), style(summaryXml, 'C11')],
  summaryCount: [style(summaryXml, 'B10'), style(summaryXml, 'B11')],
  totalText: style(summaryXml, 'A12'), totalCount: style(summaryXml, 'B12'), totalMoney: style(summaryXml, 'C12'),
  detailTotalText: style(detailXml, 'G13'),
};
const staticParts = Object.fromEntries(['xl/styles.xml', 'xl/theme/theme1.xml'].filter(name => parts.has(name)).map(name => [name, parts.get(name)]));
const generated = '// Generated by scripts/build-excel-template.mjs using @oai/artifact-tool.\n'
  + '// Do not edit this asset by hand; browser exports use these authored styles.\n'
  + `export const TEMPLATE_STYLES = Object.freeze(${JSON.stringify(styles, null, 2)});\n`
  + `export const TEMPLATE_PARTS = Object.freeze(${JSON.stringify(staticParts, null, 2)});\n`;
await fs.writeFile(path.join(repo, 'dist/export-template.js'), generated);
console.log(JSON.stringify({ templatePath, styles, generatedBytes: generated.length }));

// Exercise the actual browser exporter, then inspect and render its saved XLSX.
const { makeExcel } = await import(pathToFileURL(path.join(repo, 'dist/export.js')).href);
const { createEmptyState } = await import(pathToFileURL(path.join(repo, 'dist/finance.js')).href);
const sample = createEmptyState('2026-11-26');
sample.accounts.push({ id: 'bank', name: 'Ngân hàng', initialBalance: 0, color: '#13705c', icon: 'bank' });
sample.transactions = [
  { id: 'sample-income', type: 'income', amount: 25000000, date: '2026-11-01', categoryId: 'salary', accountId: 'bank', note: 'Lương tháng 11', createdAt: '2026-11-01T08:00:00Z' },
  { id: 'sample-expense', type: 'expense', amount: 85000, date: '2026-11-02', categoryId: 'food', accountId: 'cash', note: '=SUM(1,2) là ghi chú văn bản', createdAt: '2026-11-02T08:00:00Z' },
  { id: 'sample-transfer', type: 'transfer', amount: 1000000, date: '2026-11-02', categoryId: 'transfer', accountId: 'bank', transferToAccountId: 'cash', note: 'Rút tiền mặt', createdAt: '2026-11-02T09:00:00Z' },
];
const runtimePath = path.join(outputDir, 'money-management-runtime.xlsx');
await fs.writeFile(runtimePath, makeExcel(sample, sample.transactions, { generatedAt: new Date('2026-11-26T16:30:00Z'), timeZone: 'Asia/Ho_Chi_Minh', scopeLabel: 'Tháng 11/2026', filterLabel: 'Tất cả giao dịch, danh mục và ví' }));
await fs.writeFile(path.join(outputDir, 'money-management-empty.xlsx'), makeExcel(createEmptyState('2026-11-26'), [], { generatedAt: new Date('2026-11-26T16:30:00Z'), timeZone: 'Asia/Ho_Chi_Minh', scopeLabel: 'Không có giao dịch' }));
const imported = await SpreadsheetFile.importXlsx(await FileBlob.load(runtimePath));
imported.recalculate();
const importedDaily = imported.worksheets.getItem('Theo ngày');
const importedDetail = imported.worksheets.getItem('Giao dịch');
if (importedDaily.getRange('C12:F12').values[0].join(',') !== '25000000,85000,1000000,24915000') throw new Error('Runtime XLSX totals did not recalculate correctly.');
if (importedDetail.getRange('G11').values[0][0] !== '=SUM(1,2) là ghi chú văn bản' || importedDetail.getRange('G11').formulas[0][0]) throw new Error('A text note was interpreted as a formula.');
importedDetail.getRange('I11').values = [[100000]];
imported.recalculate();
if (importedDaily.getRange('D12').values[0][0] !== 100000 || importedDaily.getRange('F12').values[0][0] !== 24900000) throw new Error('Runtime XLSX input-change recalculation failed.');
importedDetail.getRange('I11').values = [[85000]];
imported.recalculate();
console.log((await imported.inspect({ kind: 'table', range: "'Theo ngày'!A9:F12", include: 'values,formulas', tableMaxRows: 4, tableMaxCols: 6, maxChars: 2400 })).ndjson);
console.log((await imported.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 20 }, maxChars: 1200 })).ndjson);
for (const [sheetName, range, name] of [['Theo ngày', 'A1:F14', 'runtime-daily'], ['Giao dịch', 'A1:J15', 'runtime-detail']]) {
  const preview = await imported.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(path.join(outputDir, `${name}.png`), new Uint8Array(await preview.arrayBuffer()));
}
console.log(JSON.stringify({ runtimePath, runtimeRoundTrip: 'passed', formulaRecalculation: 'passed', literalNote: 'passed' }));
