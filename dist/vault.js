/**
 * Optional, password-unlocked encryption for the ledger and recovery history.
 * WebCrypto AES-256-GCM + PBKDF2-SHA256. Never stores a plaintext password/key.
 * A synced/cloud backup is a separate feature implemented in cloud.js.
 */
import { IndexedDBBackupRepository } from './backup.js';

export const VAULT_KEY = 'money-management:vault:v1';
const PRIMARY_KEY = 'vi-minh:v1';
const RECOVERY_KEY = 'money-management:recovery:v1';
const PROTECTED_KEYS = [PRIMARY_KEY, RECOVERY_KEY];
const KDF_ITERATIONS = 420_000;
const CONTEXT = 'Money Management encrypted vault v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function b64(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text = '';
  for (let i = 0; i < data.length; i += 0x6000) text += String.fromCharCode(...data.subarray(i, i + 0x6000));
  return btoa(text);
}
function unb64(text) {
  if (typeof text !== 'string' || text.length > 30_000_000) throw new Error('Bản mã hóa không hợp lệ.');
  return Uint8Array.from(atob(text), x => x.charCodeAt(0));
}
function problem(code, message) {
  const error = new Error(message); error.code = code; return error;
}
function assertCrypto(crypto = globalThis.crypto) {
  if (!crypto?.subtle || !crypto?.getRandomValues) throw problem('NO_CRYPTO', 'Trình duyệt chưa hỗ trợ mã hóa an toàn. Hãy dùng phiên bản HTTPS hiện đại.');
  return crypto;
}
async function makeKey(password, salt, iterations, crypto) {
  if (typeof password !== 'string' || password.length < 12) throw problem('SHORT_PASSWORD', 'Mật khẩu mã hóa phải có ít nhất 12 ký tự.');
  if (!(salt instanceof Uint8Array) || salt.length !== 16 || !Number.isInteger(iterations) || iterations < 250_000 || iterations > 2_000_000) throw problem('BAD_FORMAT', 'Thông tin dẫn xuất khóa không hợp lệ.');
  const source = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations, hash:'SHA-256' }, source,
    { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}
async function seal(key, plaintext, label, crypto) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:encoder.encode(`${CONTEXT}:${label}`)}, key, encoder.encode(plaintext));
  return { nonce:b64(iv), ciphertext:b64(bytes) };
}
async function unseal(key, ciphertext, label, crypto) {
  if (!ciphertext || typeof ciphertext !== 'object' || typeof ciphertext.nonce !== 'string' || typeof ciphertext.ciphertext !== 'string') throw problem('BAD_FORMAT', 'Bản mã hóa không hợp lệ.');
  const iv = unb64(ciphertext.nonce), bytes = unb64(ciphertext.ciphertext);
  if (iv.length !== 12 || bytes.length < 16) throw problem('BAD_FORMAT', 'Bản mã hóa đã bị hỏng.');
  try {
    return decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM', iv, additionalData:encoder.encode(`${CONTEXT}:${label}`)}, key, bytes));
  } catch { throw problem('BAD_PASSWORD', 'Mật khẩu không đúng hoặc bản mã hóa bị hỏng. Sổ chưa bị thay đổi.'); }
}
function parseVault(raw) {
  let value;
  try { value = JSON.parse(raw); } catch { throw problem('BAD_FORMAT', 'Bản lưu mã hóa bị hỏng. Hãy giữ nguyên dữ liệu để phục hồi.'); }
  if (!value || value.version !== 1 || typeof value.salt !== 'string' || !value.payload) throw problem('BAD_FORMAT', 'Không đọc được định dạng sổ mã hóa.');
  return value;
}
function validatePayload(raw) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw problem('BAD_FORMAT', 'Nội dung sổ mã hóa không hợp lệ.'); }
  if (!parsed || parsed.version !== 1 || !parsed.values || typeof parsed.values !== 'object' || !parsed.metadata || typeof parsed.metadata !== 'object') throw problem('BAD_FORMAT', 'Nội dung sổ mã hóa bị hỏng.');
  for (const key of PROTECTED_KEYS) if (parsed.values[key] != null && typeof parsed.values[key] !== 'string') throw problem('BAD_FORMAT', 'Bản lưu sổ có cấu trúc không hợp lệ.');
  return parsed;
}

export class LocalVault {
  constructor(options = {}) {
    let storage = options.storage;
    if (!Object.hasOwn(options, 'storage')) try { storage = globalThis.localStorage; } catch { storage = null; }
    const crypto = options.crypto || globalThis.crypto;
    const locks = options.locks === undefined ? globalThis.navigator?.locks : options.locks;
    this.storage = storage;
    this.crypto = crypto;
    this.locks = locks;
    this.enabled = false;
    this.key = null;
    this.salt = null;
    this.raw = null;
    this.values = {};
    this.committedValues = {};
    this.metadata = {};
    this.committedMetadata = {};
    this._queue = Promise.resolve();
    this.adapter = {
      getItem: k => this._get(k),
      setItem: (k,v) => this._set(k,v),
      removeItem: k => this._remove(k),
    };
  }
  configured() { try { return this.storage?.getItem(VAULT_KEY) !== null && this.storage?.getItem(VAULT_KEY) !== undefined; } catch { return false; } }
  _get(key) {
    if (this.enabled && PROTECTED_KEYS.includes(key)) return this.values[key] ?? null;
    return this.storage.getItem(key);
  }
  _set(key,value) {
    if (this.enabled && PROTECTED_KEYS.includes(key)) { this.values[key] = String(value); return; }
    this.storage.setItem(key, String(value));
  }
  _remove(key) {
    if (this.enabled && PROTECTED_KEYS.includes(key)) { delete this.values[key]; return; }
    this.storage.removeItem(key);
  }
  getMetadata(name) { return structuredClone(this.metadata[name] ?? null); }
  async open(password) {
    assertCrypto(this.crypto);
    const raw = this.storage.getItem(VAULT_KEY);
    if (raw === null) throw problem('NO_VAULT', 'Thiết bị chưa có sổ được mã hóa.');
    const envelope = parseVault(raw);
    const salt = unb64(envelope.salt);
    const key = await makeKey(password, salt, envelope.iterations, this.crypto);
    const decrypted = validatePayload(await unseal(key, envelope.payload, 'ledger', this.crypto));
    this.salt = salt; this.key = key; this.raw = raw;
    this.enabled = true;
    this.values = { ...decrypted.values };
    this.committedValues = { ...this.values };
    this.metadata = structuredClone(decrypted.metadata);
    this.committedMetadata = structuredClone(this.metadata);
    // A previous interrupted migration may leave cleartext copies behind.
    // Only clear after successfully unlocking and verifying the encrypted copy.
    for (const entry of PROTECTED_KEYS) this.storage.removeItem(entry);
    return true;
  }
  async enable(password) {
    if (this.enabled) throw problem('ALREADY_ENABLED','Sổ đã được mã hóa.');
    const crypto = assertCrypto(this.crypto);
    if (this.storage.getItem(VAULT_KEY) !== null) throw problem('ALREADY_CONFIGURED','Đã tìm thấy sổ mã hóa. Hãy mở khóa thay vì ghi đè.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await makeKey(password, salt, KDF_ITERATIONS, crypto);
    const values = Object.fromEntries(PROTECTED_KEYS.map(k=>[k,this.storage.getItem(k)]));
    if (!values[PRIMARY_KEY]) throw problem('NO_LEDGER','Không thấy sổ chính hợp lệ để mã hóa.');
    // Verify the source before any write. Source data remains unchanged on failure.
    const { validateState } = await import('./finance.js');
    validateState(JSON.parse(values[PRIMARY_KEY]));
    if (values[RECOVERY_KEY]) JSON.parse(values[RECOVERY_KEY]);
    const metadata = {};
    const payload = await seal(key, JSON.stringify({version:1, values, metadata}), 'ledger', crypto);
    const raw = JSON.stringify({version:1, salt:b64(salt), iterations:KDF_ITERATIONS, payload});
    // Verify a complete round-trip before removing cleartext originals.
    validatePayload(await unseal(key, payload, 'ledger', crypto));
    this.storage.setItem(VAULT_KEY, raw);
    this.salt=salt; this.key=key; this.raw=raw; this.enabled=true;
    this.values=values; this.committedValues={...values};this.metadata=metadata;this.committedMetadata={};
    for (const entry of PROTECTED_KEYS) this.storage.removeItem(entry);
    return true;
  }
  async _withLock(work) {
    if (this.locks?.request) return this.locks.request('money-management:secure-ledger:v1', {mode:'exclusive'}, work);
    return work();
  }
  /** Commit the primary and recovery state atomically as one encrypted record. */
  flush() {
    if (!this.enabled) return Promise.resolve();
    const currentValues = { ...this.values }, currentMetadata = structuredClone(this.metadata);
    const pending = this._queue.catch(()=>{}).then(() => this._withLock(async () => {
      if (this.storage.getItem(VAULT_KEY) !== this.raw) throw problem('CONFLICT', 'Sổ đã thay đổi trên tab khác. Bản ghi mới không được thay thế; hãy tải lại dữ liệu.');
      const plaintext = JSON.stringify({version:1, values:currentValues, metadata:currentMetadata});
      const encrypted = await seal(this.key, plaintext, 'ledger', this.crypto);
      const raw = JSON.stringify({version:1, salt:b64(this.salt), iterations:KDF_ITERATIONS, payload:encrypted});
      if (this.storage.getItem(VAULT_KEY) !== this.raw) throw problem('CONFLICT', 'Sổ đã thay đổi trên tab khác. Bản ghi mới chưa được lưu.');
      this.storage.setItem(VAULT_KEY,raw);
      this.raw = raw;
      this.committedValues = currentValues;
      this.committedMetadata = currentMetadata;
    }));
    this._queue = pending.catch(()=>{});
    return pending;
  }
  rollback() {
    this.values={...this.committedValues};
    this.metadata=structuredClone(this.committedMetadata);
  }
  async refresh() {
    if (!this.enabled) return;
    await this._queue;
    const raw = this.storage.getItem(VAULT_KEY);
    if (raw === this.raw) return false;
    if (raw === null) throw problem('MISSING', 'Bản lưu mã hóa đã bị xóa ở tab khác; không tự tạo sổ mới.');
    const outer = parseVault(raw);
    if (outer.salt !== b64(this.salt)) throw problem('NEW_PASSWORD', 'Sổ đã được đổi mật khẩu trên tab khác. Hãy tải lại trang và mở khóa.');
    const contents = validatePayload(await unseal(this.key, outer.payload, 'ledger', this.crypto));
    this.raw=raw;this.values={...contents.values};this.committedValues={...this.values};
    this.metadata=contents.metadata;this.committedMetadata=structuredClone(contents.metadata);
    return true;
  }
  async setMetadata(name, value) {
    if (!this.enabled) throw problem('VAULT_REQUIRED','Bật mã hóa sổ trước khi lưu kết nối đám mây.');
    const previous = structuredClone(this.metadata);
    if (value === null) delete this.metadata[name]; else this.metadata[name] = structuredClone(value);
    try { await this.flush(); }
    catch(error){ this.metadata=previous; throw error; }
  }
  async encryptSnapshot(raw) {
    if (!this.enabled) return raw;
    return 'mmenc1:' + JSON.stringify(await seal(this.key, raw, 'snapshot', this.crypto));
  }
  async decryptSnapshot(raw) {
    if (!raw?.startsWith('mmenc1:')) return raw;
    if (!this.enabled) throw problem('VAULT_REQUIRED','Cần mở khóa để đọc lịch sử mã hóa.');
    return unseal(this.key, JSON.parse(raw.slice(7)), 'snapshot', this.crypto);
  }
  async encryptExport(raw) {
    if (!this.enabled) throw problem('VAULT_REQUIRED','Cần mở khóa sổ.');
    const encrypted = await seal(this.key, raw, 'export', this.crypto);
    return JSON.stringify({format:'money-management-export-encrypted-v1',salt:b64(this.salt),iterations:KDF_ITERATIONS,payload:encrypted},null,2);
  }
  async decryptExport(file,password) {
    if (file?.format !== 'money-management-export-encrypted-v1') throw problem('BAD_FORMAT','Không phải bản sao JSON mã hóa hợp lệ.');
    const key = await makeKey(password, unb64(file.salt), file.iterations, assertCrypto(this.crypto));
    return unseal(key,file.payload,'export',this.crypto);
  }
}

/** Encrypt history before it reaches IndexedDB. Preserves the backup repository API. */
export class EncryptedBackupRepository extends IndexedDBBackupRepository {
  constructor(vault, indexedDB){super(indexedDB);this.vault=vault;}
  async appendSnapshot(value,limit) {
    const raw=await this.vault.encryptSnapshot(value.raw);
    return super.appendSnapshot({...value,raw},limit);
  }
  async listSnapshots() {
    const entries=await super.listSnapshots();
    return Promise.all(entries.map(async x=>({...x,raw:await this.vault.decryptSnapshot(x.raw)})));
  }
  async getSnapshot(id) {
    const entry=await super.getSnapshot(id);
    return entry?{...entry,raw:await this.vault.decryptSnapshot(entry.raw)}:null;
  }
  async migratePlaintext() {
    if(!this.vault.enabled) return;
    const entries=await super.listSnapshots();
    const pending=await Promise.all(entries.filter(e=>!e.raw.startsWith('mmenc1:')).map(async e=>({...e,raw:await this.vault.encryptSnapshot(e.raw)})));
    if(!pending.length)return;
    await this._transaction('snapshots','readwrite',store=>{for(const entry of pending)store.put(entry);});
  }
}

/** Unlock prompt runs before the app opens, without exposing any financial data. */
export async function unlockVaultBeforeApp(vault, { document=globalThis.document } = {}) {
  if(!vault.configured()) return;
  const element=document.getElementById('app');
  if(!element)throw problem('NO_APP','Không tìm thấy khung ứng dụng.');
  return new Promise(resolve=>{
    element.innerHTML=`<main class="vault-unlock"><form id="vault-unlock-form" class="vault-unlock-card"><img src="./icons/icon-192.png" alt="" width="64" height="64"><h1>Mở khóa Money Management</h1><p>Sổ chi tiêu trên thiết bị được mã hóa. Nhập mật khẩu để mở. Ứng dụng không lưu hoặc gửi mật khẩu này đi.</p><label for="vault-unlock-password">Mật khẩu mã hóa</label><input id="vault-unlock-password" type="password" autocomplete="current-password" required minlength="12"><p id="vault-unlock-error" role="alert" class="field-error"></p><button type="submit" class="btn primary">Mở sổ</button><p class="helper-text">Quên mật khẩu? Bạn cần bản sao JSON được lưu trước khi bật mã hóa. Không thể đặt lại mật khẩu để giải mã dữ liệu cũ.</p></form></main>`;
    const form=document.getElementById('vault-unlock-form'), input=document.getElementById('vault-unlock-password');
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const button=form.querySelector('button');button.disabled=true;
      document.getElementById('vault-unlock-error').textContent='Đang giải mã…';
      try{await vault.open(input.value);input.value='';element.replaceChildren();resolve();}
      catch(error){document.getElementById('vault-unlock-error').textContent=error.message||'Không mở khóa được.';}
      finally{button.disabled=false;}
    });
    input.focus();
  });
}
