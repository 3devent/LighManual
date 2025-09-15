// ===== Базовые ссылки на DOM =====
const rootEl = document.documentElement;
const themeBtn = document.getElementById('themeToggleBtn');

// ===== Тема (светлая/тёмная) =====
function systemPref() {
  try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  catch { return 'light'; }
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
  mql.addEventListener?.('change', () => {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch {}
    if (!saved) setTheme(systemPref());
  });
} catch {}

// ===== Подвал: год и "Наверх" =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
document.getElementById('backToTop')?.addEventListener('click', e => {
  e.preventDefault();
  scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== Помощники для модалок =====
function openModal(el) {
  el?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}
function closeModal(el) {
  el?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
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

// Определяем корректный путь к assets/ (для главной и страниц разделов)
const IS_IN_SECTIONS = /\/sections\//.test(location.pathname);
const ASSETS_BASE = IS_IN_SECTIONS ? '../assets' : 'assets';

// Индекс: загрузка внешнего JSON
let SEARCH_INDEX = [];
async function loadSearchIndex() {
  try {
    const res = await fetch(`${ASSETS_BASE}/search-index.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Index HTTP error');
    const data = await res.json();
    if (Array.isArray(data)) SEARCH_INDEX = data;
  } catch (err) {
    // Фолбэк: берём заголовки из меню, если JSON недоступен
    const links = Array.from(document.querySelectorAll('.side-list a, .menu-list a'));
    SEARCH_INDEX = links.map(a => ({
      title: a.textContent.trim(),
      url: a.getAttribute('href'),
      description: '',
      keywords: ''
    }));
  }
}
loadSearchIndex();

function norm(s) { return (s || '').toLowerCase().trim(); }
function decl(n, forms) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return forms[1];
  return forms[2];


function absHref(u) {
  try {
    // делаем абсолютный URL относительно текущей страницы; ../ и anchors тоже нормализуются
    return new URL(u, location.href).href;
  } catch {
    return u || '#';
  }
}

function runSearch() {
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
    searchResults.innerHTML = results.map(r => {
  const href = absHref(r.url);
  return `
    <a class="result-item" href="${href}" data-close="panel">
      <div class="result-title">${r.title}</div>
      ${r.description ? `<p class="result-desc">${r.description}</p>` : ''}
    </a>
  `;
}).join('');
  }
  if (searchCount) {
    searchCount.textContent = `${results.length} ${decl(results.length, ['результат', 'результата', 'результатов'])}`;
  }
}

searchRunBtn?.addEventListener('click', runSearch);
searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
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
  const link = t?.closest('a[href]');
  if (link) {
    closeMenu();
    return; // важный момент: не вызываем preventDefault()
  }

  // 2) Клик по крестику или подложке — просто закрываем
  const closeEl = t?.closest('[data-close="menu"]');
  if (closeEl) {
    e.preventDefault(); // допустимо (кнопка/подложка)
    closeMenu();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
