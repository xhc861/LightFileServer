#!/usr/bin/env node

/**
 * Auto-generate metadata.json for directories
 * 
 * Usage: node scripts/generate-metadata.js <directory-path>
 * Example: node scripts/generate-metadata.js public/files/midi/animenzzz
 * 
 * Features:
 * - Scans directory for files
 * - Generates metadata entries with file modification time
 * - Preserves existing metadata (incremental update)
 * - Only adds new files, doesn't overwrite existing descriptions
 */

import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateMetadata(targetDir) {
  const metadataPath = join(targetDir, 'metadata.json');
  
  // Load existing metadata if it exists
  let existingMetadata = {};
  if (existsSync(metadataPath)) {
    try {
      const content = readFileSync(metadataPath, 'utf-8');
      existingMetadata = JSON.parse(content);
      console.log(`Loaded existing metadata with ${Object.keys(existingMetadata).length} entries`);
    } catch (err) {
      console.error('Warning: Failed to parse existing metadata:', err.message);
    }
  }

  // Scan directory for files and subdirectories
  const items = readdirSync(targetDir);
  const newMetadata = { ...existingMetadata };
  let addedCount = 0;
  let skippedCount = 0;

  items.forEach(item => {
    // Skip metadata files
    if (item === 'metadata.json' || item === 'metadata-index.json' || item.startsWith('metadata-')) {
      return;
    }

    const itemPath = join(targetDir, item);
    const stats = statSync(itemPath);

    // Check if entry already exists
    if (existingMetadata[item]) {
      skippedCount++;
      return;
    }

    if (stats.isDirectory()) {
      // Add directory entry with empty description
      newMetadata[item] = {
        description: ''
      };
      addedCount++;
      console.log(`Added directory: ${item}`);
    } else {
      // Add file entry with modification time
      const modifiedTime = stats.mtime.toISOString();
      newMetadata[item] = {
        modified: modifiedTime,
        description: ''
      };
      addedCount++;
      console.log(`Added file: ${item} (${modifiedTime})`);
    }
  });

  // Sort entries: directories first, then files, alphabetically
  const sortedMetadata = {};
  const entries = Object.entries(newMetadata);
  
  entries.sort((a, b) => {
    const aIsDir = !a[1].modified;
    const bIsDir = !b[1].modified;
    
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a[0].localeCompare(b[0]);
  });

  entries.forEach(([key, value]) => {
    sortedMetadata[key] = value;
  });

  // Write metadata file
  writeFileSync(metadataPath, JSON.stringify(sortedMetadata, null, 2), 'utf-8');
  
  console.log('\nSummary:');
  console.log(`  Added: ${addedCount} entries`);
  console.log(`  Skipped: ${skippedCount} existing entries`);
  console.log(`  Total: ${Object.keys(sortedMetadata).length} entries`);
  console.log(`\nMetadata file saved: ${metadataPath}`);
  console.log('\nNote: Please edit the file to add descriptions for new entries.');
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Please provide a directory path');
  console.error('Usage: node scripts/generate-metadata.js <directory-path>');
  console.error('Example: node scripts/generate-metadata.js public/files/midi/animenzzz');
  process.exit(1);
}

const targetDir = args[0];

if (!existsSync(targetDir)) {
  console.error(`Error: Directory not found: ${targetDir}`);
  process.exit(1);
}

const stats = statSync(targetDir);
if (!stats.isDirectory()) {
  console.error(`Error: Not a directory: ${targetDir}`);
  process.exit(1);
}

console.log(`Generating metadata for: ${targetDir}\n`);
generateMetadata(targetDir);
