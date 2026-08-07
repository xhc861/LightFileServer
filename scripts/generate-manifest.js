#!/usr/bin/env node

/**
 * 构建期清单生成器
 * node scripts/generate-manifest.js
 *
 * 遍历 public/files，把每个目录的条目、描述、大小、修改时间和 SHA-256
 * 一次性算死，写进 public/files/manifest.json。
 *
 * 前端首屏拉一次这个文件就拿到整棵树，之后翻目录不再产生任何网络请求，
 * 弹窗里的 SHA-256 也不用再把整个文件下载到浏览器现算。
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STORAGE_DIR = join(__dirname, '..', 'public', 'files');
const MANIFEST_FILE = join(STORAGE_DIR, 'manifest.json');
const MANIFEST_NAME = 'manifest.json';

/** 不对外展示的内部文件，规则与 api/browse.js 保持一致 */
function isHiddenEntry(name) {
  if (name === MANIFEST_NAME) return false; // 单独处理，见下
  if (name === 'metadata.json') return true;
  if (name === 'metadata-index.json') return true;
  if (name === 'metadata-root.json') return true;
  if (name.startsWith('metadata-')) return true;
  if (name.endsWith('.backup.json')) return true;
  return false;
}

/**
 * 读取一个目录的元数据表，兼容两种历史格式：
 *   { "文件名": { description, modified, ... } }
 *   { items: [ { name, description, ... } ] }
 * 返回以子项名为键的对象。
 */
function readMetadataTable(filePath) {
  if (!existsSync(filePath)) return {};
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (raw && Array.isArray(raw.items)) {
      const table = {};
      for (const item of raw.items) {
        if (item && item.name) table[item.name] = { ...item };
      }
      return table;
    }
    if (raw && typeof raw === 'object') return raw;
  } catch (err) {
    console.error(`  ! 解析失败，已忽略: ${filePath} (${err.message})`);
  }
  return {};
}

/**
 * 取某个目录的元数据表。
 * 约定：父目录的 metadata.json 描述它的子项（文件和子目录都算）。
 * 根目录优先用 metadata-root.json，回退到 metadata.json。
 */
function metadataForDir(dirPath, relPath) {
  if (relPath === '') {
    const root = join(dirPath, 'metadata-root.json');
    const legacy = join(dirPath, 'metadata.json');
    return { ...readMetadataTable(legacy), ...readMetadataTable(root) };
  }
  return readMetadataTable(join(dirPath, 'metadata.json'));
}

function sha256OfFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/** 目录在前，其余按名称排序 —— 与前端原来的排序规则一致 */
function sortItems(items) {
  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

const dirs = {};
let fileCount = 0;
let urlCount = 0;

function walk(absDir) {
  const relPath = relative(STORAGE_DIR, absDir).split(sep).join('/');
  const metadata = metadataForDir(absDir, relPath);
  const items = [];

  for (const name of readdirSync(absDir)) {
    if (isHiddenEntry(name)) continue;
    if (relPath === '' && name === MANIFEST_NAME) continue;

    const abs = join(absDir, name);
    const stats = statSync(abs);
    const meta = metadata[name] || {};
    const isDirectory = stats.isDirectory();

    if (isDirectory) {
      items.push({
        name,
        type: 'file',
        isDirectory: true,
        size: stats.size,
        modified: null,
        description: meta.description || null,
        password: null,
        downloadSource: null
      });
      walk(abs);
      continue;
    }

    items.push({
      name,
      type: 'file',
      isDirectory: false,
      size: stats.size,
      // 只用元数据里写的时间，不做时区转换 —— 与原有展示行为一致
      modified: meta.modified || null,
      description: meta.description || null,
      password: meta.password || null,
      downloadSource: meta.downloadSource || null,
      sha256: sha256OfFile(abs)
    });
    fileCount++;
  }

  // 元数据里声明的外链条目，本地没有实体文件
  for (const [name, value] of Object.entries(metadata)) {
    if (!value || value.type !== 'url' || !value.url) continue;
    items.push({
      name,
      type: 'url',
      isDirectory: false,
      size: 0,
      fileSize: value.fileSize || null,
      modified: value.modified || null,
      description: value.description || null,
      url: value.url,
      password: value.password || null,
      downloadSource: value.downloadSource || null
    });
    urlCount++;
  }

  dirs[relPath] = sortItems(items);
}

function main() {
  if (!existsSync(STORAGE_DIR)) {
    console.error(`Error: 存储目录不存在 ${STORAGE_DIR}`);
    process.exit(1);
  }

  walk(STORAGE_DIR);

  // buildId 由内容决定：内容不变则 URL 不变，可以长期 immutable 缓存
  const body = { version: 2, dirs };
  const buildId = createHash('sha256')
    .update(JSON.stringify(body))
    .digest('hex')
    .slice(0, 12);

  writeFileSync(MANIFEST_FILE, JSON.stringify({ buildId, ...body }), 'utf-8');

  const bytes = statSync(MANIFEST_FILE).size;
  console.log(`Generated manifest.json (${(bytes / 1024).toFixed(1)} KB, buildId ${buildId})`);
  console.log(`  目录 ${Object.keys(dirs).length} 个，文件 ${fileCount} 个，外链 ${urlCount} 个`);
}

main();
