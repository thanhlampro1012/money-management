import { CATEGORIES, isValidDate } from './finance.js';
import { TEMPLATE_PARTS, TEMPLATE_STYLES as S } from './export-template.js';

export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const DATA_ROW = 10;
const MAX_EXCEL_INTEGER = 999_999_999_999_999;
const TYPES = Object.freeze({ income: 'Thu nhập', expense: 'Chi tiêu', transfer: 'Chuyển giữa ví' });
const encoder = new TextEncoder();

function fail(message) { throw new Error(message); }
function xml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}
function textValue(value) {
  const text = String(value ?? '');
  if (text.length > 32_767) fail('Một ô văn bản vượt quá giới hạn 32.767 ký tự của Excel.');
  // OOXML escapes preserve literal escape-looking text and otherwise invalid
  // control characters. No text value is ever emitted as an Excel formula.
  return xml(text.replace(/_x[0-9a-f]{4}_/gi, match => `_x005F_${match.slice(1)}`)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, character => `_x${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}_`))
    .replace(/\r/g, '&#13;');
}
function textCell(address, value, style = S.text[0]) {
  return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${textValue(value)}</t></is></c>`;
}
function numberCell(address, value, style) {
  if (!Number.isFinite(value)) fail('Giá trị số không hợp lệ khi xuất Excel.');
  return `<c r="${address}" s="${style}" t="n"><v>${value}</v></c>`;
}
function formulaCell(address, formula, cachedValue, style) {
  if (!Number.isFinite(cachedValue)) fail('Tổng số tiền không hợp lệ khi xuất Excel.');
  return `<c r="${address}" s="${style}"><f>${xml(formula)}</f><v>${cachedValue}</v></c>`;
}
function row(index, cells, height = 29) {
  return `<row r="${index}" ht="${Math.min(409, height)}" customHeight="1">${cells.join('')}</row>`;
}

/** Excel's 1900 date system includes its historical fictitious leap day. */
export function excelDateSerial(date) {
  if (!isValidDate(date)) fail('Ngày giao dịch không hợp lệ khi xuất Excel.');
  const [year, month, day] = date.split('-').map(Number);
  const days = (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 31)) / 86_400_000;
  return days + (date >= '1900-03-01' ? 1 : 0);
}
function asDate(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) fail('Thời điểm xuất Excel không hợp lệ.');
  return date;
}
function zonedParts(date, timeZone) {
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
  } catch { fail('Múi giờ xuất Excel không hợp lệ.'); }
  return Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
}
function exportTimestamp(date, timeZone) {
  const part = zonedParts(date, timeZone);
  const dateKey = `${part.year.padStart(4, '0')}-${part.month}-${part.day}`;
  return excelDateSerial(dateKey) + (Number(part.hour) * 3600 + Number(part.minute) * 60 + Number(part.second)) / 86_400;
}
export function excelFilename(label = 'giao-dich', date = new Date()) {
  const stamp = zonedParts(asDate(date), Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const slug = String(label || 'giao-dich').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'giao-dich';
  return `money-management-${slug}-${stamp.year}-${stamp.month}-${stamp.day}.xlsx`;
}
function sumSafe(current, amount) {
  const result = current + amount;
  if (!Number.isSafeInteger(result) || result > MAX_EXCEL_INTEGER) fail('Tổng tiền vượt giới hạn 15 chữ số chính xác của Excel. Hãy chọn phạm vi xuất nhỏ hơn.');
  return result;
}
function prepare(state, transactions, options) {
  if (!state || !Array.isArray(state.accounts) || !Array.isArray(transactions) || transactions.length > 50_000) fail('Dữ liệu xuất Excel không hợp lệ hoặc có hơn 50.000 giao dịch.');
  const accounts = new Map(state.accounts.map(account => [account.id, account]));
  const categories = new Map((options.categories || [...CATEGORIES, ...(state.customCategories || [])]).map(category => [category.id, category]));
  const ids = new Set();
  const rows = transactions.map(transaction => {
    if (!transaction || typeof transaction.id !== 'string' || ids.has(transaction.id)) fail('Giao dịch xuất Excel thiếu mã hoặc có mã bị trùng.');
    ids.add(transaction.id);
    if (!Object.hasOwn(TYPES, transaction.type) || !isValidDate(transaction.date)
      || !Number.isSafeInteger(transaction.amount) || transaction.amount <= 0 || transaction.amount > 1_000_000_000_000) fail('Giao dịch xuất Excel có loại, ngày hoặc số tiền không hợp lệ.');
    const source = accounts.get(transaction.accountId);
    const target = transaction.type === 'transfer' ? accounts.get(transaction.transferToAccountId) : null;
    const category = categories.get(transaction.categoryId);
    if (!source || (transaction.type === 'transfer' && (!target || source.id === target.id))) fail('Giao dịch xuất Excel tham chiếu đến ví không hợp lệ.');
    if (!category || category.type !== transaction.type) fail('Không tìm thấy danh mục phù hợp cho một giao dịch xuất Excel.');
    return { ...transaction, sourceName: source.name, targetName: target?.name || '', categoryName: category.name };
  }).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1
    : (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const totals = { income: 0, expense: 0, transfer: 0, count: rows.length };
  const days = new Map();
  for (const transaction of rows) {
    totals[transaction.type] = sumSafe(totals[transaction.type], transaction.amount);
    const day = days.get(transaction.date) || { date: transaction.date, income: 0, expense: 0, transfer: 0, count: 0 };
    day[transaction.type] = sumSafe(day[transaction.type], transaction.amount); day.count++;
    days.set(transaction.date, day);
  }
  const generatedAt = asDate(options.generatedAt);
  const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const defaultScope = rows.length ? `${rows[0].date} đến ${rows.at(-1).date}` : 'Không có giao dịch trong phạm vi được chọn';
  return {
    rows, days: [...days.values()], totals, generatedAt, timeZone,
    timestamp: exportTimestamp(generatedAt, timeZone),
    scope: `Phạm vi: ${options.scopeLabel || defaultScope}`,
    filters: `Bộ lọc: ${options.filterLabel || 'Toàn bộ các giao dịch được chọn để xuất.'}`,
    source: `Nguồn: Sổ ${state.profile?.name || 'cá nhân'} trong Money Management. Đơn vị: VND.`,
    rules: 'Ngày giao dịch giữ nguyên. Chuyển ví không tính vào thu/chi. Tổng cộng là toàn bộ dữ liệu xuất.',
  };
}
function metadata(model, detail) {
  const dateAddress = detail ? 'D5' : 'B5';
  const zoneAddress = detail ? 'G5' : 'D5';
  const characters = detail ? 175 : 110;
  const height = text => Math.max(23, Math.ceil(String(text).length / characters) * 14 + 8);
  return [
    row(1, [], 10), row(2, [textCell('A2', detail ? 'Chi tiết giao dịch' : 'Thu chi theo ngày', S.title)], 32),
    row(3, [textCell('A3', model.scope, S.context)], height(model.scope)),
    row(4, [textCell('A4', model.filters, S.context)], height(model.filters)),
    row(5, [textCell('A5', 'Xuất lúc', S.contextLabel), numberCell(dateAddress, model.timestamp, S.dateTime), textCell(zoneAddress, `Múi giờ: ${model.timeZone}`, S.contextLabel)], 26),
    row(6, [textCell('A6', model.source, S.note)], height(model.source)),
    row(7, [textCell('A7', model.rules, S.note)], height(model.rules)),
    row(8, [], 10),
  ];
}
function sheetXml({ body, widths, lastRow, lastDataRow, detail }) {
  const lastColumn = detail ? 'J' : 'F';
  const freezes = detail ? 2 : 1;
  const topLeft = detail ? 'C10' : 'B10';
  const merges = [3, 4, 6, 7].map(index => `A${index}:${lastColumn}${index}`)
    .concat(detail ? ['A5:C5', 'D5:F5', 'G5:J5'] : ['B5:C5', 'D5:F5']);
  return XML + `<worksheet xmlns="${NS}" xmlns:r="${REL}">`
    + `<sheetPr><tabColor rgb="FF${detail ? '7A9E91' : '173F36'}"/><pageSetUpPr fitToPage="1"/></sheetPr>`
    + `<dimension ref="A1:${lastColumn}${lastRow}"/>`
    + `<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane xSplit="${freezes}" ySplit="9" topLeftCell="${topLeft}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="${topLeft}" sqref="${topLeft}"/></sheetView></sheetViews>`
    + '<sheetFormatPr defaultRowHeight="25"/>'
    + `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${body.join('')}</sheetData>`
    + `<autoFilter ref="A9:${lastColumn}${Math.max(9, lastDataRow)}"/>`
    + `<mergeCells count="${merges.length}">${merges.map(reference => `<mergeCell ref="${reference}"/>`).join('')}</mergeCells>`
    + '<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>'
    + `<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>`
    + '<headerFooter><oddFooter>&amp;L Money Management&amp;R Trang &amp;P / &amp;N</oddFooter></headerFooter></worksheet>';
}
function detailsSheet(model) {
  const body = metadata(model, true);
  const headers = ['STT', 'Ngày', 'Loại', 'Danh mục', 'Ví', 'Ví nhận chuyển', 'Ghi chú', 'Thu nhập (VND)', 'Chi tiêu (VND)', 'Chuyển ví (VND)'];
  body.push(row(9, headers.map((value, index) => textCell(`${String.fromCharCode(65 + index)}9`, value, S.header)), 34));
  model.rows.forEach((transaction, index) => {
    const r = DATA_ROW + index, stripe = index % 2;
    const note = String(transaction.note || '');
    const textLines = (value, width) => String(value).split(/\r\n|\r|\n/).reduce((count, line) => count + Math.max(1, Math.ceil(line.length / width)), 0);
    const lines = Math.max(textLines(note, 62), textLines(transaction.categoryName, 26), textLines(transaction.sourceName, 30), textLines(transaction.targetName, 30));
    body.push(row(r, [
      numberCell(`A${r}`, index + 1, S.count[stripe]), numberCell(`B${r}`, excelDateSerial(transaction.date), S.date[stripe]),
      textCell(`C${r}`, TYPES[transaction.type], S.text[stripe]), textCell(`D${r}`, transaction.categoryName, S.text[stripe]),
      textCell(`E${r}`, transaction.sourceName, S.text[stripe]), textCell(`F${r}`, transaction.targetName, S.text[stripe]),
      textCell(`G${r}`, note, S.wrapped[stripe]),
      numberCell(`H${r}`, transaction.type === 'income' ? transaction.amount : 0, S.money[stripe]),
      numberCell(`I${r}`, transaction.type === 'expense' ? transaction.amount : 0, S.money[stripe]),
      numberCell(`J${r}`, transaction.type === 'transfer' ? transaction.amount : 0, S.money[stripe]),
    ], Math.max(31, lines * 14 + 8)));
  });
  if (!model.rows.length) body.push(row(DATA_ROW, [textCell(`G${DATA_ROW}`, 'Không có giao dịch trong phạm vi được chọn.', S.note)], 32));
  const lastDataRow = DATA_ROW + model.rows.length - 1;
  const end = Math.max(DATA_ROW, lastDataRow), totalRow = end + 1;
  body.push(row(totalRow, [
    ...'ABCDEF'.split('').map(column => textCell(`${column}${totalRow}`, '', S.totalText)),
    textCell(`G${totalRow}`, `Tổng cộng (${model.rows.length} giao dịch)`, S.detailTotalText),
    ...[['H', 'income'], ['I', 'expense'], ['J', 'transfer']].map(([column, type]) => formulaCell(`${column}${totalRow}`, `SUM(${column}${DATA_ROW}:${column}${end})`, model.totals[type], S.totalMoney)),
  ], 32));
  return { xml: sheetXml({ body, widths: [7, 16, 19, 25, 28, 28, 58, 24, 24, 24], lastRow: totalRow, lastDataRow, detail: true }), totalRow, end };
}
function dailySheet(model, detailEnd) {
  const body = metadata(model, false);
  const headers = ['Ngày', 'Số giao dịch', 'Thu nhập (VND)', 'Chi tiêu (VND)', 'Chuyển ví (VND)', 'Thu − chi (VND)'];
  body.push(row(9, headers.map((value, index) => textCell(`${String.fromCharCode(65 + index)}9`, value, S.header)), 34));
  const dates = `'Giao dịch'!$B$${DATA_ROW}:$B$${detailEnd}`;
  model.days.forEach((day, index) => {
    const r = DATA_ROW + index, stripe = index % 2;
    body.push(row(r, [
      numberCell(`A${r}`, excelDateSerial(day.date), S.date[stripe]),
      formulaCell(`B${r}`, `COUNTIFS(${dates},$A${r})`, day.count, S.summaryCount[stripe]),
      ...[['C', 'H', 'income'], ['D', 'I', 'expense'], ['E', 'J', 'transfer']].map(([target, source, type]) => formulaCell(`${target}${r}`, `SUMIFS('Giao dịch'!$${source}$${DATA_ROW}:$${source}$${detailEnd},${dates},$A${r})`, day[type], S.summaryMoney[stripe])),
      formulaCell(`F${r}`, `C${r}-D${r}`, day.income - day.expense, S.summaryMoney[stripe]),
    ]));
  });
  if (!model.days.length) body.push(row(DATA_ROW, [textCell(`A${DATA_ROW}`, 'Không có giao dịch.', S.note)], 32));
  const lastDataRow = DATA_ROW + model.days.length - 1, end = Math.max(DATA_ROW, lastDataRow), totalRow = end + 1;
  body.push(row(totalRow, [
    textCell(`A${totalRow}`, 'Tổng cộng', S.totalText),
    formulaCell(`B${totalRow}`, `SUM(B${DATA_ROW}:B${end})`, model.totals.count, S.totalCount),
    ...[['C', model.totals.income], ['D', model.totals.expense], ['E', model.totals.transfer], ['F', model.totals.income - model.totals.expense]]
      .map(([column, value]) => formulaCell(`${column}${totalRow}`, `SUM(${column}${DATA_ROW}:${column}${end})`, value, S.totalMoney)),
  ], 32));
  return { xml: sheetXml({ body, widths: [17, 19, 24, 24, 24, 24], lastRow: totalRow, lastDataRow, detail: false }), totalRow };
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
/** Standards-compliant ZIP STORE encoder: runs in browsers without dependencies. */
function zip(entries, timestamp) {
  const year = Math.max(1980, Math.min(2107, timestamp.getUTCFullYear()));
  const date = ((year - 1980) << 9) | ((timestamp.getUTCMonth() + 1) << 5) | timestamp.getUTCDate();
  const time = (timestamp.getUTCHours() << 11) | (timestamp.getUTCMinutes() << 5) | Math.floor(timestamp.getUTCSeconds() / 2);
  const localParts = [], centralParts = []; let offset = 0;
  for (const [path, content] of Object.entries(entries)) {
    const name = encoder.encode(path), data = encoder.encode(content), crc = crc32(data);
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true);
    lv.setUint16(10, time, true); lv.setUint16(12, date, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
    cv.setUint16(12, time, true); cv.setUint16(14, date, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    localParts.push(local, data); centralParts.push(central); offset += local.length + data.length;
  }
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  if (offset + centralSize > 0xffffffff) fail('Tệp Excel quá lớn. Hãy chọn phạm vi xuất nhỏ hơn.');
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, centralParts.length, true); ev.setUint16(10, centralParts.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + end.length); let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) { output.set(part, cursor); cursor += part.length; }
  return output;
}

/**
 * Export ALL supplied transactions, independent of UI pagination, as a real XLSX.
 * options: {scopeLabel, filterLabel, generatedAt: Date, timeZone, categories}.
 * Returns Uint8Array synchronously. Use EXCEL_MIME and excelFilename for download.
 * Report formulas use fixed exported ranges; Excel filters do not alter totals.
 */
export function makeExcel(state, transactions, options = {}) {
  const model = prepare(state, transactions, options);
  const detail = detailsSheet(model), daily = dailySheet(model, detail.end);
  const hasTheme = Object.hasOwn(TEMPLATE_PARTS, 'xl/theme/theme1.xml');
  const entries = { ...TEMPLATE_PARTS };
  entries['[Content_Types].xml'] = XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + (hasTheme ? '<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' : '')
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
  entries['_rels/.rels'] = XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/>`
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + `<Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  entries['xl/_rels/workbook.xml.rels'] = XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + `<Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet2.xml"/>`
    + `<Relationship Id="rId3" Type="${REL}/styles" Target="styles.xml"/>`
    + (hasTheme ? `<Relationship Id="rId4" Type="${REL}/theme" Target="theme/theme1.xml"/>` : '') + '</Relationships>';
  entries['xl/workbook.xml'] = XML + `<workbook xmlns="${NS}" xmlns:r="${REL}"><workbookPr date1904="0"/><bookViews><workbookView activeTab="0"/></bookViews>`
    + '<sheets><sheet name="Theo ngày" sheetId="1" r:id="rId1"/><sheet name="Giao dịch" sheetId="2" r:id="rId2"/></sheets><definedNames>'
    + `<definedName name="_xlnm.Print_Area" localSheetId="0">'Theo ngày'!$A$1:$F$${daily.totalRow}</definedName><definedName name="_xlnm.Print_Area" localSheetId="1">'Giao dịch'!$A$1:$J$${detail.totalRow}</definedName>`
    + '<definedName name="_xlnm.Print_Titles" localSheetId="0">&apos;Theo ngày&apos;!$1:$9</definedName><definedName name="_xlnm.Print_Titles" localSheetId="1">&apos;Giao dịch&apos;!$1:$9</definedName></definedNames>'
    + '<calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>';
  entries['xl/worksheets/sheet1.xml'] = daily.xml; entries['xl/worksheets/sheet2.xml'] = detail.xml;
  entries['docProps/core.xml'] = XML + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + '<dc:title>Money Management - Báo cáo thu chi</dc:title><dc:creator>Money Management</dc:creator><cp:lastModifiedBy>Money Management</cp:lastModifiedBy>'
    + `<dcterms:created xsi:type="dcterms:W3CDTF">${xml(model.generatedAt.toISOString())}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${xml(model.generatedAt.toISOString())}</dcterms:modified></cp:coreProperties>`;
  entries['docProps/app.xml'] = XML + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Money Management</Application><DocSecurity>0</DocSecurity><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>2</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="2" baseType="lpstr"><vt:lpstr>Theo ngày</vt:lpstr><vt:lpstr>Giao dịch</vt:lpstr></vt:vector></TitlesOfParts></Properties>';
  return zip(entries, model.generatedAt);
}
