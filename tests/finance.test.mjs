import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, createEmptyState, createDemoState, localDate, monthKey, shiftMonth,
  daysInMonth, isValidDate, validateState, deriveMonthly, accountBalance,
  allTimeBalance, filterTransactions, makeCSV, uid, getCategories,
  advanceRecurringDate, createRecurringTransaction, skipRecurringOccurrence,
} from '../dist/finance.js';

function fixture() {
  const state = createEmptyState('2026-11-26');
  state.accounts[0].initialBalance = 1_000_000;
  state.accounts.push({ id: 'bank', name: 'Ngân hàng', initialBalance: 2_000_000, color: '#abcdef', icon: 'bank' });
  state.transactions = [
    { id: 'salary1', type: 'income', amount: 10_000_000, date: '2026-11-01', categoryId: 'salary', accountId: 'bank', note: 'Lương', createdAt: '2026-11-01T01:00:00.000Z' },
    { id: 'food1', type: 'expense', amount: 150_000, date: '2026-11-02', categoryId: 'food', accountId: 'cash', note: 'Bữa trưa cùng đồng nghiệp', createdAt: '2026-11-02T01:00:00.000Z' },
    { id: 'food2', type: 'expense', amount: 250_000, date: '2026-11-02', categoryId: 'food', accountId: 'bank', note: 'Đi chợ', createdAt: '2026-11-02T02:00:00.000Z' },
    { id: 'rent1', type: 'expense', amount: 3_000_000, date: '2026-11-03', categoryId: 'housing', accountId: 'bank', note: 'Thuê nhà', createdAt: '2026-11-03T01:00:00.000Z' },
    { id: 'previous1', type: 'expense', amount: 100_000, date: '2026-10-31', categoryId: 'transport', accountId: 'cash', note: 'Di chuyển', createdAt: '2026-10-31T01:00:00.000Z' },
    { id: 'previous2', type: 'income', amount: 500_000, date: '2026-10-15', categoryId: 'freelance', accountId: 'cash', note: 'Làm thêm', createdAt: '2026-10-15T01:00:00.000Z' },
  ];
  return state;
}

function transfer(overrides = {}) {
  return {
    id: 'transfer1', type: 'transfer', amount: 500_000, date: '2026-11-04',
    categoryId: 'transfer', accountId: 'bank', transferToAccountId: 'cash',
    note: 'Rút tiền mặt', createdAt: '2026-11-04T08:00:00.000Z',
    ...overrides,
  };
}

function recurring(overrides = {}) {
  return {
    id: 'rent-schedule', type: 'expense', amount: 3_000_000, categoryId: 'housing',
    accountId: 'bank', note: 'Tiền thuê nhà', frequency: 'monthly',
    nextDate: '2026-11-30', anchorDay: 31, anchorMonth: 1, active: true,
    ...overrides,
  };
}

test('calendar operations preserve local dates and handle leap years and year boundaries', () => {
  assert.equal(localDate(new Date(2026, 0, 1, 0, 30)), '2026-01-01');
  assert.equal(monthKey('2026-11-26'), '2026-11');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-11', -24), '2024-11');
  assert.equal(daysInMonth('2024-02'), 29);
  assert.equal(daysInMonth('2100-02'), 28);
  assert.equal(daysInMonth('2000-02'), 29);
  assert.equal(isValidDate('2024-02-29'), true);
  for (const invalid of ['2026-02-29', '2026-04-31', '2026-11-00', '2026-13-01', '2026-1-01', '2026-11-01T00:00:00Z', null]) assert.equal(isValidDate(invalid), false);
  assert.throws(() => shiftMonth('1900-01', -1));
  assert.throws(() => daysInMonth('2026-13'));
});

test('monthly reports reconcile to accounts without counting opening balance as income', () => {
  const state = validateState(fixture());
  const report = deriveMonthly(state, '2026-11');
  assert.equal(report.income, 10_000_000);
  assert.equal(report.expense, 3_400_000);
  assert.equal(report.net, 6_600_000);
  assert.equal(report.savingsRate, 66);
  assert.deepEqual(report.previous, { income: 500_000, expense: 100_000, net: 400_000 });
  assert.equal(report.daily.length, 30);
  assert.deepEqual(report.daily[1], { day: 2, income: 0, expense: 400_000 });
  assert.equal(report.categoryTotals.reduce((sum, item) => sum + item.amount, 0), report.expense);
  assert.deepEqual(report.categoryTotals[0], { categoryId: 'housing', amount: 3_000_000 });
  assert.equal(accountBalance(state, 'cash'), 1_250_000);
  assert.equal(accountBalance(state, 'bank'), 8_750_000);
  assert.equal(allTimeBalance(state), 10_000_000);
  assert.equal(deriveMonthly(state, '2027-01').savingsRate, 0);
  assert.equal(deriveMonthly(state, '1900-01').previous.net, 0);
  assert.throws(() => accountBalance(state, 'missing'));
});

test('filtering combines independent filters and searches Vietnamese without accents', () => {
  const state = fixture();
  assert.deepEqual(filterTransactions(state, { month: '2026-11', type: 'expense', categoryId: 'food' }).map(item => item.id), ['food2', 'food1']);
  assert.deepEqual(filterTransactions(state, { month: '2026-11', accountId: 'cash', query: 'dong nghiep' }).map(item => item.id), ['food1']);
  assert.deepEqual(filterTransactions(state, { query: 'di cho' }).map(item => item.id), ['food2']);
  assert.equal(filterTransactions(state, { month: 'all', type: 'all', categoryId: '', accountId: '' }).length, 6);
  assert.equal(filterTransactions(state, { query: 'không có kết quả' }).length, 0);
  assert.deepEqual(state.transactions.map(item => item.id), ['salary1', 'food1', 'food2', 'rent1', 'previous1', 'previous2']);
});

test('demo state is deterministic, valid at calendar limits, and never creates future current-month transactions', () => {
  for (const today of ['2026-11-26', '2027-02-01', '2024-02-29', '2026-12-31', '1900-01-01', '9999-12-31']) {
    const state = createDemoState(today);
    assert.deepEqual(state, createDemoState(today));
    assert.equal(state.demo, true);
    assert.equal(state.accounts.length, 3);
    assert.equal(state.goals.length, 3);
    assert.equal(state.version, 3);
    assert.equal(state.transactions.filter(item => item.type === 'transfer').length, 1);
    assert.ok(state.transactions.filter(item => item.date.startsWith(monthKey(today))).length >= 25);
    assert.ok(state.transactions.every(item => item.date <= today));
    assert.deepEqual(validateState(state), state);
    assert.equal(deriveMonthly(state, monthKey(today)).income, 28_850_000);
    assert.equal(new Set(CATEGORIES.map(item => item.id)).size, CATEGORIES.length);
  }
});

test('validation returns a detached clone and normalizes timestamps and display fields', () => {
  const input = fixture();
  input.profile.name = '  Lâm  ';
  input.accounts[0].color = '#ABCDEF';
  input.transactions[0].createdAt = 1793494800000;
  const result = validateState(input);
  assert.equal(result.profile.name, 'Lâm');
  assert.equal(result.accounts[0].color, '#abcdef');
  assert.match(result.transactions[0].createdAt, /Z$/);
  result.transactions[0].amount = 5;
  assert.equal(input.transactions[0].amount, 10_000_000);
});

test('invalid monetary values, dates, record identities, and references are rejected', () => {
  const changes = [
    state => { state.version = 4; },
    state => { state.profile.currency = 'USD'; },
    state => { state.profile.name = ''; },
    state => { state.demo = 'false'; },
    state => { state.accounts = []; },
    state => { state.transactions[0].amount = -1; },
    state => { state.transactions[0].amount = 0; },
    state => { state.transactions[0].amount = 1.25; },
    state => { state.transactions[0].amount = 1_000_000_000_001; },
    state => { state.transactions[0].amount = NaN; },
    state => { state.transactions[0].amount = Infinity; },
    state => { state.transactions[0].date = '2026-02-30'; },
    state => { state.transactions[0].createdAt = '2026-02-30T00:00:00Z'; },
    state => { state.transactions[0].accountId = 'missing'; },
    state => { state.transactions[0].categoryId = 'food'; },
    state => { state.transactions[0].id = '<script>'; },
    state => { state.transactions.push({ ...state.transactions[0] }); },
    state => { state.accounts.push({ ...state.accounts[0] }); },
    state => { state.accounts[0].color = 'url(javascript:alert(1))'; },
    state => { state.accounts[0].icon = '" onclick="'; },
    state => { state.mystery = true; },
    state => { state.transactions[0].unexpected = true; },
  ];
  for (const change of changes) {
    const state = fixture();
    change(state);
    assert.throws(() => validateState(state));
  }
  const validNegative = fixture();
  validNegative.accounts[0].initialBalance = -200_000;
  assert.equal(validateState(validNegative).accounts[0].initialBalance, -200_000);
});

test('budgets prohibit duplicate category/month pairs; goal amounts and deadlines are checked', () => {
  const state = createDemoState('2026-11-26');
  const duplicate = structuredClone(state);
  duplicate.budgets.push({ ...duplicate.budgets[0], id: 'different-id' });
  assert.throws(() => validateState(duplicate));
  const incomeBudget = structuredClone(state);
  incomeBudget.budgets[0].categoryId = 'salary';
  assert.throws(() => validateState(incomeBudget));
  const invalidGoal = structuredClone(state);
  invalidGoal.goals[0].saved = -1;
  assert.throws(() => validateState(invalidGoal));
  invalidGoal.goals[0].saved = 0;
  invalidGoal.goals[0].deadline = '2026-11-31';
  assert.throws(() => validateState(invalidGoal));
  const exceededGoal = structuredClone(state);
  exceededGoal.goals[0].saved = exceededGoal.goals[0].target + 1;
  assert.doesNotThrow(() => validateState(exceededGoal));
});

test('large individually valid entries cannot overflow aggregate integer precision', () => {
  const state = fixture();
  const sample = state.transactions[0];
  state.transactions = Array.from({ length: 9010 }, (_, index) => ({ ...sample, id: `big-${index}`, amount: 1_000_000_000_000 }));
  assert.throws(() => validateState(state), /chính xác/);
});

test('CSV supports Vietnamese, quoted multiline notes, numeric signs, and formula injection defense', () => {
  const state = fixture();
  const cases = ['=HYPERLINK("x")', '+SUM(1,2)', '-1+1', '@SUM(A1:A2)', '\t=1+1', '\r=1+1', '   =1+1', '\u2003=1+1'];
  for (const note of cases) {
    const transaction = { ...state.transactions[1], note };
    const csv = makeCSV([transaction], state);
    assert.ok(csv.startsWith('\ufeff'));
    assert.ok(csv.includes(`"'${note.replace(/"/g, '""')}"`));
    assert.ok(csv.endsWith(',-150000\r\n'));
  }
  const csv = makeCSV([{ ...state.transactions[0], note: 'Cà phê, "sáng"\nVui vẻ' }], state);
  assert.ok(csv.includes('"Cà phê, ""sáng""\nVui vẻ"'));
  assert.ok(csv.endsWith(',10000000\r\n'));
});

test('generated local record IDs conform to the import schema', () => {
  const ids = new Set(Array.from({ length: 100 }, () => uid()));
  assert.equal(ids.size, 100);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{1,80}$/);
});

test('wallet transfers move money between accounts without changing external cash flow or total balance', () => {
  const before = validateState(fixture());
  const state = structuredClone(before);
  state.transactions.push(transfer());
  state.transactions.push(transfer({ id: 'previous-transfer', amount: 100_000, date: '2026-10-20', accountId: 'cash', transferToAccountId: 'bank', createdAt: '2026-10-20T08:00:00.000Z' }));
  const after = validateState(state);
  assert.equal(accountBalance(after, 'cash'), accountBalance(before, 'cash') + 400_000);
  assert.equal(accountBalance(after, 'bank'), accountBalance(before, 'bank') - 400_000);
  assert.equal(allTimeBalance(after), allTimeBalance(before));
  const originalReport = deriveMonthly(before, '2026-11');
  const report = deriveMonthly(after, '2026-11');
  for (const key of ['income', 'expense', 'net', 'savingsRate']) assert.equal(report[key], originalReport[key]);
  assert.deepEqual(report.previous, originalReport.previous);
  assert.deepEqual(report.daily, originalReport.daily);
  assert.deepEqual(report.categoryTotals, originalReport.categoryTotals);
  assert.equal(report.transactions.length, originalReport.transactions.length + 1);
  const edited = structuredClone(after);
  edited.transactions.find(item => item.id === 'transfer1').amount = 800_000;
  assert.equal(accountBalance(validateState(edited), 'cash'), accountBalance(before, 'cash') + 700_000);
  assert.equal(allTimeBalance(edited), allTimeBalance(before));
  edited.transactions = edited.transactions.filter(item => item.type !== 'transfer');
  assert.equal(accountBalance(validateState(edited), 'cash'), accountBalance(before, 'cash'));
});

test('transfers require two distinct existing wallets and reject destination fields on other types', () => {
  const changes = [
    item => { item.transferToAccountId = item.accountId; },
    item => { item.transferToAccountId = 'missing'; },
    item => { delete item.transferToAccountId; },
    item => { item.accountId = 'missing'; },
    item => { item.amount = 0; },
    item => { item.amount = -1; },
    item => { item.amount = 0.5; },
    item => { item.amount = 1_000_000_000_001; },
    item => { item.categoryId = 'food'; },
    item => { item.type = 'expense'; item.categoryId = 'food'; },
  ];
  for (const change of changes) {
    const state = fixture();
    const item = transfer();
    change(item);
    state.transactions.push(item);
    assert.throws(() => validateState(state));
  }
  const mislabeledVersion = fixture();
  mislabeledVersion.version = 1;
  mislabeledVersion.transactions.push(transfer());
  assert.throws(() => validateState(mislabeledVersion));
  const unrelatedDestination = fixture();
  unrelatedDestination.transactions[0].transferToAccountId = null;
  assert.throws(() => validateState(unrelatedDestination), /Chỉ giao dịch chuyển/);
});

test('transfer search and wallet filters include both source and destination', () => {
  const state = fixture();
  state.transactions.push(transfer());
  for (const accountId of ['cash', 'bank']) {
    assert.deepEqual(filterTransactions(state, { type: 'transfer', accountId }).map(item => item.id), ['transfer1']);
  }
  for (const query of ['ngan hang', 'tien mat', 'chuyen giua vi']) {
    assert.deepEqual(filterTransactions(state, { type: 'transfer', query }).map(item => item.id), ['transfer1']);
  }
  assert.deepEqual(filterTransactions(state, { categoryId: 'transfer', month: '2026-11' }).map(item => item.id), ['transfer1']);
  assert.equal(filterTransactions(state, { accountId: 'not-a-wallet' }).length, 0);
});

test('original v1 and v2 backups migrate to v3 without changing records or balances', () => {
  const original = fixture();
  original.version = 1;
  delete original.customCategories;
  delete original.recurring;
  const migrated = validateState(JSON.parse(JSON.stringify(original)));
  assert.equal(migrated.version, 3);
  assert.equal(original.version, 1);
  for (const key of ['profile', 'demo', 'accounts', 'transactions', 'budgets', 'goals']) assert.deepEqual(migrated[key], original[key]);
  assert.deepEqual(migrated.customCategories, []);
  assert.deepEqual(migrated.recurring, []);
  assert.equal(allTimeBalance(migrated), allTimeBalance(original));
  const versionTwo = { ...original, version: 2, transactions: [...original.transactions, transfer()] };
  const restored = validateState(JSON.parse(JSON.stringify(versionTwo)));
  assert.equal(restored.version, 3);
  assert.deepEqual(restored.transactions, versionTwo.transactions);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(restored))), restored);
  assert.equal(accountBalance(restored, 'cash'), accountBalance(migrated, 'cash') + 500_000);
  assert.equal(allTimeBalance(restored), allTimeBalance(original));
});

test('a transfer-only month has zero income and expense and CSV identifies the receiving wallet', () => {
  const state = fixture();
  state.transactions = [transfer()];
  const valid = validateState(state);
  const report = deriveMonthly(valid, '2026-11');
  assert.equal(report.income, 0);
  assert.equal(report.expense, 0);
  assert.equal(report.net, 0);
  assert.equal(report.savingsRate, 0);
  assert.deepEqual(report.categoryTotals, []);
  assert.ok(report.daily.every(day => day.income === 0 && day.expense === 0 && !Object.hasOwn(day, 'transfer')));
  assert.equal(report.transactions.length, 1);
  const csv = makeCSV(valid.transactions, valid);
  assert.ok(csv.includes('"Ví","Ví nhận","Ghi chú"'));
  assert.ok(csv.includes('"Chuyển giữa ví","Chuyển giữa ví","Ngân hàng","Tiền mặt","Rút tiền mặt",500000'));
  valid.accounts.find(item => item.id === 'cash').name = '=HYPERLINK("x")';
  assert.ok(makeCSV(valid.transactions, valid).includes('"\'=HYPERLINK(""x"")"'));
});

test('transfer validation checks wallet precision and totals stay exact when large wallet balances cancel', () => {
  const overflow = fixture();
  overflow.transactions = Array.from({ length: 9010 }, (_, index) => transfer({ id: `transfer-overflow-${index}`, amount: 1_000_000_000_000 }));
  assert.throws(() => validateState(overflow), /chính xác/);

  const state = createEmptyState('2026-11-26');
  state.accounts[0].initialBalance = 1;
  for (const id of ['b', 'd', 'a', 'c']) state.accounts.push({ id, name: id, initialBalance: 0, color: '#10b981', icon: 'wallet' });
  for (let index = 0; index < 5000; index++) {
    state.transactions.push(transfer({ id: `large-ab-${index}`, accountId: 'a', transferToAccountId: 'b', amount: 1_000_000_000_000 }));
    state.transactions.push(transfer({ id: `large-cd-${index}`, accountId: 'c', transferToAccountId: 'd', amount: 1_000_000_000_000 }));
  }
  const valid = validateState(state);
  assert.equal(accountBalance(valid, 'a'), -5_000_000_000_000_000);
  assert.equal(accountBalance(valid, 'b'), 5_000_000_000_000_000);
  assert.equal(allTimeBalance(valid), 1);
  assert.equal(deriveMonthly(valid, '2026-11').expense, 0);
});

test('normalized timestamps remain importable and impossible times are rejected', () => {
  const state = fixture();
  state.transactions[0].createdAt = '2026-11-26T23:15:00+07:00';
  assert.equal(validateState(state).transactions[0].createdAt, '2026-11-26T16:15:00.000Z');
  state.transactions[0].createdAt = Date.parse('9999-12-31T23:59:59.999Z');
  const normalized = validateState(state);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(normalized))), normalized);
  for (const value of ['2026-11-26T24:00:00Z', '2026-11-26T12:60:00Z', '2026-11-26T12:00:60Z', '9999-12-31T23:59:59-07:00', Date.parse('9999-12-31T23:59:59.999Z') + 1, 8_640_000_000_000_000]) {
    state.transactions[0].createdAt = value;
    assert.throws(() => validateState(state));
  }
});

test('custom categories participate in transactions, budgets, reports, search and CSV without altering built-ins', () => {
  const state = fixture();
  state.customCategories.push({ id: 'tuition', name: 'Học phí', type: 'expense', icon: 'book', color: '#123abc' });
  state.transactions.push({ ...state.transactions[1], id: 'tuition-payment', amount: 1_500_000, categoryId: 'tuition', note: 'Lớp tiếng Anh' });
  state.budgets.push({ id: 'tuition-budget', month: '2026-11', categoryId: 'tuition', amount: 2_000_000 });
  const valid = validateState(state);
  assert.equal(getCategories(valid).length, CATEGORIES.length + 1);
  assert.equal(getCategories(createEmptyState()).length, CATEGORIES.length);
  assert.deepEqual(deriveMonthly(valid, '2026-11').categoryTotals.find(item => item.categoryId === 'tuition'), { categoryId: 'tuition', amount: 1_500_000 });
  assert.deepEqual(filterTransactions(valid, { query: 'hoc phi' }).map(item => item.id), ['tuition-payment']);
  assert.ok(makeCSV(valid.transactions, valid).includes('"Học phí"'));
  const categories = getCategories(valid);
  categories.find(item => item.id === 'tuition').name = 'Do not mutate ledger';
  assert.equal(valid.customCategories[0].name, 'Học phí');
  valid.customCategories[0].name = 'Học phí ngoại ngữ';
  const renamed = validateState(valid);
  assert.equal(filterTransactions(renamed, { query: 'hoc phi ngoai ngu' }).length, 1);
  assert.equal(allTimeBalance(renamed), allTimeBalance(state));
});

test('custom categories reject duplicate identifiers or normalized names and preserve referenced categories', () => {
  const base = fixture();
  const category = { id: 'tuition', name: 'Học phí', type: 'expense', icon: 'book', color: '#123abc' };
  const invalidLists = [
    [{ ...category, id: 'food' }],
    [{ ...category, id: 'all' }],
    [{ ...category, name: '  an   UONG  ' }],
    [category, { ...category, id: 'different-id', name: ' hoc phi ' }],
    [category, { ...category, name: 'Một tên khác' }],
    [{ ...category, type: 'transfer' }],
    [{ ...category, extra: true }],
  ];
  for (const customCategories of invalidLists) assert.throws(() => validateState({ ...base, customCategories }));
  assert.doesNotThrow(() => validateState({ ...base, customCategories: [category, { ...category, id: 'tuition-income', type: 'income' }] }));

  for (const reference of ['transaction', 'budget', 'recurring']) {
    const state = fixture();
    state.customCategories = [{ ...category }];
    if (reference === 'transaction') state.transactions[1].categoryId = 'tuition';
    if (reference === 'budget') state.budgets.push({ id: 'custom-budget', month: '2026-11', categoryId: 'tuition', amount: 1_000_000 });
    if (reference === 'recurring') state.recurring.push(recurring({ categoryId: 'tuition' }));
    assert.doesNotThrow(() => validateState(state));
    state.customCategories = [];
    assert.throws(() => validateState(state), /Danh mục|danh mục/);
  }
});

test('recurring rules validate frequency, anchors, amounts, categories and wallet references', () => {
  const mutations = [
    rule => { rule.type = 'transfer'; },
    rule => { rule.frequency = 'daily'; },
    rule => { rule.nextDate = '2026-02-30'; },
    rule => { rule.anchorDay = 0; },
    rule => { rule.anchorDay = 32; },
    rule => { rule.anchorMonth = 0; },
    rule => { rule.anchorMonth = 13; },
    rule => { rule.anchorDay = 15; },
    rule => { rule.frequency = 'yearly'; rule.anchorMonth = 12; },
    rule => { rule.amount = 0; },
    rule => { rule.amount = 1.2; },
    rule => { rule.categoryId = 'salary'; },
    rule => { rule.accountId = 'missing'; },
    rule => { rule.active = 'true'; },
    rule => { rule.unexpected = 1; },
  ];
  for (const mutate of mutations) {
    const state = fixture();
    const rule = recurring();
    mutate(rule);
    state.recurring = [rule];
    assert.throws(() => validateState(state));
  }
  const duplicate = fixture();
  duplicate.recurring = [recurring(), recurring()];
  assert.throws(() => validateState(duplicate), /trùng/);
  const legacyWithNewData = fixture();
  legacyWithNewData.version = 2;
  legacyWithNewData.recurring = [recurring()];
  assert.throws(() => validateState(legacyWithNewData), /phiên bản 3/);
});

test('recurrence arithmetic retains the 31st and leap-day anchors and handles weekly year rollover', () => {
  const monthEnd = recurring({ nextDate: '2027-01-31', anchorDay: 31 });
  assert.equal(advanceRecurringDate(monthEnd), '2027-02-28');
  monthEnd.nextDate = advanceRecurringDate(monthEnd);
  assert.equal(advanceRecurringDate(monthEnd), '2027-03-31');
  const leap = recurring({ frequency: 'yearly', nextDate: '2024-02-29', anchorDay: 29, anchorMonth: 2 });
  for (const date of ['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']) {
    leap.nextDate = advanceRecurringDate(leap);
    assert.equal(leap.nextDate, date);
  }
  assert.equal(advanceRecurringDate({ ...leap, nextDate: '2099-02-28' }), '2100-02-28');
  assert.equal(advanceRecurringDate(recurring({ frequency: 'weekly', nextDate: '2026-12-29' })), '2027-01-05');
  assert.equal(advanceRecurringDate(recurring({ frequency: 'weekly', nextDate: '2024-02-27' })), '2024-03-05');
});

test('confirming a recurring item creates exactly one actual record and advances one occurrence atomically', () => {
  const state = fixture();
  const originalBalance = allTimeBalance(state);
  state.recurring = [recurring()];
  const before = structuredClone(state);
  assert.equal(allTimeBalance(state), originalBalance);
  const next = createRecurringTransaction(state, 'rent-schedule', '2026-11-30', {
    date: '2026-12-01', amount: 3_200_000, accountId: 'cash', categoryId: 'housing', note: 'Thanh toán thực tế',
  });
  assert.deepEqual(state, before);
  assert.equal(next.transactions.length, state.transactions.length + 1);
  const created = next.transactions.at(-1);
  assert.equal(created.type, 'expense');
  assert.equal(created.amount, 3_200_000);
  assert.equal(created.date, '2026-12-01');
  assert.equal(created.accountId, 'cash');
  assert.equal(created.note, 'Thanh toán thực tế');
  assert.equal(next.recurring[0].nextDate, '2026-12-31');
  assert.equal(next.recurring[0].anchorDay, 31);
  assert.equal(next.recurring[0].amount, 3_000_000);
  assert.equal(allTimeBalance(next), originalBalance - 3_200_000);
  assert.equal(deriveMonthly(next, '2026-12').expense, 3_200_000);
  assert.equal(deriveMonthly(next, '2026-11').expense, deriveMonthly(before, '2026-11').expense);
  assert.throws(() => createRecurringTransaction(next, 'rent-schedule', '2026-11-30'), /đã được xử lý|lịch đã thay đổi/);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(next))), next);
});

test('invalid or stale recurring confirmations leave the original ledger unchanged', () => {
  const state = fixture();
  state.recurring = [recurring()];
  const before = structuredClone(state);
  for (const overrides of [{ amount: 0 }, { amount: null }, { date: '2026-02-30' }, { accountId: 'missing' }, { categoryId: 'salary' }, { type: 'income' }]) {
    assert.throws(() => createRecurringTransaction(state, 'rent-schedule', '2026-11-30', overrides));
    assert.deepEqual(state, before);
  }
  assert.throws(() => createRecurringTransaction(state, 'missing', '2026-11-30'), /không còn tồn tại/);
  assert.throws(() => createRecurringTransaction(state, 'rent-schedule', '2026-10-31'), /đã được xử lý|lịch đã thay đổi/);
  state.recurring[0].active = false;
  assert.throws(() => createRecurringTransaction(state, 'rent-schedule', '2026-11-30'), /tạm dừng/);
});

test('skipping a recurrence never creates a transaction and final valid occurrences pause safely', () => {
  const state = fixture();
  state.recurring = [recurring()];
  const skipped = skipRecurringOccurrence(state, 'rent-schedule', '2026-11-30');
  assert.deepEqual(skipped.transactions, state.transactions);
  assert.equal(skipped.recurring[0].nextDate, '2026-12-31');
  assert.equal(allTimeBalance(skipped), allTimeBalance(state));
  assert.throws(() => skipRecurringOccurrence(skipped, 'rent-schedule', '2026-11-30'));

  for (const frequency of ['weekly', 'monthly', 'yearly']) {
    const final = fixture();
    final.recurring = [recurring({ type: 'income', categoryId: 'salary', frequency, nextDate: '9999-12-31', anchorDay: 31, anchorMonth: 12 })];
    assert.equal(advanceRecurringDate(final.recurring[0]), null);
    const confirmed = createRecurringTransaction(final, 'rent-schedule', '9999-12-31');
    assert.equal(confirmed.transactions.length, final.transactions.length + 1);
    assert.equal(confirmed.recurring[0].active, false);
    assert.equal(confirmed.recurring[0].nextDate, '9999-12-31');
    assert.throws(() => createRecurringTransaction(confirmed, 'rent-schedule', '9999-12-31'), /tạm dừng/);
    const skippedFinal = skipRecurringOccurrence(final, 'rent-schedule', '9999-12-31');
    assert.equal(skippedFinal.recurring[0].active, false);
    assert.deepEqual(skippedFinal.transactions, final.transactions);
  }
});

test('inclusive date ranges override the month and combine with other transaction filters', () => {
  const state = fixture();
  assert.deepEqual(filterTransactions(state, { month: '2027-01', startDate: '2026-10-31', endDate: '2026-11-02' }).map(item => item.id), ['food2', 'food1', 'salary1', 'previous1']);
  assert.deepEqual(filterTransactions(state, { startDate: '2026-11-02', endDate: '2026-11-02', accountId: 'cash' }).map(item => item.id), ['food1']);
  assert.deepEqual(filterTransactions(state, { month: '2025-01', startDate: '2026-11-03' }).map(item => item.id), ['rent1']);
  assert.deepEqual(filterTransactions(state, { month: '2026-11', endDate: '2026-10-31' }).map(item => item.id), ['previous1', 'previous2']);
  assert.equal(filterTransactions(state, { month: '2026-11', startDate: '', endDate: '' }).length, 4);
  assert.throws(() => filterTransactions(state, { startDate: '2026-02-30' }), /không hợp lệ/);
  assert.throws(() => filterTransactions(state, { startDate: '2026-11-03', endDate: '2026-11-02' }), /Ngày bắt đầu/);
});
