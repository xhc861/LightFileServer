// 完整测试
import fs from 'fs';
import path from 'path';

const metadataFile = 'public/files/documents/metadata.json';

console.log('=== 步骤 1: 读取当前 metadata ===');
let metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
console.log(JSON.stringify(metadata, null, 2));

console.log('\n=== 步骤 2: 修改时间 ===');
const fileName = 'gzzk-article-card.pdf';
const newTime = '2026-02-21 10:00';

if (!metadata[fileName]) {
  metadata[fileName] = {};
}
metadata[fileName].modified = newTime;

console.log('修改后:');
console.log(JSON.stringify(metadata, null, 2));

console.log('\n=== 步骤 3: 保存 ===');
fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
console.log('已保存');

console.log('\n=== 步骤 4: 重新读取验证 ===');
const saved = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
console.log(JSON.stringify(saved, null, 2));

console.log('\n=== 步骤 5: 模拟 browse API 读取 ===');
const metaContent = saved;
const metadataMap = metaContent; // Old format

console.log('metadata[fileName]:', metadataMap[fileName]);
console.log('modified 字段:', metadataMap[fileName].modified);

const customModified = metadataMap[fileName].modified;
console.log('\ncustomModified 应该是:', customModified);

const item = {
  name: fileName,
  isDirectory: false,
  size: 85170,
  modified: new Date(),
  customModified: customModified,
  description: metadataMap[fileName].description
};

console.log('\n=== 最终返回的 item ===');
console.log(JSON.stringify(item, null, 2));
