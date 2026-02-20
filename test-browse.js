// 测试 browse API
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.join(__dirname, 'public', 'files');

function safePath(requestPath) {
  const normalized = path.normalize(path.join(STORAGE_DIR, requestPath || ''));
  if (!normalized.startsWith(STORAGE_DIR)) {
    throw new Error('Invalid path');
  }
  return normalized;
}

const testPath = 'documents';
const fullPath = safePath(testPath);

console.log('📂 测试路径:', testPath);
console.log('完整路径:', fullPath);

// Read metadata
let metadata = {};
const metadataPath = path.join(fullPath, 'metadata.json');
if (fs.existsSync(metadataPath)) {
  const metaContent = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log('\n📋 Metadata 内容:');
  console.log(JSON.stringify(metaContent, null, 2));
  
  if (Array.isArray(metaContent.items)) {
    console.log('\n格式: new (items array)');
    metaContent.items.forEach(item => {
      metadata[item.name] = item;
    });
  } else if (typeof metaContent === 'object') {
    console.log('\n格式: old (object)');
    metadata = metaContent;
  }
}

console.log('\n📊 处理后的 metadata:');
console.log(JSON.stringify(metadata, null, 2));

const items = fs.readdirSync(fullPath).map(name => {
  const itemPath = path.join(fullPath, name);
  const itemStats = fs.statSync(itemPath);
  const isDirectory = itemStats.isDirectory();
  
  let description = '';
  let customModified = null;
  
  if (metadata[name]) {
    description = metadata[name].description || '';
    if (metadata[name].modified) {
      customModified = metadata[name].modified;
    }
  }
  
  return {
    name,
    isDirectory,
    size: itemStats.size,
    modified: itemStats.mtime,
    customModified,
    description
  };
});

console.log('\n📁 返回的 items:');
items.forEach(item => {
  console.log(`\n${item.name}:`);
  console.log('  description:', item.description);
  console.log('  customModified:', item.customModified);
  console.log('  modified:', item.modified);
});
