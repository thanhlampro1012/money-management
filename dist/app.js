import { getCategories, createEmptyState, createDemoState, localDate, monthKey, shiftMonth, daysInMonth, isValidDate, formatMoney, formatCompact, validateState, deriveMonthly, accountBalance, allTimeBalance, filterTransactions, createRecurringTransaction, skipRecurringOccurrence, uid } from './finance.js';

import { LedgerStore } from './storage.js';
import { makeExcel, EXCEL_MIME, excelFilename } from './export.js';
import { initTheme, getThemePreference, getResolvedTheme, setThemePreference } from './theme.js';
import { BackupManager } from './backup.js';
import { LocalVault, EncryptedBackupRepository, unlockVaultBeforeApp, VAULT_KEY } from './vault.js';
import { GitHubCloudSync } from './cloud.js';
import { parseVndAmount, formatVndInput } from './input.js';
import { initPwa, renderPwaSettings } from './pwa.js';

initTheme();
const vault = new LocalVault();
await unlockVaultBeforeApp(vault);
const secureStorage = vault.adapter;
let ledger = new LedgerStore(secureStorage);
const KEY = 'vi-minh:v1';
const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paths = {
  wallet:'M20 8V5a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v11H6a3 3 0 0 1-3-3V6m17 6h-5v5h5m-3-2.5h.01',
  grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  exchange:'M5 7h14m-4-4 4 4-4 4M19 17H5m4-4-4 4 4 4',
  pie:'M12 3v9h9A9 9 0 1 1 12 3Zm4 0a9 9 0 0 1 5 5h-5Z',
  target:'M21 12a9 9 0 1 1-9-9m0 4a5 5 0 1 0 5 5m-5 0 9-9m-5 0h5v5',
  chart:'M4 3v17h17M8 14l4-5 4 3 5-7',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m-2-5h4l.7 3 2.6 1.5 3-.8 2 3.5-2.3 2.1v3l2.3 2.1-2 3.5-3-.8-2.6 1.5-.7 3h-4l-.7-3-2.6-1.5-3 .8-2-3.5 2.3-2.1v-3L1.7 10l2-3.5 3 .8L9.3 6Z',
  plus:'M12 5v14M5 12h14', chevron:'m9 5 7 7-7 7', chevronLeft:'m15 5-7 7 7 7', down:'m6 9 6 6 6-6',
  close:'m6 6 12 12M18 6 6 18', menu:'M4 6h16M4 12h16M4 18h16', search:'M21 21l-5-5M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  edit:'m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z', trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  check:'m5 12 4 4L19 6', shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Zm-4 9 3 3 5-5',
  income:'M12 4v16m-6-6 6 6 6-6M4 4h16', expense:'M12 20V4m-6 6 6-6 6 6M4 20h16',
  moon:'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z', sun:'M12 3V1m0 22v-2M3 12H1m22 0h-2M5 5 3.5 3.5M20.5 20.5 19 19M5 19l-1.5 1.5M20.5 3.5 19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  calendar:'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16', more:'M5 12h.01M12 12h.01M19 12h.01',
  utensils:'M5 3v7m3-7v7m-6-7v7h6m-3 0v11M17 3c-3 4-3 8 1 9v9m0-18v9',
  shopping:'M4 8h16l1 13H3ZM8 8V6a4 4 0 0 1 8 0v2', car:'m5 5-2 9v5h3v-3h12v3h3v-5l-2-9ZM4 11h16M7 14h.01M17 14h.01',
  home:'m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7', coffee:'M4 8h12v7a6 6 0 0 1-12 0Zm12 1h3a3 3 0 0 1 0 6h-3M6 3v2m4-2v2m4-2v2M3 21h15',
  heart:'M20 5c-4-4-8 1-8 1S8 1 4 5s0 9 8 15c8-6 12-11 8-15Z', book:'M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Zm9 2v15',
  gift:'M3 8h18v4H3zM5 12v9h14v-9M12 8v13m0-13H7a2.5 2.5 0 1 1 2.5-2.5L12 8Zm0 0h5a2.5 2.5 0 1 0-2.5-2.5L12 8Z',
  briefcase:'M3 7h18v14H3zM8 7V3h8v4M3 12c6 4 12 4 18 0m-9 0v4', coins:'M12 3c5 0 8 2 8 4s-3 4-8 4-8-2-8-4 3-4 8-4Zm-8 4v6c0 5 16 5 16 0V7M4 13v4c0 5 16 5 16 0v-4',
  bank:'m2 8 10-5 10 5ZM4 10v9m5-9v9m6-9v9m5-9v9M2 21h20', phone:'M7 2h10v20H7zM11 18h2', plane:'m3 10 7 1 6-8 2 1-3 8 6 3-1 2-7-2-4 6-2-1 2-7-6-1Z',
  laptop:'M5 3h14v13H5zM2 20h20l-3-4H5Z', umbrella:'M12 3C6 3 2 7 2 12h20c0-5-4-9-10-9Zm0 9v7a2 2 0 0 0 4 0M12 1v2',
  play:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-2 5 6 4-6 4Z', 'trending-up':'m3 17 6-6 4 4 8-10m-6 0h6v6', smartphone:'M7 2h10v20H7zM11 18h2',
  info:'M12 8h.01M12 11v6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', reset:'M3 10a9 9 0 1 1 1 8M3 3v7h7', logout:'M10 3H3v18h7M8 12h13m-5-5 5 5-5 5'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.wallet}"/></svg>`;
const money = amount => esc(formatMoney(amount));
const category = id => getCategories(state).find(c => c.id === id);
const account = id => state.accounts.find(a => a.id === id);
const clone = () => structuredClone(state);
const monthLabel = month => `Tháng ${Number(month.slice(5))}, ${month.slice(0,4)}`;
const dateLabel = date => `${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(0,4)}`;
const percent = n => new Intl.NumberFormat('vi-VN', {maximumFractionDigits:1}).format(n);
const routes = [ ['overview','grid','Tổng quan'], ['transactions','exchange','Giao dịch'], ['recurring','calendar','Khoản định kỳ'], ['budgets','pie','Ngân sách'], ['goals','target','Mục tiêu'], ['wallets','wallet','Ví của tôi'], ['categories','grid','Danh mục'], ['reports','chart','Báo cáo'] ];
const ui = {month:monthKey(localDate()), route:'overview', query:'',type:'all',categoryId:'all',accountId:'all',page:1,allMonths:false,customRange:false,startDate:'',endDate:'',chartMode:'cumulative',menu:false};
let storageIssue = '', corruptRaw = null, lastFocus = null;
let formDirty = false;
let pendingStorageRefresh = false;
let profileDraft = null;
let backupsReady = false, backupNeedsRecovery = false, backupNotice = '';
let importRequest = 0, dialogRevision = 0, updateInProgress = false;
let pendingEncryptedImport = null, cloudBusy = false;
const mobileNavigation = matchMedia('(max-width: 850px)');
const primaryMissingAtBoot = readPrimaryRaw() === null;
let state = loadState();
let backups = null, cloud = null;
backups = new BackupManager({
  repository: new EncryptedBackupRepository(vault),
  encryptExternal: raw => vault.enabled ? vault.encryptExport(raw) : JSON.stringify(JSON.parse(raw),null,2),
  getCurrentRaw: readPrimaryRaw,
  getCurrentState: () => {
    const raw = readPrimaryRaw();
    if (raw === null) throw new Error('Bản lưu chính chưa sẵn sàng.');
    return validateState(JSON.parse(raw));
  },
  download: (content, filename) => download(content, filename, 'application/json;charset=utf-8'),
  onChange: () => { if (backups) refreshBackupStatus(); },
});
cloud = new GitHubCloudSync({ vault, readState: () => state, onChange: () => { if (cloud) refreshCloudStatus(); } });

function readPrimaryRaw() {
  try { return secureStorage.getItem(KEY); } catch { return undefined; }
}

function loadState() {
  const result = ledger.load();
  storageIssue = result.issue || '';
  corruptRaw = result.corruptRaw ?? null;
  return result.state;
}

async function applyStorageRefresh(notify = false) {
  if (vault.enabled) await vault.refresh();
  pendingStorageRefresh = false;
  const latest = ledger.refresh();
  state = latest.state; storageIssue = latest.issue; corruptRaw = latest.corruptRaw;
  sanitizeFilters(); render();
  if (notify) toast(latest.issue || 'Đã cập nhật dữ liệu từ tab khác.', Boolean(latest.issue));
}

function sanitizeFilters() {
  if (ui.accountId !== 'all' && !state.accounts.some(account => account.id === ui.accountId)) ui.accountId = 'all';
  if (ui.categoryId !== 'all' && !category(ui.categoryId)) ui.categoryId = 'all';
}

let savingLedger = false;
async function commit(next, { replace = false, reason = 'Cập nhật sổ', cloudPush = true } = {}) {
  if (savingLedger) { toast('Thay đổi trước đang được lưu. Hãy thử lại sau khi hoàn tất.', true); return false; }
  if (!backupsReady) { toast('Đang mở sổ và kiểm tra bản sao. Hãy lưu lại sau một chút.', true); return false; }
  if (backupNeedsRecovery && !replace) { toast('Có lịch sử của sổ trước. Hãy chọn khôi phục hoặc xác nhận dùng sổ trống trong Cài đặt trước khi ghi tiếp.', true); return false; }
  savingLedger = true;
  const previous = JSON.stringify(state);
  let previousPersistedState = null;
  try { const raw = readPrimaryRaw(); if (typeof raw === 'string') previousPersistedState = validateState(JSON.parse(raw)); } catch { /* Guard corrupt prior revisions. */ }
  try {
    state = ledger.save(next, { replace });
    // In encrypted mode LedgerStore writes into an in-memory adapter. Do not
    // report success until WebCrypto has encrypted and committed the revision.
    if (vault.enabled) await vault.flush();
    storageIssue = ''; corruptRaw = null;
    if (replace) { profileDraft = null; backupNeedsRecovery = false; }
  } catch (error) {
    if (vault.enabled) {
      vault.rollback();
      try { if (error.code === 'CONFLICT') await vault.refresh(); } catch (refreshError) { storageIssue = refreshError.message; }
      ledger = new LedgerStore(secureStorage);
      const snapshot = ledger.load(); state = snapshot.state;
      storageIssue = storageIssue || snapshot.issue;
      corruptRaw = snapshot.corruptRaw;
    }
    if (error.code === 'CONFLICT') {
      pendingStorageRefresh = false;
      if (!vault.enabled) await applyStorageRefresh();
      render(); refreshDraftChoices();
      const fieldError = $('#modal-error');
      if (fieldError) fieldError.textContent = 'Sổ vừa thay đổi ở tab khác. Nội dung bạn nhập vẫn được giữ. Kiểm tra lại biểu mẫu rồi bấm Lưu để áp dụng vào sổ mới nhất.';
    } else if (error.code) {
      storageIssue = error.message; render();
    }
    toast(error.message || 'Không lưu được thay đổi. Dữ liệu hiện tại vẫn được giữ.', true);
    savingLedger = false;
    return false;
  }
  savingLedger = false;
  if (JSON.stringify(state) !== previous) {
    try {
      if (previousPersistedState) backups.record(previousPersistedState, 'Trước khi thay đổi sổ', {historyOnly:true}).catch(()=>{});
      Promise.resolve(backups.record(state, reason)).catch(() => {
        backupNotice = 'Sổ đã lưu trên trình duyệt, nhưng bản sao tự động chưa hoàn tất. Mở Cài đặt để kiểm tra hoặc tải JSON.';
        refreshBackupStatus();
      });
      if (cloudPush && cloud?.connection) void cloud.push(state);
    } catch {
      backupNotice = 'Sổ đã lưu trên trình duyệt. Hãy kiểm tra lại sao lưu tự động trong Cài đặt.';
    }
  }
  sanitizeFilters(); render(); return true;
}

function toast(message, error = false) {
  const region = $('#toast-region');
  const item = document.createElement('div'); item.className = `toast${error?' error':''}`;
  item.innerHTML = `${icon(error?'info':'check')}<span>${esc(message)}</span>`;
  region.append(item); setTimeout(() => item.remove(), error?7500:4200);
}

function getRoute() { const r = location.hash.slice(1); return [...routes.map(r=>r[0]),'settings'].includes(r) ? r : 'overview'; }
function currentTransactions() { return filterTransactions(state,{month:ui.allMonths||ui.customRange?'':ui.month,startDate:ui.customRange?ui.startDate:'',endDate:ui.customRange?ui.endDate:'',type:ui.type,categoryId:ui.categoryId,accountId:ui.accountId,query:ui.query}); }
function transactionScope() { return ui.customRange?`${dateLabel(ui.startDate)} – ${dateLabel(ui.endDate)}`:ui.allMonths?'Tất cả thời gian':monthLabel(ui.month); }
function transactionFilterLabel() { return [ui.type!=='all'?({income:'Thu nhập',expense:'Chi tiêu',transfer:'Chuyển giữa ví'}[ui.type]):'Tất cả loại giao dịch',ui.accountId!=='all'?account(ui.accountId)?.name:'Tất cả ví',ui.categoryId!=='all'?category(ui.categoryId)?.name:'Tất cả danh mục',ui.query?`Tìm kiếm: ${ui.query}`:''].filter(Boolean).join(' · '); }
function monthControl() {
  return `<div class="month-control"><button class="icon-btn" data-action="month-prev" aria-label="Tháng trước" ${ui.month==='1900-01'?'disabled':''}>${icon('chevronLeft')}</button><label class="visually-hidden" for="selected-month">Tháng xem báo cáo</label><span class="month-input-wrap"><span class="month-caption" aria-hidden="true">${monthLabel(ui.month)}</span><input type="month" id="selected-month" value="${ui.month}" min="1900-01" max="9999-12" required></span><button class="icon-btn" data-action="month-next" aria-label="Tháng sau" ${ui.month==='9999-12'?'disabled':''}>${icon('chevron')}</button></div>`;
}
function addButton(label='Thêm giao dịch') { return `<button class="btn primary" data-action="add-transaction">${icon('plus')}${label}</button>`; }
function pageHeader(title, subtitle, actions='') { return `<header class="page-header"><div><h1 class="page-title" tabindex="-1">${title}</h1><p class="page-subtitle">${subtitle}</p></div><div class="page-actions">${actions}</div></header>`; }
function empty(title, detail, action='') { return `<div class="empty-state"><h3>${title}</h3><p>${detail}</p>${action}</div>`; }
function progress(value, color='var(--primary)') { const safe = Math.min(100,Math.max(0,value)); return `<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${safe.toFixed(0)}" aria-label="Tiến độ"><div class="progress-fill" style="width:${safe}%;--item-color:${color};background:${color}"></div></div>`; }

function render() {
  ui.route = getRoute();
  const title = routes.find(r=>r[0]===ui.route)?.[2] || 'Cài đặt';
  document.title = `${title} · Money Management`;
  $('#app').innerHTML = `<div class="app-shell">
    ${ui.menu?'<button class="mobile-overlay" data-action="close-menu" aria-label="Đóng menu"></button>':''}
    <aside id="navigation-panel" class="sidebar${ui.menu?' open':''}" aria-label="Điều hướng chính" ${mobileNavigation.matches&&!ui.menu?'inert':''}>
      <button class="icon-btn sidebar-close" data-action="close-menu" aria-label="Đóng menu">${icon('close')}</button>
      <a class="brand" href="#overview"><span class="brand-mark">${icon('wallet')}</span><span class="brand-copy">Money Management<span>Thu chi cá nhân</span></span></a>
      <nav class="nav-list">${routes.map(([id,ico,label])=>`<a href="#${id}" class="nav-item${ui.route===id?' active':''}" ${ui.route===id?'aria-current="page"':''}>${icon(ico,'nav-icon')}<span>${label}</span>${id==='transactions'&&state.transactions.length?`<span class="nav-badge">${state.transactions.length}</span>`:''}</a>`).join('')}</nav>
      <div class="sidebar-tools"><button class="btn ghost" data-action="backup">${icon('download')}Sao lưu dữ liệu</button></div>
      <a href="#settings" class="nav-item${ui.route==='settings'?' active':''}">${icon('settings')}<span>Cài đặt & dữ liệu</span></a>
      <div class="sidebar-footer"><span class="avatar">${esc((state.profile.name||'B').charAt(0).toUpperCase())}</span><div class="user-info"><strong>${esc(state.profile.name==='Bạn'?'Sổ cá nhân':state.profile.name)}</strong><span>VND</span></div></div>
    </aside>
    <main class="main" id="main-content" ${mobileNavigation.matches&&ui.menu?'inert':''}><div class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" data-action="open-menu" aria-label="Mở menu" aria-controls="navigation-panel" aria-expanded="${ui.menu}">${icon('menu')}</button><span>Money Management</span><span class="breadcrumb-divider">/</span><strong>${title}</strong></div><div class="topbar-actions"><button class="icon-btn theme-toggle" data-action="toggle-theme" aria-label="${getResolvedTheme()==='dark'?'Bật chế độ sáng':'Bật chế độ tối'}" title="${getResolvedTheme()==='dark'?'Bật chế độ sáng':'Bật chế độ tối'}">${icon(getResolvedTheme()==='dark'?'sun':'moon')}</button><a class="storage-link" id="backup-save-status" href="#settings" aria-live="polite">${saveStatusMarkup()}</a><a class="avatar" href="#settings" aria-label="Cài đặt cá nhân">${esc((state.profile.name||'B').charAt(0).toUpperCase())}</a></div></div>
    <div class="page">${storageIssue?`<div class="storage-warning" role="alert">${icon('info')}<span>${esc(storageIssue)}</span><a href="#settings">Mở cài đặt</a></div>`:''}<div id="backup-attention">${backupAttentionMarkup()}</div>${renderPage()}</div><footer class="app-footer">Money Management <span>·</span> VND</footer></main></div>`;
  document.body.style.overflow = $('.modal') || (mobileNavigation.matches && ui.menu) ? 'hidden' : '';
}

function renderPage() {
  return ({overview:renderOverview,transactions:renderTransactions,recurring:renderRecurring,categories:renderCategories,budgets:renderBudgets,goals:renderGoals,wallets:renderWallets,reports:renderReports,settings:renderSettings}[ui.route])();
}
function demoNotice() { return state.demo?`<div class="demo-notice"><span>Đang dùng <strong>dữ liệu mẫu</strong>.</span><button class="btn ghost small" data-action="start-fresh">Bắt đầu sổ mới</button></div>`:''; }

function comparison(value, previous, expense=false) {
  if (!previous) return `<span class="muted">${value?'Chưa có số liệu tháng trước':'Chưa có giao dịch'}</span>`;
  const difference = (value-previous)/previous*100;
  const favorable = expense?difference<=0:difference>=0;
  return `<span class="trend ${favorable?'positive':'negative'}">${difference>0?'+':''}${percent(difference)}%</span><span class="muted"> so với tháng trước</span>`;
}
function stats(m) {
  return `<section class="stat-grid" aria-label="Tổng quan số dư">
    <article class="stat-card balance-card"><div class="stat-label"><span>Tổng số dư</span>${icon('wallet','stat-icon')}</div><div class="stat-value">${money(allTimeBalance(state))}</div><div class="stat-footer">${state.accounts.length} ví đang quản lý <a href="#wallets">Xem ví</a></div></article>
    <article class="stat-card"><div class="stat-label"><span>Thu nhập trong tháng</span><span class="stat-icon income-icon">${icon('income')}</span></div><div class="stat-value">${money(m.income)}</div><div class="stat-footer">${comparison(m.income,m.previous.income)}</div></article>
    <article class="stat-card"><div class="stat-label"><span>Chi tiêu trong tháng</span><span class="stat-icon expense-icon">${icon('expense')}</span></div><div class="stat-value">${money(m.expense)}</div><div class="stat-footer">${comparison(m.expense,m.previous.expense,true)}</div></article>
    <article class="stat-card"><div class="stat-label"><span>Còn lại trong tháng</span><span class="stat-icon savings-icon">${icon('coins')}</span></div><div class="stat-value ${m.net<0?'negative':''}">${money(m.net)}</div><div class="stat-footer"><span class="trend ${m.net>=0?'positive':'negative'}">${m.income?percent(m.savingsRate)+'%':'—'}</span><span class="muted"> thu nhập được giữ lại</span></div></article>
  </section>`;
}

function flowChart(m) {
  if (!m.income && !m.expense) return empty('Chưa có thu chi trong tháng','Các khoản thu và chi sẽ xuất hiện trên biểu đồ này.');
  const w=680,h=230,left=64,right=14,top=20,bottom=36;
  let inc=0,exp=0;
  const rows=m.daily.map(d=>({day:d.day,income:ui.chartMode==='cumulative'?(inc+=d.income):d.income,expense:ui.chartMode==='cumulative'?(exp+=d.expense):d.expense}));
  const max=Math.max(100000,...rows.flatMap(r=>[r.income,r.expense]))*1.17;
  const x=i=>left+i/(rows.length-1)*(w-left-right);
  const y=n=>h-bottom-n/max*(h-top-bottom);
  const line=type=>rows.map((r,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(r[type]).toFixed(2)}`).join(' ');
  const grid=Array.from({length:5},(_,i)=>{const v=max*i/4;return `<line x1="${left}" y1="${y(v)}" x2="${w-right}" y2="${y(v)}" stroke="var(--chart-grid)" stroke-dasharray="4 5"/><text x="${left-12}" y="${y(v)+4}" text-anchor="end">${esc(formatCompact(v))}</text>`;}).join('');
  const ticks=[0,4,9,14,19,24,rows.length-1].filter((v,i,a)=>a.indexOf(v)===i&&v<rows.length);
  const tip=i=>`Ngày ${rows[i].day}: Thu ${formatMoney(rows[i].income)}, chi ${formatMoney(rows[i].expense)}${ui.chartMode==='cumulative'?' (lũy kế)':''}`;
  return `<div class="flow-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Biểu đồ ${ui.chartMode==='cumulative'?'lũy kế':'theo ngày'}: thu nhập ${money(m.income)}, chi tiêu ${money(m.expense)}">${grid}<path d="${line('income')}" fill="none" stroke="var(--chart-income)" stroke-width="3" stroke-linejoin="round"/><path d="${line('expense')}" fill="none" stroke="var(--chart-expense)" stroke-width="2.6" stroke-linejoin="round"/>${ticks.map(i=>`<text x="${x(i)}" y="${h-10}" text-anchor="middle">${String(i+1).padStart(2,'0')}/${ui.month.slice(5)}</text>`).join('')}${rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.income)}" r="6" fill="transparent"><title>${esc(tip(i))}</title></circle><circle cx="${x(i)}" cy="${y(r.expense)}" r="6" fill="transparent"><title>${esc(tip(i))}</title></circle>`).join('')}</svg></div>`;
}
function chartCard(m) { return `<section class="card chart-card"><div class="card-header"><div><h2 class="card-title">Dòng tiền trong tháng</h2><p class="card-subtitle">Thu nhập và chi tiêu ${ui.chartMode==='cumulative'?'lũy kế':'theo ngày'}.</p></div><div class="segmented chart-toggle"><button data-action="chart-cumulative" class="${ui.chartMode==='cumulative'?'active':''}">Lũy kế</button><button data-action="chart-daily" class="${ui.chartMode==='daily'?'active':''}">Theo ngày</button></div></div><div class="card-body"><div class="chart-legend"><span><i class="legend-dot" style="background:var(--chart-income)"></i>Thu nhập</span><span><i class="legend-dot" style="background:var(--chart-expense)"></i>Chi tiêu</span><span class="muted">Đơn vị: đồng</span></div>${flowChart(m)}</div></section>`; }

function categoryChart(m, all=false) {
  const totals=[...m.categoryTotals].filter(c=>c.amount>0).sort((a,b)=>b.amount-a.amount);
  if (!totals.length) return empty('Chưa có chi tiêu','Các khoản chi sẽ được tổng hợp theo danh mục ở đây.');
  let offset=0;
  const segments=totals.map(c=>{const length=c.amount/m.expense*100;const segment=`<circle cx="90" cy="90" r="70" fill="none" style="--segment-color:${category(c.categoryId)?.color||'#879a92'}" stroke="${category(c.categoryId)?.color||'#879a92'}" stroke-width="23" stroke-dasharray="${length} ${100-length}" stroke-dashoffset="${-offset}" pathLength="100"/>`;offset+=length;return segment;}).join('');
  return `<div class="donut-layout"><div class="donut-wrap"><svg viewBox="0 0 180 180" role="img" aria-label="Cơ cấu chi tiêu theo danh mục"><g transform="rotate(-90 90 90)">${segments}</g></svg><div class="donut-center"><span>Tổng chi tiêu</span><strong>${esc(formatCompact(m.expense))}</strong><small>đồng</small></div></div><div class="category-list">${totals.slice(0,all?totals.length:4).map(c=>`<div class="category-row"><span class="category-label"><i class="legend-dot" style="--item-color:${category(c.categoryId)?.color||'#879a92'};background:${category(c.categoryId)?.color||'#879a92'}"></i>${esc(category(c.categoryId)?.name||'Khác')}</span><span class="category-value">${percent(c.amount/m.expense*100)}%</span></div>`).join('')}${totals.length>4&&!all?`<a class="section-link" href="#reports">Xem ${totals.length} danh mục</a>`:''}</div></div>`;
}

function transactionRows(transactions, compact=false) {
  return transactions.map(t => {
    const c = category(t.categoryId);
    const isTransfer = t.type === 'transfer';
    const walletLabel = isTransfer
      ? `${account(t.accountId)?.name || 'Ví'} → ${account(t.transferToAccountId)?.name || 'Ví'}`
      : account(t.accountId)?.name || 'Ví';
    const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '';
    return `<tr><td><div class="transaction-description"><span class="transaction-icon">${icon(c?.icon)}</span><div><strong class="transaction-title" title="${esc(t.note || c?.name)}">${esc(t.note || c?.name || 'Giao dịch')}</strong><span class="transaction-date">${dateLabel(t.date)}${compact?' · '+esc(walletLabel):''}</span></div></div></td><td><span class="category-badge">${esc(c?.name || 'Khác')}</span></td>${compact?'':`<td><span class="account-pill">${esc(walletLabel)}</span></td>`}<td class="amount ${t.type==='income'?'positive':isTransfer?'transfer-amount':''}">${sign}${money(t.amount)}${isTransfer?'<span class="amount-detail">Chuyển giữa ví</span>':''}</td><td><div class="row-actions"><button class="icon-btn" data-action="edit-transaction" data-id="${esc(t.id)}" aria-label="Sửa ${esc(t.note || c?.name)}">${icon('edit')}</button>${compact?'':`<button class="icon-btn" data-action="delete-transaction" data-id="${esc(t.id)}" aria-label="Xóa ${esc(t.note || c?.name)}">${icon('trash')}</button>`}</div></td></tr>`;
  }).join('');
}

function transactionTable(transactions, compact=false) {
  if (!transactions.length) return empty('Chưa có giao dịch nào','Bắt đầu bằng một khoản thu hoặc chi của bạn.',addButton('Thêm giao dịch đầu tiên'));
  return `<div class="table-wrap"><table class="transaction-table"><thead><tr><th>Giao dịch</th><th>Danh mục</th>${compact?'':'<th>Ví</th>'}<th class="text-right">Số tiền</th><th><span class="visually-hidden">Thao tác</span></th></tr></thead><tbody>${transactionRows(transactions,compact)}</tbody></table></div>`;
}
function budgetItems(m, limit=3) {
  const budgets=state.budgets.filter(b=>b.month===ui.month);
  if(!budgets.length) return empty('Chưa đặt ngân sách','Đặt hạn mức cho các danh mục cần theo dõi.',`<button class="btn secondary small" data-action="add-budget">${icon('plus')}Đặt ngân sách</button>`);
  return `<div class="budget-list">${budgets.slice(0,limit).map(b=>{const spent=m.categoryTotals.find(c=>c.categoryId===b.categoryId)?.amount||0,c=category(b.categoryId),p=spent/b.amount*100;return `<div class="budget-item"><div class="budget-heading"><span>${icon(c?.icon)}${esc(c?.name)}</span><strong class="${p>100?'negative':''}">${percent(p)}%</strong></div>${progress(p,p>100?'#d65a50':c?.color)}<div class="budget-meta"><span>${money(spent)}</span><span>/ ${money(b.amount)}</span></div></div>`;}).join('')}</div>`;
}

function setupPanel() {
  if (state.demo || state.transactions.length) return '';
  return `<section class="setup-panel" aria-label="Thiết lập sổ"><div><h2>Bắt đầu ghi thu chi</h2><p>Nhập số dư hiện có của các ví, sau đó thêm giao dịch đầu tiên.</p></div><div class="settings-actions"><a href="#wallets" class="btn secondary">Thiết lập ví</a>${addButton()}</div></section>`;
}

function renderOverview() {
  const m=deriveMonthly(state,ui.month);
  const recent=filterTransactions(state,{month:ui.month}).slice(0,5);
  const goal=state.goals.find(g=>g.saved<g.target)||state.goals[0];
  return `${pageHeader('Tổng quan',monthLabel(ui.month)+' · Đơn vị VND',monthControl()+addButton())}${demoNotice()}${setupPanel()}${overviewNotices(m)}${stats(m)}
    <div class="dashboard-grid">${chartCard(m)}<section class="card"><div class="card-header"><div><h2 class="card-title">Chi tiêu theo danh mục</h2><p class="card-subtitle">Tỷ trọng các khoản chi trong tháng.</p></div>${icon('pie')}</div><div class="card-body">${categoryChart(m)}</div></section></div>
    <div class="dashboard-grid dashboard-lower"><section class="card"><div class="card-header"><div><h2 class="card-title">Giao dịch gần đây</h2><p class="card-subtitle">Những khoản thu chi trong ${monthLabel(ui.month).toLowerCase()}.</p></div><a class="section-link" href="#transactions">Xem tất cả</a></div>${transactionTable(recent,true)}</section><div class="side-stack"><section class="card"><div class="card-header"><h2 class="card-title">Ngân sách tháng này</h2><a class="section-link" href="#budgets">Chi tiết</a></div><div class="card-body">${budgetItems(m)}</div></section>${goal?`<section class="goal-preview"><div class="goal-preview-heading"><span class="goal-icon" style="--item-color:${goal.color};color:${goal.color}">${icon(goal.icon)}</span><span>Mục tiêu đang theo dõi</span></div><h3>${esc(goal.name)}</h3><div class="goal-progress"><strong>${money(goal.saved)}</strong><span>/ ${money(goal.target)}</span></div>${progress(goal.saved/goal.target*100,goal.color)}<div class="goal-preview-bottom"><span>${percent(goal.saved/goal.target*100)}% mục tiêu</span><a class="section-link" href="#goals">Xem mục tiêu</a></div></section>`:''}</div></div>`;
}

function renderTransactions() {
  const list=currentTransactions();
  const pages=Math.max(1,Math.ceil(list.length/12));ui.page=Math.min(pages,ui.page);
  const income=list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),expense=list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const period=ui.customRange?'range':ui.allMonths?'all':'month';
  return `${pageHeader('Giao dịch','Thu nhập, chi tiêu và chuyển tiền giữa các ví.',(period==='month'?monthControl():'')+addButton())}${demoNotice()}
    <section class="card"><div class="toolbar"><div class="search-box">${icon('search')}<input id="transaction-search" type="search" placeholder="Tìm ghi chú, danh mục, ví…" aria-label="Tìm giao dịch" value="${esc(ui.query)}" autocomplete="off"></div><button class="btn secondary" data-action="export-excel">${icon('download')}Xuất Excel</button></div>
    <div class="filters">
      <label><span>Khoảng thời gian</span><select class="form-control" id="filter-period"><option value="month" ${period==='month'?'selected':''}>Theo tháng</option><option value="range" ${period==='range'?'selected':''}>Từ ngày đến ngày</option><option value="all" ${period==='all'?'selected':''}>Tất cả thời gian</option></select></label>
      <label><span>Loại giao dịch</span><select class="form-control" id="filter-type" data-filter="type"><option value="all">Tất cả loại</option><option value="income" ${ui.type==='income'?'selected':''}>Thu nhập</option><option value="expense" ${ui.type==='expense'?'selected':''}>Chi tiêu</option><option value="transfer" ${ui.type==='transfer'?'selected':''}>Chuyển giữa ví</option></select></label>
      <label><span>Danh mục</span><select class="form-control" id="filter-category" data-filter="categoryId"><option value="all">Tất cả danh mục</option>${getCategories(state).map(c=>`<option value="${c.id}" ${ui.categoryId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label><span>Ví</span><select class="form-control" id="filter-account" data-filter="accountId"><option value="all">Tất cả ví</option>${state.accounts.map(a=>`<option value="${a.id}" ${ui.accountId===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>
      <button class="btn ghost small" data-action="reset-filters">Xóa bộ lọc</button>
    </div>
    ${ui.customRange?`<div class="range-fields"><label class="form-group"><span class="form-label">Từ ngày</span><input class="form-control" id="filter-start-date" type="date" min="1900-01-01" max="9999-12-31" value="${ui.startDate}" required></label><label class="form-group"><span class="form-label">Đến ngày</span><input class="form-control" id="filter-end-date" type="date" min="1900-01-01" max="9999-12-31" value="${ui.endDate}" required></label></div>`:''}
    <p class="export-note">${esc(transactionScope())}. Excel gồm toàn bộ kết quả ở mọi trang, tổng theo ngày và tổng cuối kỳ.</p>
    <div class="summary-strip"><span><strong>${list.length}</strong> giao dịch</span><span>Thu <strong class="positive">${money(income)}</strong></span><span>Chi <strong>${money(expense)}</strong></span><span>Chênh lệch <strong class="${income-expense<0?'negative':'positive'}">${money(income-expense)}</strong></span></div>
    ${list.length?transactionTable(list.slice((ui.page-1)*12,ui.page*12)):empty('Không tìm thấy giao dịch','Thử thay đổi bộ lọc hoặc thêm giao dịch mới.',addButton())}
    <div class="pagination"><span>${list.length?`${(ui.page-1)*12+1}–${Math.min(ui.page*12,list.length)} trên ${list.length}`:'0 giao dịch'}</span><div><button class="icon-btn" data-action="page-prev" aria-label="Trang trước" ${ui.page<=1?'disabled':''}>${icon('chevronLeft')}</button><span>Trang ${ui.page} / ${pages}</span><button class="icon-btn" data-action="page-next" aria-label="Trang sau" ${ui.page>=pages?'disabled':''}>${icon('chevron')}</button></div></div></section>`;
}

function renderBudgets() {
  const m=deriveMonthly(state,ui.month),budgets=state.budgets.filter(b=>b.month===ui.month),total=budgets.reduce((s,b)=>s+b.amount,0);
  const spent=budgets.reduce((s,b)=>s+(m.categoryTotals.find(c=>c.categoryId===b.categoryId)?.amount||0),0);
  const uncovered=m.expense-spent;
  return `${pageHeader('Ngân sách','Hạn mức chi tiêu theo danh mục và tháng.',monthControl()+`<button class="btn primary" data-action="add-budget">${icon('plus')}Thêm ngân sách</button>`)}${demoNotice()}
  <div class="summary-banner"><span class="summary-banner-icon">${icon('pie')}</span><div><span>Đã dùng trong các danh mục có ngân sách</span><h2>${money(spent)} <small>/ ${money(total)}</small></h2>${uncovered?`<p>Còn ${money(uncovered)} chi tiêu ở các danh mục chưa đặt ngân sách.</p>`:'<p>Theo dõi hạn mức riêng cho từng danh mục trong tháng.</p>'}</div><div class="summary-banner-end"><strong class="${spent>total?'negative':'positive'}">${money(Math.abs(total-spent))}</strong><span>${spent>total?'vượt ngân sách':'còn có thể chi'}</span></div></div>
  ${budgets.length?`<div class="budget-grid">${budgets.map(b=>{const c=category(b.categoryId),amount=m.categoryTotals.find(x=>x.categoryId===b.categoryId)?.amount||0,p=amount/b.amount*100;return `<article class="card budget-card"><div class="card-header"><span class="transaction-icon" style="--item-color:${c.color};background:${c.color}15;color:${c.color}">${icon(c.icon)}</span><div class="row-actions"><button class="icon-btn" data-action="edit-budget" data-id="${b.id}" aria-label="Sửa ngân sách ${esc(c.name)}">${icon('edit')}</button><button class="icon-btn" data-action="delete-budget" data-id="${b.id}" aria-label="Xóa ngân sách ${esc(c.name)}">${icon('trash')}</button></div></div><div class="card-body"><h2 class="card-title">${esc(c.name)}</h2><div class="budget-card-values"><strong>${money(amount)}</strong><span>/ ${money(b.amount)}</span></div>${progress(p,p>100?'#d65a50':c.color)}<div class="budget-meta"><span class="${p>100?'negative':'positive'}">${p>100?'Vượt':'Còn'} ${money(Math.abs(b.amount-amount))}</span><strong>${percent(p)}%</strong></div></div></article>`;}).join('')}</div>`:`<section class="card">${empty('Chưa đặt ngân sách','Chọn danh mục và hạn mức chi tiêu cho tháng này.',`<button class="btn primary" data-action="add-budget">${icon('plus')}Đặt ngân sách đầu tiên</button>`)}</section>`}`;
}

function renderGoals() {
  return `${pageHeader('Mục tiêu tiết kiệm','Theo dõi số tiền đã dành dụm và thời hạn của từng mục tiêu.',`<button class="btn primary" data-action="add-goal">${icon('plus')}Tạo mục tiêu</button>`)}${demoNotice()}<div class="info-note">${icon('info')}<span>Mục tiêu là số tiền bạn tự ghi nhận đã để dành; cập nhật mục tiêu không làm thay đổi số dư các ví.</span></div>
  ${state.goals.length?`<div class="goal-grid">${state.goals.map(g=>{const p=g.saved/g.target*100;return `<article class="card goal-card"><div class="card-header"><span class="goal-icon" style="--item-color:${g.color};color:${g.color};background:${g.color}15">${icon(g.icon)}</span><div class="row-actions"><button class="icon-btn" data-action="edit-goal" data-id="${g.id}" aria-label="Sửa mục tiêu ${esc(g.name)}">${icon('edit')}</button><button class="icon-btn" data-action="delete-goal" data-id="${g.id}" aria-label="Xóa mục tiêu ${esc(g.name)}">${icon('trash')}</button></div></div><div class="card-body"><span class="goal-status ${p>=100?'positive':''}">${p>=100?'Đã hoàn thành':g.deadline<localDate()?'Đã đến hạn':'Đang tích lũy'}</span><h2>${esc(g.name)}</h2><p class="muted">${icon('calendar')} Hạn ${dateLabel(g.deadline)}</p><div class="goal-amount"><strong>${money(g.saved)}</strong><span>/ ${money(g.target)}</span></div>${progress(p,g.color)}<div class="budget-meta"><strong>${percent(p)}%</strong><span>Còn ${money(Math.max(0,g.target-g.saved))}</span></div><button class="btn ${p>=100?'secondary':'primary'}" data-action="contribute-goal" data-id="${g.id}">${icon('plus')}Ghi nhận tiết kiệm</button></div></article>`;}).join('')}</div>`:`<section class="card">${empty('Chưa có mục tiêu tiết kiệm','Nhập số tiền cần đạt và thời hạn dự kiến.',`<button class="btn primary" data-action="add-goal">${icon('plus')}Tạo mục tiêu đầu tiên</button>`)}</section>`}`;
}

function renderWallets() {
  return `${pageHeader('Ví của tôi','Số dư và giao dịch của từng tài khoản theo dõi.',`${state.accounts.length>1?'<button class="btn secondary" data-action="add-transfer">'+icon('exchange')+'Chuyển giữa ví</button>':''}<button class="btn primary" data-action="add-wallet">${icon('plus')}Thêm ví</button>`)}${demoNotice()}
  <div class="summary-banner"><span class="summary-banner-icon">${icon('wallet')}</span><div><span>Tổng số dư của ${state.accounts.length} ví</span><h2>${money(allTimeBalance(state))}</h2><p>Tổng số dư hiện tại của các ví. Chuyển tiền giữa ví không làm thay đổi tổng này.</p></div></div>
  <div class="wallet-grid">${state.accounts.map(a=>`<article class="card wallet-card" style="--wallet-color:${a.color}"><div class="card-header"><span class="goal-icon" style="--item-color:${a.color};color:${a.color};background:${a.color}15">${icon(a.icon)}</span><div class="row-actions"><button class="icon-btn" data-action="edit-wallet" data-id="${a.id}" aria-label="Sửa ví ${esc(a.name)}">${icon('edit')}</button><button class="icon-btn" data-action="delete-wallet" data-id="${a.id}" aria-label="Xóa ví ${esc(a.name)}">${icon('trash')}</button></div></div><div class="card-body"><h2>${esc(a.name)}</h2><div class="wallet-balance">${money(accountBalance(state,a.id))}</div><div class="wallet-info"><span>Số dư ban đầu</span><strong>${money(a.initialBalance)}</strong></div><div class="wallet-info"><span>Giao dịch đã ghi</span><strong>${state.transactions.filter(t=>t.accountId===a.id||t.transferToAccountId===a.id).length}</strong></div><button class="btn secondary" data-action="wallet-transactions" data-id="${a.id}">Xem giao dịch</button></div></article>`).join('')}</div>`;
}

function renderReports() {
  const m=deriveMonthly(state,ui.month);
  const categories=[...m.categoryTotals].filter(c=>c.amount>0).sort((a,b)=>b.amount-a.amount);
  return `${pageHeader('Báo cáo','Tổng hợp thu nhập và chi tiêu theo tháng.',monthControl()+`<button class="btn secondary" data-action="export-month">${icon('download')}Xuất Excel tháng</button>`)}${demoNotice()}${stats(m)}<div class="dashboard-grid">${chartCard(m)}<section class="card"><div class="card-header"><h2 class="card-title">Cơ cấu chi tiêu</h2></div><div class="card-body">${categoryChart(m,true)}</div></section></div><section class="card"><div class="card-header"><div><h2 class="card-title">Chi tiết theo danh mục</h2><p class="card-subtitle">${monthLabel(ui.month)} · ${m.transactions.filter(t=>t.type==='expense').length} khoản chi</p></div></div>${categories.length?`<div class="table-wrap"><table class="transaction-table"><thead><tr><th>Danh mục</th><th>Số giao dịch</th><th>Tỷ trọng</th><th class="text-right">Tổng chi tiêu</th></tr></thead><tbody>${categories.map(c=>`<tr><td><div class="transaction-description"><span class="transaction-icon" style="--item-color:${category(c.categoryId).color};color:${category(c.categoryId).color};background:${category(c.categoryId).color}15">${icon(category(c.categoryId).icon)}</span><strong>${esc(category(c.categoryId).name)}</strong></div></td><td>${m.transactions.filter(t=>t.categoryId===c.categoryId).length}</td><td>${percent(c.amount/m.expense*100)}%</td><td class="amount">${money(c.amount)}</td></tr>`).join('')}</tbody></table></div>`:empty('Chưa có chi tiêu trong tháng','Thêm giao dịch hoặc chọn tháng khác để xem báo cáo.')}</section>`;
}

function overviewNotices(monthly) {
  const due=state.recurring.filter(r=>r.active&&r.nextDate<=localDate());
  const watched=state.budgets.filter(b=>b.month===ui.month).map(b=>({...b,spent:monthly.categoryTotals.find(c=>c.categoryId===b.categoryId)?.amount||0}));
  const full=watched.filter(b=>b.spent>=b.amount),near=watched.filter(b=>b.spent>=b.amount*.8&&b.spent<b.amount);
  const lines=[];
  if(due.length) lines.push(`<div class="action-notice">${icon('calendar')}<div><strong>${due.length} khoản định kỳ đến hạn</strong><p>Kiểm tra và ghi vào sổ khi khoản thu hoặc chi đã phát sinh.</p></div><a class="btn secondary small" href="#recurring">Xem các khoản</a></div>`);
  if(full.length||near.length) lines.push(`<div class="action-notice">${icon('info')}<div><strong>${full.length?`${full.length} danh mục đã chạm hoặc vượt ngân sách`:`${near.length} danh mục đã dùng từ 80% ngân sách`}</strong><p>${esc([...full,...near].slice(0,3).map(b=>category(b.categoryId)?.name).join(', '))} · ${monthLabel(ui.month)}</p></div><a class="btn secondary small" href="#budgets">Xem ngân sách</a></div>`);
  return lines.length?`<section class="notice-list" aria-label="Khoản cần theo dõi">${lines.join('')}</section>`:'';
}

function renderCategories() {
  const all=getCategories(state);
  return `${pageHeader('Danh mục','Phân loại thu chi theo cách bạn sử dụng tiền.',`<button class="btn primary" data-action="add-category">${icon('plus')}Thêm danh mục</button>`)}
  <div class="category-manager-grid">${[['expense','Chi tiêu'],['income','Thu nhập']].map(([type,label])=>`<section class="card"><div class="card-header"><h2 class="card-title">${label}</h2><span class="muted">${all.filter(c=>c.type===type).length} danh mục</span></div><div class="managed-category-list">${all.filter(c=>c.type===type).map(c=>{const custom=state.customCategories.some(item=>item.id===c.id);return `<div class="managed-category-row"><span class="transaction-icon" style="--item-color:${c.color};color:${c.color}">${icon(c.icon)}</span><div class="managed-category-copy"><strong>${esc(c.name)}</strong><span class="muted">${custom?'Tự tạo':'Có sẵn'}</span></div>${custom?`<div class="row-actions"><button class="icon-btn" data-action="edit-category" data-id="${c.id}" aria-label="Sửa danh mục ${esc(c.name)}">${icon('edit')}</button><button class="icon-btn" data-action="delete-category" data-id="${c.id}" aria-label="Xóa danh mục ${esc(c.name)}">${icon('trash')}</button></div>`:''}</div>`;}).join('')}</div></section>`).join('')}</div><p class="helper-text">Danh mục đang được dùng trong giao dịch, ngân sách hoặc khoản định kỳ sẽ được giữ để báo cáo không mất thông tin. Bạn vẫn có thể đổi tên danh mục tự tạo.</p>`;
}

function categoryModal(id) {
  const c=state.customCategories.find(item=>item.id===id);
  if(id&&!c)return;
  const availableColors=[...colors];if(c&&!availableColors.some(([value])=>value===c.color))availableColors.unshift([c.color,'Màu hiện tại']);
  const categoryIcons=[['utensils','Ăn uống'],['home','Nhà ở'],['shopping','Mua sắm'],['car','Đi lại'],['coffee','Cà phê'],['heart','Cá nhân'],['book','Học tập'],['gift','Quà tặng'],['briefcase','Công việc'],['laptop','Thiết bị'],['coins','Tài chính'],['more','Khác']];
  if(c&&!categoryIcons.some(([value])=>value===c.icon))categoryIcons.unshift([c.icon,'Biểu tượng hiện tại']);
  openModal(c?'Sửa danh mục':'Thêm danh mục',`<form id="category-form" data-id="${c?.id||''}"><div class="form-grid">${field('name','Tên danh mục',c?.name||'',{maxlength:60,span:true,helper:'Ví dụ: Hẹn hò, Thú cưng, Tiền thưởng.'})}${c?`<input type="hidden" name="type" value="${c.type}"><div class="form-group"><span class="form-label">Loại danh mục</span><p>${c.type==='income'?'Thu nhập':'Chi tiêu'}</p></div>`:selectField('type','Loại danh mục',[['expense','Chi tiêu'],['income','Thu nhập']],'expense')}${selectField('icon','Biểu tượng',categoryIcons,c?.icon||'more')}${selectField('color','Màu sắc',availableColors,c?.color||'#13705c')}</div>${formFooter(c?'Lưu thay đổi':'Thêm danh mục')}</form>`);
}

const frequencyLabels={weekly:'Hằng tuần',monthly:'Hằng tháng',yearly:'Hằng năm'};
function renderRecurring() {
  const today=localDate();
  const records=[...state.recurring].sort((a,b)=>Number(b.active)-Number(a.active)||a.nextDate.localeCompare(b.nextDate));
  const due=records.filter(r=>r.active&&r.nextDate<=today);
  return `${pageHeader('Khoản định kỳ','Theo dõi tiền nhà, hóa đơn, lương và các khoản lặp lại.',`<button class="btn primary" data-action="add-recurring">${icon('plus')}Thêm khoản định kỳ</button>`)}
    <div class="info-note">${icon('info')}<span>Lịch chỉ nhắc khi bạn mở app. Chọn <strong>Ghi vào sổ</strong> sau khi khoản thu hoặc chi đã phát sinh; số dư chỉ thay đổi khi bạn xác nhận lưu.</span></div>
    ${due.length?`<p class="export-note"><strong>${due.length} khoản đến hạn hoặc quá hạn</strong>. Mỗi lần ghi nhận xử lý một kỳ; bạn có thể bỏ qua kỳ không phát sinh.</p>`:''}
    ${records.length?`<div class="recurring-list">${records.map(r=>{const c=category(r.categoryId);const status=!r.active?'Đang tạm dừng':r.nextDate<today?'Quá hạn':r.nextDate===today?'Đến hạn hôm nay':'Sắp tới';return `<article class="card recurring-item"><div class="recurring-main"><div class="recurring-meta"><span class="recurring-status ${!r.active?'is-paused':r.nextDate<=today?'is-due':''}">${status}</span><span>${frequencyLabels[r.frequency]}</span></div><h2>${esc(r.note||c.name)}</h2><p class="muted">${esc(c.name)} · ${esc(account(r.accountId)?.name)} · Kỳ tiếp theo ${dateLabel(r.nextDate)}</p><strong class="${r.type==='income'?'positive':'negative'}">${r.type==='income'?'+':'−'}${money(r.amount)}</strong></div><div class="recurring-actions">${r.active?`<button class="btn primary small" data-action="post-recurring" data-id="${r.id}">Ghi vào sổ</button><button class="btn secondary small" data-action="skip-recurring" data-id="${r.id}">Bỏ kỳ này</button>`:''}<button class="btn ghost small" data-action="toggle-recurring" data-id="${r.id}">${r.active?'Tạm dừng':'Tiếp tục'}</button><button class="icon-btn" data-action="edit-recurring" data-id="${r.id}" aria-label="Sửa khoản định kỳ ${esc(r.note||c.name)}">${icon('edit')}</button><button class="icon-btn" data-action="delete-recurring" data-id="${r.id}" aria-label="Xóa khoản định kỳ ${esc(r.note||c.name)}">${icon('trash')}</button></div></article>`;}).join('')}</div>`:`<section class="card">${empty('Chưa có khoản định kỳ','Tạo lịch cho tiền nhà, hóa đơn hoặc khoản lương thường xuyên.',`<button class="btn secondary" data-action="add-recurring">${icon('plus')}Thêm khoản đầu tiên</button>`)}</section>`}`;
}

function recurringModal(id) {
  const r=state.recurring.find(item=>item.id===id);if(id&&!r)return;
  openModal(r?'Sửa khoản định kỳ':'Thêm khoản định kỳ',`<form id="recurring-form" data-id="${r?.id||''}"><div class="form-grid">${field('note','Tên khoản thu hoặc chi',r?.note||'',{maxlength:2000,span:true,helper:'Ví dụ: Tiền thuê nhà, Internet, Lương hằng tháng.'})}${selectField('type','Loại giao dịch',[['expense','Chi tiêu'],['income','Thu nhập']],r?.type||'expense')}${moneyField('amount','Số tiền dự kiến (VND)',r?.amount||'')}<div id="recurring-routing" class="form-grid span-2">${transactionRouting(r?.type||'expense',r)}</div>${selectField('frequency','Lặp lại',Object.entries(frequencyLabels),r?.frequency||'monthly')}${field('nextDate','Ngày của kỳ tiếp theo',r?.nextDate||localDate(),{type:'date',min:'1900-01-01',max:'9999-12-31'})}<label class="checkbox-label span-2"><input type="checkbox" name="active" ${!r||r.active?'checked':''}> Đang theo dõi khoản này</label></div><p class="helper-text">Lịch ngày 29, 30 hoặc 31 dùng ngày cuối tháng nếu tháng đó ngắn hơn. Sau đó lịch trở lại ngày gốc.</p>${formFooter(r?'Lưu thay đổi':'Tạo lịch')}</form>`);
}

function postRecurringModal(id) {
  const r=state.recurring.find(item=>item.id===id);if(!r||!r.active)return;
  openModal('Ghi nhận khoản định kỳ',`<form id="recurring-post-form" data-id="${r.id}" data-expected-date="${r.nextDate}"><p class="modal-intro">${esc(r.note||category(r.categoryId)?.name)} · Kỳ ${dateLabel(r.nextDate)}. Kiểm tra ngày và số tiền thực tế trước khi lưu.</p><div class="form-grid">${moneyField('amount','Số tiền thực tế (VND)',r.amount,{span:true})}${transactionRouting(r.type,r)}${field('date','Ngày giao dịch thực tế',localDate(),{type:'date',min:'1900-01-01',max:'9999-12-31'})}${field('note','Ghi chú',r.note,{required:false,maxlength:2000})}</div><p class="helper-text">Lưu một giao dịch ${r.type==='income'?'thu nhập':'chi tiêu'} và chuyển lịch sang kỳ kế tiếp. Số tiền dự kiến của những kỳ sau giữ nguyên.</p>${formFooter('Lưu giao dịch')}</form>`);
}

function skipRecurring(id) {
  const r=state.recurring.find(item=>item.id===id);if(!r||!r.active)return;
  confirmModal('Bỏ qua kỳ này?',`<p>Bỏ kỳ <strong>${dateLabel(r.nextDate)}</strong> của <strong>${esc(r.note||category(r.categoryId)?.name)}</strong> và chuyển sang kỳ kế tiếp.</p><p>Không tạo giao dịch và không thay đổi số dư.</p>`,async()=>{try{if(await commit(skipRecurringOccurrence(state,id,r.nextDate))){closeModal(true);toast('Đã bỏ qua một kỳ.');}}catch(error){toast(error.message,true);}},'Bỏ kỳ này');
}

function exportWorkbook(monthOnly=false) {
  try {
    const rows=monthOnly?filterTransactions(state,{month:ui.month}):currentTransactions();
    const scopeLabel=monthOnly?monthLabel(ui.month):transactionScope();
    const bytes=makeExcel(state,rows,{scopeLabel,filterLabel:monthOnly?'Tất cả loại giao dịch, ví và danh mục':transactionFilterLabel(),generatedAt:new Date(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,categories:getCategories(state)});
    download(bytes,excelFilename(monthOnly?ui.month:ui.customRange?`${ui.startDate}_${ui.endDate}`:ui.allMonths?'tat-ca':ui.month),EXCEL_MIME);
    toast(`Đã tạo Excel gồm ${rows.length} giao dịch, tổng theo ngày và tổng cuối kỳ. Kiểm tra mục tải xuống.`);
  } catch(error) { toast(error.message||'Không tạo được tệp Excel. Dữ liệu trong sổ vẫn được giữ.',true); }
}

function timestampLabel(value) {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa xuất bản sao';
}

function backupTime(value) {
  return value ? new Intl.DateTimeFormat('vi-VN', {dateStyle:'short',timeStyle:'medium'}).format(new Date(value)) : 'Chưa có';
}

function saveStatusMarkup() {
  const s = backups?.getStatus();
  if (storageIssue || backupNeedsRecovery) return `${icon('info')}Kiểm tra dữ liệu`;
  if (!backupsReady) return `${icon('info')}Đang mở sổ`;
  if (s?.mode === 'file' && ['error','needs-permission'].includes(s.fileState)) return `${icon('info')}Kiểm tra sao lưu`;
  if (s?.mode === 'file' && s.pendingWrites) return `${icon('reset')}Đang ghi file`;
  if (s?.mode === 'file' && s.lastFileWriteAt) return `${icon('check')}Đã sao lưu file`;
  return `${icon('check')}Đã lưu trên máy`;
}

function backupAttentionMarkup() {
  const s = backups?.getStatus();
  if (backupNeedsRecovery) return `<div class="storage-warning" role="alert">${icon('info')}<span>Bản lưu chính không còn, nhưng vẫn có lịch sử của sổ trước. Hãy kiểm tra bản phục hồi trước khi ghi tiếp.</span><a href="#settings">Khôi phục sổ</a></div>`;
  const cloudIssue = cloud?.status()?.remoteChanges ? 'Bản sao trên GitHub đã thay đổi. Đã tạm dừng tự đồng bộ; hãy xem mục Đám mây trong Cài đặt.' : '';
  const issue = cloudIssue || backupNotice || s?.historyIssue || (s?.mode === 'file' && ['error','needs-permission'].includes(s.fileState) ? s.fileIssue : '') || s?.downloadIssue;
  if (issue) return `<div class="storage-warning" role="status">${icon('info')}<span>${esc(issue)}</span><a href="#settings">Kiểm tra sao lưu</a></div>`;
  if (backupsReady && s?.mode === 'off' && state.transactions.length && ui.route !== 'settings') return `<div class="backup-reminder">${icon('shield')}<span>Đã lưu trên trình duyệt. Chọn cách sao lưu file để giữ một bản riêng.</span><a href="#settings">Thiết lập sao lưu</a></div>`;
  return '';
}

function autoBackupMarkup() {
  const s = backups?.getStatus();
  if (!s?.initialized) return '<p class="helper-text" role="status">Đang kiểm tra các bản sao trên thiết bị…</p>';
  const fileLabels = {unconfigured:'Chưa chọn file',ready:'Đang tự động cập nhật',writing:'Đang ghi bản mới', 'needs-permission':'Cần cho phép ghi lại',error:'File chưa được cập nhật',paused:'Đã tạm ngừng ghi file'};
  return `<p>Mỗi lần bấm Lưu, sổ được ghi trên trình duyệt. Khi bật khóa sổ, file tự cập nhật cũng được mã hóa; bản tải JSON thủ công vẫn không mã hóa trừ khi chọn Tải bản sao mã hóa.</p>
    ${backupNeedsRecovery?`<div class="backup-recovery-callout"><strong>Tìm thấy ${s.snapshotCount} bản phục hồi của sổ trước</strong><p>Hãy xem lịch sử để khôi phục dữ liệu. Chỉ dùng sổ trống nếu bạn muốn bắt đầu lại.</p><div class="settings-actions"><button class="btn primary" data-action="backup-history">Xem lịch sử</button><button class="btn secondary" data-action="continue-empty">Dùng sổ trống</button></div></div>`:''}
    <div class="backup-option"><h3>File JSON tự cập nhật</h3>
      ${s.fileSupported?`<p>Chọn nơi lưu một lần. Sau mỗi thay đổi, app cập nhật file này khi còn quyền ghi. Giữ app mở đến khi hiện “Đã sao lưu file”.</p><div class="backup-status"><span>${fileLabels[s.fileState]||'Kiểm tra liên kết file'}</span><strong>${esc(s.fileName||'Chưa thiết lập')}</strong></div><div class="settings-actions"><button class="btn ${s.fileName?'secondary':'primary'}" data-action="choose-backup-file">${icon('download')}${s.fileName?'Đổi file':'Chọn file sao lưu'}</button>${s.fileName?`<button class="btn secondary" data-action="resume-backup-file">${s.filePermission==='granted'&&s.mode==='file'?'Cập nhật file ngay':'Cho phép ghi file'}</button><button class="btn ghost" data-action="disconnect-backup-file">Ngừng liên kết</button>`:''}</div><p class="helper-text">Ghi file thành công gần nhất: <strong>${backupTime(s.lastFileWriteAt)}</strong>.</p>`:'<p>Trình duyệt này chưa cho phép app tự ghi đè một file đã chọn. Bạn có thể dùng chế độ tải từng bản JSON bên dưới, hoặc lưu/chia sẻ bản sao vào ứng dụng Tệp.</p>'}
      ${s.fileIssue?`<p class="field-error" role="status">${esc(s.fileIssue)}</p>`:''}
      ${s.fileName&&!s.filePersistent?'<p class="helper-text">Liên kết file chỉ được giữ trong phiên này; hãy chọn lại khi mở app lần sau.</p>':''}
    </div>
    <div class="backup-option"><label class="checkbox-label backup-toggle"><input id="auto-download-backup" type="checkbox" ${s.downloadEnabled?'checked':''}><span>Tải một bản JSON sau mỗi lần lưu</span></label><p class="helper-text">Mỗi thay đổi tạo một file mới trong mục tải xuống. Hãy cho phép tải nhiều file nếu trình duyệt hỏi. Trình duyệt có thể chặn tải; app không thể xác nhận file đã được lưu vào máy.</p>${s.downloadEnabled?`<p class="helper-text">Lần yêu cầu tải gần nhất: <strong>${backupTime(s.lastDownloadAt)}</strong>. Chế độ này thay cho cập nhật một file.</p>`:''}${s.downloadIssue?`<p class="field-error">${esc(s.downloadIssue)}</p>`:''}</div>
    <div class="backup-option"><h3>Lịch sử phục hồi tự động</h3><p>${s.historyAvailable?`Đã giữ ${s.snapshotCount} bản, tối đa 30 bản gần nhất. Bạn có thể tải hoặc khôi phục từng bản.`:'Lịch sử phục hồi chưa khả dụng trong trình duyệt này. Hãy giữ file JSON riêng.'}</p><div class="settings-actions"><button class="btn secondary" data-action="backup-history" ${s.snapshotCount?'':'disabled'}>Xem lịch sử phục hồi</button>${s.persistence==='granted'?'<span class="backup-persistence">Được ưu tiên giữ trên thiết bị</span>':`<button class="btn ghost" data-action="persist-storage">Ưu tiên giữ dữ liệu</button>`}</div><p class="helper-text">Lịch sử nằm trên cùng thiết bị. Xóa dữ liệu website hoặc mất máy có thể làm mất lịch sử; file sao lưu nên được giữ thêm trong Drive, iCloud hoặc nơi riêng của bạn.</p>${s.historyIssue?`<p class="field-error">${esc(s.historyIssue)}</p>`:''}</div>
    ${!s.optionsPersistent?'<p class="field-error">Trình duyệt chưa ghi nhớ được lựa chọn sao lưu. Hãy kiểm tra lại sau khi mở app.</p>':''}`;
}

function refreshBackupStatus() {
  const status = $('#backup-save-status'); if (status) status.innerHTML = saveStatusMarkup();
  const attention = $('#backup-attention'); if (attention) attention.innerHTML = backupAttentionMarkup();
  const panel = $('#automatic-backup-content');
  if (panel) {
    const focusedId = panel.contains(document.activeElement) ? document.activeElement.id : '';
    panel.innerHTML = autoBackupMarkup();
    if (focusedId) document.getElementById(focusedId)?.focus({preventScroll:true});
  }
}

function backupTask(task, success = '') {
  Promise.resolve(task).then(result => {
    if (result?.cancelled) return;
    backupNotice = ''; refreshBackupStatus();
    const s = backups.getStatus();
    const error = (s.mode==='file'&&['error','needs-permission'].includes(s.fileState)) ? s.fileIssue : '';
    if (error) toast(error, true); else if (success) toast(success);
  }).catch(error => { if (error?.name!=='AbortError') toast(error.message||'Không hoàn tất được sao lưu. Sổ trên trình duyệt vẫn được giữ.',true); });
}
function canWriteBackupFile() {
  if(!backupsReady||backupNeedsRecovery||storageIssue){toast('Hãy hoàn tất kiểm tra hoặc khôi phục sổ trong Cài đặt trước khi cập nhật file sao lưu.',true);return false;}
  return true;
}

async function showBackupHistory() {
  const revision = dialogRevision;
  const entries = await backups.listSnapshots();
  if (dialogRevision!==revision || formDirty) return;
  openModal('Lịch sử phục hồi', `<p class="modal-intro">Mỗi bản chứa toàn bộ sổ tại thời điểm lưu. Khôi phục sẽ thay sổ hiện tại sau khi bạn xác nhận.</p>${entries.length?`<div class="backup-history-list">${entries.map(entry=>`<article class="backup-history-item"><div><strong>${backupTime(entry.savedAt)}</strong><p>${esc(entry.reason)}</p><p class="helper-text">${entry.transactions} giao dịch · ${entry.accounts} ví · ${entry.goals} mục tiêu</p></div><div class="settings-actions"><button class="btn secondary small" data-action="download-snapshot" data-id="${esc(entry.id)}">Tải JSON</button><button class="btn secondary small" data-action="restore-snapshot" data-id="${esc(entry.id)}">Khôi phục</button></div></article>`).join('')}</div>`:'<p>Chưa có lịch sử phục hồi hợp lệ.</p>'}`);
}

async function useSnapshot(id, restore = false) {
  const revision = dialogRevision;
  try {
    const entry = await backups.getSnapshot(id);
    if (!entry) throw new Error('Không còn bản phục hồi này. Hãy mở lại lịch sử.');
    if (dialogRevision!==revision || formDirty) return;
    if (!restore) {
      download(JSON.stringify(entry.state,null,2),`money-management-history-${entry.savedAt.replace(/[:.]/g,'-')}.json`,'application/json;charset=utf-8');
      toast('Đã yêu cầu tải JSON. Kiểm tra mục tải xuống.'); return;
    }
    confirmModal('Khôi phục bản đã chọn?',`<p>Bản lúc <strong>${backupTime(entry.savedAt)}</strong> có <strong>${entry.state.transactions.length} giao dịch</strong> và <strong>${entry.state.accounts.length} ví</strong>.</p><p>Sổ hiện tại sẽ được thay thế. Bạn có thể tải bản sao hiện tại trước khi tiếp tục.</p>`,async()=>{
      if (await commit(entry.state,{replace:true,reason:'Khôi phục từ lịch sử'})) {closeModal(true);resetFilters();render();toast('Đã khôi phục sổ.');}
    },'Khôi phục sổ',true);
  } catch(error) {toast(error.message,true);}
}

async function shareBackup() {
  if (corruptRaw!==null) {backup();return;}
  const file = new File([JSON.stringify(state,null,2)],`money-management-backup-${localDate()}.json`,{type:'application/json'});
  if (!navigator.share || !navigator.canShare?.({files:[file]})) {backup();return;}
  try {
    await navigator.share({files:[file],title:'Bản sao Money Management'});
    ledger.markBackup();
    toast('Đã chuyển bản sao tới lựa chọn của bạn. Hãy kiểm tra nơi lưu.');
  } catch(error) {if(error?.name!=='AbortError')toast('Chưa chia sẻ được bản sao. Bạn có thể dùng nút Tải bản sao JSON.',true);}
}

function securityMarkup() {
  return `<section class="card settings-section" id="security-settings"><div class="card-header"><h2 class="card-title">Mã hóa dữ liệu trên thiết bị</h2></div><div class="card-body">
    ${vault.enabled
      ? `<p><strong>Đang bật mã hóa AES-256-GCM.</strong> Sổ chính và lịch sử phục hồi được mã hóa trước khi lưu vào trình duyệt. Bạn cần mật khẩu mỗi khi mở phiên mới.</p><p class="helper-text">Mật khẩu không thể khôi phục nếu quên. Các bản JSON đã tải trước đó vẫn là dữ liệu không mã hóa. File JSON tự cập nhật từ phiên bản này được mã hóa nếu chế độ khóa sổ đang bật; hãy giữ mật khẩu để nhập lại.</p><div class="settings-actions"><button class="btn secondary" data-action="backup-encrypted">Tải bản sao mã hóa</button><button class="btn ghost" data-action="lock-vault">Khóa ứng dụng</button></div>`
      : `<p>Khóa sổ bằng mật khẩu riêng, mã hóa dữ liệu tài chính lưu trong trình duyệt và lịch sử phục hồi. Hãy giữ một bản JSON ở nơi riêng trước khi bật; quên mật khẩu sẽ không giải mã được.</p><div class="form-group"><label for="vault-new-password">Mật khẩu mã hóa (ít nhất 12 ký tự)</label><input id="vault-new-password" class="form-control" type="password" autocomplete="new-password" minlength="12" placeholder="Nhập mật khẩu riêng"></div><div class="form-group"><label for="vault-confirm-password">Nhập lại mật khẩu</label><input id="vault-confirm-password" class="form-control" type="password" autocomplete="new-password" minlength="12" placeholder="Xác nhận mật khẩu"></div><button class="btn primary" data-action="enable-vault">Bật mã hóa sổ</button>`}
  </div></section>`;
}
function cloudMarkup() {
  const c = cloud.status();
  return `<section class="card settings-section" id="cloud-settings"><div class="card-header"><h2 class="card-title">Sao lưu và đồng bộ qua GitHub</h2></div><div class="card-body" id="cloud-status-content">
    <p>Đồng bộ một <strong>Gist chứa dữ liệu mã hóa</strong>, không đưa giao dịch vào repository Public. Cần bạn cấp quyền Gist bằng mã truy cập GitHub; chỉ lưu mã này bên trong sổ đã khóa.</p>
    ${!vault.enabled ? `<p class="helper-text">Hãy bật mã hóa dữ liệu trên thiết bị ở mục bên trên trước khi kết nối đám mây.</p>`
      : c.connected
        ? `<div class="backup-status"><span>Trạng thái đám mây</span><strong>${c.remoteChanges?'Có phiên bản mới cần xử lý':c.status==='syncing'?'Đang đồng bộ':c.status==='offline'?'Chưa có mạng':c.status==='error'?'Có lỗi đồng bộ':'Đã kết nối'}</strong></div><p class="helper-text">Gist ID: <code>${esc(c.gistId)}</code>. Lần đồng bộ hoàn thành: ${backupTime(c.lastSyncedAt)}. Sau mỗi lần lưu, app tự thử sao lưu khi có mạng.</p>${c.error?`<p class="field-error" role="status">${esc(c.error)}</p>`:''}
           <div class="settings-actions"><button class="btn secondary" data-action="cloud-check">Kiểm tra bản đám mây</button><button class="btn primary" data-action="cloud-pull">Xem & khôi phục bản đám mây</button><button class="btn secondary" data-action="cloud-push" ${c.remoteChanges?'disabled':''}>Sao lưu lên GitHub ngay</button><button class="btn ghost" data-action="cloud-disconnect">Ngắt kết nối</button></div><p class="helper-text">Trên thiết bị khác, bật mã hóa rồi dùng Gist ID ở trên để kết nối. Khi thấy dữ liệu khác nhau, app dừng ghi đè để bạn chọn bản cần giữ.</p>`
        : `<div class="form-group"><label for="cloud-token">Mã truy cập GitHub (quyền Gists: Read and write)</label><input id="cloud-token" type="password" class="form-control" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></div><div class="form-group"><label for="cloud-password">Mật khẩu dành cho bản sao đám mây (ít nhất 12 ký tự)</label><input id="cloud-password" type="password" class="form-control" autocomplete="new-password" minlength="12" placeholder="Không gửi mật khẩu trong chat"></div><div class="form-group"><label for="cloud-gist-id">Gist ID hoặc URL (bỏ trống để tạo mới)</label><input id="cloud-gist-id" class="form-control" autocomplete="off" spellcheck="false" placeholder="Dán ID Gist nếu kết nối thiết bị thứ hai"></div><div class="settings-actions"><button class="btn primary" data-action="cloud-connect">${icon('shield')}Kết nối / tạo bản sao đám mây</button></div><p class="helper-text">Tạo mã có quyền <strong>Gists: Read and write</strong> tại <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub Personal Access Tokens</a>. Không dùng mật khẩu GitHub. Mã chỉ có hiệu lực với các quyền bạn cấp; Gist không công khai danh sách nhưng ai biết URL vẫn có thể truy cập nội dung mã hóa.</p>`}
    <p class="helper-text">Đồng bộ chạy khi ứng dụng mở và có mạng; không thể đảm bảo hai thiết bị sửa cùng lúc không xung đột. Không chia sẻ mã truy cập/mật khẩu; giữ thêm bản sao JSON độc lập.</p>
  </div></section>`;
}
function refreshCloudStatus() {
  const panel = $('#cloud-settings');
  if (panel && !panel.contains(document.activeElement)) panel.outerHTML = cloudMarkup();
  const attention = $('#backup-attention'); if (attention) attention.innerHTML = backupAttentionMarkup();
}
async function enableVault() {
  if (cloudBusy || savingLedger || !backupsReady || backupNeedsRecovery || storageIssue) { toast('Hãy hoàn tất lưu và khôi phục sổ trước khi bật mã hóa.',true);return; }
  const password=$('#vault-new-password')?.value || '', confirm=$('#vault-confirm-password')?.value || '';
  if (password.length<12 || password!==confirm) {toast('Mật khẩu phải có ít nhất 12 ký tự và hai lần nhập phải trùng nhau.',true);return;}
  if (!window.confirm('Mã hóa sổ đang sử dụng? Nếu quên mật khẩu, bạn sẽ không thể mở lại sổ. Hãy lưu bản sao JSON trước khi tiếp tục.')) return;
  cloudBusy=true;
  try {
    await backups.flush();
    const downloadBeforeEncryption = backups.getStatus().downloadEnabled;
    await vault.enable(password);
    // Automatic browser downloads cannot reliably preserve user activation after
    // asynchronous AES encryption. Stop exporting plaintext per edit silently.
    if (downloadBeforeEncryption) { backups.setDownloadMode(false); backupNotice = 'Đã tắt tải JSON tự động không mã hóa. Hãy dùng Tải bản sao mã hóa hoặc file tự cập nhật để giữ dữ liệu riêng.'; }
    // Re-encrypt old IndexedDB snapshots; avoid leaving recoverable cleartext history.
    try { await backups.repository.migratePlaintext(); }
    catch { backupNotice='Sổ chính đã mã hóa nhưng chưa hoàn tất mã hóa lịch sử cũ. Hãy xuất bản sao, kiểm tra lịch sử và mở lại ứng dụng.'; }
    toast('Đã bật mã hóa sổ. Hãy ghi nhớ mật khẩu và giữ thêm một bản sao mã hóa.');
    render();
  } catch(error) {toast(error.message || 'Chưa bật được mã hóa. Sổ vẫn được giữ nguyên.',true);}
  finally {cloudBusy=false;}
}
async function downloadEncryptedBackup() {
  try { const text=await vault.encryptExport(JSON.stringify(state)); download(text,`money-management-encrypted-${localDate()}.json`,'application/json');toast('Đã tạo bản JSON mã hóa. Kiểm tra thư mục Tải xuống.'); }
  catch(error){toast(error.message,true);}
}
async function cloudConnect() {
  if (cloudBusy || !vault.enabled) {toast('Hãy bật mã hóa trên thiết bị trước.',true);return;}
  const token=$('#cloud-token')?.value.trim(), password=$('#cloud-password')?.value || '', gist=$('#cloud-gist-id')?.value.trim();
  if(!token || !password || password.length<12){toast('Cần mã truy cập GitHub và mật khẩu đám mây ít nhất 12 ký tự.',true);return;}
  cloudBusy=true;
  try {
    if(gist){await cloud.connect(token,gist,password);toast('Đã kết nối. Hãy chọn Xem & khôi phục để nhận dữ liệu từ thiết bị trước.');}
    else {await cloud.create(token,password,state);toast('Đã tạo Gist mã hóa. Lưu lại Gist ID để dùng trên thiết bị khác.');}
    render();
  } catch(error){toast(error.message||'Kết nối GitHub không thành công.',true);}
  finally{cloudBusy=false;}
}
async function cloudPull() {
  if(cloudBusy||!cloud.connection)return;
  cloudBusy=true;
  try {
    await cloud.check();
    let latest=cloud.peekRemote();
    if(!latest){toast('Đám mây đang cùng phiên bản mà thiết bị đã đồng bộ.');return;}
    confirmModal('Nhận sổ từ đám mây?',`<p>Bản đám mây có <strong>${latest.state.transactions.length} giao dịch</strong>, <strong>${latest.state.accounts.length} ví</strong> và <strong>${latest.state.goals.length} mục tiêu</strong>.</p><p>Thao tác này <strong>thay sổ đang mở</strong>, không gộp giao dịch. Hãy tải bản sao hiện tại để phòng mất những thay đổi mới trên thiết bị.</p>`,async()=>{
      if(await commit(latest.state,{replace:true,reason:'Nhận sổ từ GitHub Gist',cloudPush:false})){
        try{await cloud.acknowledgePull(latest.revision);closeModal(true);resetFilters();render();toast('Đã nhận bản đám mây.');}
        catch(error){toast(`Sổ đã nhận nhưng chưa ghi nhớ phiên bản đám mây: ${error.message}`,true);}
      }
    },'Thay bằng bản đám mây',true);
  }catch(error){toast(error.message||'Không đọc được bản đám mây.',true);}
  finally{cloudBusy=false;}
}
async function cloudPush() {
  if(!cloud.connection)return;
  const okay=await cloud.push(state);
  if(okay)toast('Đã sao lưu dữ liệu mã hóa lên GitHub.');else toast(cloud.status().error||'Chưa đồng bộ. Kiểm tra mục Đám mây.',true);
}
async function cloudDisconnect() {
  if(!window.confirm('Ngắt liên kết GitHub khỏi thiết bị này? Gist mã hóa trên GitHub sẽ vẫn được giữ.'))return;
  try{await cloud.disconnect();render();toast('Đã ngắt liên kết.');}catch(error){toast(error.message,true);}
}

function renderSettings() {
  const recovery = ledger.getRecovery();
  const lastBackup = ledger.lastBackupAt();
  return `${pageHeader('Cài đặt & dữ liệu','Thông tin cá nhân, sao lưu và khôi phục sổ.')}
  <div class="settings-grid">
    <section class="card settings-section backup-settings"><div class="card-header"><h2 class="card-title">Sao lưu tự động</h2></div><div class="card-body" id="automatic-backup-content">${autoBackupMarkup()}</div></section>
    ${renderPwaSettings()}
    ${securityMarkup()}
    ${cloudMarkup()}
    <section class="card settings-section"><div class="card-header"><h2 class="card-title">Giao diện</h2></div><div class="card-body"><div class="form-group"><label for="theme-preference">Chế độ hiển thị</label><select id="theme-preference" class="form-control">${[['system','Theo hệ thống'],['light','Sáng'],['dark','Tối']].map(([value,label])=>`<option value="${value}" ${getThemePreference()===value?'selected':''}>${label}</option>`).join('')}</select></div><p class="helper-text">Lựa chọn được nhớ trên trình duyệt này. Bạn cũng có thể đổi nhanh bằng nút ở góc trên.</p></div></section>
    <section class="card settings-section"><div class="card-header"><h2 class="card-title">Thông tin cá nhân</h2></div><form id="profile-form" class="card-body"><div class="form-group"><label for="profile-name">Tên hiển thị</label><input id="profile-name" class="form-control" name="name" value="${esc(profileDraft ?? state.profile.name)}" required maxlength="60"></div><div class="form-group"><label for="currency">Đơn vị tiền tệ</label><input id="currency" class="form-control" value="Việt Nam đồng (VND)" disabled></div><button class="btn primary" type="submit">Lưu thay đổi</button><button class="btn ghost" type="button" data-action="discard-profile-draft">Hủy sửa tên</button></form></section>
    <section class="card settings-section"><div class="card-header"><h2 class="card-title">Sao lưu & khôi phục</h2></div><div class="card-body"><p>Sổ được lưu trên trình duyệt này. Tải bản sao JSON để giữ dữ liệu khi đổi thiết bị, đổi địa chỉ website hoặc xóa dữ liệu duyệt web.</p><div class="backup-status"><span>Lần xuất gần nhất</span><strong>${timestampLabel(lastBackup)}</strong></div><div class="settings-actions"><button class="btn secondary" data-action="backup">${icon('download')}${corruptRaw!==null?'Tải dữ liệu gốc bị lỗi':'Tải bản sao JSON'}</button><button class="btn secondary" data-action="share-backup">${icon('upload')}Lưu / chia sẻ bản sao</button><button class="btn secondary" data-action="import">${icon('upload')}Nhập bản sao JSON</button></div><input id="import-file" type="file" accept=".json,application/json" hidden><p class="helper-text">Nhập bản sao sẽ thay thế sổ hiện tại sau khi xác nhận. Hỗ trợ cả bản sao từ phiên bản cũ.</p>${corruptRaw!==null?`<p class="helper-text">Sổ đang hiển thị có ${state.transactions.length} giao dịch. JSON của sổ này không chứa dữ liệu gốc bị lỗi.</p><button class="btn secondary" data-action="backup-visible">Tải sổ đang hiển thị (JSON)</button>`:''}</div></section>
    <section class="card settings-section"><div class="card-header"><h2 class="card-title">Bản phục hồi trên thiết bị</h2></div><div class="card-body"><p>App giữ một trạng thái hợp lệ trước lần lưu gần nhất, để khôi phục khi sửa hoặc xóa nhầm.</p>${recovery?`<div class="backup-status"><span>${timestampLabel(recovery.savedAt)}</span><strong>${recovery.state.transactions.length} giao dịch · ${recovery.state.accounts.length} ví</strong></div><div class="settings-actions"><button class="btn secondary" data-action="download-recovery">${icon('download')}Tải bản phục hồi</button><button class="btn secondary" data-action="restore-recovery">Khôi phục trạng thái này</button></div>`:'<p class="helper-text">Chưa có bản phục hồi. App sẽ tạo bản này khi bạn lưu thay đổi.</p>'}<p class="helper-text">Bản này nằm cùng trình duyệt với sổ, nên không thay thế bản sao JSON bạn tải về.</p></div></section>
    <section class="card settings-section"><div class="card-header"><h2 class="card-title">Quản lý sổ</h2></div><div class="card-body"><div class="settings-counts"><div><strong>${state.transactions.length}</strong><span>Giao dịch</span></div><div><strong>${state.accounts.length}</strong><span>Ví</span></div><div><strong>${state.goals.length}</strong><span>Mục tiêu</span></div></div><p class="helper-text">${state.demo?'Sổ đang chứa dữ liệu mẫu.':'Sổ cá nhân.'} ${vault.enabled?'Sổ đang mã hóa tại chỗ.':'Sổ chưa mã hóa.'} Đồng bộ đám mây chỉ hoạt động nếu bạn đã tự kết nối GitHub Gist; app không kết nối ngân hàng.</p><div class="settings-actions"><button class="btn danger" data-action="start-fresh">Xóa dữ liệu, tạo sổ mới</button><button class="btn ghost" data-action="load-demo">Nạp dữ liệu mẫu</button></div><p class="helper-text">Money Management · Phiên bản 1.4.0</p></div></section>
  </div>`;
}

let modalAction = null;
function openModal(title, content) {
  if (ui.menu) setMenu(false);
  dialogRevision++;
  lastFocus = document.activeElement;
  formDirty = false;
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${esc(title)}</h2><button class="icon-btn modal-close" data-action="close-modal" aria-label="Đóng hộp thoại">${icon('close')}</button></div><div class="modal-body">${content}</div></section></div>`;
  $('#app').inert = true; document.body.style.overflow='hidden';
  requestAnimationFrame(()=>$('.modal input:not([type="hidden"]), .modal select, .modal textarea, .modal .btn, .modal-close')?.focus());
}
function closeModal(force = false) {
  if (formDirty && !force && !window.confirm('Bỏ các thay đổi chưa lưu?')) return;
  dialogRevision++;
  $('#modal-root').innerHTML=''; $('#app').inert=false;document.body.style.overflow=''; modalAction=null;formDirty=false;
  if (pendingStorageRefresh) applyStorageRefresh(true);
  if(lastFocus?.isConnected) lastFocus.focus(); else $('.page-title')?.focus();
}
function formFooter(save='Lưu thay đổi') { return `<p id="modal-error" class="field-error" role="alert"></p><div class="modal-footer"><button type="button" class="btn secondary" data-action="close-modal">Hủy</button><button class="btn primary" type="submit">${save}</button></div>`; }
function field(name,label,value='',options={}) {
  const {type='text',required=true,min,max,maxlength,helper,span=false}=options;
  return `<div class="form-group ${span?'span-2':''}"><label for="field-${name}">${label}</label><input class="form-control" id="field-${name}" name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} ${maxlength?`maxlength="${maxlength}"`:''} ${type==='number'?'step="1" inputmode="numeric"':''}>${helper?`<p class="helper-text">${helper}</p>`:''}</div>`;
}
function moneyField(name,label,value='',options={}) {
  const {min=1,max=1000000000000,helper='Nhập số tiền nguyên, ví dụ 85000 hoặc 85.000.',span=false}=options;
  return `<div class="form-group ${span?'span-2':''}"><label for="field-${name}">${label}</label><input class="form-control" id="field-${name}" name="${name}" type="text" inputmode="numeric" data-money-input data-min="${min}" data-max="${max}" value="${esc(formatVndInput(value))}" maxlength="32" required autocomplete="off">${helper?`<p class="helper-text">${helper}</p>`:''}</div>`;
}
function validateMoneyInput(input) {
  try { parseVndAmount(input.value,{min:Number(input.dataset.min),max:Number(input.dataset.max)}); input.setCustomValidity(''); return true; }
  catch(error) { input.setCustomValidity(error.message); return false; }
}
function refreshDraftChoices() {
  const form=$('.modal form');if(!form)return;
  const type=form.elements.type?.value||state.recurring.find(r=>r.id===form.dataset.id)?.type||'expense';
  const replaceOptions=(name,options,label)=>{
    const select=form.elements[name];if(!select||select.tagName!=='SELECT')return;
    const value=select.value, exists=options.some(([id])=>id===value);
    select.innerHTML=`${exists?'':`<option value="" disabled selected>${label}</option>`}${options.map(([id,text])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(text)}</option>`).join('')}`;
  };
  replaceOptions('accountId',state.accounts.map(a=>[a.id,a.name]),'Chọn lại ví');
  replaceOptions('transferToAccountId',state.accounts.filter(a=>a.id!==form.elements.accountId?.value).map(a=>[a.id,a.name]),'Chọn lại ví nhận');
  replaceOptions('categoryId',getCategories(state).filter(c=>c.type===type).map(c=>[c.id,c.name]),'Chọn lại danh mục');
}
function selectField(name,label,options,value) {return `<div class="form-group"><label for="field-${name}">${label}</label><select class="form-control" id="field-${name}" name="${name}" required>${options.map(([v,l])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`;}
const colors=[['#13705c','Xanh ngọc'],['#6b78a4','Tím xám'],['#ad7542','Nâu cam'],['#4c7b9d','Xanh dương'],['#9d647b','Hồng'],['#84705a','Nâu']];

function transactionRouting(type, transaction = {}) {
  const source = transaction.accountId || state.accounts[0].id;
  const wallets = state.accounts.map(a => [a.id, a.name]);
  if (type === 'transfer') {
    const targets = wallets.filter(([id]) => id !== source);
    const target = targets.some(([id]) => id === transaction.transferToAccountId) ? transaction.transferToAccountId : targets[0]?.[0];
    return `<input type="hidden" name="categoryId" value="transfer">${selectField('accountId','Từ ví',wallets,source)}${selectField('transferToAccountId','Đến ví',targets,target)}`;
  }
  const categories = getCategories(state).filter(c => c.type === type).map(c => [c.id,c.name]);
  return `${selectField('categoryId','Danh mục',categories,transaction.categoryId)}${selectField('accountId',type==='income'?'Ví nhận tiền':'Ví thanh toán',wallets,source)}`;
}

function transactionModal(id, desiredType='expense') {
  const transaction = state.transactions.find(t => t.id === id);
  const type = transaction?.type || desiredType;
  if (type === 'transfer' && state.accounts.length < 2) { toast('Thêm ít nhất hai ví để ghi nhận chuyển tiền.', true); return; }
  const date = ui.month === monthKey(localDate()) ? localDate() : `${ui.month}-01`;
  openModal(transaction?'Sửa giao dịch':'Thêm giao dịch',`<form id="transaction-form" data-id="${transaction?.id || ''}"><input type="hidden" name="type" value="${type}"><div class="segmented transaction-type" aria-label="Loại giao dịch">${[['expense','Chi tiêu'],['income','Thu nhập'],['transfer','Chuyển ví']].map(([value,label])=>`<button type="button" data-action="transaction-kind" data-type="${value}" class="${type===value?'active':''}" aria-pressed="${type===value}" ${value==='transfer'&&state.accounts.length<2?'disabled title="Cần ít nhất hai ví"':''}>${label}</button>`).join('')}</div><div class="form-grid">${moneyField('amount','Số tiền (VND)',transaction?.amount || '',{span:true,helper:'Nhập 85000 hoặc 85.000 đều được hiểu là 85.000 ₫.'})}<div id="transaction-routing" class="form-grid span-2">${transactionRouting(type,transaction)}</div><p id="transfer-note" class="helper-text span-2" ${type==='transfer'?'':'hidden'}>Chỉ ghi nhận việc chuyển tiền đã thực hiện. Không tính khoản này vào thu nhập hay chi tiêu.</p>${field('date','Ngày giao dịch',transaction?.date || date,{type:'date',min:'1900-01-01',max:'9999-12-31'})}${field('note','Ghi chú',transaction?.note || '',{required:false,maxlength:2000,helper:'Ví dụ: Ăn trưa, tiền lương hoặc rút tiền mặt.'})}</div>${formFooter(transaction?'Lưu thay đổi':'Lưu giao dịch')}</form>`);
  requestAnimationFrame(() => $('#field-amount')?.focus());
}

function budgetModal(id) {
  const b=state.budgets.find(b=>b.id===id);
  openModal(b?'Sửa ngân sách':'Thêm ngân sách',`<form id="budget-form" data-id="${b?.id||''}"><p class="modal-intro">Mỗi danh mục có một hạn mức riêng cho từng tháng.</p><div class="form-grid">${selectField('categoryId','Danh mục',getCategories(state).filter(c=>c.type==='expense').map(c=>[c.id,c.name]),b?.categoryId||'')}${field('month','Tháng áp dụng',b?.month||ui.month,{type:'month',min:'1900-01',max:'9999-12'})}${moneyField('amount','Hạn mức (VND)',b?.amount||'',{span:true})}</div>${formFooter(b?'Lưu thay đổi':'Tạo ngân sách')}</form>`);
}
function goalModal(id) {
  const g=state.goals.find(g=>g.id===id);
  const defaultDeadline=`${shiftMonth(monthKey(localDate()),6)}-01`;
  const goalColors=[...colors]; if(g&&!goalColors.some(c=>c[0]===g.color)) goalColors.unshift([g.color,'Màu hiện tại']);
  openModal(g?'Sửa mục tiêu':'Tạo mục tiêu tiết kiệm',`<form id="goal-form" data-id="${g?.id||''}"><div class="form-grid">${field('name','Tên mục tiêu',g?.name||'',{maxlength:80,span:true})}${moneyField('target','Số tiền mục tiêu (VND)',g?.target||'')}${moneyField('saved','Đã để dành (VND)',g?.saved||0,{min:0})}${field('deadline','Ngày muốn đạt mục tiêu',g?.deadline||defaultDeadline,{type:'date',min:'1900-01-01',max:'9999-12-31'})}${selectField('icon','Biểu tượng',[['plane','Chuyến đi'],['laptop','Thiết bị'],['shield','Dự phòng'],['home','Nhà cửa'],['book','Học tập'],['target','Dự định khác']],g?.icon||'target')}${selectField('color','Màu sắc',goalColors,g?.color||'#13705c')}</div><p class="helper-text">Số đã để dành được theo dõi riêng, không trừ vào số dư ví.</p>${formFooter(g?'Lưu thay đổi':'Tạo mục tiêu')}</form>`);
}
function walletModal(id) {
  const a=state.accounts.find(a=>a.id===id);
  const walletColors=[...colors];if(a&&!walletColors.some(c=>c[0]===a.color))walletColors.unshift([a.color,'Màu hiện tại']);
  openModal(a?'Sửa ví':'Thêm ví mới',`<form id="wallet-form" data-id="${a?.id||''}"><div class="form-grid">${field('name','Tên ví',a?.name||'',{maxlength:60,span:true})}${moneyField('initialBalance','Số dư ban đầu (VND)',a?.initialBalance||0,{min:-1000000000000,span:true,helper:'Số tiền có sẵn trước các giao dịch đang theo dõi. Thay đổi số này sẽ điều chỉnh số dư hiện tại.'})}${selectField('icon','Loại ví',[['wallet','Tiền mặt'],['bank','Ngân hàng'],['phone','Ví điện tử']],a?.icon==='smartphone'?'phone':a?.icon||'wallet')}${selectField('color','Màu sắc',walletColors,a?.color||'#13705c')}</div>${formFooter(a?'Lưu thay đổi':'Thêm ví')}</form>`);
}
function contributeModal(id) {
  const goal=state.goals.find(g=>g.id===id); if(!goal)return;
  openModal('Ghi nhận khoản tiết kiệm',`<form id="contribute-form" data-id="${goal.id}"><div class="contribution-goal"><span class="goal-icon" style="--item-color:${goal.color};color:${goal.color}">${icon(goal.icon)}</span><div><strong>${esc(goal.name)}</strong><p class="muted">Đã tích lũy ${money(goal.saved)}</p></div></div>${moneyField('amount','Số tiền để dành thêm (VND)')}<p class="helper-text">Khoản này chỉ cập nhật tiến độ mục tiêu. Số dư ví giữ nguyên.</p>${formFooter('Ghi nhận tiết kiệm')}</form>`);
}
function confirmModal(title,copy,onConfirm,label='Xác nhận',backup=false) {
  openModal(title,`<div class="confirm-copy">${copy}</div>${backup?'<button class="btn secondary" data-action="backup">'+icon('download')+(corruptRaw!==null?'Tải dữ liệu gốc bị lỗi':'Tải bản sao hiện tại')+'</button>':''}<div class="modal-footer"><button class="btn secondary" data-action="close-modal">Hủy</button><button class="btn danger" data-action="confirm-action">${label}</button></div>`);
  modalAction=onConfirm;
}
function removeRecord(kind,id) {
  const list=state[kind],record=list.find(x=>x.id===id);if(!record)return;
  if(kind==='accounts') {
    if(state.accounts.length===1){toast('Cần giữ lại ít nhất một ví để ghi giao dịch.',true);return;}
    if(state.transactions.some(t=>t.accountId===id||t.transferToAccountId===id)){toast('Ví này còn giao dịch. Hãy chuyển giao dịch sang ví khác trước khi xóa.',true);return;}
    if(state.recurring.some(r=>r.accountId===id)){toast('Ví này đang được dùng trong khoản định kỳ. Hãy đổi ví của lịch trước khi xóa.',true);return;}
  }
  if(kind==='customCategories'&&(state.transactions.some(t=>t.categoryId===id)||state.budgets.some(b=>b.categoryId===id)||state.recurring.some(r=>r.categoryId===id))){toast('Danh mục đang được sử dụng. Hãy chuyển các giao dịch, ngân sách và khoản định kỳ sang danh mục khác trước khi xóa.',true);return;}
  const names={transactions:'giao dịch',budgets:'ngân sách',goals:'mục tiêu',accounts:'ví',customCategories:'danh mục',recurring:'khoản định kỳ'};
  const label=record.name||record.note||category(record.categoryId)?.name||names[kind];
  confirmModal(`Xóa ${names[kind]}?`,`<p>Bạn muốn xóa <strong>${esc(label)}</strong>?</p><p>${kind==='transactions'?'Số dư ví, ngân sách và báo cáo sẽ được cập nhật ngay.':'Các giao dịch đã ghi vẫn được giữ.'}</p>`,async()=>{const next=clone();next[kind]=next[kind].filter(x=>x.id!==id);if(await commit(next,{reason:`Xóa ${names[kind]}`})){closeModal();toast(`Đã xóa ${names[kind]}.`);}},'Xóa');
}

function download(content,name,type) {
  const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function backup() {
  if (corruptRaw !== null) {
    download(corruptRaw,`money-management-original-recovery-${localDate()}.json`,'application/json;charset=utf-8');
    toast('Đã tạo tệp dữ liệu gốc bị lỗi để phục hồi. Tệp này chưa phải bản sao JSON hợp lệ.');
    return;
  }
  download(JSON.stringify(state,null,2),`money-management-backup-${localDate()}.json`,'application/json;charset=utf-8');
  ledger.markBackup();
  if (ui.route === 'settings') render();
  toast('Đã tạo tệp JSON. Kiểm tra mục tải xuống để giữ bản sao.');
}
function restoreRecovery() {
  const recovery = ledger.getRecovery();
  if (!recovery) { toast('Không có bản phục hồi hợp lệ.', true); return; }
  confirmModal('Khôi phục trạng thái trước?',`<p>Bản phục hồi lúc <strong>${timestampLabel(recovery.savedAt)}</strong> có <strong>${recovery.state.transactions.length} giao dịch</strong>.</p><p>Sổ hiện tại sẽ được thay thế bằng trạng thái này.</p>`,async()=>{
    if (await commit(recovery.state,{replace:true,reason:'Khôi phục trạng thái trước'})) { closeModal(true); resetFilters(); render(); toast('Đã khôi phục trạng thái trước.'); }
  },'Khôi phục',true);
}
function confirmImportedState(imported) {
  confirmModal('Khôi phục sổ từ bản sao lưu?',`<p>Bản sao có <strong>${imported.transactions.length} giao dịch</strong>, <strong>${imported.accounts.length} ví</strong> và <strong>${imported.goals.length} mục tiêu</strong>, <strong>${imported.customCategories.length} danh mục tự tạo</strong> và <strong>${imported.recurring.length} khoản định kỳ</strong>.</p><p>Sổ hiện tại sẽ được thay thế hoàn toàn. Bạn có thể tải bản sao hiện tại trước khi tiếp tục.</p>`,async()=>{if(await commit(imported,{replace:true,reason:'Nhập bản sao JSON'})){closeModal();resetFilters();render();toast('Đã khôi phục dữ liệu thành công.');}},'Khôi phục dữ liệu',true);
}
async function decryptPendingImport() {
  const password=$('#encrypted-import-password')?.value||'';
  if(!pendingEncryptedImport)return;
  try{
    const raw=await vault.decryptExport(pendingEncryptedImport,password);
    const parsed=validateState(JSON.parse(raw));
    pendingEncryptedImport=null;
    confirmImportedState(parsed);
  }catch(error){const field=$('#encrypted-import-error');if(field)field.textContent=error.message;}
}
async function readImport(file) {
  if(!file)return;
  if(file.size>15*1024*1024){toast('Tệp lớn hơn 15 MB. Hãy chọn một bản sao lưu Money Management phù hợp.',true);return;}
  const request=++importRequest, revision=dialogRevision;
  try {
    const data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
    if(request!==importRequest)return;
    if(dialogRevision!==revision||formDirty){toast('Bạn đang thao tác ở biểu mẫu khác. Hãy hoàn tất hoặc đóng biểu mẫu rồi chọn lại file JSON.',true);return;}
    if(data?.format==='money-management-export-encrypted-v1'){
      pendingEncryptedImport=data;
      openModal('Mở bản sao JSON mã hóa',`<p class="modal-intro">Nhập mật khẩu đã dùng khi tạo bản sao. Không gửi mật khẩu trong chat.</p><div class="form-group"><label for="encrypted-import-password">Mật khẩu giải mã</label><input id="encrypted-import-password" type="password" autocomplete="off" class="form-control"></div><p id="encrypted-import-error" class="field-error" role="alert"></p><button class="btn primary" data-action="decrypt-import">Mở bản sao</button>`);
      return;
    }
    confirmImportedState(validateState(data));
  } catch(error) {toast(`Không thể nhập bản sao: ${error.message||'Tệp JSON không hợp lệ.'}`,true);}
}

function freshBook(demo=false) {
  confirmModal(demo?'Nạp dữ liệu minh họa?':'Bắt đầu một sổ mới?',`<p>${demo?'Thay sổ hiện tại bằng một bộ thu chi minh họa để khám phá app.':'Xóa sổ hiện tại, gồm ví, giao dịch, ngân sách, mục tiêu, danh mục tự tạo và khoản định kỳ.'}</p><p>Hãy tải bản sao nếu bạn muốn giữ lại dữ liệu đang có.</p>`,async()=>{const next=demo?createDemoState():createEmptyState();next.profile={...state.profile};if(await commit(next,{replace:true,reason:demo?'Nạp dữ liệu mẫu':'Tạo sổ mới'})){closeModal();ui.month=monthKey(localDate());resetFilters();location.hash=demo?'overview':'wallets';render();toast(demo?'Đã nạp dữ liệu mẫu.':'Đã tạo sổ mới. Nhập số dư ban đầu tại mục Ví của tôi.');}},demo?'Nạp dữ liệu mẫu':'Bắt đầu sổ mới',true);
}

function preserveRender() {
  const focused=document.activeElement,id=focused?.id,start=focused?.selectionStart,end=focused?.selectionEnd;
  render();
  if(id){const fresh=document.getElementById(id);if(fresh){fresh.focus();if(start!=null&&fresh.setSelectionRange)try{fresh.setSelectionRange(start,end);}catch{}}}
}
function resetFilters() { ui.query='';ui.type='all';ui.categoryId='all';ui.accountId='all';ui.allMonths=false;ui.customRange=false;ui.startDate='';ui.endDate='';ui.page=1; }
function setMenu(open) {
  ui.menu=Boolean(open&&mobileNavigation.matches); render();
  const target=ui.menu?$('.sidebar-close'):$('[data-action="open-menu"]');
  target?.focus({preventScroll:true});
}
function handleAction(event) {
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action,id=button.dataset.id;
  if(action==='backdrop'){if(event.target===button)closeModal();return;}
  const actions={
    'enable-vault':enableVault,'backup-encrypted':downloadEncryptedBackup,'lock-vault':()=>location.reload(),
    'cloud-connect':cloudConnect,'cloud-check':()=>cloud.check().then(()=>toast(cloud.status().remoteChanges?'Có thay đổi trên đám mây. Hãy xem và chọn bản cần giữ.':'Đám mây không có thay đổi mới.')),'cloud-pull':cloudPull,'cloud-push':cloudPush,'cloud-disconnect':cloudDisconnect,
    'decrypt-import':()=>decryptPendingImport(),
    'toggle-theme':()=>{const result=setThemePreference(getResolvedTheme()==='dark'?'light':'dark');if(!result.persisted)toast('Đã đổi giao diện cho phiên này. Trình duyệt chưa cho lưu lựa chọn.',true);},
    'open-menu':()=>setMenu(true),'close-menu':()=>setMenu(false),
    'month-prev':()=>{if(ui.month>'1900-01'){ui.month=shiftMonth(ui.month,-1);ui.page=1;render();}},
    'month-next':()=>{if(ui.month<'9999-12'){ui.month=shiftMonth(ui.month,1);ui.page=1;render();}},
    'chart-cumulative':()=>{ui.chartMode='cumulative';render();},'chart-daily':()=>{ui.chartMode='daily';render();},
    'add-transaction':()=>transactionModal(),'add-transfer':()=>transactionModal(undefined,'transfer'),'edit-transaction':()=>transactionModal(id),'delete-transaction':()=>removeRecord('transactions',id),
    'add-budget':()=>budgetModal(),'edit-budget':()=>budgetModal(id),'delete-budget':()=>removeRecord('budgets',id),
    'add-goal':()=>goalModal(),'edit-goal':()=>goalModal(id),'delete-goal':()=>removeRecord('goals',id),'contribute-goal':()=>contributeModal(id),
    'add-wallet':()=>walletModal(),'edit-wallet':()=>walletModal(id),'delete-wallet':()=>removeRecord('accounts',id),
    'add-category':()=>categoryModal(),'edit-category':()=>categoryModal(id),'delete-category':()=>removeRecord('customCategories',id),
    'add-recurring':()=>recurringModal(),'edit-recurring':()=>recurringModal(id),'delete-recurring':()=>removeRecord('recurring',id),'post-recurring':()=>postRecurringModal(id),'skip-recurring':()=>skipRecurring(id),
    'toggle-recurring':async()=>{const next=clone(),rule=next.recurring.find(r=>r.id===id);if(!rule)return;rule.active=!rule.active;if(await commit(next))toast(rule.active?'Đã tiếp tục theo dõi khoản định kỳ.':'Đã tạm dừng khoản định kỳ.');},
    'wallet-transactions':()=>{resetFilters();ui.accountId=id;ui.allMonths=true;location.hash='transactions';},
    'page-prev':()=>{ui.page=Math.max(1,ui.page-1);render();},'page-next':()=>{ui.page++;render();},
    'reset-filters':()=>{resetFilters();render();},
    'close-modal':closeModal,'confirm-action':()=>modalAction?.(),'backup':backup,
    'share-backup':shareBackup,
    'choose-backup-file':()=>{if(canWriteBackupFile())backupTask(backups.chooseFile(state),'Đã liên kết file sao lưu. App sẽ cập nhật file sau mỗi lần lưu.');},
    'resume-backup-file':()=>{if(canWriteBackupFile())backupTask(backups.resumeFilePermission(state),'Đã cập nhật file sao lưu.');},
    'disconnect-backup-file':()=>backupTask(backups.disconnectFile(),'Đã ngừng liên kết. File đã lưu vẫn nằm ở nơi bạn chọn.'),
    'backup-history':()=>showBackupHistory().catch(error=>toast(error.message,true)),
    'download-snapshot':()=>useSnapshot(id),
    'restore-snapshot':()=>useSnapshot(id,true),
    'persist-storage':()=>backups.requestPersistence().then(()=>toast(backups.getStatus().persistence==='granted'?'Trình duyệt đã ưu tiên giữ dữ liệu trên thiết bị.':'Trình duyệt chưa cấp ưu tiên. Hãy giữ thêm file sao lưu riêng.')).catch(error=>toast(error.message,true)),
    'continue-empty':()=>confirmModal('Dùng sổ trống?', '<p>Lịch sử cũ vẫn được giữ trong giới hạn 30 bản. Những thay đổi mới sẽ tạo lịch sử mới và có thể thay nội dung file sao lưu đang liên kết.</p>',()=>{backupNeedsRecovery=false;closeModal(true);render();toast('Bạn có thể bắt đầu ghi vào sổ trống.');},'Dùng sổ trống'),
    'backup-visible':()=>{download(JSON.stringify(state,null,2),`money-management-visible-book-${localDate()}.json`,'application/json;charset=utf-8');toast(`Đã tạo JSON của sổ đang hiển thị (${state.transactions.length} giao dịch), không bao gồm dữ liệu gốc bị lỗi.`);},
    'discard-profile-draft':()=>{profileDraft=null;render();},
    'import':()=>$('#import-file')?.click(),
    'restore-recovery':restoreRecovery,
    'download-recovery':()=>{const recovery=ledger.getRecovery();if(recovery)download(JSON.stringify(recovery.state,null,2),`money-management-previous-${localDate()}.json`,'application/json;charset=utf-8');else toast('Không có bản phục hồi hợp lệ.',true);},
    'recover-raw':()=>download(corruptRaw||'',`money-management-recovery-${localDate()}.json`,'application/json;charset=utf-8'),
    'start-fresh':()=>freshBook(false),'load-demo':()=>freshBook(true),
    'export-excel':()=>exportWorkbook(false),'export-month':()=>exportWorkbook(true),
    'transaction-kind':()=>{
      const type=button.dataset.type,form=$('#transaction-form');
      if (type==='transfer'&&state.accounts.length<2) return;
      const draft=Object.fromEntries(new FormData(form));
      form.elements.type.value=type;
      form.querySelectorAll('[data-action="transaction-kind"]').forEach(b=>{b.classList.toggle('active',b.dataset.type===type);b.setAttribute('aria-pressed',String(b.dataset.type===type));});
      $('#transaction-routing').innerHTML=transactionRouting(type,draft);
      $('#transfer-note').hidden=type!=='transfer';
      formDirty=true;
    }
  };
  actions[action]?.();
}

document.addEventListener('click',handleAction);
document.addEventListener('click',event=>{
  if(ui.menu&&event.target.closest('.sidebar a[href^="#"]'))setMenu(false);
  if(event.target.closest('.skip-link')) {
    event.preventDefault();
    const main=$('#main-content'); main?.setAttribute('tabindex','-1'); main?.focus(); main?.scrollIntoView({block:'start'});
  }
});
document.addEventListener('input',event=>{
  if(event.target.closest('.modal form')) formDirty=true;
  if(event.target.id==='profile-name') profileDraft=event.target.value;
  if(event.target.matches('[data-money-input]')&&!event.isComposing)validateMoneyInput(event.target);
  if(event.target.id==='transaction-search'&&!event.isComposing){ui.query=event.target.value;ui.page=1;preserveRender();}
});
document.addEventListener('compositionend',event=>{
  if(event.target.matches('[data-money-input]'))validateMoneyInput(event.target);
  if(event.target.id==='transaction-search'){ui.query=event.target.value;ui.page=1;preserveRender();}
});
document.addEventListener('focusout',event=>{
  if(event.target.matches('[data-money-input]')&&validateMoneyInput(event.target))event.target.value=formatVndInput(event.target.value);
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.closest('.modal form')) formDirty=true;
  if(el.id==='profile-name') profileDraft=el.value;
  if(el.id==='theme-preference') {const result=setThemePreference(el.value);if(!result.persisted)toast('Đã đổi giao diện cho phiên này. Trình duyệt chưa cho lưu lựa chọn.',true);}
  else if(el.id==='auto-download-backup') {const enabled=el.checked;backupTask(backups.setDownloadMode(enabled),enabled?'Đã bật yêu cầu tải JSON sau mỗi lần lưu. Hãy cho phép tải nhiều file nếu trình duyệt hỏi.':'Đã tắt tải tự động. Lịch sử trên thiết bị vẫn được tạo.');}
  else if(el.id==='selected-month') {if(el.validity.valid&&/^\d{4}-\d{2}$/.test(el.value)){ui.month=el.value;ui.page=1;render();}}
  else if(el.dataset.filter){ui[el.dataset.filter]=el.value;ui.page=1;render();}
  else if(el.id==='filter-period') {ui.customRange=el.value==='range';ui.allMonths=el.value==='all';if(ui.customRange){ui.startDate=ui.startDate||`${ui.month}-01`;ui.endDate=ui.endDate||`${ui.month}-${String(daysInMonth(ui.month)).padStart(2,'0')}`;}ui.page=1;render();}
  else if(el.id==='filter-start-date'||el.id==='filter-end-date') {const start=el.id==='filter-start-date'?el.value:ui.startDate,end=el.id==='filter-end-date'?el.value:ui.endDate;if(!isValidDate(start)||!isValidDate(end)||start>end){toast('Ngày bắt đầu phải hợp lệ và không sau ngày kết thúc.',true);render();return;}ui.startDate=start;ui.endDate=end;ui.page=1;render();}
  else if(el.id==='field-type'&&$('#recurring-form')) {const form=$('#recurring-form');$('#recurring-routing').innerHTML=transactionRouting(el.value,Object.fromEntries(new FormData(form)));}
  else if(el.id==='field-accountId' && $('#transaction-form')?.elements.type.value==='transfer'){const form=$('#transaction-form');$('#transaction-routing').innerHTML=transactionRouting('transfer',Object.fromEntries(new FormData(form)));}
  else if(el.id==='import-file'){const file=el.files?.[0];el.value='';readImport(file);}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!['transaction-form','budget-form','goal-form','wallet-form','contribute-form','profile-form','category-form','recurring-form','recurring-post-form'].includes(form.id))return;
  event.preventDefault();form.querySelectorAll('[data-money-input]').forEach(validateMoneyInput);if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form)),id=form.dataset.id;let next=clone(),message='Đã lưu thay đổi.';
  const readAmount=name=>parseVndAmount(data[name],{min:Number(form.elements[name].dataset.min),max:Number(form.elements[name].dataset.max)});
  try {
    const editCollection={'transaction-form':'transactions','budget-form':'budgets','goal-form':'goals','wallet-form':'accounts','category-form':'customCategories','recurring-form':'recurring'}[form.id];
    if(id&&editCollection&&!next[editCollection].some(record=>record.id===id)) throw new Error('Mục này đã bị xóa ở tab khác. Hãy đóng biểu mẫu và tải lại danh sách.');
    if(form.id==='profile-form') {next.profile.name=data.name.trim();}
    if(form.id==='category-form') {
      const record={id:id||uid(),name:data.name.trim(),type:data.type,icon:data.icon,color:data.color};
      if(id)next.customCategories=next.customCategories.map(c=>c.id===id?record:c);else next.customCategories.push(record);
      message=id?'Đã cập nhật danh mục.':'Đã thêm danh mục mới.';
    }
    if(form.id==='recurring-form') {
      const previous=next.recurring.find(r=>r.id===id);
      const preserveAnchor=previous&&previous.nextDate===data.nextDate&&previous.frequency===data.frequency;
      const record={id:id||uid(),type:data.type,amount:readAmount('amount'),categoryId:data.categoryId,accountId:data.accountId,note:data.note.trim(),frequency:data.frequency,nextDate:data.nextDate,anchorDay:preserveAnchor?previous.anchorDay:Number(data.nextDate.slice(8)),anchorMonth:preserveAnchor?previous.anchorMonth:Number(data.nextDate.slice(5,7)),active:data.active==='on'};
      if(id)next.recurring=next.recurring.map(r=>r.id===id?record:r);else next.recurring.push(record);
      message=id?'Đã cập nhật khoản định kỳ.':'Đã tạo lịch. Chưa có giao dịch nào được ghi.';
    }
    if(form.id==='recurring-post-form') {
      next=createRecurringTransaction(state,id,form.dataset.expectedDate,{date:data.date,amount:readAmount('amount'),categoryId:data.categoryId,accountId:data.accountId,note:data.note.trim()});
      message='Đã ghi giao dịch và chuyển lịch sang kỳ tiếp theo.';
    }
    if(form.id==='transaction-form') {
      const record={id:id||uid(),type:data.type,amount:readAmount('amount'),date:data.date,categoryId:data.categoryId,accountId:data.accountId,note:data.note.trim(),createdAt:state.transactions.find(t=>t.id===id)?.createdAt||new Date().toISOString()};
      if(data.type==='transfer') record.transferToAccountId=data.transferToAccountId;
      if(id) next.transactions=next.transactions.map(t=>t.id===id?record:t);else next.transactions.push(record);
      message=id?'Đã cập nhật giao dịch.':'Đã lưu giao dịch mới.';
    }
    if(form.id==='budget-form') {
      if(next.budgets.some(b=>b.month===data.month&&b.categoryId===data.categoryId&&b.id!==id))throw new Error('Danh mục này đã có ngân sách trong tháng. Hãy sửa ngân sách hiện có.');
      const record={id:id||uid(),month:data.month,categoryId:data.categoryId,amount:readAmount('amount')};
      if(id)next.budgets=next.budgets.map(b=>b.id===id?record:b);else next.budgets.push(record);
      message=id?'Đã cập nhật ngân sách.':'Đã tạo ngân sách mới.';
    }
    if(form.id==='goal-form') {
      const record={id:id||uid(),name:data.name.trim(),target:readAmount('target'),saved:readAmount('saved'),deadline:data.deadline,icon:data.icon,color:data.color};
      if(id)next.goals=next.goals.map(g=>g.id===id?record:g);else next.goals.push(record);
      message=id?'Đã cập nhật mục tiêu.':'Đã tạo mục tiêu.';
    }
    if(form.id==='wallet-form') {
      const record={id:id||uid(),name:data.name.trim(),initialBalance:readAmount('initialBalance'),icon:data.icon,color:data.color};
      if(id)next.accounts=next.accounts.map(a=>a.id===id?record:a);else next.accounts.push(record);
      message=id?'Đã cập nhật ví.':'Đã thêm ví mới.';
    }
    if(form.id==='contribute-form') {
      const goal=next.goals.find(g=>g.id===id);if(!goal)throw new Error('Mục tiêu không còn tồn tại.');
      const amount=readAmount('amount');if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('Hãy nhập số tiền nguyên lớn hơn 0.');
      goal.saved+=amount;message='Đã cập nhật số tiền tiết kiệm.';
    }
    validateState(next);
    if(await commit(next,{reason:message})) { if(form.id==='profile-form')profileDraft=null;else closeModal(true); if(form.id==='transaction-form'||form.id==='recurring-post-form'){ui.month=data.date.slice(0,7);ui.page=1;} if(form.id==='budget-form')ui.month=data.month;render();toast(message); }
  } catch(error) {const errorEl=$('#modal-error');if(errorEl){errorEl.textContent=error.message;errorEl.scrollIntoView({block:'nearest'});}else toast(error.message,true);}
});
document.addEventListener('keydown',event=>{
  if(!$('.modal')){
    if(event.key==='Escape'&&ui.menu){setMenu(false);event.preventDefault();}
    if(event.key==='Tab'&&ui.menu&&mobileNavigation.matches){
      const focusable=[...$('.sidebar').querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.offsetParent!==null);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
    return;
  }
  if(event.key==='Escape'){closeModal();event.preventDefault();}
  if(event.key==='Tab') {
    const focusable=[...$('.modal').querySelectorAll('button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea,a[href],[tabindex="0"]')].filter(el=>el.offsetParent!==null);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
window.addEventListener('hashchange',()=>{ui.menu=false;ui.page=1;render();window.scrollTo({top:0,behavior:'instant'});});
window.addEventListener('storage',async event=>{
  if(event.key!==(vault.enabled?VAULT_KEY:KEY) && event.key!==null)return;
  if($('.modal')) {pendingStorageRefresh=true;toast('Sổ vừa thay đổi ở tab khác. App sẽ cập nhật khi đóng hộp thoại và kiểm tra xung đột trước khi lưu.',true);return;}
  try { await applyStorageRefresh(true); } catch(error) {storageIssue=error.message;render();toast(error.message,true);}
});
mobileNavigation.addEventListener('change',()=>{
  if(!mobileNavigation.matches)ui.menu=false;
  const sidebar=$('.sidebar'); if(sidebar){sidebar.inert=mobileNavigation.matches&&!ui.menu;sidebar.classList.toggle('open',ui.menu);}
  const main=$('#main-content'); if(main)main.inert=mobileNavigation.matches&&ui.menu;
  if(!ui.menu)$('.mobile-overlay')?.remove();
  document.body.style.overflow=$('.modal')||(ui.menu&&mobileNavigation.matches)?'hidden':'';
});
window.addEventListener('beforeunload',event=>{if(!updateInProgress&&(savingLedger||formDirty||(profileDraft!==null&&profileDraft!==state.profile.name)||(backups.getStatus().mode==='file'&&backups.getStatus().pendingWrites))){event.preventDefault();event.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')backups.flush().catch(()=>{});});
window.addEventListener('pagehide',()=>{backups.flush().catch(()=>{});});
window.addEventListener('online',()=>{ if(cloud?.connection)void cloud.check(); });
window.setInterval(()=>{ if(document.visibilityState==='visible'&&navigator.onLine&&cloud?.connection)void cloud.check(); },180000);
window.addEventListener('money-management:themechange',()=>{
  const selector=$('#theme-preference');if(selector)selector.value=getThemePreference();
  const toggle=$('.theme-toggle');if(toggle){const label=getResolvedTheme()==='dark'?'Bật chế độ sáng':'Bật chế độ tối';toggle.setAttribute('aria-label',label);toggle.setAttribute('title',label);toggle.innerHTML=icon(getResolvedTheme()==='dark'?'sun':'moon');}
});
render();
backups.init().then(async()=>{
  backupNeedsRecovery=primaryMissingAtBoot&&!storageIssue&&backups.getStatus().snapshotCount>0;
  backupsReady=true;refreshBackupStatus();
  // Opening a blank or damaged primary must never overwrite the last good file.
  if(!primaryMissingAtBoot&&!storageIssue&&!backupNeedsRecovery)await backups.syncFile(state);
  if(cloud?.connection && navigator.onLine!==false)void cloud.check();
}).catch(()=>{
  backupsReady=true;backupNotice='Sổ có thể tiếp tục lưu trên trình duyệt. Chưa mở được sao lưu tự động; hãy tải một bản JSON trong Cài đặt.';refreshBackupStatus();
});
initPwa({beforeUpdate:async()=>{
  await backups.flush();
  if((formDirty||(profileDraft!==null&&profileDraft!==state.profile.name))&&!window.confirm('Cập nhật sẽ tải lại app. Bỏ các thay đổi chưa lưu và cập nhật?'))return false;
  updateInProgress=true;
  $('#app').inert=true;$('#modal-root').inert=true;
  return true;
}});
window.addEventListener('money-management:pwa-change',event=>{
  if(!event.detail?.updating){updateInProgress=false;$('#app').inert=Boolean($('.modal'));$('#modal-root').inert=false;}
  const panel=$('#pwa-settings');if(panel)panel.outerHTML=renderPwaSettings();
});
