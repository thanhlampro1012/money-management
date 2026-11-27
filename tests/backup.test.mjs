import test from 'node:test';
import assert from 'node:assert/strict';
import { BackupManager, IndexedDBBackupRepository, SNAPSHOT_LIMIT, backupFilename } from '../dist/backup.js';
import { createEmptyState, validateState } from '../dist/finance.js';

const OPTIONS_KEY = 'money-management:backup-options:v1';

class MemoryStorage {
  constructor() { this.values = new Map(); this.denied = false; }
  getItem(key) { if (this.denied) throw new DOMException('Denied', 'SecurityError'); return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.denied) throw new DOMException('Denied', 'SecurityError'); this.values.set(key, value); }
}

class MemoryRepository {
  constructor() { this.entries = []; this.file = null; this.next = 1; this.denied = false; this.quota = false; }
  check() { if (this.denied) throw new DOMException('Denied', 'SecurityError'); }
  async open() { this.check(); }
  async getFile() { this.check(); return this.file ? { ...this.file } : null; }
  async setFile(file) { this.check(); this.file = file ? { ...file } : null; }
  async restoreFileIfCurrent(id, previous) {
    this.check();
    if (this.file?.id !== id) return false;
    this.file = previous ? { ...previous } : null;
    return true;
  }
  async markFileWritten(id, at) { this.check(); if (this.file?.id === id) this.file.lastWriteAt = at; }
  async appendSnapshot(value, limit) {
    this.check();
    if (this.quota) throw new DOMException('Full', 'QuotaExceededError');
    let entry = this.entries.at(-1);
    if (entry?.raw !== value.raw) { entry = { ...value, sequence: this.next++ }; this.entries.push(entry); }
    this.entries = this.entries.slice(-limit);
    return { entry: { ...entry }, count: this.entries.length };
  }
  async listSnapshots() { this.check(); return this.entries.toReversed().map(entry => ({ ...entry })); }
  async getSnapshot(id) { this.check(); const entry = this.entries.find(item => item.id === id); return entry ? { ...entry } : null; }
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

class FileHandle {
  constructor(name = 'money.json') {
    this.kind = 'file'; this.name = name; this.permission = 'granted';
    this.queryCalls = 0; this.permissionRequests = 0; this.started = 0;
    this.committed = []; this.aborted = 0; this.failClose = false; this.gate = null; this.startedSignal = null;
  }
  async queryPermission(options) { assert.equal(options.mode, 'readwrite'); this.queryCalls += 1; return this.permission; }
  async requestPermission(options) { assert.equal(options.mode, 'readwrite'); this.permissionRequests += 1; return this.permission; }
  async createWritable() {
    if (this.permission !== 'granted') throw new DOMException('Denied', 'NotAllowedError');
    this.started += 1;
    const handle = this;
    let pending;
    let aborted = false;
    return {
      async write(value) { pending = value; handle.startedSignal?.resolve(); if (handle.gate) await handle.gate.promise; },
      async close() {
        if (handle.failClose) throw new DOMException('Disk full', 'QuotaExceededError');
        if (!aborted) handle.committed.push(JSON.parse(pending));
      },
      async abort() { aborted = true; handle.aborted += 1; },
    };
  }
}

function state(name = 'Sổ của tôi') {
  const value = createEmptyState('2026-11-27');
  value.profile.name = name;
  return validateState(value);
}

function setup(overrides = {}) {
  const repository = overrides.repository || new MemoryRepository();
  const storage = overrides.storage || new MemoryStorage();
  const handle = overrides.handle || new FileHandle();
  const downloads = [];
  let currentRaw = JSON.stringify(state());
  let id = 0;
  let time = Date.parse('2026-11-27T06:00:00.000Z');
  const manager = new BackupManager({ repository, storage, picker: () => Promise.resolve(handle),
    download: (content, name) => { downloads.push({ state: JSON.parse(content), name }); },
    getCurrentRaw: () => currentRaw, now: () => new Date(time++), makeId: () => `snapshot-${++id}`,
    locks: null, storageManager: null, ...overrides });
  return { manager, repository, storage, handle, downloads,
    setCurrent(value) { currentRaw = typeof value === 'string' || value === null ? value : JSON.stringify(value); },
    getCurrent() { return currentRaw; },
  };
}

test('boot preserves the journal and does not archive an empty/corrupt/missing primary or write files', async () => {
  const repository = new MemoryRepository();
  repository.entries = [{ id: 'old', sequence: 1, savedAt: '2026-11-26T02:00:00.000Z', reason: 'Sổ trước đó', raw: JSON.stringify(state('Có dữ liệu')) }];
  for (const primary of [null, 'broken', JSON.stringify(state())]) {
    const env = setup({ repository }); env.setCurrent(primary);
    await env.manager.init();
    assert.equal(repository.entries.length, 1);
    assert.equal(env.handle.started, 0);
    assert.equal(env.downloads.length, 0);
    assert.equal(env.manager.getStatus().snapshotCount, 1);
    assert.equal(env.manager.getStatus().mode, 'off');
    assert.equal((await env.manager.getSnapshot('old')).state.profile.name, 'Có dữ liệu');
  }
});

test('every valid committed change gets a detached recoverable snapshot, bounded to the latest thirty', async () => {
  const env = setup();
  await env.manager.init();
  for (let i = 0; i < 35; i += 1) {
    const next = state(`Lần ${i}`); env.setCurrent(next);
    await env.manager.record(next, `Thay đổi ${i}`);
    next.profile.name = 'Sửa đối tượng từ bên ngoài';
  }
  const list = await env.manager.listSnapshots();
  assert.equal(list.length, SNAPSHOT_LIMIT);
  assert.equal(list[0].reason, 'Thay đổi 34');
  assert.equal(list.at(-1).reason, 'Thay đổi 5');
  assert.equal(list[0].transactions, 0);
  assert.equal(list[0].accounts, 1);
  const restored = await env.manager.getSnapshot(list[0].id);
  assert.equal(restored.state.profile.name, 'Lần 34');
  restored.state.profile.name = 'Không thay đổi bản gốc';
  assert.equal((await env.manager.getSnapshot(list[0].id)).state.profile.name, 'Lần 34');
  assert.equal(env.downloads.length, 0);
});

test('invalid financial state is rejected before creating any file, download or history snapshot', async () => {
  const env = setup(); await env.manager.init(); env.manager.setDownloadMode(true);
  const invalid = state(); invalid.accounts[0].initialBalance = Number.NaN;
  assert.throws(() => env.manager.record(invalid));
  assert.equal(env.repository.entries.length, 0);
  assert.equal(env.downloads.length, 0);
  assert.equal(env.handle.started, 0);
});

test('download mode initiates synchronously with unique portable names and survives reload', async () => {
  const env = setup(); await env.manager.init(); env.manager.setDownloadMode(true);
  const next = state('Thu nhập'); env.setCurrent(next);
  const pending = env.manager.record(next, 'Thêm thu nhập');
  assert.equal(env.downloads.length, 1, 'download starts before the returned promise is awaited');
  assert.equal(env.downloads[0].state.profile.name, 'Thu nhập');
  assert.match(env.downloads[0].name, /^money-management-backup-.*\.json$/);
  assert.ok(env.manager.getStatus().lastDownloadAt);
  assert.equal(env.manager.getStatus().lastFileWriteAt, null, 'a download is never reported as a confirmed file write');
  await pending;
  const reloaded = setup({ storage: env.storage, repository: env.repository });
  await reloaded.manager.init();
  assert.equal(reloaded.manager.getStatus().downloadEnabled, true);
  assert.equal(reloaded.manager.getStatus().lastDownloadAt, env.manager.getStatus().lastDownloadAt);
  const a = backupFilename(new Date('2026-11-27T06:00:00.123Z'), 'one');
  const b = backupFilename(new Date('2026-11-27T06:00:00.123Z'), 'two');
  assert.notEqual(a, b);
  assert.doesNotMatch(a, /[:/]/);
});

test('file picker opens during the direct call and cancel preserves the selected backup mode', async () => {
  const gate = deferred(); let opened = false;
  const env = setup({ picker: () => { opened = true; return gate.promise; } });
  env.manager.setDownloadMode(true);
  const pending = env.manager.chooseFile(state());
  assert.equal(opened, true);
  gate.resolve(Promise.reject(new DOMException('Cancelled', 'AbortError')));
  const result = await pending;
  assert.equal(result.cancelled, true);
  assert.equal(result.mode, 'download');
  assert.equal(env.repository.file, null);
});

test('selecting a file writes the current ledger, persists the handle and disables automatic downloads', async () => {
  const env = setup(); await env.manager.init(); env.manager.setDownloadMode(true);
  await env.manager.chooseFile(state());
  assert.equal(env.manager.getStatus().mode, 'file');
  assert.equal(env.manager.getStatus().downloadEnabled, false);
  assert.equal(env.manager.getStatus().filePersistent, true);
  assert.equal(env.manager.getStatus().fileState, 'ready');
  assert.ok(env.manager.getStatus().lastFileWriteAt);
  const newer = state('Tiền vừa thêm'); env.setCurrent(newer); await env.manager.record(newer);
  assert.equal(env.handle.committed.at(-1).profile.name, 'Tiền vừa thêm');
  assert.equal(env.downloads.length, 0);
  assert.equal(env.handle.permissionRequests, 0);
  const reloaded = setup({ storage: env.storage, repository: env.repository });
  await reloaded.manager.init();
  assert.equal(reloaded.manager.getStatus().fileName, env.handle.name);
  assert.equal(reloaded.manager.getStatus().fileState, 'ready');
  assert.equal(reloaded.manager.getStatus().lastFileWriteAt, env.manager.getStatus().lastFileWriteAt);
  assert.equal(env.handle.committed.length, 2, 'boot does not write the restored file');
  assert.equal(env.handle.permissionRequests, 0, 'boot never prompts for file permission');
});

test('a picker open during another change saves the actual newest ledger when it resolves', async () => {
  const handle = new FileHandle(); const gate = deferred();
  const env = setup({ handle, picker: () => gate.promise });
  await env.manager.init();
  const pending = env.manager.chooseFile(state('Trước khi chọn'));
  env.setCurrent(state('Mới trong lúc chọn tệp'));
  gate.resolve(handle); await pending;
  assert.equal(handle.committed[0].profile.name, 'Mới trong lúc chọn tệp');
});

test('revoked write permission retains history and requires an explicit reconnect gesture', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const writtenAt = env.manager.getStatus().lastFileWriteAt;
  env.handle.permission = 'prompt';
  const newer = state('Chi tiêu mới'); env.setCurrent(newer); await env.manager.record(newer);
  assert.equal(env.handle.permissionRequests, 0);
  assert.equal(env.handle.committed.length, 1);
  assert.equal(env.manager.getStatus().fileState, 'needs-permission');
  assert.equal(env.manager.getStatus().lastFileWriteAt, writtenAt);
  assert.equal((await env.manager.listSnapshots()).length, 1);
  env.handle.permission = 'granted';
  const permission = env.manager.resumeFilePermission(newer);
  assert.equal(env.handle.permissionRequests, 1, 'permission request starts synchronously in the user action');
  await permission;
  assert.equal(env.handle.committed.at(-1).profile.name, 'Chi tiêu mới');
  assert.equal(env.manager.getStatus().fileState, 'ready');
});

test('denying permission never reports a file write and does not silently switch download mode', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  env.manager.setDownloadMode(true); env.handle.permission = 'denied';
  const before = env.manager.getStatus().lastFileWriteAt;
  await env.manager.resumeFilePermission(state());
  assert.equal(env.manager.getStatus().mode, 'download');
  assert.equal(env.manager.getStatus().filePermission, 'denied');
  assert.equal(env.manager.getStatus().lastFileWriteAt, before);
});

test('resuming permission writes the current ledger, including changes made during the prompt', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const gate = deferred();
  env.handle.requestPermission = () => gate.promise;
  const permission = env.manager.resumeFilePermission(state());
  env.setCurrent(state('Sau khi mở hộp thoại'));
  gate.resolve('granted'); await permission;
  assert.equal(env.handle.committed.at(-1).profile.name, 'Sau khi mở hộp thoại');
});

test('a permission prompt cannot re-enable file mode after a newer choice in another tab', async () => {
  for (const enabled of [false, true]) {
    const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
    const other = setup({ repository: env.repository, storage: env.storage }); await other.manager.init();
    const gate = deferred(); env.handle.requestPermission = () => gate.promise;
    const pending = env.manager.resumeFilePermission(state());
    other.manager.setDownloadMode(enabled);
    gate.resolve('granted');
    const result = await pending;
    assert.equal(result.cancelled, true);
    assert.equal(result.stale, true);
    assert.equal(env.manager.getStatus().mode, enabled ? 'download' : 'off');
    assert.equal(JSON.parse(env.storage.getItem(OPTIONS_KEY)).mode, enabled ? 'download' : 'off');
    assert.equal(env.handle.committed.length, 1);
  }
});

test('shared choice revisions distinguish same-value choices and ABA while a prompt is open', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  env.manager.setDownloadMode(false);
  const other = setup({ repository: env.repository, storage: env.storage }); await other.manager.init();
  for (const aba of [false, true]) {
    const gate = deferred(); env.handle.requestPermission = () => gate.promise;
    const pending = env.manager.resumeFilePermission(state());
    const previousRevision = JSON.parse(env.storage.getItem(OPTIONS_KEY)).revision;
    if (aba) other.manager.setDownloadMode(true);
    other.manager.setDownloadMode(false);
    assert.notEqual(JSON.parse(env.storage.getItem(OPTIONS_KEY)).revision, previousRevision);
    gate.resolve('granted');
    assert.equal((await pending).cancelled, true);
    assert.equal(env.manager.getStatus().mode, 'off');
    assert.equal(env.handle.committed.length, 1);
  }
});

test('a pending picker cannot override a newer local choice or an explicit Off in another tab', async () => {
  for (const local of [true, false]) {
    const gate = deferred(); const env = setup({ picker: () => gate.promise }); await env.manager.init();
    const other = setup({ repository: env.repository, storage: env.storage }); await other.manager.init();
    const pending = env.manager.chooseFile(state());
    (local ? env : other).manager.setDownloadMode(local);
    gate.resolve(env.handle);
    assert.equal((await pending).cancelled, true);
    assert.equal(env.manager.getStatus().mode, local ? 'download' : 'off');
    assert.equal(env.repository.file, null);
    assert.equal(env.handle.committed.length, 0);
  }
});

test('a picker queued behind a slow write rechecks the newer mode before changing the remembered file', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const original = env.repository.file;
  env.handle.gate = deferred(); env.handle.startedSignal = deferred();
  const next = state('Đang ghi'); env.setCurrent(next); const saving = env.manager.record(next);
  await env.handle.startedSignal.promise;
  const replacement = new FileHandle('replacement.json'); env.manager.picker = () => Promise.resolve(replacement);
  const picking = env.manager.chooseFile(next);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(env.manager.getStatus().pendingWrites, 2, 'the file selection has reached the asynchronous queue');
  env.manager.setDownloadMode(true);
  env.handle.gate.resolve();
  await saving;
  assert.equal((await picking).cancelled, true);
  assert.equal(env.repository.file.id, original.id);
  assert.equal(replacement.committed.length, 0);
  assert.equal(env.manager.getStatus().mode, 'download');
});

test('a picker waiting for a shared lock rechecks another tab’s newer choice inside that lock', async () => {
  const entered = deferred(); const released = deferred();
  const env = setup({ locks: { async request(name, options, work) { entered.resolve(); await released.promise; return work(); } } });
  await env.manager.init();
  const other = setup({ repository: env.repository, storage: env.storage }); await other.manager.init();
  const pending = env.manager.chooseFile(state());
  await entered.promise;
  other.manager.setDownloadMode(false);
  released.resolve();
  assert.equal((await pending).cancelled, true);
  assert.equal(env.repository.file, null);
  assert.equal(env.handle.committed.length, 0);
  assert.equal(env.manager.getStatus().mode, 'off');
});

test('a mode choice during handle persistence rolls back only the stale selection metadata', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const original = env.repository.file;
  const other = setup({ repository: env.repository, storage: env.storage }); await other.manager.init();
  const gate = deferred(); const entered = deferred();
  const setFile = env.repository.setFile.bind(env.repository);
  env.repository.setFile = async file => { await setFile(file); entered.resolve(); await gate.promise; };
  const replacement = new FileHandle('replacement.json'); env.manager.picker = () => Promise.resolve(replacement);
  const pending = env.manager.chooseFile(state());
  await entered.promise;
  other.manager.setDownloadMode(true);
  gate.resolve();
  assert.equal((await pending).cancelled, true);
  assert.equal(env.repository.file.id, original.id);
  assert.equal(env.repository.file.handle, original.handle);
  assert.equal(replacement.committed.length, 0);
  assert.equal(env.manager.getStatus().mode, 'download');
});

test('permission completion queued behind a write cannot replace a newer local choice', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  env.handle.gate = deferred(); env.handle.startedSignal = deferred();
  const next = state('Đang ghi'); env.setCurrent(next); const saving = env.manager.record(next);
  await env.handle.startedSignal.promise;
  const pending = env.manager.resumeFilePermission(next);
  await Promise.resolve(); await Promise.resolve();
  env.manager.setDownloadMode(false);
  env.handle.gate.resolve(); await saving;
  assert.equal((await pending).cancelled, true);
  assert.equal(env.manager.getStatus().mode, 'off');
  assert.equal(env.handle.committed.length, 1);
});

test('history-only recording preserves the first pre-upgrade ledger without downloading or writing a file', async () => {
  const env = setup({ getCurrentRaw: undefined }); await env.manager.init(); await env.manager.chooseFile(state());
  const current = state('Sau lần sửa đầu tiên');
  await env.manager.record(current);
  const written = env.handle.committed.length;
  await env.manager.record(state('Sổ trước nâng cấp'), 'Trước thay đổi', { historyOnly: true });
  assert.equal(env.handle.committed.length, written);
  await env.manager.syncFile(current);
  assert.equal(env.handle.committed.at(-1).profile.name, current.profile.name, 'history-only must not replace the current-revision guard');
  assert.equal(env.handle.committed.length, written + 1);
  env.manager.setDownloadMode(true);
  await env.manager.record(current, 'Lưu lịch sử riêng', { historyOnly: true });
  assert.equal(env.downloads.length, 0);
  const summaries = await env.manager.listSnapshots();
  const old = summaries.find(entry => entry.reason === 'Trước thay đổi');
  assert.equal((await env.manager.getSnapshot(old.id)).state.profile.name, 'Sổ trước nâng cấp');
});

test('syncFile catches up an explicitly verified primary without adding history, downloads or a permission prompt', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const next = state('Bản chính mới hơn tệp'); env.setCurrent(next);
  await env.manager.syncFile(next);
  assert.equal(env.handle.committed.at(-1).profile.name, 'Bản chính mới hơn tệp');
  assert.equal(env.repository.entries.length, 0);
  assert.equal(env.downloads.length, 0);
  assert.equal(env.handle.permissionRequests, 0);
  env.manager.setDownloadMode(true);
  await env.manager.syncFile(next);
  assert.equal(env.handle.committed.length, 2);
  assert.equal(env.downloads.length, 0);
  env.manager.setDownloadMode(false);
  await env.manager.syncFile(next);
  assert.equal(env.handle.committed.length, 2);
});

test('syncFile never overwrites a file from a missing, corrupt or newer primary revision', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  for (const primary of [null, 'corrupt', JSON.stringify(state('Mới hơn'))]) {
    env.setCurrent(primary); await env.manager.syncFile(state('Cũ'));
  }
  assert.equal(env.handle.committed.length, 1);
  assert.equal(env.repository.entries.length, 0);
});

test('failed writable close is never counted as success and leaves the previous file intact', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const before = env.manager.getStatus().lastFileWriteAt;
  env.handle.failClose = true;
  const next = state('Chưa sao lưu ra tệp'); env.setCurrent(next); await env.manager.record(next);
  assert.equal(env.manager.getStatus().fileState, 'error');
  assert.ok(env.manager.getStatus().fileIssue);
  assert.equal(env.manager.getStatus().lastFileWriteAt, before);
  assert.equal(env.handle.committed.length, 1);
  assert.equal(env.handle.aborted, 1);
  assert.equal(JSON.parse(env.getCurrent()).profile.name, 'Chưa sao lưu ra tệp', 'the primary saved ledger is not rolled back by backup failure');
  assert.equal((await env.manager.listSnapshots()).length, 1);
});

test('rapid changes retain every journal revision while the external file gets the latest state', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const promises = [];
  for (const name of ['A', 'B', 'C']) { const next = state(name); env.setCurrent(next); promises.push(env.manager.record(next, name)); }
  await Promise.all(promises);
  assert.deepEqual((await env.manager.listSnapshots()).map(entry => entry.reason), ['C', 'B', 'A']);
  assert.deepEqual(env.handle.committed.map(entry => entry.profile.name), ['Sổ của tôi', 'C']);
  assert.equal(env.manager.getStatus().pendingWrites, 0);
});

test('a newer revision during a slow write aborts that stale write before closing', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  env.handle.gate = deferred(); env.handle.startedSignal = deferred();
  const first = state('B'); env.setCurrent(first); const pendingFirst = env.manager.record(first);
  await env.handle.startedSignal.promise;
  const newest = state('C'); env.setCurrent(newest); const pendingNewest = env.manager.record(newest);
  env.handle.gate.resolve();
  await Promise.all([pendingFirst, pendingNewest]);
  assert.equal(env.handle.aborted, 1);
  assert.deepEqual(env.handle.committed.map(entry => entry.profile.name), ['Sổ của tôi', 'C']);
});

test('corrupt or deleted current primary blocks stale queued external writes', async () => {
  for (const primary of ['corrupt', null]) {
    const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
    env.setCurrent(primary); await env.manager.record(state('Dernière copie valide'));
    assert.equal(env.handle.committed.length, 1);
    assert.equal((await env.manager.listSnapshots()).length, 1, 'the last valid submitted revision still remains recoverable');
  }
});

test('history quota failure does not prevent an independent external-file backup', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  env.repository.quota = true;
  const next = state('Đã có tệp độc lập'); env.setCurrent(next); await env.manager.record(next);
  assert.match(env.manager.getStatus().historyIssue, /đầy/);
  assert.equal(env.manager.getStatus().fileState, 'ready');
  assert.equal(env.handle.committed.at(-1).profile.name, 'Đã có tệp độc lập');
});

test('no IndexedDB still permits current-session file backup and clearly reports the persistence limit', async () => {
  const env = setup(); env.repository.denied = true; await env.manager.init();
  assert.equal(env.manager.getStatus().historyAvailable, false);
  await env.manager.chooseFile(state());
  assert.equal(env.handle.committed.length, 1);
  assert.equal(env.manager.getStatus().filePersistent, false);
  assert.match(env.manager.getStatus().fileIssue, /phiên này/);
  const newer = state('Có thể tiếp tục'); env.setCurrent(newer); await env.manager.record(newer);
  assert.equal(env.handle.committed.at(-1).profile.name, 'Có thể tiếp tục');
});

test('download initiation failures remain visible and never advance its timestamp', async () => {
  const env = setup({ download: () => { throw new Error('Browser denied'); } });
  await env.manager.init(); env.manager.setDownloadMode(true);
  const next = state('Mới'); env.setCurrent(next); await env.manager.record(next);
  assert.ok(env.manager.getStatus().downloadIssue);
  assert.equal(env.manager.getStatus().lastDownloadAt, null);
  assert.equal((await env.manager.listSnapshots()).length, 1);
});

test('failed options persistence retains the user choice in memory instead of re-enabling an old mode', async () => {
  const env = setup(); await env.manager.init();
  env.storage.setItem(OPTIONS_KEY, JSON.stringify({ mode: 'off' }));
  env.storage.denied = true;
  env.manager.setDownloadMode(true);
  const next = state('Phiên chưa ghi nhớ'); env.setCurrent(next); await env.manager.record(next);
  assert.equal(env.downloads.length, 1);
  assert.equal(env.manager.getStatus().optionsPersistent, false);
  assert.equal(env.manager.getStatus().mode, 'download');
});

test('download mode pauses the remembered file and disconnecting never erases downloaded/history data', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  env.manager.setDownloadMode(true);
  const next = state('Xuất thành nhiều tệp'); env.setCurrent(next); await env.manager.record(next);
  assert.equal(env.handle.committed.length, 1);
  assert.equal(env.downloads.length, 1);
  assert.equal(env.manager.getStatus().fileState, 'paused');
  await env.manager.disconnectFile();
  assert.equal(env.repository.file, null);
  assert.equal(env.manager.getStatus().mode, 'download');
  assert.equal((await env.manager.listSnapshots()).length, 1);
  await assert.rejects(env.manager.resumeFilePermission(next), { code: 'NO_FILE' });
});

test('disconnecting during an in-flight write cancels the staged old file data and waits for it to settle', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  env.handle.gate = deferred(); env.handle.startedSignal = deferred();
  const next = state('Đang ghi'); env.setCurrent(next); const pending = env.manager.record(next);
  await env.handle.startedSignal.promise;
  const disconnect = env.manager.disconnectFile();
  env.handle.gate.resolve(); await Promise.all([pending, disconnect]);
  assert.equal(env.handle.aborted, 1);
  assert.equal(env.handle.committed.length, 1);
  assert.equal(env.manager.getStatus().fileState, 'unconfigured');
  assert.equal(env.manager.getStatus().mode, 'off');
});

test('another tab disconnecting the shared file prevents a stale tab from writing it again', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const second = setup({ repository: env.repository, storage: env.storage }); await second.manager.init();
  await second.manager.disconnectFile();
  const next = state('Tab cũ'); env.setCurrent(next); await env.manager.record(next);
  assert.equal(env.handle.committed.length, 1);
  assert.equal(env.manager.getStatus().mode, 'off');
});

test('another tab selecting downloads pauses a stale file manager before any later write', async () => {
  const env = setup(); await env.manager.init(); await env.manager.chooseFile(state());
  const second = setup({ repository: env.repository, storage: env.storage }); await second.manager.init();
  second.manager.setDownloadMode(true);
  const next = state('Sao lưu theo lựa chọn mới'); env.setCurrent(next);
  await env.manager.record(next);
  assert.equal(env.handle.committed.length, 1);
  assert.equal(env.downloads.length, 1);
  assert.equal(env.manager.getStatus().fileState, 'paused');
  assert.equal(env.manager.getStatus().mode, 'download');
});

test('a tab opened before file setup adopts the new shared handle and later replacements', async () => {
  const env = setup(); await env.manager.init();
  const second = setup({ repository: env.repository, storage: env.storage }); await second.manager.init();
  await second.manager.chooseFile(state());
  const next = state('Đã kết nối ở tab kia'); env.setCurrent(next); await env.manager.record(next);
  assert.equal(second.handle.committed.at(-1).profile.name, next.profile.name);
  assert.equal(env.manager.getStatus().filePersistent, true);
  assert.equal(env.handle.committed.length, 0);
  const replaced = new FileHandle('another.json');
  second.manager.picker = () => Promise.resolve(replaced);
  await second.manager.chooseFile(state());
  const newest = state('Đã đổi sang tệp khác'); env.setCurrent(newest); await env.manager.record(newest);
  assert.equal(replaced.committed.at(-1).profile.name, newest.profile.name);
  assert.equal(second.handle.committed.at(-1).profile.name, next.profile.name);
  assert.equal(env.manager.getStatus().fileName, 'another.json');
});

test('two managers share the same exclusive file lock and skip older revisions', async () => {
  let chain = Promise.resolve(); let active = 0; let maxActive = 0; let requests = 0;
  const locks = { request(name, options, work) {
    assert.equal(name, 'money-management:backup-file:v1'); assert.equal(options.mode, 'exclusive'); requests += 1;
    const result = chain.then(async () => { active += 1; maxActive = Math.max(maxActive, active); try { return await work(); } finally { active -= 1; } });
    chain = result.catch(() => {}); return result;
  } };
  let raw = JSON.stringify(state());
  const env = setup({ locks, getCurrentRaw: () => raw }); await env.manager.init(); await env.manager.chooseFile(state());
  const second = setup({ locks, repository: env.repository, storage: env.storage, getCurrentRaw: () => raw }); await second.manager.init();
  raw = JSON.stringify(state('Ancien')); const old = env.manager.record(state('Ancien'));
  raw = JSON.stringify(state('Mới nhất')); const latest = second.manager.record(state('Mới nhất'));
  await Promise.all([old, latest]);
  assert.equal(maxActive, 1);
  assert.ok(requests >= 4);
  assert.equal(env.handle.committed.at(-1).profile.name, 'Mới nhất');
  assert.ok(!env.handle.committed.some(entry => entry.profile.name === 'Ancien'));
});

test('tampered history metadata or financial data is never returned as a usable restore', async () => {
  const env = setup(); await env.manager.init();
  const good = state('Hợp lệ'); env.setCurrent(good); await env.manager.record(good);
  env.repository.entries.push({ id: 'invalid', savedAt: '2026-02-31', reason: 'Bad', raw: JSON.stringify(good) });
  env.repository.entries.push({ id: 'bad-finance', savedAt: '2026-11-27T06:00:00.000Z', reason: 'Bad', raw: '{"version":3}' });
  const list = await env.manager.listSnapshots();
  assert.equal(list.length, 1);
  assert.ok(env.manager.getStatus().historyIssue);
  await assert.rejects(env.manager.getSnapshot('invalid'), { code: 'SNAPSHOT_INVALID' });
  await assert.rejects(env.manager.getSnapshot('bad-finance'));
  assert.equal(await env.manager.getSnapshot('not-found'), null);
  assert.equal(JSON.parse(env.getCurrent()).profile.name, 'Hợp lệ');
});

test('duplicate snapshots do not consume recovery history slots', async () => {
  const env = setup(); await env.manager.init();
  const next = state('Không đổi'); env.setCurrent(next);
  await env.manager.record(next); await env.manager.record(next);
  assert.equal((await env.manager.listSnapshots()).length, 1);
});

test('storage persistence is only requested explicitly and denial is not reported as granted', async () => {
  let requests = 0;
  const env = setup({ storageManager: { async persisted() { return false; }, async persist() { requests += 1; return false; } } });
  await env.manager.init(); assert.equal(requests, 0);
  assert.equal(env.manager.getStatus().persistence, 'not-granted');
  await env.manager.requestPersistence();
  assert.equal(requests, 1);
  assert.equal(env.manager.getStatus().persistence, 'not-granted');
});

test('an unavailable IndexedDB factory fails cleanly without a hanging initialization', async () => {
  const repository = new IndexedDBBackupRepository(null);
  await assert.rejects(repository.open(), { code: 'HISTORY_UNAVAILABLE' });
  await assert.rejects(repository.open(), { code: 'HISTORY_UNAVAILABLE' });
});
