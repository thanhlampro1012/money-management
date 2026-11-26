/** Theme preference is local to this browser and separate from financial backups. */
export const THEME_PREFERENCE_KEY = 'money-management:theme';
export const THEME_CHANGE_EVENT = 'money-management:themechange';
const preferences = new Set(['light', 'dark', 'system']);
let preference = 'system';
let mediaQuery = null;
let initialized = false;

function readPreference() {
  try {
    const saved = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    return preferences.has(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

function resolveTheme() {
  return preference === 'system' ? (mediaQuery?.matches ? 'dark' : 'light') : preference;
}

function applyTheme(notify = true) {
  const resolved = resolveTheme();
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { preference, resolved } }));
  }
  return { preference, resolved };
}

/** Initialize once; follow operating-system and same-origin tab preference changes. */
export function initTheme() {
  if (initialized) return { preference, resolved: resolveTheme() };
  initialized = true;
  if (typeof window !== 'undefined') {
    preference = readPreference();
    try { mediaQuery = window.matchMedia('(prefers-color-scheme: dark)'); } catch { mediaQuery = null; }
    const handleSystemChange = () => { if (preference === 'system') applyTheme(); };
    if (mediaQuery?.addEventListener) mediaQuery.addEventListener('change', handleSystemChange);
    else if (mediaQuery?.addListener) mediaQuery.addListener(handleSystemChange);
    window.addEventListener('storage', event => {
      if (event.key !== THEME_PREFERENCE_KEY && event.key !== null) return;
      // A clear event removes the preference; malformed values also revert to system.
      preference = event.key === null ? 'system' : (preferences.has(event.newValue) ? event.newValue : 'system');
      applyTheme();
    });
  }
  return applyTheme(false);
}

export function getThemePreference() {
  initTheme();
  return preference;
}

export function getResolvedTheme() {
  initTheme();
  return resolveTheme();
}

/** Apply immediately. A blocked/full localStorage does not prevent changing appearance. */
export function setThemePreference(value) {
  if (!preferences.has(value)) throw new RangeError('Chế độ giao diện không hợp lệ.');
  initTheme();
  preference = value;
  let persisted = false;
  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, value);
    persisted = true;
  } catch { /* Keep the requested theme for this tab when persistence is unavailable. */ }
  return { ...applyTheme(), persisted };
}
