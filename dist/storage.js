import { createEmptyState, validateState } from './finance.js';

// Retain the original ledger key so upgrades do not strand an existing book.
const LEDGER_KEY = 'vi-minh:v1';
const RECOVERY_KEY = 'money-management:recovery:v1';
const BACKUP_AT_KEY = 'money-management:backup-at';

function problem(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function parseState(raw) {
  return validateState(JSON.parse(raw));
}

function validTimestamp(value) {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function storageReason(error) {
  return error?.name === 'QuotaExceededError'
    ? 'Bộ nhớ website đã đầy.'
    : 'Trình duyệt chưa cho phép ghi vào bộ nhớ website.';
}

/**
 * Synchronous localStorage repository with optimistic revision checks.
 * A recovery copy is one previous valid ledger in the SAME browser/origin.
 * It is not an off-device backup or a cross-tab database transaction.
 */
export class LedgerStore {
  constructor(storage) {
    try {
      // Accessing the localStorage property itself can throw a SecurityError.
      this._storage = arguments.length ? storage : globalThis.localStorage;
    } catch (error) {
      this._storage = null;
      this._storageAccessError = error;
    }
    this._state = validateState(createEmptyState());
    this._knownRaw = null;
    this._corruptRaw = null;
    this._issue = '';
    this._loaded = false;
    this._hasSeenData = false;
    this._hasValidState = false;
    this._missing = false;
  }

  _read(key) {
    if (!this._storage || typeof this._storage.getItem !== 'function') {
      throw this._storageAccessError || new Error('Bộ nhớ website không khả dụng.');
    }
    return this._storage.getItem(key);
  }

  _write(key, value) {
    if (!this._storage || typeof this._storage.setItem !== 'function') {
      throw this._storageAccessError || new Error('Bộ nhớ website không khả dụng.');
    }
    this._storage.setItem(key, value);
  }

  _result() {
    return {
      state: validateState(this._state),
      raw: this._knownRaw,
      issue: this._issue,
      corruptRaw: this._corruptRaw,
      recoveryAvailable: this.getRecovery() !== null,
    };
  }

  _assertRevision(currentRaw) {
    if (currentRaw === this._knownRaw) return;
    const error = problem(
      'CONFLICT',
      'Sổ đã thay đổi ở tab khác. Hãy xem dữ liệu mới nhất rồi thực hiện lại; thay đổi này chưa được lưu.',
    );
    error.latestRaw = currentRaw;
    error.latestState = null;
    error.latestIssue = currentRaw === null ? 'missing' : 'corrupt';
    if (currentRaw !== null) {
      try {
        error.latestState = parseState(currentRaw);
        error.latestIssue = '';
      } catch { /* Preserve the unreadable bytes for an explicit recovery path. */ }
    }
    throw error;
  }

  /**
   * Read the current revision. Legacy schemas are normalized in memory, then
   * written in the current schema on the next successful explicit save.
   * On external corruption/deletion/read errors, keep the last good UI state.
   */
  load() {
    this._loaded = true;
    let raw;
    try {
      raw = this._read(LEDGER_KEY);
    } catch {
      this._issue = 'Không thể đọc bộ nhớ website. Sổ đang hiển thị chưa được xác nhận là bản lưu hiện tại; các thay đổi chỉ được áp dụng khi lưu thành công.';
      return this._result();
    }

    if (raw === null) {
      if (this._hasSeenData) {
        this._knownRaw = null;
        this._missing = true;
        this._issue = 'Bản lưu trên thiết bị đã bị xóa ở nơi khác. Sổ đang hiển thị được giữ lại trong phiên này. Hãy tải JSON hoặc xác nhận khôi phục trước khi thay thế dữ liệu.';
        return this._result();
      }

      // A fresh installation always starts with an empty personal ledger.
      const empty = validateState(createEmptyState());
      const emptyRaw = JSON.stringify(empty);
      try {
        const latestRaw = this._read(LEDGER_KEY);
        if (latestRaw !== null) {
          // Another tab initialized the ledger while this one was opening.
          return this.load();
        }
        this._write(LEDGER_KEY, emptyRaw);
        this._state = empty;
        this._knownRaw = emptyRaw;
        this._hasSeenData = true;
        this._hasValidState = true;
        this._missing = false;
        this._corruptRaw = null;
        this._issue = '';
      } catch (error) {
        this._issue = `${storageReason(error)} Sổ trống chưa được lưu; hãy cho phép lưu trữ trước khi ghi chép.`;
      }
      return this._result();
    }

    this._knownRaw = raw;
    this._hasSeenData = true;
    this._missing = false;
    try {
      this._state = parseState(raw);
      this._hasValidState = true;
      this._corruptRaw = null;
      this._issue = '';
    } catch {
      this._corruptRaw = raw;
      this._issue = 'Bản lưu trên thiết bị không đọc được. Dữ liệu gốc được giữ nguyên; hãy tải bản gốc hoặc khôi phục từ một bản sao hợp lệ trong Cài đặt.';
    }
    return this._result();
  }

  refresh() {
    return this.load();
  }

  /**
   * Validate, compare the known revision, save a recovery snapshot, then commit.
   * replace authorizes replacing corrupt/missing data; it NEVER bypasses the
   * revision check. A caller must explicitly confirm import/reset/recovery.
   * Returns a detached normalized state only after the primary write succeeds.
   */
  save(next, { replace = false } = {}) {
    const normalized = validateState(next);
    const nextRaw = JSON.stringify(normalized);
    if (!this._loaded) this.load();

    let currentRaw;
    try {
      currentRaw = this._read(LEDGER_KEY);
    } catch (error) {
      throw problem('STORAGE_UNAVAILABLE', 'Không thể đọc bản lưu hiện tại. Thay đổi chưa được lưu; sổ đang có vẫn được giữ nguyên.', error);
    }
    this._assertRevision(currentRaw);

    if (this._corruptRaw !== null && !replace) {
      throw problem('CORRUPT_STORAGE', 'Bản lưu hiện tại bị lỗi và chưa bị ghi đè. Hãy tải bản gốc, rồi xác nhận khôi phục hoặc bắt đầu sổ mới.');
    }
    if (this._missing && !replace) {
      throw problem('MISSING_STORAGE', 'Bản lưu đã bị xóa ở nơi khác. Hãy sao lưu sổ đang hiển thị và xác nhận khôi phục trước khi ghi lại.');
    }

    if (nextRaw === currentRaw && this._corruptRaw === null) {
      this._state = validateState(normalized);
      this._hasValidState = true;
      this._issue = '';
      return normalized;
    }

    let previous = null;
    if (currentRaw !== null) {
      try { previous = parseState(currentRaw); } catch { /* Never use corrupt bytes as a valid recovery. */ }
    }
    if (!previous && this._hasValidState) previous = validateState(this._state);

    if (previous) {
      try {
        this._write(RECOVERY_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state: previous }));
      } catch (error) {
        throw problem('RECOVERY_WRITE', `${storageReason(error)} Không tạo được bản khôi phục trước thay đổi nên thao tác đã dừng. Sổ hiện tại chưa bị thay thế.`, error);
      }
    }

    // Recheck after the separate recovery write to reduce the cross-tab window.
    // localStorage has no atomic compare-and-swap across documents.
    try {
      this._assertRevision(this._read(LEDGER_KEY));
    } catch (error) {
      if (error.code === 'CONFLICT') throw error;
      throw problem('STORAGE_UNAVAILABLE', 'Không thể kiểm tra bản lưu hiện tại. Thay đổi chưa được lưu.', error);
    }

    try {
      this._write(LEDGER_KEY, nextRaw);
    } catch (error) {
      // The primary and in-memory ledger remain unchanged. The recovery slot
      // may now contain that same previous valid ledger, which is still safe.
      throw problem('STORAGE_WRITE', `${storageReason(error)} Thay đổi chưa được lưu; sổ trước đó vẫn được giữ nguyên.`, error);
    }

    this._knownRaw = nextRaw;
    this._state = validateState(normalized);
    this._hasSeenData = true;
    this._hasValidState = true;
    this._missing = false;
    this._corruptRaw = null;
    this._issue = '';
    return normalized;
  }

  getRecovery() {
    try {
      const raw = this._read(RECOVERY_KEY);
      if (raw === null) return null;
      const envelope = JSON.parse(raw);
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)
        || envelope.version !== 1 || !validTimestamp(envelope.savedAt)
        || Object.keys(envelope).some(key => !['version', 'savedAt', 'state'].includes(key))) return null;
      return { state: validateState(envelope.state), savedAt: envelope.savedAt };
    } catch {
      return null;
    }
  }

  /** Call only after the UI confirms replacing the current ledger. */
  restoreRecovery() {
    const recovery = this.getRecovery();
    if (!recovery) throw problem('NO_RECOVERY', 'Không có bản khôi phục hợp lệ trên thiết bị này. Hãy nhập bản sao JSON nếu bạn đã tải xuống trước đó.');
    return this.save(recovery.state, { replace: true });
  }

  /** Records download initiation, not proof that the user saved the file. */
  markBackup() {
    const savedAt = new Date().toISOString();
    try {
      this._write(BACKUP_AT_KEY, savedAt);
      return savedAt;
    } catch {
      return null;
    }
  }

  lastBackupAt() {
    try {
      const savedAt = this._read(BACKUP_AT_KEY);
      return validTimestamp(savedAt) ? savedAt : null;
    } catch {
      return null;
    }
  }
}
