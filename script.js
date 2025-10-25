// script.js

// Guardamos referencias originales de console para restaurar si hace falta
const _originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Elementos "sensibles" que usamos en devtools guard (se mantienen)
const SENSITIVE_SELECTORS = [
  '#desktop',
  '.window-body',
  '#welcome-banner'
];

const savedContent = new Map(); // selector -> original HTML

/* -------------------------
   PROTECCIÓN BÁSICA (disuasoria)
   ------------------------- */
(function protectionSetup() {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  document.addEventListener('copy', (e) => e.preventDefault());
  document.addEventListener('cut', (e) => e.preventDefault());
  document.addEventListener('paste', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (e.key === 'F12') return e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) return e.preventDefault();
    if (e.ctrlKey && key === 'u') return e.preventDefault();
    if (e.ctrlKey && key === 's') return e.preventDefault();
    if (e.ctrlKey && key === 'p') return e.preventDefault();
  });
})();

/* -------------------------
   UI: loader, menu, ventanas
   ------------------------- */
window.addEventListener('load', () => {
  setTimeout(() => document.body.classList.add('loaded'), 3000);

  // vincular items del Start Menu
  const menuItems = document.querySelectorAll('.start-menu .menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target) openWindow(target);
    });
  });

  // overlay reload
  const overlayReload = document.getElementById('overlay-reload');
  if (overlayReload) overlayReload.addEventListener('click', () => window.location.reload());

  // reloj
  startTaskbarClock();

  // iniciar detector devtools (no bloquea backdrop behavior)
  initDevToolsGuard();
});

function anyWindowOpen() {
  return document.querySelectorAll('.window:not(.hidden)').length > 0;
}

function showBackdrop() {
  const bd = document.getElementById('backdrop');
  if (bd) bd.classList.remove('hidden');
}

function hideBackdrop() {
  const bd = document.getElementById('backdrop');
  if (bd && !anyWindowOpen() && document.getElementById('start-menu').classList.contains('hidden')) {
    bd.classList.add('hidden');
  }
}

// Abre una ventana y mantiene backdrop activo
function openWindow(id) {
  document.querySelectorAll('.window').forEach(w => w.classList.add('hidden'));

  // cerrar start-menu si estaba abierto
  const startMenu = document.getElementById('start-menu');
  if (startMenu && !startMenu.classList.contains('hidden')) startMenu.classList.add('hidden');

  const win = document.getElementById(id + '-window');
  if (win) {
    win.classList.remove('hidden');
    win.setAttribute('tabindex', '-1');
    win.focus();
  }

  showBackdrop();
}

// Cierra una ventana; si no quedan ventanas ni el start-menu, oculta backdrop
function closeWindow(id) {
  let win;
  if (id === 'welcome') win = document.getElementById('welcome-window');
  else win = document.getElementById(id + '-window');

  if (win) win.classList.add('hidden');

  // esperar microtick para evaluar si hay ventanas abiertas
  setTimeout(() => {
    if (!anyWindowOpen() && document.getElementById('start-menu').classList.contains('hidden')) {
      const bd = document.getElementById('backdrop');
      if (bd) bd.classList.add('hidden');
    }
  }, 50);
}

// Toggle start menu y backdrop
function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  if (!menu) return;
  const isHidden = menu.classList.toggle('hidden');
  // si ahora está visible => show backdrop, si quedó oculto => hideBackdrop si no hay ventanas
  if (!isHidden) {
    showBackdrop();
  } else {
    // eliminar backdrop sólo si no hay ventanas abiertas
    setTimeout(hideBackdrop, 50);
  }
}

// Close start menu when clicking outside AND hide backdrop si corresponde
document.addEventListener('click', (e) => {
  const startBtn = document.getElementById('start-button');
  const menu = document.getElementById('start-menu');
  if (startBtn && menu && !startBtn.contains(e.target) && !menu.contains(e.target)) {
    if (!menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
      setTimeout(hideBackdrop, 50);
    }
  }
});

// Cerrar ventanas con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.window').forEach(w => w.classList.add('hidden'));
    // ocultar backdrop si no hay windows ni menu
    setTimeout(hideBackdrop, 50);
  }
});

/* -------------------------
   Reloj de la barra de tareas
   ------------------------- */
function startTaskbarClock() {
  function pad(n) { return n < 10 ? '0' + n : n; }
  function update() {
    const now = new Date();
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const time = `${hours}:${minutes}`;
    const date = now.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const tEl = document.getElementById('taskbar-time');
    const dEl = document.getElementById('taskbar-date');
    if (tEl) tEl.textContent = time;
    if (dEl) dEl.textContent = date;
  }
  update();
  setInterval(update, 60 * 1000);
}

/* -------------------------
   DETECCIÓN / RESPUESTA DEVTOOLS (heurística ligera)
   ------------------------- */
function initDevToolsGuard() {
  const overlay = document.getElementById('protection-overlay');
  let devtoolsOpen = false;
  let checkInterval = null;

  function cacheOriginals() {
    SENSITIVE_SELECTORS.forEach(sel => {
      try {
        const el = document.querySelector(sel);
        if (el && !savedContent.has(sel)) savedContent.set(sel, el.innerHTML);
      } catch (e) { }
    });
  }

  function blankSensitive() {
    SENSITIVE_SELECTORS.forEach(sel => {
      try {
        const el = document.querySelector(sel);
        if (el) {
          el.innerHTML = '';
          el.style.filter = 'blur(2px)';
        }
      } catch (e) { }
    });
  }

  function restoreSensitive() {
    SENSITIVE_SELECTORS.forEach(sel => {
      try {
        const el = document.querySelector(sel);
        if (el && savedContent.has(sel)) {
          el.innerHTML = savedContent.get(sel);
          el.style.filter = '';
        }
      } catch (e) { }
    });
  }

  function silenceConsole() {
    console.log = function () { };
    console.info = function () { };
    console.warn = function () { };
    console.error = function () { };
    console.debug = function () { };
  }

  function restoreConsole() {
    console.log = _originalConsole.log;
    console.info = _originalConsole.info;
    console.warn = _originalConsole.warn;
    console.error = _originalConsole.error;
    console.debug = _originalConsole.debug;
  }

  function detect() {
    const threshold = 160;
    const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
    const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
    if (widthDiff > threshold || heightDiff > threshold) return true;

    let detected = false;
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const delta = performance.now() - start;
    if (delta > 100) detected = true;
    if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') detected = true;

    return detected;
  }

  function onDetected() {
    if (devtoolsOpen) return;
    devtoolsOpen = true;
    if (overlay) overlay.classList.remove('hidden');
    cacheOriginals();
    blankSensitive();
    silenceConsole();
    try { document.body.style.filter = 'blur(1px)'; } catch (e) { }
  }

  function onCleared() {
    if (!devtoolsOpen) return;
    devtoolsOpen = false;
    if (overlay) overlay.classList.add('hidden');
    restoreSensitive();
    restoreConsole();
    try { document.body.style.filter = ''; } catch (e) { }
  }

  function startMonitoring() {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
      try {
        const isOpen = detect();
        if (isOpen) onDetected(); else onCleared();
      } catch (e) { }
    }, 900);
  }

  window.addEventListener('resize', () => {
    try {
      const isOpen = detect();
      if (isOpen) onDetected(); else onCleared();
    } catch (e) { }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      try {
        const isOpen = detect();
        if (isOpen) onDetected(); else onCleared();
      } catch (e) { }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') {
      if (overlay) overlay.classList.remove('hidden');
      setTimeout(() => { if (overlay) overlay.classList.add('hidden'); }, 2400);
    }
  });

  startMonitoring();
}
