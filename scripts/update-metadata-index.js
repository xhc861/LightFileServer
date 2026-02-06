#!/usr/bin/env node

/**
 * Auto-update metadata-index.json
 * Scans all directories and adds missing entries to the index
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = join(__dirname, '..', 'public', 'files');
const INDEX_PATH = join(STORAGE_DIR, 'metadata-index.json');

console.log('Updating metadata-index.json...\n');

// Load existing index
let index = {
  version: '1.0',
  shards: {}
};

if (existsSync(INDEX_PATH)) {
  index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
  console.log(`Loaded existing index with ${Object.keys(index.shards).length} entries`);
}

// Scan directories
function scanDirectory(dirPath, relativePath = '') {
  const items = readdirSync(dirPath);
  const metadataPath = join(dirPath, 'metadata.json');
  
  // Check if this directory has or should have metadata
  if (relativePath !== '' && existsSync(metadataPath)) {
    const shardFile = relativePath + '/metadata.json';
    
    if (!index.shards[relativePath]) {
      index.shards[relativePath] = shardFile;
      console.log(`Added: ${relativePath} -> ${shardFile}`);
    }
  }
  
  // Recursively scan subdirectories
  for (const item of items) {
    if (item.startsWith('metadata-') || item === 'metadata.json') continue;
    
    const itemPath = join(dirPath, item);
    const stats = statSync(itemPath);
    
    if (stats.isDirectory()) {
      const itemRelative = relativePath ? `${relativePath}/${item}` : item;
      scanDirectory(itemPath, itemRelative);
    }
  }
}

// Ensure root entry exists
if (!index.shards['']) {
  index.shards[''] = 'metadata-root.json';
  console.log('Added: (root) -> metadata-root.json');
}

// Scan all directories
scanDirectory(STORAGE_DIR);

// Sort entries for readability
const sortedShards = {};
const entries = Object.entries(index.shards).sort((a, b) => {
  if (a[0] === '') return -1;
  if (b[0] === '') return 1;
  return a[0].localeCompare(b[0]);
});

entries.forEach(([key, value]) => {
  sortedShards[key] = value;
});

index.shards = sortedShards;

// Write updated index
writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');

console.log(`\nIndex updated with ${Object.keys(index.shards).length} total entries`);
console.log('Saved: metadata-index.json');
