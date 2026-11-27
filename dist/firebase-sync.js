/** Optional encrypted, account-scoped Firebase Authentication + Firestore sync.
 * No Firebase is contacted until an owner supplies a web config and signs in.
 * Server-side CAS, onSnapshot and an encrypted local checkpoint prevent silent
 * cross-device overwrites. Independent offline changes require explicit review.
 */
import { validateState } from './finance.js';
import { deriveCloudKey, encryptCloudState, decryptCloudState } from './cloud.js';

export const FIREBASE_CONFIG_KEY = 'money-management:firebase-web-config:v1';
const encoder = new TextEncoder();
const problem = (code, message) => Object.assign(new Error(message), { code });
const sanitize = input => {
  const value = typeof input === 'string' ? JSON.parse(input) : input;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw problem('CONFIG', 'Cấu hình Firebase phải là một đối tượng JSON.');
  const allowed = ['apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket', 'messagingSenderId', 'measurementId'];
  const safe = {};
  for (const key of allowed) {
    if (value[key] != null) {
      if (typeof value[key] !== 'string' || value[key].length > 300 || !value[key].trim()) throw problem('CONFIG', `Trường ${key} không hợp lệ.`);
      safe[key] = value[key].trim();
    }
  }
  if (!safe.apiKey || !safe.authDomain || !safe.projectId || !safe.appId) throw problem('CONFIG', 'Cần apiKey, authDomain, projectId và appId của Firebase Web App.');
  if (!/^[a-z][a-z0-9-]{4,60}$/.test(safe.projectId) || !/^[a-z0-9.-]+$/i.test(safe.authDomain)) throw problem('CONFIG', 'Tên dự án hoặc miền xác thực Firebase không hợp lệ.');
  return safe;
};
export const parseFirebaseConfig = sanitize;
export function loadFirebaseConfig(storage = globalThis.localStorage) {
  try { const raw = storage?.getItem(FIREBASE_CONFIG_KEY); return raw ? sanitize(raw) : null; }
  catch { return null; }
}
export function storeFirebaseConfig(config, storage = globalThis.localStorage) {
  const safe = sanitize(config);
  storage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(safe));
  return safe;
}
export async function fingerprint(state, crypto = globalThis.crypto) {
  const data = encoder.encode(JSON.stringify(validateState(state)));
  if (!crypto?.subtle) throw problem('CRYPTO', 'Trình duyệt chưa có Web Crypto để bảo vệ đồng bộ.');
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
}
const from64 = text => Uint8Array.from(atob(text), x => x.charCodeAt(0));
const b64 = data => btoa(String.fromCharCode(...data));
const metaSafe = (meta, uid, projectId) => Boolean(meta && meta.uid === uid && meta.projectId === projectId
  && Number.isSafeInteger(meta.revision) && meta.revision > 0 && typeof meta.key === 'string'
  && typeof meta.salt === 'string' && typeof meta.fingerprint === 'string');

export class FirebaseLedgerSync {
  constructor({ vault, readState, applyRemote, canApplyRemote = () => true,
    storage = globalThis.localStorage, crypto = globalThis.crypto,
    makeTransport = async config => (await import('./firebase-transport.js')).createFirebaseTransport(config, {
      onAuthChanged: user => this._authChanged(user), onError: error => this._fail(error),
    }), onChange = () => {}, online = () => globalThis.navigator?.onLine !== false } = {}) {
    this.vault = vault; this.readState = readState; this.applyRemote = applyRemote;
    this.canApplyRemote = canApplyRemote; this.storage = storage; this.crypto = crypto;
    this.makeTransport = makeTransport; this.onChange = onChange; this.online = online;
    this.config = loadFirebaseConfig(storage);
    this.transport = null; this.user = null; this.meta = null; this.remote = null;
    this.pendingRemote = null; this._started = false; this._generation = 0; this._incomingSeq = 0;
    this._queue = Promise.resolve(); this._busyPush = false; this._applying = false; this._pendingAfterPush = false;
    this.view = { status: this.config ? 'ready' : 'unconfigured', error: '', email: '', uid: '',
      remoteExists: false, linked: false, dirty: false, conflict: false, revision: 0,
      lastSyncedAt: null, syncing: false, incoming: false };
  }
  status() { return { ...this.view, configured: Boolean(this.config), projectId: this.config?.projectId || '', signedIn: Boolean(this.user), remoteSummary: this.pendingRemote?.state ? {
    transactions: this.pendingRemote.state.transactions.length, accounts: this.pendingRemote.state.accounts.length,
  } : null }; }
  _notify(patch = {}) { Object.assign(this.view, patch); try { this.onChange(this.status()); } catch { /* presentation only */ } return this.status(); }
  _fail(error) { return this._notify({ status: 'error', syncing: false, error: error?.message || 'Không thể kết nối Firebase.' }); }
  async start() {
    if (!this.config || this._started) return this.status();
    this._started = true; this._notify({ status: 'connecting', error: '' });
    try {
      this.transport = await this.makeTransport(this.config);
      // The Firebase auth observer normally fires, but test adapters may expose
      // only currentUser and must still be able to restore a session.
      const user = this.transport.currentUser?.();
      if (user && (!this.user || !this._unsub)) await this._authChanged(user);
      else if (!user && !this.user) this._notify({ status: 'signed-out' });
    } catch (error) { this._started = false; this._fail(error); }
    return this.status();
  }
  async configure(value) {
    const safe = sanitize(value);
    if (this.user) throw problem('AUTH', 'Hãy đăng xuất trước khi đổi dự án Firebase.');
    this.transport?.close?.(); this.transport = null; this._started = false;
    this.config = storeFirebaseConfig(safe, this.storage);
    this._notify({ status: 'ready', error: '' });
    return this.start();
  }
  async signIn(email, password, signUp = false) {
    if (!this.config) throw problem('CONFIG', 'Hãy nhập cấu hình Firebase trước.');
    await this.start();
    if (!this.transport) throw problem('NETWORK', 'Chưa kết nối được SDK Firebase. Hãy kiểm tra mạng.');
    if (typeof email !== 'string' || !email.includes('@') || !password) throw problem('LOGIN', 'Hãy nhập email và mật khẩu tài khoản Firebase.');
    const result = await (signUp ? this.transport.signUp(email.trim(), password) : this.transport.signIn(email.trim(), password));
    const user = result?.user ? { uid: result.user.uid, email: result.user.email || '' } : this.transport.currentUser?.();
    if (user && user.uid !== this.user?.uid) await this._authChanged(user);
    return this.status();
  }
  async resetPassword(email) {
    if (!this.config) throw problem('CONFIG', 'Hãy nhập cấu hình Firebase trước.');
    await this.start();
    if (!this.transport?.resetPassword) throw problem('NETWORK', 'Chưa kết nối được dịch vụ đặt lại mật khẩu Firebase.');
    const address = typeof email === 'string' ? email.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw problem('LOGIN', 'Hãy nhập địa chỉ email hợp lệ để nhận liên kết đặt lại mật khẩu.');
    await this.transport.resetPassword(address);
    return this.status();
  }
  async signOut() {
    ++this._generation; ++this._incomingSeq;
    this._unsub?.(); this._unsub = null;
    await this.transport?.signOut?.();
    this.user = null; this.meta = null; this.remote = null; this.pendingRemote = null;
    return this._notify({ status: 'signed-out', email: '', uid: '', linked: false, remoteExists: false,
      dirty: false, conflict: false, revision: 0, incoming: false, error: '' });
  }
  async _authChanged(user) {
    if (user && this.user?.uid === user.uid && this._unsub) return;
    const generation = ++this._generation;
    ++this._incomingSeq;
    this._unsub?.(); this._unsub = null;
    this.user = user;
    this.remote = null; this.pendingRemote = null;
    this.meta = user && this.vault?.enabled ? this.vault.getMetadata('firebase') : null;
    if (user && !metaSafe(this.meta, user.uid, this.config.projectId)) this.meta = null;
    this._notify({ status: user ? 'checking' : 'signed-out', uid: user?.uid || '', email: user?.email || '',
      linked: Boolean(this.meta), revision: this.meta?.revision || 0, lastSyncedAt: this.meta?.lastSyncedAt || null,
      remoteExists: false, incoming: false, conflict: false, error: '' });
    if (!user || !this.transport) return;
    this._unsub = this.transport.subscribe(user.uid, record => {
      if (generation === this._generation) void this._receive(record).catch(error => this._fail(error));
    }, error => { if (generation === this._generation) this._fail(error); });
    await this.check();
  }
  async check() {
    if (!this.user || !this.transport || !this.online()) return this._notify({ status: 'offline', error: 'Chưa kết nối mạng. Sổ trên thiết bị vẫn lưu bình thường.' });
    const uid = this.user.uid, generation = this._generation;
    try {
      const record = await this.transport.get(uid);
      if (generation === this._generation && this.user?.uid === uid) await this._receive(record);
    } catch (error) { if (generation === this._generation) this._fail(error); }
    return this.status();
  }
  async _receive(remote) {
    if (this._busyPush || this._applying) { this._pendingAfterPush = true; return this.status(); }
    // The subscription and an explicit check may overlap. Only the newest
    // receive is allowed to apply or replace a pending revision.
    const sequence = ++this._incomingSeq;
    const generation = this._generation;
    const uid = this.user?.uid;
    const current = () => sequence === this._incomingSeq && generation === this._generation && this.user?.uid === uid;
    this.remote = remote;
    if (!this.user) return this.status();
    if (!remote) {
      this.pendingRemote = null;
      return this._notify({ status: this.meta ? 'missing-remote' : 'empty-remote', remoteExists: false, incoming: false, error: '' });
    }
    if (!this.meta) return this._notify({ status: 'needs-key', remoteExists: true, revision: remote.revision, incoming: false, error: '' });
    const localHash = await fingerprint(this.readState(), this.crypto);
    if (!current()) return this.status();
    const dirty = localHash !== this.meta.fingerprint;
    const changed = remote.revision !== this.meta.revision;
    if (remote.revision < this.meta.revision) return this._notify({ status: 'conflict', conflict: true,
      incoming: false, remoteExists: true, error: 'Phiên bản cloud thấp hơn bản đã đồng bộ. Không tự khôi phục dữ liệu cũ.' });
    if (!changed) {
      this.pendingRemote = null;
      if (dirty && !this._busyPush) void this.localChanged();
      return this._notify({ status: dirty ? 'pending' : 'synced', remoteExists: true,
        dirty, conflict: false, revision: remote.revision, incoming: false, error: '' });
    }
    const incoming = await decryptCloudState(remote.envelope, this.meta.key, this.crypto);
    if (!current()) return this.status();
    // A user may save another transaction while decrypting the remote snapshot.
    // Recompute after the await: never classify that fresh edit as a clean book.
    const latestHash = await fingerprint(this.readState(), this.crypto);
    if (!current()) return this.status();
    const latestDirty = latestHash !== this.meta.fingerprint;
    this.pendingRemote = { ...remote, state: incoming };
    if (latestDirty) return this._notify({ status: 'conflict', remoteExists: true,
      dirty: true, conflict: true, revision: remote.revision, incoming: true,
      error: 'Hai thiết bị đã thay đổi cùng một sổ. Không có dữ liệu nào bị ghi đè; hãy chọn bản muốn giữ.' });
    if (!this.canApplyRemote()) return this._notify({ status: 'incoming', incoming: true, remoteExists: true,
      error: 'Có dữ liệu mới nhưng đang mở biểu mẫu. Hãy hoàn tất biểu mẫu rồi nhận cập nhật.' });
    return this.useRemote({ automatic: true, expectedRevision: remote.revision });
  }
  async _persistMeta(next) {
    await this.vault.setMetadata('firebase', next);
    this.meta = next;
  }
  /** Explicit connect on a second device. Never import without owner confirmation. */
  async connectCloud(password) {
    if (!this.vault.enabled) throw problem('VAULT', 'Bật mã hóa sổ trên thiết bị trước khi đồng bộ Firebase.');
    if (!this.user) throw problem('LOGIN', 'Hãy đăng nhập Firebase trước.');
    const record = await this.transport.get(this.user.uid);
    if (!record) throw problem('MISSING', 'Chưa có sổ đám mây. Hãy tạo từ thiết bị đang giữ dữ liệu gốc trước.');
    const key = await deriveCloudKey(password, from64(record.envelope.salt), this.crypto);
    const decoded = await decryptCloudState(record.envelope, key, this.crypto);
    this.remote = record;
    this.pendingRemote = { ...record, state: decoded, key, salt: record.envelope.salt };
    return this._notify({ status: 'incoming', remoteExists: true, incoming: true, conflict: false,
      revision: record.revision, error: 'Đã giải mã bản đám mây. Hãy xác nhận nhập hoặc giữ sổ trên máy.' });
  }
  /** Explicitly create the very first cloud revision from this device. */
  async createCloud(password) {
    if (!this.vault.enabled) throw problem('VAULT', 'Bật mã hóa sổ trên thiết bị trước khi dùng Firebase.');
    if (!this.user) throw problem('LOGIN', 'Hãy đăng nhập Firebase trước.');
    if (this.meta) throw problem('LINKED', 'Đã kết nối sổ Firebase.');
    const local = validateState(this.readState());
    const salt = b64(this.crypto.getRandomValues(new Uint8Array(16)));
    const key = await deriveCloudKey(password, from64(salt), this.crypto);
    const envelope = await encryptCloudState(local, key, salt, this.crypto);
    this._notify({ syncing: true, status: 'syncing', error: '' });
    try {
      const record = await this.transport.put(this.user.uid, 0, envelope);
      const meta = { uid: this.user.uid, projectId: this.config.projectId, revision: record.revision,
        salt, key, fingerprint: await fingerprint(local, this.crypto), lastSyncedAt: new Date().toISOString() };
      await this._persistMeta(meta);
      this.remote = record; this.pendingRemote = null;
      return this._notify({ syncing: false, status: 'synced', linked: true, remoteExists: true,
        revision: record.revision, dirty: false, incoming: false, lastSyncedAt: meta.lastSyncedAt, error: '' });
    } catch (error) { this._fail(error); throw error; }
  }
  /** A conflict or new login is resolved only after the owner confirms it. */
  async useRemote({ automatic = false, expectedRevision = null } = {}) {
    if (!this.pendingRemote) throw problem('NO_REMOTE', 'Không có bản mới để nhận.');
    const picked = this.pendingRemote;
    const uid = this.user?.uid;
    const generation = this._generation;
    if (this._applying) return this.status();
    if (!this.canApplyRemote()) return this._notify({ status: 'incoming', incoming: true,
      error: 'Hãy đóng biểu mẫu và thử nhận cập nhật lại.' });
    const before = await fingerprint(this.readState(), this.crypto);
    const target = await fingerprint(picked.state, this.crypto);
    if (!this.meta && !picked.key) throw problem('PASSWORD', 'Cần mật khẩu đám mây để liên kết thiết bị.');
    // Confirm no document, identity or local revision changed during awaits.
    if (generation !== this._generation || uid !== this.user?.uid || this.pendingRemote !== picked
      || (expectedRevision !== null && picked.revision !== expectedRevision)) return this.status();
    if (automatic && before !== this.meta?.fingerprint) return this._notify({ status: 'conflict',
      dirty: true, conflict: true, incoming: true,
      error: 'Sổ trên máy vừa có thay đổi. Đã dừng nhận tự động để tránh ghi đè.' });
    const latest = await fingerprint(this.readState(), this.crypto);
    if (generation !== this._generation || uid !== this.user?.uid || this.pendingRemote !== picked) return this.status();
    if (latest !== before || !this.canApplyRemote()) return this._notify({ status: 'incoming', incoming: true,
      error: 'Sổ đã thay đổi hoặc còn biểu mẫu đang mở. Hãy xem lại dữ liệu trước khi xác nhận nhận bản đám mây.' });
    this._applying = true;
    try {
      if (before !== target && !(await this.applyRemote(picked.state))) throw problem('LOCAL_SAVE', 'Không ghi được sổ đám mây xuống thiết bị. Bản hiện tại chưa bị thay thế.');
      const next = { uid: this.user.uid, projectId: this.config.projectId, revision: picked.revision,
        key: picked.key || this.meta.key, salt: picked.salt || this.meta.salt,
        fingerprint: target, lastSyncedAt: new Date().toISOString() };
      await this._persistMeta(next);
      this.remote = { revision: picked.revision, envelope: picked.envelope };
      this.pendingRemote = null;
      const dirty = (await fingerprint(this.readState(), this.crypto)) !== next.fingerprint;
      const state = this._notify({ status: dirty ? 'pending' : 'synced', linked: true, remoteExists: true,
        dirty, conflict: false, incoming: false, revision: picked.revision,
        lastSyncedAt: next.lastSyncedAt, error: '' });
      if (dirty) void this.localChanged();
      return state;
    } finally {
      this._applying = false;
      if (this._pendingAfterPush && generation === this._generation) {
        this._pendingAfterPush = false;
        void this.check();
      }
    }
  }
  async localChanged() {
    if (!this.meta || !this.user || !this.vault.enabled) return false;
    this._notify({ dirty: true, status: this.online() ? 'pending' : 'offline' });
    const job = this._queue.catch(() => {}).then(() => this._pushLatest());
    this._queue = job.catch(() => {});
    return job;
  }
  async _pushLatest() {
    if (!this.user || !this.meta || this.pendingRemote || !this.online()) return false;
    const local = validateState(this.readState());
    const localHash = await fingerprint(local, this.crypto);
    if (localHash === this.meta.fingerprint) return this._notify({ dirty: false, status: 'synced' });
    this._busyPush = true;
    const generation = this._generation, uid = this.user.uid;
    let conflict = false;
    this._notify({ syncing: true, status: 'syncing', error: '' });
    try {
      const encrypted = await encryptCloudState(local, this.meta.key, this.meta.salt, this.crypto);
      const record = await this.transport.put(uid, this.meta.revision, encrypted);
      if (generation !== this._generation || this.user?.uid !== uid) return false;
      const next = { ...this.meta, revision: record.revision, fingerprint: localHash, lastSyncedAt: new Date().toISOString() };
      await this._persistMeta(next);
      this.remote = record;
      const dirty = (await fingerprint(this.readState(), this.crypto)) !== next.fingerprint;
      this._notify({ status: dirty ? 'pending' : 'synced', syncing: false, dirty, revision: record.revision,
        lastSyncedAt: next.lastSyncedAt, error: '' });
      if (dirty) void this.localChanged();
      return true;
    } catch (error) {
      if (error.code === 'REVISION_CONFLICT') conflict = true;
      else this._fail(error);
      return false;
    } finally {
      this._busyPush = false; this._notify({ syncing: false });
      const needsCheck = conflict || this._pendingAfterPush; this._pendingAfterPush = false;
      if (needsCheck && this.user?.uid === uid && generation === this._generation) void this.check();
    }
  }
  async keepLocal() {
    if (!this.user || !this.meta || !this.pendingRemote) throw problem('NO_CONFLICT', 'Không có xung đột cần xử lý.');
    const current = await this.transport.get(this.user.uid);
    if (!current || current.revision !== this.pendingRemote.revision) throw problem('REMOTE_CHANGED', 'Sổ đám mây tiếp tục thay đổi. Hãy kiểm tra lại trước khi ghi đè.');
    const local = validateState(this.readState());
    const fingerprintLocal = await fingerprint(local, this.crypto);
    const envelope = await encryptCloudState(local, this.meta.key, this.meta.salt, this.crypto);
    const record = await this.transport.put(this.user.uid, current.revision, envelope);
    const next = { ...this.meta, revision: record.revision, fingerprint: fingerprintLocal, lastSyncedAt: new Date().toISOString() };
    await this._persistMeta(next);
    this.pendingRemote = null; this.remote = record;
    const dirty = (await fingerprint(this.readState(), this.crypto)) !== next.fingerprint;
    const status = this._notify({ status: dirty ? 'pending' : 'synced', linked: true, conflict: false, incoming: false,
      dirty, revision: record.revision, lastSyncedAt: next.lastSyncedAt, error: '' });
    if (dirty) void this.localChanged();
    return status;
  }
  async disconnect() {
    ++this._incomingSeq;
    this._unsub?.(); this._unsub = null;
    await this.vault.setMetadata('firebase', null);
    this.meta = null; this.pendingRemote = null; this.remote = null;
    return this._notify({ status: 'needs-key', linked: false, incoming: false, conflict: false,
      error: 'Đã ngắt liên kết sổ Firebase trên thiết bị này. Sổ trên cloud vẫn được giữ.' });
  }
  resume() { return this.check(); }
  flush() { return this._queue; }
}
