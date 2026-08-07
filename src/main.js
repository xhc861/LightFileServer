import './styles.css';
import { initPetals, initLanterns, initSnow, initWaves } from './effects.js';

const translations = {
  en: {
    title: "xhc861's Micro File Server",
    'warning-title': 'Notice:',
    'warning-text': 'This system is designed for small files only (JS, CSS, JSON, etc.). Large files may experience slow download speeds.',
    home: 'Home',
    download: 'Download',
    goToDownload: 'Go to Download',
    empty: 'This folder is empty',
    fileName: 'File Name',
    fileSize: 'File Size',
    modified: 'Modified',
    sha256: 'SHA-256',
    calculating: 'Calculating...',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!',
    description: 'Description',
    footer: 'Welcome to visit my personal website',
    toggleEffectsOff: 'Disable All Effects',
    toggleEffectsOn: 'Enable All Effects',
    searchPlaceholder: 'Search all files…',
    noResults: 'No matching files',
    resultCount: 'result(s)',
    sourceUrl: 'Source URL',
    accessPassword: 'Password',
    copyPassword: 'Copy',
    passwordCopied: 'Password copied!',
    copyFailed: 'Copy failed',
    loadFailed: 'Failed to load directory'
  },
  zh: {
    title: "xhc861's 微文件服务器",
    'warning-title': '注意：',
    'warning-text': '本系统仅用于存储小文件（JS、CSS、JSON等）。大文件可能会导致下载速度变慢。',
    home: '首页',
    download: '下载',
    goToDownload: '前往下载',
    empty: '此文件夹为空',
    fileName: '文件名',
    fileSize: '文件大小',
    modified: '修改时间',
    sha256: 'SHA-256',
    calculating: '计算中...',
    copyLink: '复制链接',
    linkCopied: '链接已复制！',
    description: '描述',
    footer: '欢迎访问个人网站',
    toggleEffectsOff: '关闭所有网页特效',
    toggleEffectsOn: '开启所有网页特效',
    searchPlaceholder: '搜索所有文件…',
    noResults: '没有匹配的文件',
    resultCount: '个结果',
    sourceUrl: '原始URL',
    accessPassword: '访问密码',
    copyPassword: '复制密码',
    passwordCopied: '密码已复制！',
    copyFailed: '复制失败',
    loadFailed: '加载目录失败'
  },
  ja: {
    title: 'xhc861 のマイクロファイルサーバー',
    'warning-title': '注意：',
    'warning-text': 'このシステムは小さなファイル（JS、CSS、JSONなど）専用です。大きなファイルはダウンロード速度が遅くなる可能性があります。',
    home: 'ホーム',
    download: 'ダウンロード',
    goToDownload: 'ダウンロードへ',
    empty: 'このフォルダは空です',
    fileName: 'ファイル名',
    fileSize: 'ファイルサイズ',
    modified: '更新日時',
    sha256: 'SHA-256',
    calculating: '計算中...',
    copyLink: 'リンクをコピー',
    linkCopied: 'リンクをコピーしました！',
    description: '説明',
    footer: '個人サイトへようこそ',
    toggleEffectsOff: 'すべてのエフェクトを無効にする',
    toggleEffectsOn: 'すべてのエフェクトを有効にする',
    searchPlaceholder: 'すべてのファイルを検索…',
    noResults: '一致するファイルがありません',
    resultCount: '件',
    sourceUrl: '元のURL',
    accessPassword: 'アクセスパスワード',
    copyPassword: 'コピー',
    passwordCopied: 'パスワードをコピーしました！',
    copyFailed: 'コピーに失敗しました',
    loadFailed: 'ディレクトリの読み込みに失敗しました'
  }
};

const icons = {
  folder: `<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
  file: `<svg viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
};

const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : '';
const MANIFEST_URL = '/files/manifest.json' + (BUILD_ID ? `?v=${BUILD_ID}` : '');

let currentLang = 'zh';
let currentPath = '';
let currentFileForModal = null;
let lastFocusedElement = null;

/** 当前渲染出来的行，每行记住它所属的目录（搜索结果会跨目录） */
let renderedRows = [];
/** 当前目录的条目，切换语言时直接重渲染，不再联网 */
let currentItems = [];
let searchQuery = '';

const $ = (id) => document.getElementById(id);

function t(key) {
  return translations[currentLang][key] || key;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ==========================================================================
   Manifest —— 整棵目录树只拉一次，之后全部在内存里翻
   ========================================================================== */

let manifestPromise = null;

function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`manifest ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data || typeof data.dirs !== 'object') throw new Error('bad manifest');
        return data;
      })
      .catch((err) => {
        console.warn('manifest 不可用，回退到 /api/browse：', err.message);
        return null;
      });
  }
  return manifestPromise;
}

/** manifest 缺失时的降级路径，行为与改动前一致 */
async function fetchDirFromApi(path) {
  const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'browse failed');
  return data.items || [];
}

/* ==========================================================================
   i18n / 主题
   ========================================================================== */

function updateUI() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key === 'footer') {
      el.childNodes[0].textContent = t(key) + ' ';
    } else {
      el.textContent = t(key);
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  updateUI();

  // 语言只影响文案，数据已经在内存里 —— 直接重渲染，不发请求
  if (searchQuery) {
    runSearch(searchQuery);
  } else {
    renderBreadcrumb(currentPath);
    renderItems(currentItems.map((item) => ({ item, dir: currentPath })));
  }

  const toggleEffectsBtn = $('toggleEffects');
  if (toggleEffectsBtn) {
    const isHidden = document.body.classList.contains('effects-hidden');
    toggleEffectsBtn.textContent = isHidden ? t('toggleEffectsOn') : t('toggleEffectsOff');
  }
}

/* ==========================================================================
   格式化
   ========================================================================== */

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function joinPath(dir, name) {
  return dir ? `${dir}/${name}` : name;
}

/* ==========================================================================
   渲染
   ========================================================================== */

function renderBreadcrumb(path) {
  const parts = path ? path.split('/').filter(Boolean) : [];
  let html = `<a href="#/" data-nav="">${escapeHtml(t('home'))}</a>`;

  let accumulated = '';
  parts.forEach((part, i) => {
    accumulated += (accumulated ? '/' : '') + part;
    const isLast = i === parts.length - 1;
    html += `<span class="sep">/</span>`;
    html += isLast
      ? `<span class="current">${escapeHtml(part)}</span>`
      : `<a href="#/${escapeHtml(encodePath(accumulated))}" data-nav="${escapeHtml(accumulated)}">${escapeHtml(part)}</a>`;
  });

  $('breadcrumb').innerHTML = html;
}

function renderSkeleton(rows = 6) {
  $('filesList').innerHTML = Array.from(
    { length: rows },
    () => '<div class="skeleton-row"><span></span><span></span><span></span></div>'
  ).join('');
}

/**
 * rows: [{ item, dir }]，dir 是该条目所在目录 —— 搜索结果里各行 dir 不同。
 * showPath 为 true 时在文件名下显示所在路径。
 */
function renderItems(rows, { showPath = false, emptyText } = {}) {
  renderedRows = rows;
  const list = $('filesList');

  if (rows.length === 0) {
    list.innerHTML = `<div class="empty">${escapeHtml(emptyText || t('empty'))}</div>`;
    return;
  }

  list.innerHTML = rows
    .map(({ item, dir }, index) => {
      const desc = item.description
        ? `<span class="file-desc">${escapeHtml(item.description)}</span>`
        : '';
      const pathLine = showPath && dir
        ? `<span class="file-path">${escapeHtml(dir)}/</span>`
        : '';

      if (item.isDirectory) {
        return `
          <div class="file-item" role="button" tabindex="0" data-index="${index}">
            <span class="file-icon folder-icon">${icons.folder}</span>
            <span class="file-name">${escapeHtml(item.name)}${desc}${pathLine}</span>
            <span class="file-size">—</span>
            <span class="file-date"></span>
            <span></span>
          </div>`;
      }

      const isUrl = item.type === 'url';
      const displayTime = escapeHtml(item.modified || '—');

      if (isUrl) {
        const metaLine = [item.fileSize ? formatSize(item.fileSize) : '', item.downloadSource]
          .filter(Boolean)
          .join(' · ');
        return `
          <div class="file-item" role="button" tabindex="0" data-index="${index}">
            <span class="file-icon link-icon">${icons.link}</span>
            <span class="file-name">${escapeHtml(item.name)}${desc}${pathLine}${
              metaLine ? `<span class="file-meta">${escapeHtml(metaLine)}</span>` : ''
            }</span>
            <span class="file-size"></span>
            <span class="file-date">${displayTime}</span>
            <span></span>
          </div>`;
      }

      return `
        <div class="file-item" role="button" tabindex="0" data-index="${index}">
          <span class="file-icon">${icons.file}</span>
          <span class="file-name">${escapeHtml(item.name)}${desc}${pathLine}</span>
          <span class="file-size">${escapeHtml(formatSize(item.size))}</span>
          <span class="file-date">${displayTime}</span>
          <span class="file-actions">
            <button type="button" class="btn btn-ghost" data-action="copy" data-index="${index}">${escapeHtml(t('copyLink'))}</button>
            <button type="button" class="btn btn-ghost" data-action="download" data-index="${index}">${escapeHtml(t('download'))}</button>
          </span>
        </div>`;
    })
    .join('');
}

/* ==========================================================================
   目录导航
   ========================================================================== */

async function loadDirectory(path = '') {
  currentPath = path;

  const manifest = await loadManifest();

  if (manifest) {
    const items = manifest.dirs[path];
    if (!items) {
      renderBreadcrumb(path);
      currentItems = [];
      renderItems([], { emptyText: t('loadFailed') });
      return;
    }
    currentItems = items;
    renderBreadcrumb(path);
    renderItems(items.map((item) => ({ item, dir: path })));
    return;
  }

  // 降级：manifest 拿不到时走老接口
  try {
    const items = await fetchDirFromApi(path);
    currentItems = items;
    renderBreadcrumb(path);
    renderItems(items.map((item) => ({ item, dir: path })));
  } catch (err) {
    console.error('Failed to load directory:', err);
    currentItems = [];
    renderBreadcrumb(path);
    renderItems([], { emptyText: t('loadFailed') });
  }
}

function encodePath(path) {
  return (path || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

function pathFromHash() {
  const hash = location.hash || '';
  if (!hash.startsWith('#/')) return '';
  try {
    return hash.slice(2).split('/').filter(Boolean).map(decodeURIComponent).join('/');
  } catch {
    return '';
  }
}

function navigateTo(path) {
  const target = '#/' + encodePath(path);
  if (location.hash === target || (!location.hash && !path)) {
    // hash 没变，hashchange 不会触发，直接渲染
    clearSearch({ silent: true });
    loadDirectory(path);
    return;
  }
  location.hash = target;
}

window.addEventListener('hashchange', () => {
  clearSearch({ silent: true });
  loadDirectory(pathFromHash());
});

/* ==========================================================================
   搜索 —— 全部在内存里做，零网络请求
   ========================================================================== */

let flatIndex = null;

async function buildFlatIndex() {
  if (flatIndex) return flatIndex;
  const manifest = await loadManifest();
  if (!manifest) return (flatIndex = []);

  flatIndex = [];
  for (const [dir, items] of Object.entries(manifest.dirs)) {
    for (const item of items) {
      flatIndex.push({
        item,
        dir,
        haystack: `${item.name}\n${item.description || ''}\n${dir}`.toLowerCase()
      });
    }
  }
  return flatIndex;
}

async function runSearch(query) {
  searchQuery = query;
  const index = await buildFlatIndex();
  const needles = query.toLowerCase().split(/\s+/).filter(Boolean);

  const hits = index.filter(({ haystack }) => needles.every((n) => haystack.includes(n)));

  $('breadcrumb').innerHTML =
    `<span class="current">${escapeHtml(`“${query}” — ${hits.length} ${t('resultCount')}`)}</span>`;
  renderItems(hits.map(({ item, dir }) => ({ item, dir })), {
    showPath: true,
    emptyText: t('noResults')
  });
}

function clearSearch({ silent = false } = {}) {
  if (!searchQuery && silent) return;
  searchQuery = '';
  const input = $('searchInput');
  if (input) input.value = '';
  $('search').classList.remove('has-value');
  if (!silent) {
    renderBreadcrumb(currentPath);
    renderItems(currentItems.map((item) => ({ item, dir: currentPath })));
  }
}

/* ==========================================================================
   弹窗
   ========================================================================== */

function showFileModal(item, dir) {
  currentFileForModal = { ...item, path: joinPath(dir, item.name) };
  lastFocusedElement = document.activeElement;

  const isUrl = item.type === 'url';
  $('modalFileName').textContent = item.name;

  const rows = [[t('fileName'), escapeHtml(item.name)]];

  if (item.description) rows.push([t('description'), escapeHtml(item.description)]);

  if (isUrl && item.url) {
    rows.push([
      t('sourceUrl'),
      `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.url)}</a>`
    ]);
  }

  if (isUrl && item.password) {
    rows.push([
      t('accessPassword'),
      `<span class="pill">${escapeHtml(item.password)}</span>` +
        `<button type="button" class="btn-inline" data-action="copy-password">${escapeHtml(t('copyPassword'))}</button>`
    ]);
  }

  rows.push([
    t('fileSize'),
    escapeHtml(isUrl ? (item.fileSize ? formatSize(item.fileSize) : '—') : formatSize(item.size))
  ]);
  rows.push([t('modified'), escapeHtml(item.modified || '—')]);

  if (!isUrl) {
    // 构建期已经算好，直接显示；只有降级路径才需要现算
    rows.push([
      t('sha256'),
      item.sha256
        ? `<span class="mono">${escapeHtml(item.sha256)}</span>`
        : `<span class="loading" id="sha256Value">${escapeHtml(t('calculating'))}</span>`
    ]);
  }

  $('fileInfo').innerHTML = rows
    .map(
      ([label, value]) => `
      <div class="info-row">
        <div class="info-label">${escapeHtml(label)}</div>
        <div class="info-value">${value}</div>
      </div>`
    )
    .join('');

  const downloadLabel = $('modalDownloadBtn').querySelector('span');
  if (downloadLabel) downloadLabel.textContent = isUrl ? t('goToDownload') : t('download');

  $('fileModal').classList.add('show');
  $('modalClose').focus();

  if (!isUrl && !item.sha256) {
    calculateSHA256(currentFileForModal.path).then((hash) => {
      const el = $('sha256Value');
      if (el) {
        el.textContent = hash;
        el.classList.remove('loading');
        el.classList.add('mono');
      }
    });
  }
}

/** 仅在 manifest 缺失的降级场景使用：把文件拉下来现算 */
async function calculateSHA256(path) {
  try {
    const response = await fetch(staticUrl(path));
    const buffer = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (err) {
    console.error('SHA256 calculation error:', err);
    return 'Error calculating hash';
  }
}

function closeModal() {
  $('fileModal').classList.remove('show');
  currentFileForModal = null;
  if (lastFocusedElement && document.contains(lastFocusedElement)) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

/* ==========================================================================
   动作
   ========================================================================== */

/** 实体文件的静态地址 —— 直接走 CDN，不再经过 Serverless Function 中转 */
function staticUrl(path) {
  return '/files/' + path.split('/').map(encodeURIComponent).join('/');
}

function downloadPath(path) {
  const a = document.createElement('a');
  a.href = staticUrl(path);
  a.download = path.split('/').pop();
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function copyText(text, okMessage) {
  navigator.clipboard
    .writeText(text)
    .then(() => showToast(okMessage))
    .catch((err) => {
      console.error('Failed to copy:', err);
      showToast(t('copyFailed'));
    });
}

function copyRowLink(item, dir) {
  if (item.type === 'url' && item.url) {
    copyText(item.url, t('linkCopied'));
    return;
  }
  copyText(`${window.location.origin}${staticUrl(joinPath(dir, item.name))}`, t('linkCopied'));
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

/* ==========================================================================
   事件绑定 —— 全部走委托，不再往 HTML 里拼 onclick
   ========================================================================== */

$('filesList').addEventListener('click', (e) => {
  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) {
    e.stopPropagation();
    const row = renderedRows[Number(actionBtn.dataset.index)];
    if (!row) return;
    if (actionBtn.dataset.action === 'copy') copyRowLink(row.item, row.dir);
    if (actionBtn.dataset.action === 'download') downloadPath(joinPath(row.dir, row.item.name));
    return;
  }

  const itemEl = e.target.closest('.file-item');
  if (!itemEl) return;
  const row = renderedRows[Number(itemEl.dataset.index)];
  if (!row) return;

  if (row.item.isDirectory) {
    navigateTo(joinPath(row.dir, row.item.name));
  } else {
    showFileModal(row.item, row.dir);
  }
});

// 行是 div[role=button]，需要自己实现 Enter / Space 激活
$('filesList').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const itemEl = e.target.closest('.file-item');
  if (!itemEl || e.target !== itemEl) return;
  e.preventDefault();
  itemEl.click();
});

$('breadcrumb').addEventListener('click', (e) => {
  const link = e.target.closest('[data-nav]');
  if (!link) return;
  e.preventDefault();
  navigateTo(link.dataset.nav);
});

let searchTimer = null;
$('searchInput').addEventListener('input', (e) => {
  const value = e.target.value.trim();
  $('search').classList.toggle('has-value', value.length > 0);
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (value) runSearch(value);
    else clearSearch();
  }, 120);
});

$('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.stopPropagation();
    clearSearch();
    e.target.blur();
  }
});

$('searchClear').addEventListener('click', () => {
  clearSearch();
  $('searchInput').focus();
});

$('modalClose').addEventListener('click', closeModal);

$('modalCopyBtn').addEventListener('click', () => {
  if (!currentFileForModal) return;
  const dir = currentFileForModal.path.split('/').slice(0, -1).join('/');
  copyRowLink(currentFileForModal, dir);
});

$('modalDownloadBtn').addEventListener('click', () => {
  if (!currentFileForModal) return;
  if (currentFileForModal.type === 'url' && currentFileForModal.url) {
    window.open(currentFileForModal.url, '_blank', 'noopener');
  } else {
    downloadPath(currentFileForModal.path);
  }
});

$('fileInfo').addEventListener('click', (e) => {
  if (e.target.dataset.action === 'copy-password' && currentFileForModal?.password) {
    copyText(currentFileForModal.password, t('passwordCopied'));
  }
});

$('fileModal').addEventListener('click', (e) => {
  if (e.target === $('fileModal')) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('fileModal').classList.contains('show')) closeModal();
});

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

/* ==========================================================================
   主题 / 特效开关
   ========================================================================== */

const html = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  html.setAttribute('data-theme', savedTheme);
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  html.setAttribute('data-theme', 'dark');
}

$('themeToggle').addEventListener('click', () => {
  const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

const toggleEffectsBtn = $('toggleEffects');
if (localStorage.getItem('effectsHidden') === 'true') {
  document.body.classList.add('effects-hidden');
}
toggleEffectsBtn.textContent = document.body.classList.contains('effects-hidden')
  ? t('toggleEffectsOn')
  : t('toggleEffectsOff');

toggleEffectsBtn.addEventListener('click', () => {
  const isHidden = document.body.classList.toggle('effects-hidden');
  localStorage.setItem('effectsHidden', isHidden);
  toggleEffectsBtn.textContent = isHidden ? t('toggleEffectsOn') : t('toggleEffectsOff');
});

/* ==========================================================================
   启动
   ========================================================================== */

updateUI();
renderSkeleton();
loadManifest();
loadDirectory(pathFromHash());

fetch('/effects-config.json')
  .then((res) => res.json())
  .then((config) => {
    if (config.petals?.enabled) initPetals(config.petals.count || 30);
    if (config.lanterns?.enabled) initLanterns(config.lanterns.text);
    if (config.snow?.enabled) initSnow(config.snow.color);
    if (config.waves?.enabled) initWaves(config.waves.colors);
  })
  .catch((err) => console.error('Failed to load effects config:', err));
