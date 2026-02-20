// 测试 API 的脚本
import fs from 'fs';
import path from 'path';

const testFile = 'public/files/documents/metadata.json';

console.log('📋 测试前的 metadata.json:');
if (fs.existsSync(testFile)) {
  const content = fs.readFileSync(testFile, 'utf8');
  console.log(content);
} else {
  console.log('文件不存在');
}

console.log('\n🔧 模拟修改...');

// 读取
let metadata = {};
if (fs.existsSync(testFile)) {
  metadata = JSON.parse(fs.readFileSync(testFile, 'utf8'));
}

const fileName = 'gzzk-article-card.pdf';
const description = '测试描述';
const modified = '2026-02-20 18:30';

console.log('当前格式:', Array.isArray(metadata.items) ? 'new (items array)' : 'old (object)');

// 旧格式处理
if (!metadata[fileName]) {
  metadata[fileName] = {};
}
metadata[fileName].description = description;
metadata[fileName].modified = modified;

console.log('\n修改后的 metadata:');
console.log(JSON.stringify(metadata, null, 2));

// 保存
fs.writeFileSync(testFile, JSON.stringify(metadata, null, 2));

console.log('\n✅ 已保存到文件');

console.log('\n📋 验证保存结果:');
const saved = fs.readFileSync(testFile, 'utf8');
console.log(saved);
