import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { createPwaManager } from '../dist/pwa.js';

const dist = new URL('../dist/', import.meta.url);
const swSource = await readFile(new URL('sw.js', dist), 'utf8');

function serviceWorkerHarness({ scope = 'https://example.github.io/money-management/', offline = false, failInstall = false } = {}) {
  const listeners = new Map();
  const stores = new Map();
  const calls = { added: [], deleted: [], fetched: [], claims: 0, activations: 0 };
  const prefix = `money-management:${scope}:`;
  function cacheFor(name) {
    if (!stores.has(name)) {
      const entries = new Map();
      stores.set(name, {
        entries,
        async addAll(requests) {
          const urls = Array.from(requests, request => request.url);
          calls.added.push(urls);
          if (failInstall) throw new Error('A precached file returned 404');
          for (const url of urls) entries.set(url, new Response(`cached:${new URL(url).pathname}`));
        },
        async match(url) { return entries.get(typeof url === 'string' ? url : url.url)?.clone(); },
      });
    }
    return stores.get(name);
  }
  const cacheStorage = {
    open: async name => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async name => { calls.deleted.push(name); return stores.delete(name); },
  };
  const self = {
    registration: { scope },
    addEventListener: (name, handler) => listeners.set(name, handler),
    clients: { claim: async () => { calls.claims++; } },
    skipWaiting: async () => { calls.activations++; },
  };
  vm.runInNewContext(swSource, {
    self, caches: cacheStorage, URL, Request, Response, Set,
    fetch: async request => {
      calls.fetched.push(request.url);
      if (offline) throw new Error('Network unavailable');
      return new Response('network version');
    },
  }, { filename: 'sw.js' });
  function dispatch(type, payload = {}) {
    const work = [];
    let response;
    listeners.get(type)({ ...payload, waitUntil: promise => work.push(promise), respondWith: promise => { response = promise; } });
    return { done: Promise.all(work), response };
  }
  return { scope, prefix, stores, cacheFor, calls, dispatch };
}

function browserHarness({ waiting = true, registrationError = false, supported = true } = {}) {
  const calls = { reloads: 0, registrations: [], updateChecks: 0, messages: [], viewport: {} };
  const activeWorker = Object.assign(new EventTarget(), { state: 'activated' });
  const waitingWorker = Object.assign(new EventTarget(), { state: 'installed', postMessage: message => calls.messages.push(message) });
  const registration = Object.assign(new EventTarget(), {
    active: activeWorker, waiting: waiting ? waitingWorker : null, installing: null,
    update: async () => { calls.updateChecks++; },
  });
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: activeWorker,
    register: async (url, options) => {
      calls.registrations.push({ url: url.href, ...options });
      if (registrationError) throw new Error('Unavailable');
      return registration;
    },
  });
  const media = Object.assign(new EventTarget(), { matches: false });
  const viewport = Object.assign(new EventTarget(), { height: 700, offsetTop: 0 });
  const window = Object.assign(new EventTarget(), {
    CustomEvent, isSecureContext: true, innerHeight: 720, visualViewport: viewport,
    matchMedia: () => media, location: { reload: () => { calls.reloads++; } },
  });
  const region = { innerHTML: '' };
  const document = Object.assign(new EventTarget(), {
    getElementById: id => id === 'pwa-status-region' ? region : null,
    documentElement: { style: { setProperty: (key, value) => { calls.viewport[key] = value; } } },
  });
  const navigator = { onLine: true, ...(supported ? { serviceWorker } : {}) };
  const manager = createPwaManager({ window, document, navigator, baseUrl: 'https://example.github.io/money-management/pwa.js' });
  return { calls, registration, serviceWorker, waitingWorker, window, document, navigator, viewport, region, manager };
}

test('manifest and home-screen assets resolve inside a GitHub project and a nested preview', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', dist), 'utf8'));
  assert.equal(manifest.name, 'Money Management');
  assert.equal(manifest.display, 'standalone');
  for (const scope of ['https://example.github.io/money-management/', 'https://preview.example/apps/demo/dist/']) {
    const url = new URL('manifest.webmanifest', scope);
    assert.equal(new URL(manifest.id, url).href, scope);
    assert.equal(new URL(manifest.start_url, url).href, scope);
    assert.equal(new URL(manifest.scope, url).href, scope);
    for (const item of [...manifest.icons, ...manifest.shortcuts]) {
      assert.ok(new URL(item.src || item.url, url).href.startsWith(scope));
    }
  }
  const index = await readFile(new URL('index.html', dist), 'utf8');
  assert.match(index, /viewport-fit=cover/);
  assert.match(index, /rel="apple-touch-icon"/);
  assert.match(index, /rel="manifest"/);
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['maskable-512.png', 512]]) {
    const png = await readFile(new URL(`icons/${file}`, dist));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
    assert.equal(png.readUInt32BE(16), size, file);
    assert.equal(png.readUInt32BE(20), size, file);
    assert.equal(png[25], 2, `${file} is opaque RGB`);
  }
});

test('install caches all shipped runtime assets, keeps project scope and waits for consent', async () => {
  for (const scope of ['https://example.github.io/money-management/', 'https://preview.example/apps/demo/dist/']) {
    const h = serviceWorkerHarness({ scope });
    await h.dispatch('install').done;
    assert.equal(h.calls.added.length, 1, 'one atomic cache batch');
    const cached = h.calls.added.flat();
    assert.ok(cached.every(url => url.startsWith(scope)));
    for (const file of await readdir(dist)) {
      if (/\.(?:js|css|html|webmanifest|svg)$/.test(file) && file !== 'sw.js') {
        assert.ok(cached.includes(new URL(file, scope).href), `precache includes ${file}`);
      }
    }
    assert.equal(h.calls.activations, 0, 'no automatic skipWaiting');
  }
});

test('an incomplete install rejects without deleting the working app cache', async () => {
  const h = serviceWorkerHarness({ failInstall: true });
  const previousName = `${h.prefix}1.2.0`;
  h.cacheFor(previousName).entries.set(`${h.scope}index.html`, new Response('working app'));
  await assert.rejects(h.dispatch('install').done, /404/);
  assert.equal(await (await h.cacheFor(previousName).match(`${h.scope}index.html`)).text(), 'working app');
  assert.deepEqual(h.calls.deleted, []);
  assert.equal(h.calls.activations, 0);
});

test('offline navigation and modules load together from the installed app shell', async () => {
  const h = serviceWorkerHarness({ offline: true });
  await h.dispatch('install').done;
  for (const path of ['', 'index.html', 'app.js', 'backup.js', 'input.js', 'styles.css', 'icons/icon-192.png']) {
    const request = { method: 'GET', url: `${h.scope}${path}`, mode: path === '' || path === 'index.html' ? 'navigate' : 'same-origin' };
    const event = h.dispatch('fetch', { request });
    assert.ok(event.response, `handled ${path || '/'}`);
    const body = await (await event.response).text();
    assert.equal(body, `cached:${new URL(path || 'index.html', h.scope).pathname}`);
  }
  assert.deepEqual(h.calls.fetched, []);
});

test('online requests keep a consistent release instead of mixing newly deployed modules', async () => {
  const h = serviceWorkerHarness();
  await h.dispatch('install').done;
  const request = { method: 'GET', url: `${h.scope}app.js`, mode: 'same-origin' };
  const response = await h.dispatch('fetch', { request }).response;
  assert.equal(await response.text(), 'cached:/money-management/app.js');
  assert.deepEqual(h.calls.fetched, []);
});

test('SW never intercepts private data, downloads, other projects, query requests or writes', async () => {
  const h = serviceWorkerHarness();
  await h.dispatch('install').done;
  for (const request of [
    { url: `${h.scope}backup.json` },
    { url: `${h.scope}ledger.xlsx` },
    { url: `${h.scope}api/transactions` },
    { url: `${h.scope}index.html?export=true` },
    { url: 'https://example.github.io/LinhLamEnglish/index.html', mode: 'navigate' },
    { url: 'https://example.github.io/money-management-other/index.html', mode: 'navigate' },
    { url: 'https://other.example/money-management/app.js' },
    { url: `${h.scope}index.html`, method: 'POST' },
  ]) {
    const event = h.dispatch('fetch', { request: { method: 'GET', mode: 'same-origin', ...request } });
    assert.equal(event.response, undefined, request.url);
  }
  assert.deepEqual(h.calls.fetched, []);
});

test('activation removes only obsolete caches for this exact app scope', async () => {
  const h = serviceWorkerHarness();
  await h.dispatch('install').done;
  const obsolete = `${h.prefix}1.2.0`;
  const anotherApp = 'money-management:https://example.github.io/LinhLamEnglish/:1.2.0';
  const nestedPreview = 'money-management:https://example.github.io/money-management/preview/:1.2.0';
  [obsolete, anotherApp, nestedPreview, 'unrelated-cache'].forEach(h.cacheFor);
  await h.dispatch('activate').done;
  assert.deepEqual(h.calls.deleted, [obsolete]);
  assert.ok(h.stores.has(anotherApp));
  assert.ok(h.stores.has(nestedPreview));
  assert.ok(h.stores.has('unrelated-cache'));
  assert.equal(h.calls.claims, 1);
});

test('update activation requires the recognized message from an app client in scope', async () => {
  const h = serviceWorkerHarness();
  for (const payload of [
    { data: { type: 'SKIP_WAITING' }, source: { url: h.scope } },
    { data: { type: 'ACTIVATE_UPDATE' }, source: { url: 'https://evil.example/money-management/' } },
    { data: { type: 'ACTIVATE_UPDATE' }, source: { url: 'https://example.github.io/LinhLamEnglish/' } },
    { data: { type: 'ACTIVATE_UPDATE' }, source: { url: 'https://example.github.io/money-management-other/' } },
    { data: { type: 'ACTIVATE_UPDATE' } },
  ]) await h.dispatch('message', payload).done;
  assert.equal(h.calls.activations, 0);
  await h.dispatch('message', { data: { type: 'ACTIVATE_UPDATE' }, source: { url: `${h.scope}#settings` } }).done;
  assert.equal(h.calls.activations, 1);
});

test('PWA registration stays in the module directory and does not activate a waiting update', async () => {
  const h = browserHarness();
  await h.manager.init();
  assert.deepEqual(h.calls.registrations, [{ url: 'https://example.github.io/money-management/sw.js', scope: 'https://example.github.io/money-management/', updateViaCache: 'none' }]);
  assert.equal(h.manager.getState().offlineReady, true);
  assert.equal(h.manager.getState().updateAvailable, true);
  assert.deepEqual(h.calls.messages, []);
  assert.equal(h.calls.reloads, 0);
  assert.match(h.region.innerHTML, /Có phiên bản mới/);
  await h.manager.init();
  assert.equal(h.calls.registrations.length, 1, 'initialization is idempotent');
});

test('declining an update or failing to flush a backup never activates or reloads', async () => {
  for (const guard of [async () => false, async () => { throw new Error('backup flush failed'); }]) {
    const h = browserHarness();
    await h.manager.init({ beforeUpdate: guard });
    assert.equal(await h.manager.requestUpdate(), false);
    assert.deepEqual(h.calls.messages, []);
    assert.equal(h.calls.reloads, 0);
    assert.equal(h.manager.getState().updating, false);
  }
});

test('an explicit update waits for the save guard, then reloads only after controllerchange', async () => {
  const h = browserHarness();
  let finishSave;
  await h.manager.init({ beforeUpdate: () => new Promise(resolve => { finishSave = resolve; }) });
  const updating = h.manager.requestUpdate();
  assert.equal(h.manager.getState().updating, true);
  assert.deepEqual(h.calls.messages, []);
  finishSave(true);
  assert.equal(await updating, true);
  assert.deepEqual(h.calls.messages, [{ type: 'ACTIVATE_UPDATE' }]);
  assert.equal(h.calls.reloads, 0);
  h.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(h.calls.reloads, 1);
  h.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(h.calls.reloads, 1, 'does not reload twice');
});

test('an update accepted in another tab never reloads or discards the current form', async () => {
  const h = browserHarness();
  await h.manager.init();
  h.registration.waiting = null;
  h.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(h.calls.reloads, 0);
  assert.equal(h.manager.getState().updateAvailable, false);
});

test('a waiting worker replaced during the save guard is cancelled without messaging either version', async () => {
  const h = browserHarness();
  let finishSave;
  const replacements = [];
  const replacement = Object.assign(new EventTarget(), { state: 'installed', postMessage: message => replacements.push(message) });
  await h.manager.init({ beforeUpdate: () => new Promise(resolve => { finishSave = resolve; }) });
  const pending = h.manager.requestUpdate();
  h.registration.waiting = replacement;
  finishSave(true);
  assert.equal(await pending, false);
  assert.deepEqual(h.calls.messages, [], 'the stale worker never receives an activation command');
  assert.deepEqual(replacements, [], 'the replacement requires a fresh click');
  assert.equal(h.calls.reloads, 0);
  assert.equal(h.manager.getState().updating, false, 'the app edit lock can be released');
  assert.equal(h.manager.getState().updateAvailable, true);
  assert.match(h.manager.getState().error, /đã thay đổi/);
  await h.manager.init({ beforeUpdate: async () => true });
  assert.equal(await h.manager.requestUpdate(), true, 'a fresh click can update the replacement');
  assert.deepEqual(replacements, [{ type: 'ACTIVATE_UPDATE' }]);
  replacement.state = 'redundant';
  replacement.dispatchEvent(new Event('statechange'));
  assert.equal(h.manager.getState().updating, false, 'the replacement is observed for activation failure');
  assert.equal(h.manager.getState().updateAvailable, false);
});

test('a worker becoming redundant before or after activation does not leave updating stuck', async () => {
  for (const duringGuard of [true, false]) {
    const h = browserHarness();
    let finishSave;
    await h.manager.init({ beforeUpdate: () => new Promise(resolve => { finishSave = resolve; }) });
    const pending = h.manager.requestUpdate();
    if (duringGuard) h.waitingWorker.state = 'redundant';
    finishSave(true);
    assert.equal(await pending, !duringGuard);
    if (!duringGuard) {
      h.waitingWorker.state = 'redundant';
      h.waitingWorker.dispatchEvent(new Event('statechange'));
    }
    assert.equal(h.manager.getState().updating, false);
    assert.match(h.manager.getState().error, /không còn khả dụng/);
    h.serviceWorker.dispatchEvent(new Event('controllerchange'));
    assert.equal(h.calls.reloads, 0, 'a failed activation never leaves a later reload armed');
  }
});

test('another tab activating during the save guard preserves the lock until this tab decides', async () => {
  for (const approved of [false, true]) {
    const h = browserHarness();
    let finishSave;
    await h.manager.init({ beforeUpdate: () => new Promise(resolve => { finishSave = resolve; }) });
    const pending = h.manager.requestUpdate();
    h.registration.waiting = null;
    h.waitingWorker.state = 'activated';
    h.registration.active = h.waitingWorker;
    h.serviceWorker.controller = h.waitingWorker;
    h.serviceWorker.dispatchEvent(new Event('controllerchange'));
    assert.equal(h.manager.getState().updating, true, 'an unrelated controller change cannot unlock a pending flush');
    assert.equal(h.calls.reloads, 0);
    finishSave(approved);
    assert.equal(await pending, approved);
    assert.equal(h.calls.reloads, approved ? 1 : 0);
    if (!approved) assert.equal(h.manager.getState().updating, false);
    assert.deepEqual(h.calls.messages, []);
  }
});

test('install prompt and viewport resizing are progressive enhancements', async () => {
  const h = browserHarness({ waiting: false });
  await h.manager.init();
  let prompted = 0;
  const prompt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: async () => { prompted++; }, userChoice: Promise.resolve({ outcome: 'accepted' }),
  });
  h.window.dispatchEvent(prompt);
  assert.equal(prompt.defaultPrevented, true);
  assert.equal(h.manager.getState().installAvailable, true);
  assert.equal(await h.manager.installApp(), true);
  assert.equal(prompted, 1);
  assert.equal(h.manager.getState().installAvailable, false);
  h.window.dispatchEvent(new Event('appinstalled'));
  assert.equal(h.manager.getState().installed, true);
  h.viewport.height = 380; h.viewport.offsetTop = 110;
  h.viewport.dispatchEvent(new Event('resize'));
  assert.equal(h.calls.viewport['--app-viewport-height'], '380px');
  assert.equal(h.calls.viewport['--app-viewport-top'], '110px');
  h.window.dispatchEvent(new Event('offline'));
  assert.equal(h.manager.getState().online, false);
  assert.equal(await h.manager.checkForUpdates(), false);
  assert.equal(h.calls.updateChecks, 0);
});

test('unsupported or blocked SW registration leaves the app usable with honest status', async () => {
  const unsupported = browserHarness({ supported: false });
  await unsupported.manager.init();
  assert.equal(unsupported.manager.getState().supported, false);
  assert.deepEqual(unsupported.calls.registrations, []);
  const blocked = browserHarness({ registrationError: true });
  await blocked.manager.init();
  assert.equal(blocked.manager.getState().offlineReady, false);
  assert.match(blocked.manager.getState().error, /vẫn dùng được khi có mạng/);
});
