const esc = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const initialState = () => ({ supported: false, initialized: false, offlineReady: false, online: true, installed: false, installAvailable: false, updateAvailable: false, checking: false, updating: false, message: '', error: '' });

/** The environment argument makes lifecycle/guard behavior testable without a
 * browser. Runtime callers use initPwa, renderPwaSettings and getPwaState. */
export function createPwaManager({ window, document, navigator, baseUrl = import.meta.url }) {
  let state = initialState();
  let registration = null;
  let installPrompt = null;
  let beforeUpdate = async () => true;
  let reloadRequested = false;
  let activationWorker = null;
  let dismissedWorker = null;
  let initialized = false;
  let initPromise = null;
  const observedWorkers = new WeakSet();
  const displayMode = window.matchMedia?.('(display-mode: standalone)');
  const standalone = () => Boolean(displayMode?.matches || navigator.standalone);

  function renderNotice() {
    const region = document.getElementById('pwa-status-region');
    if (!region) return;
    region.innerHTML = state.updateAvailable && registration?.waiting !== dismissedWorker
      ? `<section class="pwa-update-notice" aria-label="Cập nhật ứng dụng"><div class="pwa-update-copy"><strong>Có phiên bản mới</strong><p>Cập nhật khi bạn đã ghi xong để tiếp tục dùng bản mới nhất.</p></div><div class="pwa-update-actions"><button class="btn primary small" data-pwa-action="update" ${state.updating?'disabled':''}>${state.updating?'Đang cập nhật…':'Cập nhật'}</button><button class="btn ghost small" data-pwa-action="dismiss-update" ${state.updating?'disabled':''}>Để sau</button></div></section>`
      : '';
  }

  function notify(patch = {}) {
    state = { ...state, ...patch };
    renderNotice();
    window.dispatchEvent(new window.CustomEvent('money-management:pwa-change', { detail: getState() }));
  }

  function getState() { return { ...state }; }

  function cancelUpdate(error = '') {
    reloadRequested = false;
    activationWorker = null;
    notify({ updating: false, error });
    return false;
  }

  function syncRegistration() {
    const updateAvailable = Boolean(registration?.waiting?.state === 'installed' && navigator.serviceWorker.controller);
    notify({
      offlineReady: registration?.active?.state === 'activated',
      updateAvailable,
      ...(updateAvailable ? { message: 'Phiên bản mới đã sẵn sàng.' } : {}),
    });
  }

  function watchWorker(worker) {
    if (!worker || observedWorkers.has(worker)) return;
    observedWorkers.add(worker);
    const wasInstalling = worker.state !== 'activated';
    worker.addEventListener('statechange', () => {
      syncRegistration();
      if (worker.state === 'redundant' && worker === activationWorker) {
        cancelUpdate('Phiên bản chờ cập nhật không còn khả dụng. Hãy kiểm tra cập nhật rồi thử lại.');
        return;
      }
      if (worker.state === 'redundant' && wasInstalling) {
        notify({ error: registration?.active
          ? 'Chưa tải đủ phiên bản mới. Bạn vẫn đang dùng bản hiện tại; hãy thử lại khi có mạng.'
          : 'Chưa tải đủ ứng dụng để dùng ngoại tuyến. Hãy kết nối mạng và thử lại.' });
      }
    });
  }

  async function requestUpdate() {
    const worker = registration?.waiting;
    if (!worker || state.updating) return false;
    notify({ updating: true, error: '', message: '' });
    try {
      if (await beforeUpdate() === false) {
        return cancelUpdate();
      }
      // The save guard can outlive a new deployment or another tab's update.
      // Revalidate identity before messaging: a stale worker may never reply.
      const currentWorker = registration?.waiting;
      if (currentWorker !== worker) {
        // This exact update may already be activating/active in another tab.
        // Only this tab's explicit, completed save guard permits its reload.
        if (!currentWorker && registration?.active === worker) {
          if (worker.state === 'activated') {
            window.location.reload();
            return true;
          }
          if (worker.state === 'activating') {
            activationWorker = worker;
            reloadRequested = true;
            return true;
          }
        }
        syncRegistration();
        return cancelUpdate('Phiên bản chờ cập nhật đã thay đổi. Hãy nhấn Cập nhật lại để dùng bản mới nhất.');
      }
      if (currentWorker.state !== 'installed') {
        return cancelUpdate('Phiên bản chờ cập nhật không còn khả dụng. Hãy kiểm tra cập nhật rồi thử lại.');
      }
      watchWorker(currentWorker);
      activationWorker = currentWorker;
      reloadRequested = true;
      currentWorker.postMessage({ type: 'ACTIVATE_UPDATE' });
      return true;
    } catch {
      return cancelUpdate('Chưa thể cập nhật. Hãy kiểm tra bản sao lưu rồi thử lại.');
    }
  }

  async function checkForUpdates() {
    if (!registration || state.checking || !state.online) return false;
    notify({ checking: true, error: '', message: '' });
    try {
      await registration.update();
      syncRegistration();
      notify({ message: registration.waiting ? 'Phiên bản mới đã sẵn sàng.' : registration.installing ? 'Đang tải phiên bản mới…' : 'Bạn đang dùng phiên bản mới nhất.' });
      return true;
    } catch {
      notify({ error: 'Không kiểm tra được phiên bản mới. Hãy thử lại khi có mạng.' });
      return false;
    } finally {
      notify({ checking: false });
    }
  }

  async function installApp() {
    const prompt = installPrompt;
    if (!prompt) return false;
    installPrompt = null;
    notify({ installAvailable: false, error: '' });
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') notify({ message: 'Đã gửi yêu cầu cài đặt. Bạn có thể mở app từ màn hình chính.' });
      return choice?.outcome === 'accepted';
    } catch {
      notify({ error: 'Hãy dùng menu trình duyệt để thêm app vào màn hình chính.' });
      return false;
    }
  }

  function updateViewport() {
    const viewport = window.visualViewport;
    document.documentElement.style.setProperty('--app-viewport-height', `${viewport?.height || window.innerHeight}px`);
    document.documentElement.style.setProperty('--app-viewport-top', `${viewport?.offsetTop || 0}px`);
  }

  function init(options = {}) {
    if (typeof options.beforeUpdate === 'function') beforeUpdate = options.beforeUpdate;
    if (initialized) return initPromise;
    initialized = true;
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('online', () => notify({ online: true }));
    window.addEventListener('offline', () => notify({ online: false }));
    displayMode?.addEventListener?.('change', () => notify({ installed: standalone() }));
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault(); installPrompt = event;
      notify({ installAvailable: !standalone() });
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      notify({ installed: true, installAvailable: false, message: 'Đã thêm Money Management vào màn hình chính.' });
    });
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-pwa-action]');
      if (!button || button.disabled) return;
      const action = button.dataset.pwaAction;
      if (action === 'update') void requestUpdate();
      else if (action === 'check-update') void checkForUpdates();
      else if (action === 'install') void installApp();
      else if (action === 'dismiss-update') { dismissedWorker = registration?.waiting; renderNotice(); }
    });
    notify({ initialized: true, online: navigator.onLine !== false, installed: standalone(), supported: Boolean(navigator.serviceWorker && window.isSecureContext) });
    if (!state.supported) return (initPromise = Promise.resolve(getState()));
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Updates accepted elsewhere must not discard this tab's in-progress form.
      if (reloadRequested) { reloadRequested = false; activationWorker = null; window.location.reload(); }
      // A guard may still be flushing this tab's data. Do not release its edit
      // lock merely because another tab has accepted an update in the meantime.
      else syncRegistration();
    });
    initPromise = (async () => {
      try {
        registration = await navigator.serviceWorker.register(new URL('./sw.js', baseUrl), { scope: new URL('./', baseUrl).href, updateViaCache: 'none' });
        watchWorker(registration.installing);
        watchWorker(registration.waiting);
        watchWorker(registration.active);
        registration.addEventListener('updatefound', () => watchWorker(registration.installing));
        syncRegistration();
      } catch {
        notify({ error: 'Chưa chuẩn bị được chế độ ngoại tuyến. App vẫn dùng được khi có mạng.' });
      }
      return getState();
    })();
    return initPromise;
  }

  return { init, getState, requestUpdate, checkForUpdates, installApp };
}

let manager;
export function initPwa(options = {}) {
  manager ||= createPwaManager({ window, document, navigator });
  return manager.init(options);
}
export function getPwaState() { return manager ? manager.getState() : initialState(); }

export function renderPwaSettings() {
  const state = getPwaState();
  const offlineText = !state.initialized ? 'Đang chuẩn bị chế độ ngoại tuyến…'
    : !state.supported ? 'Trình duyệt này chưa hỗ trợ chế độ ngoại tuyến. Bạn vẫn có thể dùng app khi có mạng.'
    : state.offlineReady ? 'Đã tải ứng dụng để mở và ghi thu chi khi không có mạng.'
    : 'Cần mở app khi có mạng để tải xong chế độ ngoại tuyến.';
  return `<section class="card settings-section" id="pwa-settings"><div class="card-header"><div class="pwa-card-heading"><img src="./icons/icon-192.png" width="48" height="48" alt=""><div><h2 class="card-title">Ứng dụng trên điện thoại</h2><p>${state.installed?'Đang mở từ màn hình chính.':'Mở nhanh Money Management từ màn hình chính.'}</p></div></div></div><div class="card-body"><p>${offlineText}</p><p class="helper-text">Chế độ ngoại tuyến giữ ứng dụng trên máy. Hãy dùng phần sao lưu để giữ thêm một bản dữ liệu thu chi.</p><div class="settings-actions">${state.installAvailable?'<button class="btn primary" data-pwa-action="install">Thêm vào màn hình chính</button>':''}${state.updateAvailable?`<button class="btn primary" data-pwa-action="update" ${state.updating?'disabled':''}>${state.updating?'Đang cập nhật…':'Cập nhật ứng dụng'}</button>`:''}${state.supported?`<button class="btn secondary" data-pwa-action="check-update" ${state.checking||!state.online?'disabled':''}>${state.checking?'Đang kiểm tra…':'Kiểm tra cập nhật'}</button>`:''}</div>${state.error||state.message?`<p class="pwa-state" role="status">${esc(state.error||state.message)}</p>`:''}<details class="pwa-install-help"><summary>Cách thêm vào màn hình chính</summary><ol><li><strong>iPhone / iPad:</strong> mở trang bằng Safari, chọn Chia sẻ, rồi chọn Thêm vào Màn hình chính.</li><li><strong>Android:</strong> mở trang bằng Chrome, chọn menu ⋮, rồi Cài đặt ứng dụng hoặc Thêm vào Màn hình chính.</li></ol><p>Nếu chuyển sang app trên màn hình chính, hãy xuất bản sao lưu ở trình duyệt trước và nhập lại nếu sổ chưa hiện. Dữ liệu chưa tự đồng bộ giữa các trình duyệt hay thiết bị.</p></details></div></section>`;
}
