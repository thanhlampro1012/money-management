import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState, validateState } from '../dist/finance.js';
import { LedgerStore } from '../dist/storage.js';

const KEY = 'vi-minh:v1';
const RECOVERY = 'money-management:recovery:v1';
const BACKUP = 'money-management:backup-at';

class MemoryStorage {
  constructor(entries = {}) {
    this.data = new Map(Object.entries(entries));
    this.writes = [];
    this.denied = false;
    this.failKey = null;
    this.afterWrite = null;
  }
  getItem(key) {
    if (this.denied) throw new DOMException('Denied', 'SecurityError');
    return this.data.get(key) ?? null;
  }
  setItem(key, value) {
    if (this.denied) throw new DOMException('Denied', 'SecurityError');
    if (this.failKey === key || this.failKey === '*') throw new DOMException('Full', 'QuotaExceededError');
    this.writes.push({ key, value: String(value) });
    this.data.set(key, String(value));
    this.afterWrite?.(key, String(value));
  }
  removeItem(key) { this.data.delete(key); }
}

function ledger(name = 'Sổ cá nhân') {
  const state = createEmptyState('2026-11-26');
  state.profile.name = name;
  return validateState(state);
}

function existing(name = 'Ban đầu') {
  const state = ledger(name);
  const storage = new MemoryStorage({ [KEY]: JSON.stringify(state) });
  const store = new LedgerStore(storage);
  store.load();
  return { state, storage, store };
}

test('a fresh installation persists an empty personal book, never demonstration transactions', () => {
  const storage = new MemoryStorage();
  const result = new LedgerStore(storage).load();
  assert.equal(result.state.demo, false);
  assert.deepEqual(result.state.transactions, []);
  assert.equal(result.state.accounts.length, 1);
  assert.equal(result.state.accounts[0].initialBalance, 0);
  assert.equal(result.issue, '');
  assert.equal(result.corruptRaw, null);
  assert.equal(result.recoveryAvailable, false);
  assert.deepEqual(JSON.parse(storage.getItem(KEY)), result.state);
});

test('legacy v1 books normalize in memory without rewriting the original on load', () => {
  const legacy = ledger('Sổ cũ');
  legacy.version = 1;
  delete legacy.transfers;
  const raw = JSON.stringify(legacy, null, 2);
  const storage = new MemoryStorage({ [KEY]: raw });
  const result = new LedgerStore(storage).load();
  assert.deepEqual(result.state, validateState(legacy));
  assert.equal(result.state.profile.name, 'Sổ cũ');
  assert.equal(result.raw, raw);
  assert.equal(storage.getItem(KEY), raw);
  assert.equal(storage.writes.length, 0);
});

test('unavailable storage and quota errors never claim that a fresh book was saved', () => {
  for (const failure of ['denied', 'quota']) {
    const storage = new MemoryStorage();
    if (failure === 'denied') storage.denied = true;
    else storage.failKey = '*';
    const store = new LedgerStore(storage);
    const result = store.load();
    assert.equal(result.state.demo, false);
    assert.deepEqual(result.state.transactions, []);
    assert.ok(result.issue);
    assert.equal(result.raw, null);
    assert.equal(storage.data.has(KEY), false);
    assert.throws(() => store.save(ledger('Chưa lưu')), error => ['STORAGE_UNAVAILABLE', 'STORAGE_WRITE'].includes(error.code));
  }
});

test('an unavailable localStorage property is handled without crashing construction', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('Denied', 'SecurityError'); } });
  try {
    const result = new LedgerStore().load();
    assert.ok(result.issue);
    assert.equal(result.state.demo, false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('corrupt primary bytes remain untouched until an explicitly confirmed replacement', () => {
  const raw = '{"transactions":broken';
  const storage = new MemoryStorage({ [KEY]: raw });
  const store = new LedgerStore(storage);
  const result = store.load();
  assert.equal(result.corruptRaw, raw);
  assert.equal(result.raw, raw);
  assert.ok(result.issue);
  assert.equal(storage.writes.length, 0);
  assert.throws(() => store.save(ledger()), { code: 'CORRUPT_STORAGE' });
  assert.equal(storage.getItem(KEY), raw);
  const saved = store.save(ledger('Khôi phục'), { replace: true });
  assert.equal(saved.profile.name, 'Khôi phục');
  assert.equal(store.load().corruptRaw, null);
});

test('a valid save retains the previous valid ledger and detached return objects', () => {
  const { state, storage, store } = existing();
  const result = store.save(ledger('Mới'));
  const recovery = store.getRecovery();
  assert.deepEqual(recovery.state, state);
  assert.equal(new Date(recovery.savedAt).toISOString(), recovery.savedAt);
  assert.equal(JSON.parse(storage.getItem(KEY)).profile.name, 'Mới');
  result.profile.name = 'Không được sửa bộ nhớ nội bộ';
  recovery.state.profile.name = 'Không được sửa bản khôi phục';
  assert.equal(store.getRecovery().state.profile.name, 'Ban đầu');
  assert.equal(store.load().state.profile.name, 'Mới');
});

test('recovery write failure aborts before any primary change', () => {
  const { storage, store } = existing();
  const before = storage.getItem(KEY);
  storage.failKey = RECOVERY;
  assert.throws(() => store.save(ledger('Chưa lưu')), { code: 'RECOVERY_WRITE' });
  assert.equal(storage.getItem(KEY), before);
  assert.equal(store.load().state.profile.name, 'Ban đầu');
});

test('primary write failure retains the old primary and in-memory ledger', () => {
  const { storage, store } = existing();
  const before = storage.getItem(KEY);
  storage.failKey = KEY;
  assert.throws(() => store.save(ledger('Chưa lưu')), { code: 'STORAGE_WRITE' });
  assert.equal(storage.getItem(KEY), before);
  // Force a read failure so this assertion checks the preserved memory state.
  storage.denied = true;
  const result = store.load();
  assert.equal(result.state.profile.name, 'Ban đầu');
  assert.equal(result.raw, before);
  assert.ok(result.issue);
});

test('two tabs cannot silently replace a revision already changed by the other tab', () => {
  const { storage, store } = existing();
  const second = new LedgerStore(storage);
  second.load();
  second.save(ledger('Từ tab thứ hai'));
  const before = storage.getItem(KEY);
  assert.throws(() => store.save(ledger('Thay đổi cũ')), error => {
    assert.equal(error.code, 'CONFLICT');
    assert.equal(error.latestRaw, before);
    assert.equal(error.latestState.profile.name, 'Từ tab thứ hai');
    return true;
  });
  assert.equal(storage.getItem(KEY), before);
  assert.equal(store.refresh().state.profile.name, 'Từ tab thứ hai');
});

test('confirmed import/reset replacement still rejects a stale revision', () => {
  const { storage, store } = existing();
  const imported = ledger('File nhập');
  const newer = JSON.stringify(ledger('Được sửa khi hộp thoại mở'));
  storage.setItem(KEY, newer);
  assert.throws(() => store.save(imported, { replace: true }), { code: 'CONFLICT' });
  assert.equal(storage.getItem(KEY), newer);
});

test('a revision changed during recovery write is checked again before primary write', () => {
  const { storage, store } = existing();
  const newer = JSON.stringify(ledger('Tab khác chen vào'));
  storage.afterWrite = key => {
    if (key === RECOVERY) storage.data.set(KEY, newer);
  };
  assert.throws(() => store.save(ledger('Thay đổi cũ')), { code: 'CONFLICT' });
  assert.equal(storage.getItem(KEY), newer);
});

test('corrupt, missing and unreadable external updates preserve the last good UI state', () => {
  for (const update of ['corrupt', 'missing', 'denied']) {
    const { storage, store } = existing('Dữ liệu cần giữ');
    if (update === 'corrupt') storage.setItem(KEY, 'invalid-json');
    if (update === 'missing') storage.removeItem(KEY);
    if (update === 'denied') storage.denied = true;
    const result = store.refresh();
    assert.equal(result.state.profile.name, 'Dữ liệu cần giữ');
    assert.ok(result.issue);
    assert.throws(() => store.save(ledger('Không được ghi đè')));
    if (update === 'corrupt') assert.equal(storage.getItem(KEY), 'invalid-json');
    if (update === 'missing') assert.equal(storage.getItem(KEY), null);
  }
});

test('explicit replacement after an external deletion preserves the last good memory state as recovery', () => {
  const { storage, store } = existing('Cần khôi phục');
  storage.removeItem(KEY);
  store.refresh();
  store.save(ledger('Sổ mới'), { replace: true });
  assert.equal(store.getRecovery().state.profile.name, 'Cần khôi phục');
});

test('restoreRecovery swaps the current and previous valid snapshots', () => {
  const { store } = existing('Phiên bản A');
  store.save(ledger('Phiên bản B'));
  assert.equal(store.restoreRecovery().profile.name, 'Phiên bản A');
  assert.equal(store.getRecovery().state.profile.name, 'Phiên bản B');
  assert.equal(store.restoreRecovery().profile.name, 'Phiên bản B');
  assert.equal(store.getRecovery().state.profile.name, 'Phiên bản A');
});

test('restoration cannot bypass an external change', () => {
  const { storage, store } = existing('A');
  store.save(ledger('B'));
  const newer = JSON.stringify(ledger('C'));
  storage.setItem(KEY, newer);
  assert.throws(() => store.restoreRecovery(), { code: 'CONFLICT' });
  assert.equal(storage.getItem(KEY), newer);
});

test('invalid or absent recovery metadata is safely rejected', () => {
  const { storage, store } = existing();
  assert.equal(store.getRecovery(), null);
  assert.throws(() => store.restoreRecovery(), { code: 'NO_RECOVERY' });
  for (const raw of ['broken', '{}', JSON.stringify({ version: 1, savedAt: '2026-02-31', state: ledger() }), JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state: { version: 1 } })]) {
    storage.setItem(RECOVERY, raw);
    assert.equal(store.getRecovery(), null);
    assert.throws(() => store.restoreRecovery(), { code: 'NO_RECOVERY' });
  }
});

test('backup metadata is independent, safe on denial, and accepts only canonical timestamps', () => {
  const { storage, store } = existing();
  assert.equal(store.lastBackupAt(), null);
  const raw = storage.getItem(KEY);
  const timestamp = store.markBackup();
  assert.equal(store.lastBackupAt(), timestamp);
  assert.equal(storage.getItem(KEY), raw);
  storage.setItem(BACKUP, '2026-02-31T00:00:00.000Z');
  assert.equal(store.lastBackupAt(), null);
  storage.denied = true;
  assert.equal(store.lastBackupAt(), null);
  assert.equal(store.markBackup(), null);
});

test('no-op saves leave a useful older recovery snapshot intact', () => {
  const { storage, store } = existing('A');
  const current = store.save(ledger('B'));
  const recovery = storage.getItem(RECOVERY);
  const count = storage.writes.length;
  store.save(current);
  assert.equal(storage.getItem(RECOVERY), recovery);
  assert.equal(storage.writes.length, count);
});

test('invalid next state never writes recovery or primary data', () => {
  const { storage, store } = existing();
  const before = storage.getItem(KEY);
  const invalid = ledger();
  invalid.accounts[0].initialBalance = Number.NaN;
  assert.throws(() => store.save(invalid));
  assert.equal(storage.getItem(KEY), before);
  assert.equal(storage.getItem(RECOVERY), null);
});
