// assets/main.js
'use strict';

// ===== Базовые ссылки на DOM =====
const rootEl = document.documentElement;
const themeBtn = document.getElementById('themeToggleBtn');

// ===== Тема (светлая/тёмная) =====
function systemPref() {
  try {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
function setTheme(mode) {
  const next = mode === 'dark' ? 'dark' : 'light';
  rootEl.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch {}
}
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  setTheme(saved || systemPref());
})();
themeBtn?.addEventListener('click', () => {
  const current = rootEl.getAttribute('data-theme') || 'light';
  setTheme(current === 'light' ? 'dark' : 'light');
});
try {
  const mql = matchMedia('(prefers-color-scheme: dark)');
  if (mql.addEventListener) {
    mql.addEventListener('change', () => {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch {}
      if (!saved) setTheme(systemPref());
    });
  } else if (mql.addListener) {
    mql.addListener(() => {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch {}
      if (!saved) setTheme(systemPref());
    });
  }
} catch {}

// ===== Подвал: год и "Наверх" =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
document.getElementById('backToTop')?.addEventListener('click', e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== Помощники для модалок =====
function anyModalOpen() {
  return !!document.querySelector('[role="dialog"][aria-hidden="false"]');
}
function openModal(el) {
  if (!el) return;
  el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}
function closeModal(el) {
  if (!el) return;
  el.setAttribute('aria-hidden', 'true');
  if (!anyModalOpen()) {
    document.body.classList.remove('modal-open');
  }
}

// ===== База сайта (важно для GitHub Pages под /LighManual/) =====
const pathParts = location.pathname.split('/').filter(Boolean);
// Если сайт в подпапке (например, /LighManual/), возьмём первый сегмент как BASE
const SITE_BASE = pathParts.length ? `/${pathParts[0]}/` : '/';
// База для ассетов — абсолютный путь внутри сайта
const ASSETS_BASE = `${SITE_BASE}assets`;

// Нормализация ссылок из поискового индекса под SITE_BASE
function resolveUrl(u) {
  if (!u) return '#';
  if (/^https?:\/\//i.test(u)) return u; // внешняя ссылка
  if (u.startsWith('#')) return u;       // якорь

  // Если ссылка уже абсолютная внутри сайта, но без BASE (например, /sections/..),
  // добавим BASE. Если уже начинается с SITE_BASE — оставим как есть.
  if (u.startsWith(SITE_BASE)) return u;
  if (u.startsWith('/')) return SITE_BASE + u.replace(/^\//, '');

  // Уберём ./ и ../ в начале и префиксуем BASE
  let v = u.replace(/^\.\/+/, '');
  while (v.startsWith('../')) v = v.slice(3);
  return SITE_BASE + v;
}

// ===== Поиск =====
const searchPanel = document.getElementById('searchPanel');
const searchOpenBtn = document.getElementById('searchOpenBtn');
const heroSearchBtn = document.getElementById('heroSearchBtn');
const searchInput = document.getElementById('searchInput');
const searchRunBtn = document.getElementById('searchRunBtn');
const searchResults = document.getElementById('searchResults');
const searchCount = document.getElementById('searchCount');

function focusSearch() { setTimeout(() => searchInput?.focus(), 50); }
const openSearch = () => { openModal(searchPanel); focusSearch(); };
const closeSearch = () => closeModal(searchPanel);

searchOpenBtn?.addEventListener('click', openSearch);
heroSearchBtn?.addEventListener('click', openSearch);

searchPanel?.addEventListener('click', e => {
  const t = e.target;
  if (t?.dataset?.close === 'panel' || t?.closest?.('[data-close="panel"]')) closeSearch();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSearch();
});

// Индекс: загрузка внешнего JSON
let SEARCH_INDEX = [];
let searchIndexPromise = null;

async function loadSearchIndex() {
  try {
    const res = await fetch(`${ASSETS_BASE}/search-index.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Index HTTP error');
    const data = await res.json();
    if (Array.isArray(data)) SEARCH_INDEX = data;
  } catch {
    // Фолбэк: берём заголовки из меню, если JSON недоступен
    const links = Array.from(document.querySelectorAll('.side-list a, .menu-list a'));
    SEARCH_INDEX = links.map(a => ({
      title: (a.textContent || '').trim(),
      url: a.getAttribute('href') || '#',
      description: '',
      keywords: ''
    }));
  }
}
searchIndexPromise = loadSearchIndex();

function norm(s) { return (s || '').toLowerCase().trim(); }
function decl(n, forms) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return forms[1];
  return forms[2];
}

async function runSearch() {
  try { await searchIndexPromise; } catch {}

  const q = norm(searchInput?.value);
  if (!q) {
    if (searchResults) searchResults.innerHTML = '';
    if (searchCount) searchCount.textContent = '';
    return;
  }
  const results = SEARCH_INDEX.filter(item => {
    const hay = `${item.title} ${item.description} ${item.keywords}`.toLowerCase();
    return hay.includes(q);
  });

  if (!results.length) {
    if (searchResults) searchResults.innerHTML = '<div class="muted">Ничего не найдено</div>';
    if (searchCount) searchCount.textContent = '0 результатов';
    return;
  }

  if (searchResults) {
    searchResults.innerHTML = results.map(r => `
      <a class="result-item" href="${resolveUrl(r.url)}" data-close="panel">
        <div class="result-title">${r.title}</div>
        ${r.description ? `<p class="result-desc">${r.description}</p>` : ''}
      </a>
    `).join('');
  }
  if (searchCount) {
    searchCount.textContent = `${results.length} ${decl(results.length, ['результат', 'результата', 'результатов'])}`;
  }
}

searchRunBtn?.addEventListener('click', e => { e.preventDefault(); runSearch(); });
searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
searchInput?.addEventListener('input', () => { runSearch(); });
searchResults?.addEventListener('click', e => {
  const a = e.target.closest?.('a[data-close="panel"]');
  if (a) closeSearch();
});

// ===== Мобильное меню =====
const menuPanel = document.getElementById('menuPanel');
const menuOpenBtn = document.getElementById('menuOpenBtn');
const openMenu = () => openModal(menuPanel);
const closeMenu = () => closeModal(menuPanel);

menuOpenBtn?.addEventListener('click', openMenu);
menuPanel?.addEventListener('click', e => {
  const t = e.target;

  // 1) Клик по ссылке — закрываем меню, но даём перейти по адресу
  const link = t?.closest?.('a[href]');
  if (link) {
    closeMenu();
    return;
  }

  // 2) Клик по крестику или подложке — просто закрываем
  const closeEl = t?.closest?.('[data-close="menu"]');
  if (closeEl) {
    e.preventDefault();
    closeMenu();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
