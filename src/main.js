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
    toggleEffectsOn: 'Enable All Effects'
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
    toggleEffectsOn: '开启所有网页特效'
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
    toggleEffectsOn: 'すべてのエフェクトを有効にする'
  }
};

// Inline SVG icons
const icons = {
  folder: `<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
  file: `<svg viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
};

let currentLang = 'zh';
let currentPath = '';
let currentFileForModal = null;

function t(key) {
  return translations[currentLang][key] || key;
}

function updateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key === 'footer') {
      // Special handling for footer to preserve the link
      el.childNodes[0].textContent = t(key) + ' ';
    } else {
      el.textContent = t(key);
    }
  });
}

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  updateUI();
  loadDirectory(currentPath);
  
  // Update toggle effects button text
  const toggleEffectsBtn = document.getElementById('toggleEffects');
  if (toggleEffectsBtn) {
    const isHidden = document.body.classList.contains('effects-hidden');
    toggleEffectsBtn.textContent = isHidden ? t('toggleEffectsOn') : t('toggleEffectsOff');
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  // Parse the ISO string manually to avoid timezone conversion
  // Format: "2026-02-01T19:31:09Z"
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return '—';
  
  const [, year, month, day, hour, minute, second] = match;
  
  if (currentLang === 'zh') {
    return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
  } else if (currentLang === 'ja') {
    return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
  } else {
    return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
  }
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
  
  list.innerHTML = items.map((item, index) => {
    const path = currentPath ? `${currentPath}/${item.name}` : item.name;
    
    if (item.isDirectory) {
      const icon = icons.folder;
      // Display folder name with description below, same as files
      return `
        <div class="file-item" onclick="navigateTo('${path}')">
          <span class="file-icon">${icon}</span>
          <span class="file-name">${item.name}${item.description ? '<br><small style="color: #999; font-size: 12px;">' + item.description + '</small>' : ''}</span>
          <span class="file-size">—</span>
          <span class="file-date"></span>
        </div>
      `;
    } else {
      // Determine icon based on type
      const isUrl = item.type === 'url';
      const icon = isUrl ? icons.link : icons.file;
      const iconClass = isUrl ? 'link-icon' : '';
      
      // Store item data in a global array to avoid JSON escaping issues
      if (!window.fileItems) window.fileItems = [];
      window.fileItems[index] = {
        name: item.name,
        type: item.type || 'file',
        size: item.size,
        fileSize: item.fileSize,
        modified: item.modified,
        customModified: item.customModified,
        path: path,
        description: item.description,
        url: item.url,
        password: item.password,
        downloadSource: item.downloadSource
      };
      
      // Use custom modified time if available (as string), otherwise format file system time
      const displayTime = item.customModified || formatDate(item.modified);
      
      console.log(`File ${item.name}: type=${item.type}, customModified=${item.customModified}, displayTime=${displayTime}`);
      
      // For URL links, show size and download source in one line below description
      if (isUrl) {
        const sizeText = item.fileSize ? formatSize(item.fileSize) : '';
        const metadataLine = [sizeText, item.downloadSource].filter(x => x).join('  ');
        
        return `
          <div class="file-item" onclick="showFileModalByIndex(${index})">
            <span class="file-icon ${iconClass}">${icon}</span>
            <span class="file-name">
              ${item.name}
              ${item.description ? '<br><small style="color: #999; font-size: 12px;">' + item.description + '</small>' : ''}
              ${metadataLine ? '<br><small style="color: #999; font-size: 11px;">' + metadataLine + '</small>' : ''}
            </span>
            <span class="file-size"></span>
            <span class="file-date">${displayTime}</span>
          </div>
        `;
      } else {
        // For regular files, show normally
        return `
          <div class="file-item" onclick="showFileModalByIndex(${index})">
            <span class="file-icon ${iconClass}">${icon}</span>
            <span class="file-name">${item.name}${item.description ? '<br><small style="color: #999; font-size: 12px;">' + item.description + '</small>' : ''}</span>
            <span class="file-size">${formatSize(item.size)}</span>
            <span class="file-date">${displayTime}</span>
            <div class="file-actions">
              <button class="copy-btn" onclick="copyFileLink('${path}'); event.stopPropagation();">${t('copyLink')}</button>
              <button class="download-btn" onclick="downloadFile('${path}'); event.stopPropagation();">${t('download')}</button>
            </div>
          </div>
        `;
      }
    }
  }).join('');
}

function showFileModalByIndex(index) {
  if (window.fileItems && window.fileItems[index]) {
    showFileModal(window.fileItems[index]);
  }
}

async function calculateSHA256(path, isUrl) {
  if (isUrl) {
    return 'N/A (URL Link)';
  }
  
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
  
  const isUrl = fileInfo.type === 'url';
  
  document.getElementById('modalFileName').textContent = fileInfo.name;
  
  let infoHTML = `
    <div class="info-row">
      <div class="info-label">${t('fileName')}:</div>
      <div class="info-value">${fileInfo.name}</div>
    </div>`;
  
  // Add description if available
  if (fileInfo.description) {
    infoHTML += `
    <div class="info-row">
      <div class="info-label">${t('description')}:</div>
      <div class="info-value">${fileInfo.description}</div>
    </div>`;
  }
  
  // Show original URL for link type
  if (isUrl && fileInfo.url) {
    infoHTML += `
    <div class="info-row">
      <div class="info-label">原始URL:</div>
      <div class="info-value" style="word-break: break-all; max-height: 100px; overflow-y: auto;">
        <a href="${fileInfo.url}" target="_blank" style="color: #007bff;">${fileInfo.url}</a>
      </div>
    </div>`;
  }
  
  // Show password if available
  if (isUrl && fileInfo.password) {
    infoHTML += `
    <div class="info-row">
      <div class="info-label">访问密码:</div>
      <div class="info-value">
        <span style="font-family: monospace; background: var(--bg-secondary, #f5f5f5); color: var(--text-primary, #333); padding: 4px 8px; border-radius: 4px; display: inline-block; border: 1px solid var(--border-color, #ddd); margin-right: 8px;">${fileInfo.password}</span>
        <button onclick="copyPassword('${fileInfo.password}'); event.stopPropagation();" style="padding: 4px 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">复制密码</button>
      </div>
    </div>`;
  }
  
  infoHTML += `
    <div class="info-row">
      <div class="info-label">${t('fileSize')}:</div>
      <div class="info-value">${isUrl ? (fileInfo.fileSize ? formatSize(fileInfo.fileSize) : '—') : formatSize(fileInfo.size)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${t('modified')}:</div>
      <div class="info-value">${formatDate(fileInfo.modified)}</div>
    </div>`;
  
  if (!isUrl) {
    infoHTML += `
    <div class="info-row">
      <div class="info-label">${t('sha256')}:</div>
      <div class="info-value loading" id="sha256Value">${t('calculating')}</div>
    </div>`;
  }
  
  document.getElementById('fileInfo').innerHTML = infoHTML;
  
  // Update download button text based on file type
  const downloadBtn = document.querySelector('.modal-download-btn span');
  if (downloadBtn) {
    downloadBtn.textContent = isUrl ? t('goToDownload') : t('download');
  }
  
  document.getElementById('fileModal').classList.add('show');
  
  // Calculate SHA256 asynchronously (only for files)
  if (!isUrl) {
    calculateSHA256(fileInfo.path, false).then(hash => {
      const sha256Element = document.getElementById('sha256Value');
      if (sha256Element) {
        sha256Element.textContent = hash;
        sha256Element.classList.remove('loading');
      }
    });
  }
}

function closeModal() {
  document.getElementById('fileModal').classList.remove('show');
  currentFileForModal = null;
}

function downloadFromModal() {
  if (currentFileForModal) {
    const isUrl = currentFileForModal.type === 'url';
    
    if (isUrl && currentFileForModal.url) {
      // For URL links, open in new tab
      window.open(currentFileForModal.url, '_blank');
    } else {
      // For regular files, download
      downloadFile(currentFileForModal.path);
    }
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
  // Encode only special characters, keep Chinese readable
  const safePath = path.replace(/ /g, '%20').replace(/#/g, '%23').replace(/\?/g, '%3F');
  window.location.href = `/api/download?path=${safePath}`;
}

function copyFileLink(path) {
  // Get file info from global array
  const fileInfo = window.fileItems.find(item => {
    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    return itemPath === path;
  });
  
  // If it's a URL link, copy the original URL
  if (fileInfo && fileInfo.type === 'url') {
    navigator.clipboard.writeText(fileInfo.url).then(() => {
      showToast(t('linkCopied'));
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy link');
    });
  } else {
    // For regular files, copy the download API URL
    const safePath = path.replace(/ /g, '%20').replace(/#/g, '%23').replace(/\?/g, '%3F');
    const url = `${window.location.origin}/api/download?path=${safePath}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast(t('linkCopied'));
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy link');
    });
  }
}

function copyPassword(password) {
  navigator.clipboard.writeText(password).then(() => {
    showToast('密码已复制！');
  }).catch(err => {
    console.error('Failed to copy password:', err);
    showToast('复制失败');
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
window.copyPassword = copyPassword;
window.showFileModal = showFileModal;
window.showFileModalByIndex = showFileModalByIndex;
window.closeModal = closeModal;
window.downloadFromModal = downloadFromModal;
window.copyFromModal = copyFromModal;


// Initialize
updateUI();
loadDirectory();

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Load saved theme or use system preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  html.setAttribute('data-theme', savedTheme);
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  html.setAttribute('data-theme', 'dark');
}

themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

// Toggle effects button
const toggleEffectsBtn = document.getElementById('toggleEffects');
const savedEffectsState = localStorage.getItem('effectsHidden');
if (savedEffectsState === 'true') {
  document.body.classList.add('effects-hidden');
  toggleEffectsBtn.textContent = t('toggleEffectsOn');
}

toggleEffectsBtn.addEventListener('click', () => {
  const isHidden = document.body.classList.toggle('effects-hidden');
  localStorage.setItem('effectsHidden', isHidden);
  toggleEffectsBtn.textContent = isHidden ? t('toggleEffectsOn') : t('toggleEffectsOff');
});

// Load effects configuration and initialize
fetch('/effects-config.json')
  .then(res => res.json())
  .then(config => {
    if (config.petals?.enabled) {
      initPetals(config.petals.count || 30);
    }
    if (config.lanterns?.enabled) {
      initLanterns(config.lanterns.text);
    }
    if (config.snow?.enabled) {
      initSnow(config.snow.color);
    }
    if (config.waves?.enabled) {
      initWaves(config.waves.colors);
    }
  })
  .catch(err => console.error('Failed to load effects config:', err));
