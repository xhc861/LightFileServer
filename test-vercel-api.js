// Test script to simulate Vercel API behavior
import { readFileSync, existsSync } from 'fs';
import { join, normalize } from 'path';

console.log('🧪 Testing Vercel API Behavior\n');
console.log('=' .repeat(60));

// Simulate Vercel environment
const STORAGE_DIR = join(process.cwd(), 'public', 'files');
const METADATA_INDEX = join(STORAGE_DIR, 'metadata-index.json');

console.log('\n📍 Environment:');
console.log(`   CWD: ${process.cwd()}`);
console.log(`   STORAGE_DIR: ${STORAGE_DIR}`);
console.log(`   METADATA_INDEX: ${METADATA_INDEX}`);

// Test Case 1: Browse Apps directory
console.log('\n\n🧪 Test Case 1: Browse /Apps directory');
console.log('-'.repeat(60));

const testPath = 'Apps';

try {
  // Load metadata index
  if (!existsSync(METADATA_INDEX)) {
    console.log('❌ METADATA_INDEX not found!');
    process.exit(1);
  }

  const indexContent = readFileSync(METADATA_INDEX, 'utf-8');
  const index = JSON.parse(indexContent);
  
  console.log(`✅ Loaded metadata index`);
  console.log(`   Available shards: ${Object.keys(index.shards).join(', ')}`);
  
  // Get shard for Apps
  const shardKey = testPath;
  const shardFile = index.shards[shardKey];
  
  console.log(`\n🔍 Looking for shard key: "${shardKey}"`);
  console.log(`   Found shard file: ${shardFile || 'NOT FOUND'}`);
  
  if (!shardFile) {
    console.log('❌ No shard found for Apps!');
    process.exit(1);
  }
  
  // Load shard
  const shardPath = join(STORAGE_DIR, shardFile);
  console.log(`   Shard path: ${shardPath}`);
  console.log(`   Exists: ${existsSync(shardPath)}`);
  
  if (!existsSync(shardPath)) {
    console.log('❌ Shard file does not exist!');
    process.exit(1);
  }
  
  const shardContent = readFileSync(shardPath, 'utf-8');
  const rawMetadata = JSON.parse(shardContent);
  
  console.log(`\n📄 Raw metadata format: ${rawMetadata.items ? 'items array' : 'object'}`);
  
  // Convert to object format if needed
  let metadata = {};
  if (rawMetadata.items && Array.isArray(rawMetadata.items)) {
    rawMetadata.items.forEach(item => {
      if (item.name) {
        metadata[item.name] = item;
      }
    });
    console.log(`✅ Converted items array to object format`);
  } else {
    metadata = rawMetadata;
  }
  
  console.log(`\n📦 Metadata entries: ${Object.keys(metadata).length}`);
  
  // Find URL links
  const urlItems = [];
  for (const [key, value] of Object.entries(metadata)) {
    console.log(`\n   Entry: "${key}"`);
    console.log(`      type: ${value.type || 'undefined'}`);
    console.log(`      url: ${value.url || 'undefined'}`);
    
    if (value.type === 'url' && value.url) {
      urlItems.push({
        name: key,
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
    }
  }
  
  console.log(`\n✅ Found ${urlItems.length} URL items`);
  
  if (urlItems.length === 0) {
    console.log('❌ No URL items found! This is the problem.');
    console.log('\n🔍 Debugging info:');
    console.log('   Raw metadata:', JSON.stringify(rawMetadata, null, 2));
  } else {
    console.log('\n📋 URL items that would be returned:');
    urlItems.forEach(item => {
      console.log(`\n   📎 ${item.name}`);
      console.log(`      URL: ${item.url}`);
      console.log(`      Description: ${item.description || 'N/A'}`);
      console.log(`      Password: ${item.password || 'N/A'}`);
    });
  }
  
} catch (err) {
  console.log(`\n❌ Error: ${err.message}`);
  console.log(err.stack);
  process.exit(1);
}

// Test Case 2: Download/Redirect
console.log('\n\n🧪 Test Case 2: Download Sleep-v20260121.apk');
console.log('-'.repeat(60));

const downloadPath = 'Apps/Sleep-v20260121.apk';
const pathParts = downloadPath.split('/');
const fileName = pathParts.pop();
const dirPath = pathParts.join('/');

console.log(`   File: ${fileName}`);
console.log(`   Directory: ${dirPath}`);

try {
  const indexContent = readFileSync(METADATA_INDEX, 'utf-8');
  const index = JSON.parse(indexContent);
  const shardFile = index.shards[dirPath];
  
  console.log(`   Shard file: ${shardFile || 'NOT FOUND'}`);
  
  if (!shardFile) {
    console.log('❌ No shard found!');
  } else {
    const shardPath = join(STORAGE_DIR, shardFile);
    const shardContent = readFileSync(shardPath, 'utf-8');
    const rawMetadata = JSON.parse(shardContent);
    
    // Convert format
    let metadata = {};
    if (rawMetadata.items && Array.isArray(rawMetadata.items)) {
      rawMetadata.items.forEach(item => {
        if (item.name) {
          metadata[item.name] = item;
        }
      });
    } else {
      metadata = rawMetadata;
    }
    
    console.log(`   Metadata keys: ${Object.keys(metadata).join(', ')}`);
    console.log(`   Looking for: "${fileName}"`);
    console.log(`   Found: ${metadata[fileName] ? 'YES' : 'NO'}`);
    
    if (metadata[fileName]) {
      const entry = metadata[fileName];
      console.log(`\n   Entry details:`);
      console.log(`      type: ${entry.type}`);
      console.log(`      url: ${entry.url}`);
      
      if (entry.type === 'url' && entry.url) {
        console.log(`\n✅ Would redirect to: ${entry.url}`);
      } else {
        console.log(`\n❌ Not a valid URL link!`);
      }
    }
  }
} catch (err) {
  console.log(`\n❌ Error: ${err.message}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ Test complete');
