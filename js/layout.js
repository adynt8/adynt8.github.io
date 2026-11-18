// Shared page chrome (header, footer, theme switch) and small DOM helpers.

const PRIMARY = [
  ['index.html', 'Calculator'],
  ['compare.html', 'Compare'],
  ['size-chart.html', 'Distribution'],
  ['progress.html', 'Progress'],
  ['community.html', 'Community'],
];

const MORE = [
  ['how-to-measure.html', 'How to measure'],
  ['camera-measure.html', 'Measure from a photo'],
  ['condom-recommendations.html', 'Condom size finder'],
  ['survey.html', 'Take the survey'],
  ['methodology.html', 'Methodology & sources'],
  ['user-info.html', 'Your data & privacy'],
];

/** Escape a value for safe interpolation into HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function currentPage() {
  const file = location.pathname.split('/').pop();
  return file === '' ? 'index.html' : file;
}

const THEMES = ['auto', 'light', 'dark'];
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const THEME_ICON = {
  auto: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
  light: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  dark: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
};

function getTheme() {
  try { return localStorage.getItem('plssize:theme') || 'auto'; } catch { return 'auto'; }
}

function setTheme(theme) {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('plssize:theme', theme); } catch { /* ignore */ }
  const btn = $('#theme-toggle');
  if (btn) {
    btn.innerHTML = THEME_ICON[theme];
    btn.setAttribute('aria-label', `Theme: ${theme}. Click to change.`);
    btn.title = `Theme: ${theme}`;
  }
  document.dispatchEvent(new CustomEvent('themechange'));
}

function renderHeader() {
  const page = currentPage();
  const link = ([href, label], cls = '') =>
    `<a href="${href}" class="${cls}"${href === page ? ' aria-current="page"' : ''}>${label}</a>`;
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="bar">
      <a class="brand" href="index.html"><img src="android-chrome-192x192.png" alt="" width="30" height="30">PlsSize.Me</a>
      <nav class="site-nav" aria-label="Main">
        <span class="nav-primary">${PRIMARY.map((l) => link(l)).join('')}</span>
        <details class="menu">
          <summary aria-label="More pages">More ▾</summary>
          <div class="menu-panel">
            ${PRIMARY.map((l) => link(l, 'mobile-only')).join('')}
            ${MORE.map((l) => link(l)).join('')}
          </div>
        </details>
        <button id="theme-toggle" class="icon-btn" type="button"></button>
      </nav>
    </div>`;
  document.body.prepend(header);

  const menu = $('.menu', header);
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.open = false; });
  $('#theme-toggle').addEventListener('click', () => {
    setTheme(THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length]);
  });
  setTheme(getTheme());
}

function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="inner">
      <span>© ${new Date().getFullYear()} PlsSize.Me · For information and entertainment, not medical advice.</span>
      <nav aria-label="Footer">
        <a href="methodology.html">Methodology</a>
        <a href="methodology.html#sources">Sources</a>
        <a href="user-info.html">Privacy</a>
        <a href="survey.html">Survey</a>
      </nav>
    </div>`;
  document.body.append(footer);
}

let toastHost;
export function toast(message, ms = 2600) {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toast-host';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.append(toastHost);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  toastHost.append(el);
  setTimeout(() => el.remove(), ms);
}

/** Fill AdSense slots declared as <div class="ad-slot" data-ad-slot="..."></div>. */
function initAds() {
  for (const slot of $$('.ad-slot[data-ad-slot]')) {
    slot.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-3286392498569665"
      data-ad-slot="${esc(slot.dataset.adSlot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked */ }
  }
}

// Offline support: sw.js keeps a copy of pages you've opened (network first, cache as fallback).
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* optional */ }));
}

renderHeader();
renderFooter();
initAds();
registerServiceWorker();
