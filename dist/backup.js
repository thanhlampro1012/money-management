import { uid, validateState } from './finance.js';

const DATABASE = 'money-management-backups-v1';
const OPTIONS_KEY = 'money-management:backup-options:v1';
const LOCK_NAME = 'money-management:backup-file:v1';
export const SNAPSHOT_LIMIT = 30;

function failure(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function safeGlobal(name) {
  try { return globalThis[name]; } catch { return undefined; }
}

function timestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function normalizedRaw(state) {
  return JSON.stringify(validateState(state));
}

function snapshotValue(value) {
  if (!value || typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value.id)
    || !timestamp(value.savedAt) || typeof value.reason !== 'string' || value.reason.length > 120
    || typeof value.raw !== 'string') throw failure('SNAPSHOT_INVALID', 'Bản phục hồi này không hợp lệ; sổ hiện tại chưa bị thay đổi.');
  return { id: value.id, savedAt: value.savedAt, reason: value.reason, state: validateState(JSON.parse(value.raw)) };
}

function snapshotSummary(value) {
  const entry = snapshotValue(value);
  return { id: entry.id, savedAt: entry.savedAt, reason: entry.reason,
    transactions: entry.state.transactions.length, accounts: entry.state.accounts.length, goals: entry.state.goals.length };
}

export function backupFilename(date = new Date(), id = uid()) {
  const stamp = date.toISOString().replaceAll(':', '-').replace('.', '-');
  return `money-management-backup-${stamp}-${String(id).replace(/[^A-Za-z0-9_-]/g, '').slice(-12)}.json`;
}

function defaultDownload(content, name) {
  const doc = safeGlobal('document');
  if (!doc || !globalThis.URL?.createObjectURL) throw failure('DOWNLOAD_UNAVAILABLE', 'Trình duyệt chưa hỗ trợ tải bản sao tại đây.');
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
  const link = doc.createElement('a');
  link.href = url;
  link.download = name;
  doc.body.append(link);
  try { link.click(); } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

/** The journal and file handle remain device-local. Neither is a cloud backup. */
export class IndexedDBBackupRepository {
  constructor(indexedDB = safeGlobal('indexedDB')) {
    this.indexedDB = indexedDB;
    this.opening = null;
  }

  open() {
    if (this.opening) return this.opening;
    this.opening = new Promise((resolve, reject) => {
      if (!this.indexedDB?.open) { reject(failure('HISTORY_UNAVAILABLE', 'Trình duyệt chưa cho phép tạo lịch sử phục hồi.')); return; }
      let request;
      let settled = false;
      const fail = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      };
      const timer = setTimeout(() => fail(failure('HISTORY_BLOCKED', 'Không mở được lịch sử phục hồi. Hãy đóng các tab cũ của ứng dụng rồi thử lại.')), 5_000);
      try { request = this.indexedDB.open(DATABASE, 1); } catch (error) { fail(error); return; }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('snapshots')) {
          const store = db.createObjectStore('snapshots', { keyPath: 'sequence', autoIncrement: true });
          store.createIndex('id', 'id', { unique: true });
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      request.onerror = () => fail(request.error || new Error('Không mở được IndexedDB.'));
      request.onblocked = () => fail(failure('HISTORY_BLOCKED', 'Một tab cũ đang giữ lịch sử phục hồi. Hãy đóng tab đó rồi thử lại.'));
      request.onsuccess = () => {
        const db = request.result;
        if (settled) { db.close(); return; }
        settled = true;
        clearTimeout(timer);
        db.onversionchange = () => { db.close(); this.opening = null; };
        db.onclose = () => { this.opening = null; };
        resolve(db);
      };
    }).catch(error => { this.opening = null; throw error; });
    return this.opening;
  }

  async _transaction(storeName, mode, work) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      let transaction;
      let result;
      try { transaction = db.transaction(storeName, mode); } catch (error) { reject(error); return; }
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error || failure('HISTORY_WRITE', 'Không ghi được lịch sử phục hồi.'));
      transaction.onerror = () => { /* The abort event is the final transaction outcome. */ };
      try { work(transaction.objectStore(storeName), value => { result = value; }); }
      catch (error) { transaction.abort(); reject(error); }
    });
  }

  getFile() {
    return this._transaction('meta', 'readonly', (store, done) => {
      const request = store.get('file');
      request.onsuccess = () => done(request.result?.value || null);
    });
  }

  setFile(value) {
    return this._transaction('meta', 'readwrite', store => {
      if (value) store.put({ key: 'file', value });
      else store.delete('file');
    });
  }

  restoreFileIfCurrent(id, previous) {
    return this._transaction('meta', 'readwrite', (store, done) => {
      const request = store.get('file');
      request.onsuccess = () => {
        const current = request.result?.value;
        if (current?.id !== id) { done(false); return; }
        if (previous) store.put({ key: 'file', value: previous });
        else store.delete('file');
        done(true);
      };
    });
  }

  markFileWritten(id, savedAt) {
    return this._transaction('meta', 'readwrite', store => {
      const request = store.get('file');
      request.onsuccess = () => {
        if (request.result?.value?.id === id) store.put({ key: 'file', value: { ...request.result.value, lastWriteAt: savedAt } });
      };
    });
  }

  appendSnapshot(snapshot, limit = SNAPSHOT_LIMIT) {
    return this._transaction('snapshots', 'readwrite', (store, done) => {
      const last = store.openCursor(null, 'prev');
      last.onsuccess = () => {
        const countAndPrune = entry => {
          const count = store.count();
          count.onsuccess = () => {
            let excess = Math.max(0, count.result - limit);
            done({ entry, count: Math.min(count.result, limit) });
            if (!excess) return;
            const oldest = store.openCursor();
            oldest.onsuccess = () => {
              const cursor = oldest.result;
              if (cursor && excess > 0) { cursor.delete(); excess -= 1; cursor.continue(); }
            };
          };
        };
        let validDuplicate = false;
        try { validDuplicate = last.result?.value?.raw === snapshot.raw && Boolean(snapshotValue(last.result.value)); } catch { /* Replace an invalid entry with a fresh valid snapshot. */ }
        if (validDuplicate) { countAndPrune(last.result.value); return; }
        const added = store.add(snapshot);
        added.onsuccess = () => countAndPrune({ ...snapshot, sequence: added.result });
      };
    });
  }

  listSnapshots() {
    return this._transaction('snapshots', 'readonly', (store, done) => {
      const entries = [];
      const request = store.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { done(entries); return; }
        entries.push(cursor.value);
        cursor.continue();
      };
    });
  }

  getSnapshot(id) {
    return this._transaction('snapshots', 'readonly', (store, done) => {
      const request = store.index('id').get(id);
      request.onsuccess = () => done(request.result || null);
    });
  }
}

/**
 * Call record only AFTER LedgerStore.save succeeds. File and history errors do
 * not roll back that primary save. File writes close atomically where supported;
 * a download can only be reported as initiated, not as successfully saved by OS.
 */
export class BackupManager {
  constructor(options = {}) {
    const nav = safeGlobal('navigator');
    this.repository = options.repository || new IndexedDBBackupRepository(options.indexedDB);
    this.storage = Object.hasOwn(options, 'storage') ? options.storage : safeGlobal('localStorage');
    this.picker = Object.hasOwn(options, 'picker') ? options.picker : globalThis.showSaveFilePicker?.bind(globalThis);
    this.download = options.download || defaultDownload;
    this.encryptExternal = options.encryptExternal || null;
    this.getCurrentRaw = options.getCurrentRaw;
    this.getCurrentState = options.getCurrentState;
    this.locks = Object.hasOwn(options, 'locks') ? options.locks : nav?.locks;
    this.persistence = Object.hasOwn(options, 'storageManager') ? options.storageManager : nav?.storage;
    this.onChange = options.onChange || (() => {});
    this.now = options.now || (() => new Date());
    this.makeId = options.makeId || uid;
    this.makeRevision = options.makeRevision || uid;
    this._queue = Promise.resolve();
    this._initialization = null;
    this._file = null;
    this._generation = 0;
    this._choiceGeneration = 0;
    this._latestRecordedRaw = null;
    this._optionsDirty = false;
    this._options = { mode: 'off', lastDownloadAt: null, revision: null };
    this._status = {
      initialized: false, historyAvailable: false, historyIssue: '', snapshotCount: 0,
      fileSupported: typeof this.picker === 'function', fileName: '', filePermission: 'prompt',
      fileState: 'unconfigured', fileIssue: '', filePersistent: false, lastFileWriteAt: null,
      optionsPersistent: true, downloadIssue: '', pendingWrites: 0, persistence: 'unknown',
    };
    this._loadOptions();
  }

  _loadOptions() {
    if (this._optionsDirty) return;
    try {
      if (!this.storage?.getItem) { this._status.optionsPersistent = false; return; }
      const raw = this.storage.getItem(OPTIONS_KEY);
      if (!raw) return;
      const value = JSON.parse(raw);
      if (['off', 'file', 'download'].includes(value?.mode)) this._options.mode = value.mode;
      this._options.revision = typeof value?.revision === 'string' ? value.revision : null;
      if (timestamp(value?.lastDownloadAt)) this._options.lastDownloadAt = value.lastDownloadAt;
      if (this._file && this._options.mode !== 'file') this._status.fileState = 'paused';
    } catch { this._status.optionsPersistent = false; }
  }

  _saveOptions({ choice = false } = {}) {
    // Each explicit choice needs its own revision, including Off → Off and ABA.
    // Download timestamps alone must not invalidate a pending user choice.
    if (choice) this._options.revision = this.makeRevision();
    try {
      if (!this.storage?.setItem) throw new Error('Bộ nhớ không khả dụng.');
      this.storage.setItem(OPTIONS_KEY, JSON.stringify(this._options));
      this._status.optionsPersistent = true;
      this._optionsDirty = false;
    } catch { this._status.optionsPersistent = false; this._optionsDirty = true; }
  }

  _sharedChoiceRevision() {
    try {
      if (!this.storage?.getItem) return undefined;
      const raw = this.storage.getItem(OPTIONS_KEY);
      if (raw === null) return null;
      try {
        const value = JSON.parse(raw);
        return JSON.stringify([value?.mode ?? null, value?.revision ?? null]);
      } catch { return raw; }
    } catch { return undefined; }
  }

  _captureChoice() {
    return { local: this._choiceGeneration, generation: this._generation, shared: this._sharedChoiceRevision() };
  }

  _beginChoice() {
    this._loadOptions();
    ++this._choiceGeneration;
    return this._captureChoice();
  }

  _choiceIsCurrent(choice) {
    return choice.local === this._choiceGeneration && choice.generation === this._generation
      && choice.shared === this._sharedChoiceRevision();
  }

  _staleChoice() {
    this._loadOptions();
    this._notify();
    return { ...this.getStatus(), cancelled: true, stale: true };
  }

  _notify() {
    try { this.onChange(this.getStatus()); } catch { /* UI listeners must not cancel a backup. */ }
  }

  getStatus() {
    return { ...this._status, mode: this._options.mode, downloadEnabled: this._options.mode === 'download',
      lastDownloadAt: this._options.lastDownloadAt };
  }

  init() {
    if (this._initialization) return this._initialization;
    this._initialization = this._init();
    return this._initialization;
  }

  async _init() {
    try {
      await this.repository.open?.();
      const entries = await this.repository.listSnapshots();
      const valid = entries.filter(entry => { try { snapshotValue(entry); return true; } catch { return false; } });
      this._status.snapshotCount = valid.length;
      this._status.historyAvailable = true;
      if (valid.length !== entries.length) this._status.historyIssue = 'Có bản phục hồi không đọc được. Các bản hợp lệ vẫn được giữ.';
      this._file = await this.repository.getFile();
      if (this._validFile(this._file)) {
        this._status.filePersistent = true;
        await this._describeFile();
      } else {
        this._file = null;
        if (this._options.mode === 'file') {
          this._status.fileIssue = 'Không còn liên kết đến tệp sao lưu. Hãy chọn lại tệp để tiếp tục tự động lưu.';
          this._status.fileState = 'error';
        }
      }
    } catch (error) {
      this._status.historyIssue = this._historyError(error);
      this._status.historyAvailable = false;
      if (this._options.mode === 'file') {
        this._status.fileState = 'error';
        this._status.fileIssue = 'Không đọc được liên kết tệp sao lưu. Hãy chọn lại tệp hoặc tải JSON.';
      }
    }
    try {
      if (this.persistence?.persisted) this._status.persistence = (await this.persistence.persisted()) ? 'granted' : 'not-granted';
      else this._status.persistence = 'unsupported';
    } catch { this._status.persistence = 'unknown'; }
    this._status.initialized = true;
    this._notify();
    return this.getStatus();
  }

  _validFile(value) {
    return value && typeof value.id === 'string' && value.handle?.kind === 'file'
      && typeof value.handle.createWritable === 'function';
  }

  async _permission(handle) {
    return typeof handle.queryPermission === 'function' ? await handle.queryPermission({ mode: 'readwrite' }) : 'prompt';
  }

  async _describeFile() {
    if (!this._file) return;
    this._status.fileName = String(this._file.handle.name || 'money-management-backup.json');
    this._status.lastFileWriteAt = timestamp(this._file.lastWriteAt) ? this._file.lastWriteAt : null;
    try {
      this._status.filePermission = await this._permission(this._file.handle);
      this._status.fileState = this._options.mode !== 'file' ? 'paused'
        : this._status.filePermission === 'granted' ? 'ready' : 'needs-permission';
    } catch {
      this._status.filePermission = 'prompt';
      this._status.fileState = 'error';
      this._status.fileIssue = 'Không kiểm tra được quyền ghi tệp. Hãy kết nối lại tệp sao lưu.';
    }
  }

  _historyError(error) {
    return error?.name === 'QuotaExceededError'
      ? 'Bộ nhớ lịch sử phục hồi đã đầy. Sổ chính vẫn được giữ; hãy tải bản sao JSON.'
      : error?.message?.startsWith('Một tab cũ') || error?.code === 'HISTORY_BLOCKED'
        ? error.message : 'Chưa tạo được lịch sử phục hồi trên trình duyệt này. Hãy dùng tệp sao lưu JSON.';
  }

  _isCurrent(raw) {
    try {
      if (this.getCurrentRaw) {
        const current = this.getCurrentRaw();
        if (typeof current !== 'string') return false;
        return normalizedRaw(JSON.parse(current)) === raw;
      }
      if (this.getCurrentState) return normalizedRaw(this.getCurrentState()) === raw;
      return this._latestRecordedRaw === null || this._latestRecordedRaw === raw;
    } catch { return false; }
  }

  _currentRaw(fallback) {
    if (this.getCurrentRaw) return normalizedRaw(JSON.parse(this.getCurrentRaw()));
    if (this.getCurrentState) return normalizedRaw(this.getCurrentState());
    return fallback;
  }

  _enqueue(work) {
    this._status.pendingWrites += 1;
    this._notify();
    const next = this._queue.then(work, work).finally(() => {
      this._status.pendingWrites -= 1;
      this._notify();
    });
    // Keep the internal queue usable after a rejected explicit operation.
    this._queue = next.catch(() => {});
    return next;
  }

  /** Synchronous start preserves the click's user activation for downloads. */
  record(state, reason = 'Thay đổi sổ', { historyOnly = false } = {}) {
    const raw = normalizedRaw(state);
    const savedAt = this.now().toISOString();
    const id = this.makeId();
    const entry = { id, savedAt, reason: String(reason || 'Thay đổi sổ').trim().slice(0, 120), raw };
    if (!historyOnly) this._latestRecordedRaw = raw;
    this._loadOptions();
    if (!historyOnly && this._options.mode === 'download' && this._isCurrent(raw)) {
      try {
        this.download(JSON.stringify(JSON.parse(raw), null, 2), backupFilename(new Date(savedAt), id));
        this._options.lastDownloadAt = savedAt;
        this._status.downloadIssue = '';
        this._saveOptions();
      } catch {
        this._status.downloadIssue = 'Không bắt đầu được lượt tải JSON tự động. Hãy dùng nút Tải bản sao JSON.';
      }
      this._notify();
    }
    return this._enqueue(async () => {
      await this.init();
      try {
        const result = await this.repository.appendSnapshot(entry, SNAPSHOT_LIMIT);
        this._status.snapshotCount = result.count;
        this._status.historyAvailable = true;
        this._status.historyIssue = '';
      } catch (error) { this._status.historyIssue = this._historyError(error); }
      // A history failure must not prevent an independent external-file backup.
      if (!historyOnly && this._options.mode === 'file') await this._writeFile(raw);
      return this.getStatus();
    });
  }

  async _withFileLock(work) {
    if (this.locks?.request) return this.locks.request(LOCK_NAME, { mode: 'exclusive' }, work);
    return work();
  }

  /** Boot catch-up only after the caller verified an existing valid primary. */
  syncFile(state) {
    const raw = normalizedRaw(state);
    return this._enqueue(async () => {
      await this.init();
      this._loadOptions();
      if (this._options.mode === 'file') await this._writeFile(raw);
      return this.getStatus();
    });
  }

  async _writeFile(raw) {
    try {
      await this._withFileLock(async () => {
        this._loadOptions();
        if (this._options.mode !== 'file' || !this._isCurrent(raw)) return;
        if (this._status.filePersistent || !this._file) {
          const current = await this.repository.getFile();
          if (!this._validFile(current)) {
            this._file = null;
            this._status.fileName = '';
            this._status.fileState = 'unconfigured';
            this._status.filePersistent = false;
            this._status.lastFileWriteAt = null;
            this._status.fileIssue = 'Liên kết tệp đã được ngắt ở tab khác. Hãy chọn lại tệp nếu muốn tiếp tục sao lưu.';
            return;
          }
          if (current.id !== this._file?.id) {
            this._file = current;
            this._status.filePersistent = true;
            await this._describeFile();
          }
        }
        this._loadOptions();
        if (!this._isCurrent(raw) || this._options.mode !== 'file') return;
        const connection = this._file;
        const generation = this._generation;
        const permission = await this._permission(connection.handle);
        this._status.filePermission = permission;
        if (permission !== 'granted') {
          this._status.fileState = 'needs-permission';
          this._status.fileIssue = 'Tệp chưa được cập nhật. Hãy bấm Cho phép ghi tiếp để cấp lại quyền.';
          return;
        }
        if (!this._isCurrent(raw) || generation !== this._generation || this._options.mode !== 'file') return;
        this._status.fileState = 'writing';
        this._notify();
        let writable;
        try {
          writable = await connection.handle.createWritable();
          const content = this.encryptExternal ? await this.encryptExternal(raw) : JSON.stringify(JSON.parse(raw), null, 2);
          await writable.write(content);
          this._loadOptions();
          if (!this._isCurrent(raw) || generation !== this._generation || this._options.mode !== 'file') {
            await writable.abort?.();
            this._status.fileState = this._options.mode === 'file' ? 'ready' : 'paused';
            return;
          }
          await writable.close();
        } catch (error) {
          try { await writable?.abort?.(); } catch { /* Preserve the original failure. */ }
          throw error;
        }
        const savedAt = this.now().toISOString();
        this._status.lastFileWriteAt = savedAt;
        this._status.fileState = 'ready';
        this._status.fileIssue = this._status.filePersistent ? ''
          : 'Tệp đã được ghi; liên kết chỉ có hiệu lực trong phiên này. Hãy chọn lại tệp sau khi đóng ứng dụng.';
        connection.lastWriteAt = savedAt;
        if (this._status.filePersistent) {
          try { await this.repository.markFileWritten(connection.id, savedAt); }
          catch { this._status.fileIssue = 'Tệp đã được ghi, nhưng chưa ghi nhớ được thời điểm sao lưu sau khi đóng ứng dụng.'; }
        }
      });
    } catch (error) {
      this._status.fileState = error?.name === 'NotAllowedError' ? 'needs-permission' : 'error';
      if (error?.name === 'NotAllowedError') this._status.filePermission = 'prompt';
      this._status.fileIssue = error?.name === 'NotAllowedError'
        ? 'Quyền ghi tệp đã hết hoặc bị thu hồi. Hãy bấm Cho phép ghi tiếp.'
        : 'Không ghi được tệp sao lưu. Sổ đã lưu trên thiết bị; hãy kết nối lại tệp hoặc tải JSON.';
    }
    this._notify();
  }

  /** Call directly in a click handler: the picker opens BEFORE any await. */
  chooseFile(state) {
    const raw = normalizedRaw(state);
    if (!this._status.fileSupported) return Promise.reject(failure('FILE_UNSUPPORTED', 'Trình duyệt này chưa hỗ trợ cập nhật một tệp đã chọn. Bạn có thể bật tải JSON sau mỗi thay đổi.'));
    const choice = this._beginChoice();
    let selection;
    try {
      selection = this.picker({ suggestedName: 'money-management-backup.json',
        types: [{ description: 'Bản sao Money Management', accept: { 'application/json': ['.json'] } }],
        excludeAcceptAllOption: true });
    } catch (error) { return Promise.reject(error); }
    return Promise.resolve(selection).then(async handle => {
      await this.init();
      if (!this._choiceIsCurrent(choice)) return this._staleChoice();
      if (!this._validFile({ id: 'selected', handle })) throw failure('FILE_INVALID', 'Tệp được chọn chưa hỗ trợ ghi sao lưu.');
      const connection = { id: this.makeId(), handle, lastWriteAt: null };
      return this._enqueue(async () => {
        let committedChoice;
        await this._withFileLock(async () => {
          if (!this._choiceIsCurrent(choice)) return;
          let previous = null;
          let persisted = false;
          try { previous = await this.repository.getFile(); } catch { /* A session-only link can still work. */ }
          if (!this._choiceIsCurrent(choice)) return;
          try { await this.repository.setFile(connection); persisted = true; } catch { /* Report session-only below. */ }
          if (!this._choiceIsCurrent(choice)) {
            if (persisted) {
              try { await this.repository.restoreFileIfCurrent(connection.id, previous); }
              catch { this._status.fileIssue = 'Chưa khôi phục được liên kết tệp sau thay đổi ở tab khác. Hãy kiểm tra lại tệp đang chọn.'; }
            }
            return;
          }
          ++this._generation;
          this._file = connection;
          this._status.filePersistent = persisted;
          this._status.fileIssue = persisted ? '' : 'Liên kết tệp chỉ có hiệu lực trong phiên này. Hãy chọn lại tệp sau khi đóng ứng dụng.';
          this._options.mode = 'file';
          this._saveOptions({ choice: true });
          committedChoice = this._captureChoice();
          await this._describeFile();
        });
        if (!committedChoice || !this._choiceIsCurrent(committedChoice)) return this._staleChoice();
        // Prefer the current ledger if the user changed it while the picker was open.
        let currentRaw;
        try {
          currentRaw = this._currentRaw(raw);
        } catch { this._status.fileState = 'error'; this._status.fileIssue = 'Sổ hiện tại chưa đọc được. Chưa ghi dữ liệu vào tệp.'; return this.getStatus(); }
        await this._writeFile(currentRaw);
        return this._choiceIsCurrent(committedChoice) ? this.getStatus() : this._staleChoice();
      });
    }).catch(error => {
      if (error?.name === 'AbortError') return { ...this.getStatus(), cancelled: true };
      throw error;
    });
  }

  /** Explicit gesture only. init/record never request permission themselves. */
  resumeFilePermission(state) {
    const raw = normalizedRaw(state);
    if (!this._file) return Promise.reject(failure('NO_FILE', 'Hãy chọn tệp sao lưu trước.'));
    const connection = this._file;
    const choice = this._beginChoice();
    let permission;
    try {
      permission = typeof connection.handle.requestPermission === 'function'
        ? connection.handle.requestPermission({ mode: 'readwrite' }) : this._permission(connection.handle);
    } catch (error) { return Promise.reject(error); }
    return Promise.resolve(permission).then(async result => {
      if (connection !== this._file || !this._choiceIsCurrent(choice)) return this._staleChoice();
      this._status.filePermission = result;
      if (result !== 'granted') {
        this._status.fileState = 'needs-permission';
        this._status.fileIssue = 'Bạn chưa cấp quyền ghi; tệp sao lưu chưa được cập nhật.';
        this._notify();
        return this.getStatus();
      }
      return this._enqueue(async () => {
        let committedChoice;
        await this._withFileLock(async () => {
          if (connection !== this._file || !this._choiceIsCurrent(choice)) return;
          ++this._generation;
          this._options.mode = 'file';
          this._saveOptions({ choice: true });
          committedChoice = this._captureChoice();
        });
        if (!committedChoice || !this._choiceIsCurrent(committedChoice)) return this._staleChoice();
        let currentRaw;
        try { currentRaw = this._currentRaw(raw); }
        catch {
          this._status.fileState = 'error';
          this._status.fileIssue = 'Sổ hiện tại chưa đọc được. Chưa ghi dữ liệu vào tệp.';
          return this.getStatus();
        }
        await this._writeFile(currentRaw);
        return this._choiceIsCurrent(committedChoice) ? this.getStatus() : this._staleChoice();
      });
    });
  }

  async disconnectFile() {
    this._beginChoice();
    ++this._generation;
    this._file = null;
    if (this._options.mode === 'file') this._options.mode = 'off';
    this._saveOptions({ choice: true });
    const choice = this._captureChoice();
    await this.flush();
    if (!this._choiceIsCurrent(choice)) return this._staleChoice();
    this._file = null;
    try { await this._withFileLock(() => this._choiceIsCurrent(choice) ? this.repository.setFile(null) : undefined); }
    catch {
      this._status.fileIssue = 'Đã dừng ghi ở phiên này, nhưng chưa xóa được liên kết tệp đã ghi nhớ.';
      this._notify();
      return this.getStatus();
    }
    if (!this._choiceIsCurrent(choice)) return this._staleChoice();
    Object.assign(this._status, { fileName: '', filePermission: 'prompt', fileState: 'unconfigured', fileIssue: '',
      filePersistent: false, lastFileWriteAt: null });
    this._notify();
    return this.getStatus();
  }

  setDownloadMode(enabled) {
    this._beginChoice();
    ++this._generation;
    this._options.mode = enabled ? 'download' : 'off';
    this._status.downloadIssue = '';
    this._saveOptions({ choice: true });
    if (this._file) this._status.fileState = 'paused';
    this._notify();
    return this.getStatus();
  }

  async requestPersistence() {
    try {
      this._status.persistence = this.persistence?.persist
        ? (await this.persistence.persist() ? 'granted' : 'not-granted') : 'unsupported';
    } catch { this._status.persistence = 'unknown'; }
    this._notify();
    return this.getStatus();
  }

  async listSnapshots() {
    await this.init();
    await this.flush();
    try {
      const entries = await this.repository.listSnapshots();
      const summaries = [];
      for (const entry of entries) {
        try { summaries.push(snapshotSummary(entry)); }
        catch { this._status.historyIssue = 'Có bản phục hồi không đọc được. Các bản hợp lệ vẫn được giữ.'; }
      }
      this._status.snapshotCount = summaries.length;
      this._status.historyAvailable = true;
      return summaries;
    } catch (error) { this._status.historyIssue = this._historyError(error); return []; }
  }

  async getSnapshot(id) {
    await this.init();
    await this.flush();
    const value = await this.repository.getSnapshot(id);
    return value ? snapshotValue(value) : null;
  }

  flush() { return this._queue; }
}
