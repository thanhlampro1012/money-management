/** VND has no fractional unit in this ledger. Accept familiar grouping without
 * ever interpreting a Vietnamese thousands separator as a decimal point. */
export function parseVndAmount(value, { min = -1000000000000, max = 1000000000000 } = {}) {
  const text = String(value ?? '').trim().replace(/\s*(?:VND|₫|đ)\s*$/iu, '').trim().replace(/[\u00a0\u202f]/g, ' ');
  if (!text) throw new Error('Hãy nhập số tiền.');
  let digits;
  if (/^[+-]?\d+$/.test(text)) digits = text;
  else if (/^[+-]?\d{1,3}([., ])\d{3}(?:\1\d{3})*$/.test(text)) digits = text.replace(/[., ]/g, '');
  else throw new Error('Nhập số tiền nguyên, ví dụ 85000 hoặc 85.000. Không dùng số thập phân hay ký hiệu e.');
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount) || amount < min || amount > max) {
    throw new Error(`Số tiền phải từ ${new Intl.NumberFormat('vi-VN').format(min)} đến ${new Intl.NumberFormat('vi-VN').format(max)} đồng.`);
  }
  return Object.is(amount, -0) ? 0 : amount;
}

export function formatVndInput(value) {
  if (value === '' || value === null || value === undefined) return '';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(parseVndAmount(value));
}
