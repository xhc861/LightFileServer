#!/usr/bin/env node

/**
 * Diagnose metadata system issues
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = join(__dirname, '..', 'public', 'files');

console.log('Metadata System Diagnostics\n');
console.log('='.repeat(50));

// Check index file
console.log('\n1. Checking metadata-index.json...');
const indexPath = join(STORAGE_DIR, 'metadata-index.json');
if (!existsSync(indexPath)) {
  console.log('ERROR: metadata-index.json not found!');
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
console.log(`OK: Found ${Object.keys(index.shards).length} shard entries`);

// Check each shard
console.log('\n2. Checking shard files...');
let errors = 0;
for (const [key, shardFile] of Object.entries(index.shards)) {
  const shardPath = join(STORAGE_DIR, shardFile);
  const displayKey = key === '' ? '(root)' : key;
  
  if (!existsSync(shardPath)) {
    console.log(`ERROR: ${displayKey} -> ${shardFile} NOT FOUND`);
    errors++;
  } else {
    try {
      const content = JSON.parse(readFileSync(shardPath, 'utf-8'));
      const count = Object.keys(content).length;
      console.log(`OK: ${displayKey} -> ${shardFile} (${count} entries)`);
    } catch (err) {
      console.log(`ERROR: ${displayKey} -> ${shardFile} INVALID JSON: ${err.message}`);
      errors++;
    }
  }
}

// Check for directories without metadata
console.log('\n3. Checking for missing metadata files...');
function checkDirectory(dirPath, relativePath = '') {
  const items = readdirSync(dirPath);
  
  for (const item of items) {
    if (item.startsWith('metadata-') || item === 'metadata.json') continue;
    
    const itemPath = join(dirPath, item);
    const stats = statSync(itemPath);
    
    if (stats.isDirectory()) {
      const itemRelative = relativePath ? `${relativePath}/${item}` : item;
      const metadataPath = join(itemPath, 'metadata.json');
      
      // Check if this directory should have metadata
      if (index.shards[itemRelative]) {
        if (!existsSync(metadataPath)) {
          console.log(`WARNING: ${itemRelative} is in index but metadata.json missing`);
          errors++;
        }
      } else {
        // Check if directory has subdirectories or files
        const subItems = readdirSync(itemPath);
        const hasContent = subItems.some(sub => {
          const subPath = join(itemPath, sub);
          return !sub.startsWith('metadata');
        });
        
        if (hasContent) {
          console.log(`INFO: ${itemRelative} has content but not in index`);
        }
      }
      
      // Recursively check subdirectories
      checkDirectory(itemPath, itemRelative);
    }
  }
}

checkDirectory(STORAGE_DIR);

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0) {
  console.log('SUCCESS: No errors found!');
} else {
  console.log(`FAILED: Found ${errors} error(s)`);
  process.exit(1);
}
