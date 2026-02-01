const translations = {
  en: {
    title: 'File Server',
    'warning-title': 'Notice:',
    'warning-text': 'This system is designed for small files only (JS, CSS, JSON, etc.). Large files may experience slow download speeds.',
    home: 'Home',
    download: 'Download',
    empty: 'This folder is empty',
    fileName: 'File Name',
    fileSize: 'File Size',
    modified: 'Modified',
    sha256: 'SHA-256',
    calculating: 'Calculating...',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!'
  },
  zh: {
    title: '文件服务器',
    'warning-title': '注意：',
    'warning-text': '本系统仅用于存储小文件（JS、CSS、JSON等）。大文件可能会导致下载速度变慢。',
    home: '首页',
    download: '下载',
    empty: '此文件夹为空',
    fileName: '文件名',
    fileSize: '文件大小',
    modified: '修改时间',
    sha256: 'SHA-256',
    calculating: '计算中...',
    copyLink: '复制链接',
    linkCopied: '链接已复制！'
  },
  ja: {
    title: 'ファイルサーバー',
    'warning-title': '注意：',
    'warning-text': 'このシステムは小さなファイル（JS、CSS、JSONなど）専用です。大きなファイルはダウンロード速度が遅くなる可能性があります。',
    home: 'ホーム',
    download: 'ダウンロード',
    empty: 'このフォルダは空です',
    fileName: 'ファイル名',
    fileSize: 'ファイルサイズ',
    modified: '更新日時',
    sha256: 'SHA-256',
    calculating: '計算中...',
    copyLink: 'リンクをコピー',
    linkCopied: 'リンクをコピーしました！'
  }
};

// Inline SVG icons
const icons = {
  folder: '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>'
};

let currentLang = 'zh';
let currentPath = '';
let currentFileForModal = null;

function t(key) {
  return translations[currentLang][key] || key;
}

function updateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  updateUI();
  loadDirectory(currentPath);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(currentLang === 'zh' ? 'zh-CN' : currentLang === 'ja' ? 'ja-JP' : 'en-US');
}

function renderBreadcrumb(path) {
  const breadcrumb = document.getElementById('breadcrumb');
  const parts = path ? path.split('/').filter(p => p) : [];
  
  let html = `<a href="#" onclick="navigateTo(''); return false;">${t('home')}</a>`;
  
  let accumulated = '';
  parts.forEach((part, i) => {
    accumulated += (accumulated ? '/' : '') + part;
    const isLast = i === parts.length - 1;
    if (isLast) {
      html += ` <span>/</span> <span>${part}</span>`;
    } else {
      html += ` <span>/</span> <a href="#" onclick="navigateTo('${accumulated}'); return false;">${part}</a>`;
    }
  });
  
  breadcrumb.innerHTML = html;
}

async function loadDirectory(path = '') {
  currentPath = path;
  
  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    
    if (!res.ok || data.error) {
      console.error('API error:', data);
      document.getElementById('filesList').innerHTML = `<div class="empty">Error: ${data.error || 'Failed to load directory'}</div>`;
      return;
    }
    
    renderBreadcrumb(path);
    renderFiles(data.items || []);
  } catch (err) {
    console.error('Failed to load directory:', err);
    document.getElementById('filesList').innerHTML = '<div class="empty">Failed to load directory</div>';
  }
}

function renderFiles(items) {
  const list = document.getElementById('filesList');
  
  if (items.length === 0) {
    list.innerHTML = `<div class="empty">${t('empty')}</div>`;
    return;
  }
  
  list.innerHTML = items.map(item => {
    const path = currentPath ? `${currentPath}/${item.name}` : item.name;
    const icon = item.isDirectory ? icons.folder : icons.file;
    
    if (item.isDirectory) {
      return `
        <div class="file-item" onclick="navigateTo('${path}')">
          <span class="file-icon">${icon}</span>
          <span class="file-name">${item.name}</span>
          <span class="file-size">—</span>
          <span class="file-date">${formatDate(item.modified)}</span>
        </div>
      `;
    } else {
      const itemJson = JSON.stringify({name: item.name, size: item.size, modified: item.modified, path: path}).replace(/"/g, '&quot;');
      return `
        <div class="file-item" onclick="showFileModal(${itemJson})">
          <span class="file-icon">${icon}</span>
          <span class="file-name">${item.name}</span>
          <span class="file-size">${formatSize(item.size)}</span>
          <span class="file-date">${formatDate(item.modified)}</span>
          <div class="file-actions">
            <button class="copy-btn" onclick="copyFileLink('${path}'); event.stopPropagation();">${t('copyLink')}</button>
            <button class="download-btn" onclick="downloadFile('${path}'); event.stopPropagation();">${t('download')}</button>
          </div>
        </div>
      `;
    }
  }).join('');
}

async function calculateSHA256(path) {
  try {
    const response = await fetch(`/api/download?path=${encodeURIComponent(path)}`);
    const buffer = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (err) {
    console.error('SHA256 calculation error:', err);
    return 'Error calculating hash';
  }
}

function showFileModal(fileInfo) {
  currentFileForModal = fileInfo;
  
  document.getElementById('modalFileName').textContent = fileInfo.name;
  document.getElementById('fileInfo').innerHTML = `
    <div class="info-row">
      <div class="info-label">${t('fileName')}:</div>
      <div class="info-value">${fileInfo.name}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t('fileSize')}:</div>
      <div class="info-value">${formatSize(fileInfo.size)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t('modified')}:</div>
      <div class="info-value">${formatDate(fileInfo.modified)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t('sha256')}:</div>
      <div class="info-value loading" id="sha256Value">${t('calculating')}</div>
    </div>
  `;
  
  document.getElementById('fileModal').classList.add('show');
  
  // Calculate SHA256 asynchronously
  calculateSHA256(fileInfo.path).then(hash => {
    const sha256Element = document.getElementById('sha256Value');
    if (sha256Element) {
      sha256Element.textContent = hash;
      sha256Element.classList.remove('loading');
    }
  });
}

function closeModal() {
  document.getElementById('fileModal').classList.remove('show');
  currentFileForModal = null;
}

function downloadFromModal() {
  if (currentFileForModal) {
    downloadFile(currentFileForModal.path);
  }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('fileModal');
  if (e.target === modal) {
    closeModal();
  }
});

function navigateTo(path) {
  loadDirectory(path);
}

function downloadFile(path) {
  window.location.href = `/api/download?path=${encodeURIComponent(path)}`;
}

function copyFileLink(path) {
  const url = `${window.location.origin}/api/download?path=${encodeURIComponent(path)}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast(t('linkCopied'));
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy link');
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

function copyFromModal() {
  if (currentFileForModal) {
    copyFileLink(currentFileForModal.path);
  }
}

// Event listeners
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

// Make functions global
window.navigateTo = navigateTo;
window.downloadFile = downloadFile;
window.copyFileLink = copyFileLink;
window.showFileModal = showFileModal;
window.closeModal = closeModal;
window.downloadFromModal = downloadFromModal;
window.copyFromModal = copyFromModal;

// Initialize
updateUI();
loadDirectory();
