/** Pure financial calculations and the versioned, portable backup format. */
export const CATEGORIES = Object.freeze([
  { id: 'food', name: 'Ăn uống', type: 'expense', icon: 'utensils', color: '#368073' },
  { id: 'housing', name: 'Nhà ở', type: 'expense', icon: 'home', color: '#5c7392' },
  { id: 'shopping', name: 'Mua sắm', type: 'expense', icon: 'shopping', color: '#ad8250' },
  { id: 'transport', name: 'Di chuyển', type: 'expense', icon: 'car', color: '#648a9a' },
  { id: 'coffee', name: 'Cà phê', type: 'expense', icon: 'coffee', color: '#90755f' },
  { id: 'health', name: 'Sức khỏe', type: 'expense', icon: 'heart', color: '#a06c80' },
  { id: 'education', name: 'Học tập', type: 'expense', icon: 'book', color: '#7e7195' },
  { id: 'entertainment', name: 'Giải trí', type: 'expense', icon: 'play', color: '#9b8d4b' },
  { id: 'gifts', name: 'Quà tặng', type: 'expense', icon: 'gift', color: '#a76868' },
  { id: 'other-expense', name: 'Chi tiêu khác', type: 'expense', icon: 'more', color: '#778390' },
  { id: 'salary', name: 'Lương', type: 'income', icon: 'briefcase', color: '#13705c' },
  { id: 'freelance', name: 'Làm thêm', type: 'income', icon: 'laptop', color: '#4c817a' },
  { id: 'investment', name: 'Đầu tư', type: 'income', icon: 'trending-up', color: '#657c9a' },
  { id: 'other-income', name: 'Thu nhập khác', type: 'income', icon: 'coins', color: '#738a61' },
  { id: 'transfer', name: 'Chuyển giữa ví', type: 'transfer', icon: 'exchange', color: '#64748b' },
].map(Object.freeze));

const CATEGORY_MAP = new Map(CATEGORIES.map(category => [category.id, category]));
const MAX_AMOUNT = 1_000_000_000_000;
const MAX_SAFE = Number.MAX_SAFE_INTEGER;
const MAX_TIMESTAMP = Date.parse('9999-12-31T23:59:59.999Z');
const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const moneyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const compactFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Built-in category identities remain stable across backup schema upgrades. */
export function getCategories(state) {
  return [...CATEGORIES, ...(Array.isArray(state?.customCategories) ? state.customCategories.map(item => ({ ...item })) : [])];
}

function fail(message) { throw new Error(message); }
function validMonth(month) {
  return typeof month === 'string' && /^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(month);
}

/** A local calendar date, with no UTC conversion that could shift the day. */
export function localDate(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) fail('Ngày không hợp lệ.');
  return `${date.getFullYear().toString().padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthKey(date = localDate()) {
  const value = date instanceof Date ? localDate(date) : date;
  if (validMonth(value)) return value;
  if (!isValidDate(value)) fail('Ngày không hợp lệ.');
  return value.slice(0, 7);
}

export function shiftMonth(month, offset) {
  if (!validMonth(month) || !Number.isInteger(offset) || Math.abs(offset) > 120_000) fail('Tháng không hợp lệ.');
  const [year, number] = month.split('-').map(Number);
  const index = year * 12 + number - 1 + offset;
  const result = `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(((index % 12) + 12) % 12 + 1).padStart(2, '0')}`;
  if (!validMonth(result)) fail('Tháng nằm ngoài khoảng năm 1900–9999.');
  return result;
}

export function daysInMonth(month) {
  if (!validMonth(month)) fail('Tháng không hợp lệ.');
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number, 0)).getUTCDate();
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !validMonth(value.slice(0, 7))) return false;
  const day = Number(value.slice(8));
  return day >= 1 && day <= daysInMonth(value.slice(0, 7));
}

export function formatMoney(amount) {
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatCompact(amount) {
  if (!Number.isFinite(amount)) return '0';
  const absolute = Math.abs(amount);
  if (absolute >= 1e9) return `${compactFormatter.format(amount / 1e9)} tỷ`;
  if (absolute >= 1e6) return `${compactFormatter.format(amount / 1e6)} tr`;
  if (absolute >= 1e3) return `${compactFormatter.format(amount / 1e3)} k`;
  return compactFormatter.format(amount);
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return `id-${globalThis.crypto.randomUUID()}`;
  if (globalThis.crypto?.getRandomValues) {
    const words = new Uint32Array(4);
    globalThis.crypto.getRandomValues(words);
    return `id-${Array.from(words, word => word.toString(16).padStart(8, '0')).join('')}`;
  }
  // IDs identify local records only; they are never used as access tokens.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyState(today = localDate()) {
  if (!isValidDate(today)) fail('Ngày không hợp lệ.');
  return {
    version: 3,
    profile: { name: 'Bạn', currency: 'VND' },
    demo: false,
    accounts: [{ id: 'cash', name: 'Tiền mặt', initialBalance: 0, color: '#13705c', icon: 'wallet' }],
    transactions: [], budgets: [], goals: [], customCategories: [], recurring: [],
  };
}

export function createDemoState(today = localDate()) {
  if (!isValidDate(today)) fail('Ngày không hợp lệ.');
  const current = monthKey(today);
  const previous = current === '1900-01' ? null : shiftMonth(current, -1);
  const elapsed = Number(today.slice(8));
  const date = (month, day) => `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, '0')}`;
  const currentDay = day => Math.max(1, Math.min(elapsed, Math.round(day * elapsed / 28)));
  const futureMonth = offset => {
    const [year, month] = current.split('-').map(Number);
    return shiftMonth(current, Math.min(offset, (9999 - year) * 12 + 12 - month));
  };
  const state = createEmptyState(today);
  state.demo = true;
  state.accounts = [
    { id: 'bank', name: 'Tài khoản ngân hàng', initialBalance: 5_400_000, color: '#13705c', icon: 'bank' },
    { id: 'cash', name: 'Tiền mặt', initialBalance: 3_800_000, color: '#ad8250', icon: 'wallet' },
    { id: 'ewallet', name: 'Ví điện tử', initialBalance: 1_800_000, color: '#7e7195', icon: 'smartphone' },
  ];
  const samples = [
    [1, 'income', 25_000_000, 'salary', 'bank', 'Lương tháng này'],
    [2, 'expense', 5_000_000, 'housing', 'bank', 'Tiền thuê nhà'],
    [3, 'expense', 680_000, 'housing', 'bank', 'Điện và nước'],
    [3, 'expense', 420_000, 'food', 'bank', 'Đi chợ đầu tuần'],
    [4, 'expense', 85_000, 'food', 'cash', 'Bữa trưa văn phòng'],
    [5, 'expense', 45_000, 'coffee', 'ewallet', 'Cà phê sáng'],
    [6, 'expense', 150_000, 'transport', 'cash', 'Đổ xăng'],
    [7, 'expense', 850_000, 'shopping', 'bank', 'Một đôi giày mới'],
    [8, 'expense', 72_000, 'food', 'cash', 'Bữa trưa cùng đồng nghiệp'],
    [9, 'expense', 49_000, 'coffee', 'ewallet', 'Cà phê cuối tuần'],
    [10, 'expense', 320_000, 'education', 'bank', 'Mua sách'],
    [11, 'expense', 129_000, 'entertainment', 'ewallet', 'Gói nghe nhạc'],
    [12, 'expense', 380_000, 'food', 'bank', 'Thực phẩm trong tuần'],
    [13, 'expense', 65_000, 'food', 'cash', 'Bữa sáng và bữa trưa'],
    [14, 'expense', 45_000, 'coffee', 'ewallet', 'Cà phê sáng'],
    [15, 'income', 3_500_000, 'freelance', 'bank', 'Dự án thiết kế nhỏ'],
    [16, 'expense', 490_000, 'shopping', 'bank', 'Đồ dùng cá nhân'],
    [17, 'expense', 420_000, 'health', 'bank', 'Khám sức khỏe'],
    [18, 'expense', 220_000, 'housing', 'bank', 'Internet hàng tháng'],
    [19, 'expense', 150_000, 'transport', 'cash', 'Đổ xăng'],
    [20, 'expense', 450_000, 'food', 'bank', 'Mua thực phẩm'],
    [21, 'expense', 55_000, 'coffee', 'ewallet', 'Một buổi cà phê'],
    [22, 'expense', 500_000, 'gifts', 'bank', 'Quà sinh nhật'],
    [23, 'expense', 180_000, 'entertainment', 'ewallet', 'Xem phim cuối tuần'],
    [24, 'expense', 86_000, 'food', 'cash', 'Bữa trưa'],
    [24, 'income', 350_000, 'other-income', 'bank', 'Bán sách đã đọc'],
    [25, 'expense', 45_000, 'coffee', 'ewallet', 'Cà phê sáng'],
    [26, 'expense', 245_000, 'food', 'bank', 'Ăn tối cùng bạn'],
    [27, 'expense', 62_000, 'transport', 'ewallet', 'Đặt xe về nhà'],
    [28, 'expense', 125_000, 'food', 'cash', 'Bữa trưa cuối tuần'],
  ];
  samples.forEach(([day, type, amount, categoryId, accountId, note], index) => {
    const transactionDate = date(current, currentDay(day));
    state.transactions.push({ id: `demo-current-${index + 1}`, type, amount, date: transactionDate, categoryId, accountId, note, createdAt: `${transactionDate}T${String(8 + index % 12).padStart(2, '0')}:00:00.000Z` });
  });
  const transferDate = date(current, currentDay(16));
  state.transactions.push({ id: 'demo-transfer-ewallet', type: 'transfer', amount: 800_000, date: transferDate, categoryId: 'transfer', accountId: 'bank', transferToAccountId: 'ewallet', note: 'Nạp tiền vào ví điện tử', createdAt: `${transferDate}T07:00:00.000Z` });
  const older = [
    [1, 'income', 24_000_000, 'salary', 'bank', 'Lương tháng trước'],
    [2, 'expense', 5_000_000, 'housing', 'bank', 'Tiền thuê nhà'],
    [5, 'expense', 2_400_000, 'food', 'bank', 'Ăn uống tháng trước'],
    [8, 'expense', 1_800_000, 'shopping', 'bank', 'Mua sắm tháng trước'],
    [12, 'income', 2_000_000, 'freelance', 'bank', 'Dự án làm thêm'],
    [16, 'expense', 920_000, 'housing', 'bank', 'Điện, nước và internet'],
    [20, 'expense', 600_000, 'transport', 'bank', 'Di chuyển tháng trước'],
    [22, 'expense', 1_500_000, 'education', 'bank', 'Khóa học trực tuyến'],
    [24, 'expense', 750_000, 'health', 'bank', 'Chăm sóc sức khỏe'],
    [25, 'expense', 550_000, 'entertainment', 'bank', 'Giải trí tháng trước'],
    [27, 'expense', 400_000, 'coffee', 'bank', 'Cà phê tháng trước'],
    [28, 'expense', 500_000, 'gifts', 'bank', 'Quà tặng gia đình'],
  ];
  if (previous) older.forEach(([day, type, amount, categoryId, accountId, note], index) => {
    const transactionDate = date(previous, day);
    state.transactions.push({ id: `demo-previous-${index + 1}`, type, amount, date: transactionDate, categoryId, accountId, note, createdAt: `${transactionDate}T08:00:00.000Z` });
  });
  state.budgets = [
    ['food', 3_000_000], ['housing', 6_000_000], ['shopping', 2_000_000],
    ['transport', 1_000_000], ['coffee', 500_000], ['entertainment', 700_000], ['health', 1_000_000],
  ].map(([categoryId, amount]) => ({ id: `demo-budget-${categoryId}`, month: current, categoryId, amount }));
  state.goals = [
    { id: 'demo-goal-travel', name: 'Chuyến đi Đà Lạt', target: 20_000_000, saved: 8_500_000, deadline: date(futureMonth(3), 15), icon: 'plane', color: '#13705c' },
    { id: 'demo-goal-emergency', name: 'Quỹ dự phòng', target: 60_000_000, saved: 21_000_000, deadline: date(futureMonth(9), 28), icon: 'shield', color: '#7e7195' },
    { id: 'demo-goal-laptop', name: 'Laptop mới', target: 30_000_000, saved: 12_000_000, deadline: date(futureMonth(5), 20), icon: 'laptop', color: '#ad8250' },
  ];
  return validateState(state);
}

function object(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label} không đúng định dạng.`);
  if (Object.keys(value).some(key => !keys.includes(key))) fail(`${label} có trường dữ liệu không được hỗ trợ.`);
  return value;
}
function string(value, label, max, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim()) || /\u0000/.test(value)) fail(`${label} không hợp lệ (tối đa ${max} ký tự).`);
  return allowEmpty ? value : value.trim();
}
function identifier(value, label) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) fail(`${label} không hợp lệ.`);
  return value;
}
function amount(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum || value > MAX_AMOUNT) fail(`${label} phải là số nguyên từ ${minimum.toLocaleString('vi-VN')} đến ${MAX_AMOUNT.toLocaleString('vi-VN')} đồng.`);
  return value;
}
function color(value) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) fail('Màu sắc không hợp lệ.');
  return value.toLowerCase();
}
function icon(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(value)) fail('Biểu tượng không hợp lệ.');
  return value;
}
function collection(value, label, maximum, minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) fail(`${label} phải có từ ${minimum} đến ${maximum.toLocaleString('vi-VN')} mục.`);
  return value;
}
function uniqueIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) fail(`${label} có mã định danh bị trùng.`);
    ids.add(item.id);
  }
  return ids;
}
function timestamp(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TIMESTAMP) fail('Thời điểm tạo giao dịch không hợp lệ.');
  } else if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) || !isValidDate(value.slice(0, 10))) {
    fail('Thời điểm tạo giao dịch không hợp lệ.');
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail('Thời điểm tạo giao dịch không hợp lệ.');
  const normalized = date.toISOString();
  if (!isValidDate(normalized.slice(0, 10))) fail('Thời điểm tạo giao dịch nằm ngoài khoảng năm 1900–9999.');
  return normalized;
}
function safeAdd(left, right) {
  const result = left + right;
  if (!Number.isSafeInteger(result) || Math.abs(result) > MAX_SAFE) fail('Tổng số tiền quá lớn để tính chính xác.');
  return result;
}

/** Validate an untrusted backup and migrate original v1/v2 data to v3. */
export function validateState(input) {
  object(input, 'Bản sao lưu', ['version', 'profile', 'demo', 'accounts', 'transactions', 'budgets', 'goals', 'customCategories', 'recurring']);
  if (![1, 2, 3].includes(input.version)) fail('Phiên bản sao lưu chưa được hỗ trợ.');
  object(input.profile, 'Hồ sơ', ['name', 'currency']);
  if (input.profile.currency !== 'VND') fail('Bản sao lưu phải sử dụng đơn vị VND.');
  if (typeof input.demo !== 'boolean') fail('Trạng thái dữ liệu minh họa không hợp lệ.');
  const profile = { name: string(input.profile.name, 'Tên hiển thị', 60), currency: 'VND' };
  const rawCategories = Object.hasOwn(input, 'customCategories') ? input.customCategories : [];
  const rawRecurring = Object.hasOwn(input, 'recurring') ? input.recurring : [];
  collection(rawCategories, 'Danh mục tùy chỉnh', 200);
  collection(rawRecurring, 'Danh sách định kỳ', 500);
  if (input.version < 3 && (rawCategories.length || rawRecurring.length)) fail('Danh mục tùy chỉnh và lịch định kỳ yêu cầu bản sao phiên bản 3.');
  const categoryNames = new Set(CATEGORIES.map(item => `${item.type}:${normalizeSearch(item.name).trim().replace(/\s+/g, ' ')}`));
  const customCategories = rawCategories.map(item => {
    object(item, 'Danh mục tùy chỉnh', ['id', 'name', 'type', 'icon', 'color']);
    const id = identifier(item.id, 'Mã danh mục');
    if (CATEGORY_MAP.has(id) || id === 'all') fail('Mã danh mục trùng với danh mục có sẵn hoặc mã dành riêng.');
    if (!['income', 'expense'].includes(item.type)) fail('Danh mục tùy chỉnh chỉ dành cho thu nhập hoặc chi tiêu.');
    const name = string(item.name, 'Tên danh mục', 60);
    const nameKey = `${item.type}:${normalizeSearch(name).trim().replace(/\s+/g, ' ')}`;
    if (categoryNames.has(nameKey)) fail('Tên danh mục đã tồn tại trong cùng loại thu hoặc chi.');
    categoryNames.add(nameKey);
    return { id, name, type: item.type, icon: icon(item.icon), color: color(item.color) };
  });
  uniqueIds(customCategories, 'Danh mục tùy chỉnh');
  const categoryMap = new Map([...CATEGORIES, ...customCategories].map(item => [item.id, item]));
  const accounts = collection(input.accounts, 'Danh sách ví', 30, 1).map(item => {
    object(item, 'Ví', ['id', 'name', 'initialBalance', 'color', 'icon']);
    return { id: identifier(item.id, 'Mã ví'), name: string(item.name, 'Tên ví', 60), initialBalance: amount(item.initialBalance, 'Số dư ban đầu', -MAX_AMOUNT), color: color(item.color), icon: icon(item.icon) };
  });
  const accountIds = uniqueIds(accounts, 'Danh sách ví');
  const transactions = collection(input.transactions, 'Danh sách giao dịch', 50_000).map(item => {
    const keys = ['id', 'type', 'amount', 'date', 'categoryId', 'accountId', 'note', 'createdAt'];
    if (input.version >= 2) keys.push('transferToAccountId');
    object(item, 'Giao dịch', keys);
    if (!['income', 'expense', ...(input.version >= 2 ? ['transfer'] : [])].includes(item.type)) fail('Loại giao dịch không hợp lệ.');
    if (!isValidDate(item.date)) fail('Ngày giao dịch không hợp lệ.');
    if (!categoryMap.has(item.categoryId) || categoryMap.get(item.categoryId).type !== item.type) fail('Danh mục không phù hợp với loại giao dịch.');
    if (!accountIds.has(item.accountId)) fail('Giao dịch tham chiếu đến một ví không tồn tại.');
    if (item.type === 'transfer') {
      if (!accountIds.has(item.transferToAccountId)) fail('Ví nhận của giao dịch chuyển tiền không tồn tại.');
      if (item.accountId === item.transferToAccountId) fail('Ví gửi và ví nhận phải khác nhau.');
    } else if (Object.hasOwn(item, 'transferToAccountId')) {
      fail('Chỉ giao dịch chuyển giữa ví mới có ví nhận.');
    }
    const record = { id: identifier(item.id, 'Mã giao dịch'), type: item.type, amount: amount(item.amount, 'Số tiền giao dịch', 1), date: item.date, categoryId: item.categoryId, accountId: item.accountId, note: string(item.note, 'Ghi chú', 2000, true), createdAt: timestamp(item.createdAt) };
    if (item.type === 'transfer') record.transferToAccountId = item.transferToAccountId;
    return record;
  });
  uniqueIds(transactions, 'Danh sách giao dịch');
  const budgetKeys = new Set();
  const budgets = collection(input.budgets, 'Danh sách ngân sách', 6000).map(item => {
    object(item, 'Ngân sách', ['id', 'month', 'categoryId', 'amount']);
    if (!validMonth(item.month)) fail('Tháng ngân sách không hợp lệ.');
    if (categoryMap.get(item.categoryId)?.type !== 'expense') fail('Ngân sách phải thuộc danh mục chi tiêu.');
    const key = `${item.month}:${item.categoryId}`;
    if (budgetKeys.has(key)) fail('Mỗi danh mục chỉ có một ngân sách trong cùng tháng.');
    budgetKeys.add(key);
    return { id: identifier(item.id, 'Mã ngân sách'), month: item.month, categoryId: item.categoryId, amount: amount(item.amount, 'Hạn mức ngân sách', 1) };
  });
  uniqueIds(budgets, 'Danh sách ngân sách');
  const goals = collection(input.goals, 'Danh sách mục tiêu', 100).map(item => {
    object(item, 'Mục tiêu', ['id', 'name', 'target', 'saved', 'deadline', 'icon', 'color']);
    if (!isValidDate(item.deadline)) fail('Hạn hoàn thành mục tiêu không hợp lệ.');
    return { id: identifier(item.id, 'Mã mục tiêu'), name: string(item.name, 'Tên mục tiêu', 80), target: amount(item.target, 'Số tiền mục tiêu', 1), saved: amount(item.saved, 'Số tiền đã tích lũy'), deadline: item.deadline, icon: icon(item.icon), color: color(item.color) };
  });
  uniqueIds(goals, 'Danh sách mục tiêu');
  const recurring = rawRecurring.map(item => {
    object(item, 'Khoản định kỳ', ['id', 'type', 'amount', 'categoryId', 'accountId', 'note', 'frequency', 'nextDate', 'anchorDay', 'anchorMonth', 'active']);
    if (!['income', 'expense'].includes(item.type)) fail('Khoản định kỳ chỉ hỗ trợ thu nhập hoặc chi tiêu.');
    if (categoryMap.get(item.categoryId)?.type !== item.type) fail('Danh mục của khoản định kỳ không phù hợp.');
    if (!accountIds.has(item.accountId)) fail('Khoản định kỳ tham chiếu đến một ví không tồn tại.');
    validateRecurringDates(item);
    if (typeof item.active !== 'boolean') fail('Trạng thái khoản định kỳ không hợp lệ.');
    return { id: identifier(item.id, 'Mã khoản định kỳ'), type: item.type, amount: amount(item.amount, 'Số tiền định kỳ', 1), categoryId: item.categoryId, accountId: item.accountId, note: string(item.note, 'Ghi chú định kỳ', 2000, true), frequency: item.frequency, nextDate: item.nextDate, anchorDay: item.anchorDay, anchorMonth: item.anchorMonth, active: item.active };
  });
  uniqueIds(recurring, 'Danh sách định kỳ');
  // Check external totals and each wallet's credits/debits independently.
  // Transfers cancel globally but can still overflow a single wallet.
  let positive = 0, negative = 0;
  const walletTotals = new Map();
  for (const account of accounts) {
    if (account.initialBalance >= 0) positive = safeAdd(positive, account.initialBalance);
    else negative = safeAdd(negative, -account.initialBalance);
    walletTotals.set(account.id, { credit: Math.max(0, account.initialBalance), debit: Math.max(0, -account.initialBalance) });
  }
  for (const transaction of transactions) {
    const source = walletTotals.get(transaction.accountId);
    if (transaction.type === 'income') {
      positive = safeAdd(positive, transaction.amount);
      source.credit = safeAdd(source.credit, transaction.amount);
    } else {
      source.debit = safeAdd(source.debit, transaction.amount);
      if (transaction.type === 'expense') negative = safeAdd(negative, transaction.amount);
      else {
        const destination = walletTotals.get(transaction.transferToAccountId);
        destination.credit = safeAdd(destination.credit, transaction.amount);
      }
    }
  }
  safeAdd(positive, -negative);
  return { version: 3, profile, demo: input.demo, accounts, transactions, budgets, goals, customCategories, recurring };
}

function validateRecurringDates(rule) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) fail('Khoản định kỳ không hợp lệ.');
  if (!['weekly', 'monthly', 'yearly'].includes(rule.frequency)) fail('Chu kỳ phải là hàng tuần, hàng tháng hoặc hàng năm.');
  if (!isValidDate(rule.nextDate)) fail('Ngày đến hạn không hợp lệ.');
  if (!Number.isInteger(rule.anchorDay) || rule.anchorDay < 1 || rule.anchorDay > 31) fail('Ngày gốc của lịch định kỳ phải từ 1 đến 31.');
  if (!Number.isInteger(rule.anchorMonth) || rule.anchorMonth < 1 || rule.anchorMonth > 12) fail('Tháng gốc của lịch định kỳ phải từ 1 đến 12.');
  if (rule.frequency !== 'weekly') {
    const expectedDay = Math.min(rule.anchorDay, daysInMonth(rule.nextDate.slice(0, 7)));
    if (Number(rule.nextDate.slice(8)) !== expectedDay) fail('Ngày đến hạn không khớp ngày gốc của lịch định kỳ.');
    if (rule.frequency === 'yearly' && Number(rule.nextDate.slice(5, 7)) !== rule.anchorMonth) fail('Ngày đến hạn không khớp tháng gốc của lịch định kỳ.');
  }
}

/** Advance one occurrence, retaining month-end/leap-day anchors. */
export function advanceRecurringDate(rule) {
  validateRecurringDates(rule);
  const [year, month, day] = rule.nextDate.split('-').map(Number);
  if (rule.frequency === 'weekly') {
    const next = new Date(Date.UTC(year, month - 1, day + 7));
    if (next.getUTCFullYear() > 9999) return null;
    return `${String(next.getUTCFullYear()).padStart(4, '0')}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  }
  if (rule.frequency === 'monthly' && rule.nextDate.slice(0, 7) === '9999-12') return null;
  if (rule.frequency === 'yearly' && year === 9999) return null;
  const nextMonth = rule.frequency === 'monthly' ? shiftMonth(rule.nextDate.slice(0, 7), 1) : `${year + 1}-${String(rule.anchorMonth).padStart(2, '0')}`;
  return `${nextMonth}-${String(Math.min(rule.anchorDay, daysInMonth(nextMonth))).padStart(2, '0')}`;
}

function pendingRecurring(state, ruleId, expectedDate) {
  const next = validateState(state);
  const rule = next.recurring.find(item => item.id === ruleId);
  if (!rule) fail('Khoản định kỳ không còn tồn tại.');
  if (!rule.active) fail('Khoản định kỳ đang tạm dừng.');
  if (!isValidDate(expectedDate) || rule.nextDate !== expectedDate) fail('Kỳ này đã được xử lý hoặc lịch đã thay đổi. Hãy xem lại ngày đến hạn mới nhất.');
  return { next, rule };
}

function moveRecurringForward(rule) {
  const nextDate = advanceRecurringDate(rule);
  if (nextDate) rule.nextDate = nextDate;
  else rule.active = false;
}

/** Create an actual ledger record only when the caller explicitly confirms. */
export function createRecurringTransaction(state, ruleId, expectedDate, overrides = {}) {
  object(overrides, 'Thông tin xác nhận định kỳ', ['date', 'amount', 'accountId', 'categoryId', 'note']);
  const { next, rule } = pendingRecurring(state, ruleId, expectedDate);
  const value = (key, fallback) => Object.hasOwn(overrides, key) ? overrides[key] : fallback;
  next.transactions.push({
    id: uid(), type: rule.type,
    amount: value('amount', rule.amount),
    date: value('date', rule.nextDate),
    categoryId: value('categoryId', rule.categoryId),
    accountId: value('accountId', rule.accountId),
    note: value('note', rule.note),
    createdAt: new Date().toISOString(),
  });
  moveRecurringForward(rule);
  return validateState(next);
}

/** Skip one pending occurrence without creating a transaction. */
export function skipRecurringOccurrence(state, ruleId, expectedDate) {
  const { next, rule } = pendingRecurring(state, ruleId, expectedDate);
  moveRecurringForward(rule);
  return validateState(next);
}

function normalizeSearch(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function activeFilter(value) { return Boolean(value && value !== 'all'); }

export function filterTransactions(state, filters = {}) {
  const { month, type, categoryId, accountId, query, startDate, endDate } = filters;
  const hasStart = startDate !== undefined && startDate !== null && startDate !== '';
  const hasEnd = endDate !== undefined && endDate !== null && endDate !== '';
  if ((hasStart && !isValidDate(startDate)) || (hasEnd && !isValidDate(endDate))) fail('Khoảng ngày lọc không hợp lệ.');
  if (hasStart && hasEnd && startDate > endDate) fail('Ngày bắt đầu không được sau ngày kết thúc.');
  const search = normalizeSearch(query || '').trim();
  const accounts = new Map(state.accounts.map(account => [account.id, account.name]));
  const categories = new Map(getCategories(state).map(item => [item.id, item]));
  return state.transactions.filter(transaction => {
    if (hasStart && transaction.date < startDate) return false;
    if (hasEnd && transaction.date > endDate) return false;
    if (!hasStart && !hasEnd && activeFilter(month) && !transaction.date.startsWith(`${month}-`)) return false;
    if (activeFilter(type) && transaction.type !== type) return false;
    if (activeFilter(categoryId) && transaction.categoryId !== categoryId) return false;
    if (activeFilter(accountId) && transaction.accountId !== accountId && !(transaction.type === 'transfer' && transaction.transferToAccountId === accountId)) return false;
    if (!search) return true;
    const typeLabel = { income: 'Thu nhập', expense: 'Chi tiêu', transfer: 'Chuyển giữa ví' }[transaction.type];
    const text = [transaction.note, categories.get(transaction.categoryId)?.name, accounts.get(transaction.accountId), transaction.type === 'transfer' ? accounts.get(transaction.transferToAccountId) : '', transaction.amount, transaction.date, typeLabel].join(' ');
    return normalizeSearch(text).includes(search);
  }).sort((a, b) => b.date.localeCompare(a.date) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id));
}

function monthlyTotals(state, month) {
  let income = 0, expense = 0;
  for (const transaction of state.transactions) {
    if (transaction.date.slice(0, 7) !== month) continue;
    if (transaction.type === 'income') income += transaction.amount;
    else if (transaction.type === 'expense') expense += transaction.amount;
  }
  return { income, expense, net: income - expense };
}

export function deriveMonthly(state, month) {
  if (!validMonth(month)) fail('Tháng không hợp lệ.');
  const transactions = filterTransactions(state, { month });
  const totals = monthlyTotals(state, month);
  const categories = new Map();
  const daily = Array.from({ length: daysInMonth(month) }, (_, index) => ({ day: index + 1, income: 0, expense: 0 }));
  for (const transaction of transactions) {
    if (transaction.type === 'transfer') continue;
    const entry = daily[Number(transaction.date.slice(8)) - 1];
    entry[transaction.type] += transaction.amount;
    if (transaction.type === 'expense') categories.set(transaction.categoryId, (categories.get(transaction.categoryId) || 0) + transaction.amount);
  }
  const previous = month === '1900-01' ? { income: 0, expense: 0, net: 0 } : monthlyTotals(state, shiftMonth(month, -1));
  return {
    ...totals,
    savingsRate: totals.income > 0 ? (totals.net / totals.income) * 100 : 0,
    transactions,
    categoryTotals: Array.from(categories, ([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount || a.categoryId.localeCompare(b.categoryId)),
    daily,
    previous,
  };
}

export function accountBalance(state, accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) fail('Không tìm thấy ví.');
  return state.transactions.reduce((balance, transaction) => {
    if (transaction.accountId === accountId) return safeAdd(balance, transaction.type === 'income' ? transaction.amount : -transaction.amount);
    if (transaction.type === 'transfer' && transaction.transferToAccountId === accountId) return safeAdd(balance, transaction.amount);
    return balance;
  }, account.initialBalance);
}

export function allTimeBalance(state) {
  // Summing external flows directly also avoids rounding from cancellation
  // between very large positive and negative wallet balances.
  const opening = state.accounts.reduce((balance, account) => safeAdd(balance, account.initialBalance), 0);
  return state.transactions.reduce((balance, transaction) => transaction.type === 'transfer' ? balance : safeAdd(balance, transaction.type === 'income' ? transaction.amount : -transaction.amount), opening);
}

function csvCell(value) {
  if (typeof value === 'number') return String(value);
  let text = String(value ?? '');
  // Quoting alone does not prevent formula execution in spreadsheet software.
  if (/^[\s\u0000-\u001f\u007f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function makeCSV(transactions, state) {
  const accounts = new Map(state.accounts.map(account => [account.id, account.name]));
  const categories = new Map(getCategories(state).map(item => [item.id, item]));
  const rows = [['Ngày', 'Loại giao dịch', 'Danh mục', 'Ví', 'Ví nhận', 'Ghi chú', 'Số tiền (VND)']];
  for (const transaction of transactions) {
    const typeLabel = { income: 'Thu nhập', expense: 'Chi tiêu', transfer: 'Chuyển giữa ví' }[transaction.type];
    const destination = transaction.type === 'transfer' ? accounts.get(transaction.transferToAccountId) || transaction.transferToAccountId : '';
    rows.push([transaction.date, typeLabel, categories.get(transaction.categoryId)?.name || transaction.categoryId, accounts.get(transaction.accountId) || transaction.accountId, destination, transaction.note, transaction.type === 'expense' ? -transaction.amount : transaction.amount]);
  }
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
