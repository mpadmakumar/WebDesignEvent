/* ═══════════════════════════════════════════
   AURORA THEME — Shared loader & utilities
   Include this FIRST in every page's <head>
   ═══════════════════════════════════════════ */

/* ── Inject page loader HTML ── */
(function injectLoader() {
  const loader = document.createElement('div');
  loader.id = 'page-loader';
  loader.innerHTML = `
    <div class="loader-logo">SOFTTECH</div>
    <div class="loader-ring"></div>
    <div class="loader-dots">
      <span></span><span></span><span></span>
    </div>
    <div class="loader-text">Loading...</div>
  `;
  document.body.appendChild(loader);
})();

/* ── Hide loader once page is ready ── */
window.addEventListener('DOMContentLoaded', function () {
  // Give Firebase / data a moment to initialize
  setTimeout(function () {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 600);
    }
  }, 800);
});

/* ── Show fetch loader helper ── */
window.showFetchLoader = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
};

window.hideFetchLoader = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
};

/* ── Global fetch loader overlay (for heavy operations) ── */
window.showGlobalLoader = function (text) {
  let el = document.getElementById('global-fetch-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-fetch-loader';
    el.style.cssText = `
      position: fixed; inset: 0; background: rgba(5,5,15,0.85);
      z-index: 9000; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px;
      backdrop-filter: blur(6px);
    `;
    el.innerHTML = `
      <div class="loader-ring" style="width:44px;height:44px;border-width:3px;"></div>
      <div id="global-loader-text" style="font-size:0.8rem;letter-spacing:3px;color:#8d99ae;text-transform:uppercase;"></div>
    `;
    document.body.appendChild(el);
  }
  document.getElementById('global-loader-text').textContent = text || 'Loading...';
  el.style.display = 'flex';
};

window.hideGlobalLoader = function () {
  const el = document.getElementById('global-fetch-loader');
  if (el) el.style.display = 'none';
};

/* ── Toast notifications ── */
window.showToast = function (msg, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column; gap: 10px;
      z-index: 8000;
    `;
    document.body.appendChild(container);
  }

  const colors = {
    success: '#32cdaa',
    error:   '#ff4b6e',
    warning: '#ffca3a',
    info:    '#5b8cff'
  };
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px;
    background: rgba(10,10,30,0.95);
    border: 1px solid ${colors[type] || colors.info};
    border-left: 3px solid ${colors[type] || colors.info};
    border-radius: 8px;
    font-size: 0.875rem;
    color: #edf2f4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    animation: slideInToast 0.3s ease;
    min-width: 240px;
    max-width: 340px;
    backdrop-filter: blur(12px);
  `;
  toast.innerHTML = `
    <span style="color:${colors[type] || colors.info};font-weight:700;">${icons[type] || 'ℹ'}</span>
    <span>${msg}</span>
  `;

  // Inject keyframe once
  if (!document.getElementById('toast-keyframe')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframe';
    style.textContent = `
      @keyframes slideInToast {
        from { opacity:0; transform:translateX(20px); }
        to   { opacity:1; transform:translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 350);
  }, duration);
};
