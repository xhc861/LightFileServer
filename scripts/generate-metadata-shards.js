#!/usr/bin/env node

/**
 * 元数据分片生成工具
 * node scripts/generate-metadata-shards.js
 * 
 * 1. 读取 public/files/metadata.json
 * 2. 按目录拆分成多个小文件
 * 3. 生成 metadata-index.json 索引文件
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = join(__dirname, '..', 'public', 'files');
const METADATA_FILE = join(STORAGE_DIR, 'metadata.json');

function main() {
  console.log('Starting metadata sharding...\n');

  // 读取原始元数据
  if (!existsSync(METADATA_FILE)) {
    console.error('Error: metadata.json not found');
    process.exit(1);
  }

  const metadata = JSON.parse(readFileSync(METADATA_FILE, 'utf-8'));
  console.log(`Loaded ${Object.keys(metadata).length} metadata records\n`);

  // 按目录分组
  const shards = {
    '': {} // 根目录
  };

  for (const [key, value] of Object.entries(metadata)) {
    if (key.includes('/')) {
      // 文件路径，提取目录
      const parts = key.split('/');
      const dir = parts[0];
      const filename = parts.slice(1).join('/');

      if (!shards[dir]) {
        shards[dir] = {};
      }
      shards[dir][filename] = value;
    } else {
      // 根目录项（文件夹描述或根文件）
      shards[''][key] = value;
    }
  }

  // 生成索引
  const index = {
    version: '1.0',
    shards: {}
  };

  // 写入分片文件
  for (const [dir, data] of Object.entries(shards)) {
    const shardFilename = dir === '' ? 'metadata-root.json' : `${dir}/metadata.json`;
    const shardPath = join(STORAGE_DIR, shardFilename);

    // 确保目录存在
    const shardDir = dirname(shardPath);
    if (!existsSync(shardDir)) {
      mkdirSync(shardDir, { recursive: true });
    }

    // 写入分片
    writeFileSync(shardPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Generated: ${shardFilename} (${Object.keys(data).length} records)`);

    // 添加到索引
    index.shards[dir] = shardFilename;
  }

  // 写入索引文件
  const indexPath = join(STORAGE_DIR, 'metadata-index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`\nGenerated index file: metadata-index.json`);

  console.log('\nMetadata sharding completed!');
  console.log('\nStatistics:');
  console.log(`   - Total shards: ${Object.keys(shards).length}`);
  console.log(`   - Total records: ${Object.keys(metadata).length}`);
  console.log('\nNote: You can now delete or backup the old metadata.json file');
}

main();
