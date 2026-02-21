// Comprehensive diagnostic script for Vercel deployment
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔍 Vercel Deployment Diagnostic Tool\n');
console.log('=' .repeat(60));

const STORAGE_DIR = join(process.cwd(), 'public', 'files');
const METADATA_INDEX = join(STORAGE_DIR, 'metadata-index.json');
const METADATA_FILE = join(STORAGE_DIR, 'metadata.json');

// Check 1: Storage directory
console.log('\n📁 Check 1: Storage Directory');
console.log('-'.repeat(60));
if (existsSync(STORAGE_DIR)) {
  console.log(`✅ Storage directory exists: ${STORAGE_DIR}`);
  const items = readdirSync(STORAGE_DIR);
  console.log(`   Contains ${items.length} items`);
} else {
  console.log(`❌ Storage directory NOT found: ${STORAGE_DIR}`);
  process.exit(1);
}

// Check 2: Metadata files
console.log('\n📄 Check 2: Metadata Files');
console.log('-'.repeat(60));

if (existsSync(METADATA_INDEX)) {
  console.log(`✅ metadata-index.json exists`);
  try {
    const indexContent = readFileSync(METADATA_INDEX, 'utf-8');
    const index = JSON.parse(indexContent);
    console.log(`   Version: ${index.version}`);
    console.log(`   Shards: ${Object.keys(index.shards).length}`);
  } catch (err) {
    console.log(`❌ Error reading metadata-index.json: ${err.message}`);
  }
} else {
  console.log(`⚠️  metadata-index.json NOT found`);
}

if (existsSync(METADATA_FILE)) {
  console.log(`✅ metadata.json exists (fallback)`);
} else {
  console.log(`⚠️  metadata.json NOT found (fallback)`);
}

// Check 3: Verify all shards exist
console.log('\n🗂️  Check 3: Shard Files');
console.log('-'.repeat(60));

if (existsSync(METADATA_INDEX)) {
  const indexContent = readFileSync(METADATA_INDEX, 'utf-8');
  const index = JSON.parse(indexContent);
  
  let allShardsExist = true;
  for (const [path, shardFile] of Object.entries(index.shards)) {
    const shardPath = join(STORAGE_DIR, shardFile);
    const exists = existsSync(shardPath);
    const icon = exists ? '✅' : '❌';
    console.log(`${icon} "${path}" -> ${shardFile} ${exists ? '' : '(NOT FOUND)'}`);
    
    if (!exists) {
      allShardsExist = false;
    }
  }
  
  if (allShardsExist) {
    console.log('\n✅ All shard files exist');
  } else {
    console.log('\n❌ Some shard files are missing!');
  }
}

// Check 4: Scan for URL links
console.log('\n🔗 Check 4: URL Links');
console.log('-'.repeat(60));

let totalUrlLinks = 0;
const urlLinksByPath = {};

if (existsSync(METADATA_INDEX)) {
  const indexContent = readFileSync(METADATA_INDEX, 'utf-8');
  const index = JSON.parse(indexContent);
  
  for (const [path, shardFile] of Object.entries(index.shards)) {
    const shardPath = join(STORAGE_DIR, shardFile);
    if (!existsSync(shardPath)) continue;
    
    try {
      const shardContent = readFileSync(shardPath, 'utf-8');
      const rawMetadata = JSON.parse(shardContent);
      
      // Convert to object format if needed
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
      
      // Find URL links
      const urlLinks = [];
      for (const [key, value] of Object.entries(metadata)) {
        if (value.type === 'url' && value.url) {
          urlLinks.push({
            name: key,
            url: value.url,
            description: value.description,
            password: value.password
          });
        }
      }
      
      if (urlLinks.length > 0) {
        urlLinksByPath[path] = urlLinks;
        totalUrlLinks += urlLinks.length;
      }
    } catch (err) {
      console.log(`❌ Error reading shard ${shardFile}: ${err.message}`);
    }
  }
}

if (totalUrlLinks === 0) {
  console.log('⚠️  No URL links found in any shard');
} else {
  console.log(`✅ Found ${totalUrlLinks} URL links across ${Object.keys(urlLinksByPath).length} directories\n`);
  
  for (const [path, links] of Object.entries(urlLinksByPath)) {
    console.log(`   📂 ${path || '(root)'}: ${links.length} link(s)`);
    links.forEach(link => {
      console.log(`      📎 ${link.name}`);
      console.log(`         URL: ${link.url}`);
      if (link.description) {
        console.log(`         Description: ${link.description}`);
      }
      if (link.password) {
        console.log(`         Password: ${link.password}`);
      }
    });
    console.log();
  }
}

// Check 5: File size analysis
console.log('\n📊 Check 5: File Size Analysis');
console.log('-'.repeat(60));

function getDirectorySize(dirPath) {
  let totalSize = 0;
  const items = readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = join(dirPath, item);
    const stats = statSync(itemPath);
    
    if (stats.isDirectory()) {
      totalSize += getDirectorySize(itemPath);
    } else {
      totalSize += stats.size;
    }
  }
  
  return totalSize;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

const totalSize = getDirectorySize(STORAGE_DIR);
console.log(`Total storage size: ${formatSize(totalSize)}`);

// Count metadata files
let metadataCount = 0;
let metadataSize = 0;

function countMetadataFiles(dirPath) {
  const items = readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = join(dirPath, item);
    const stats = statSync(itemPath);
    
    if (stats.isDirectory()) {
      countMetadataFiles(itemPath);
    } else if (item.includes('metadata') && item.endsWith('.json')) {
      metadataCount++;
      metadataSize += stats.size;
    }
  }
}

countMetadataFiles(STORAGE_DIR);
console.log(`Metadata files: ${metadataCount} (${formatSize(metadataSize)})`);

// Check 6: Vercel configuration
console.log('\n⚙️  Check 6: Vercel Configuration');
console.log('-'.repeat(60));

const vercelConfigPath = join(process.cwd(), 'vercel.json');
if (existsSync(vercelConfigPath)) {
  console.log('✅ vercel.json exists');
  try {
    const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, 'utf-8'));
    if (vercelConfig.functions && vercelConfig.functions['api/*.js']) {
      const funcConfig = vercelConfig.functions['api/*.js'];
      console.log(`   Memory: ${funcConfig.memory || 'default'} MB`);
      console.log(`   Max Duration: ${funcConfig.maxDuration || 'default'} seconds`);
      console.log(`   Include Files: ${funcConfig.includeFiles || 'none'}`);
    }
  } catch (err) {
    console.log(`❌ Error reading vercel.json: ${err.message}`);
  }
} else {
  console.log('⚠️  vercel.json NOT found');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📋 Summary');
console.log('='.repeat(60));

const checks = [
  { name: 'Storage directory', passed: existsSync(STORAGE_DIR) },
  { name: 'Metadata index', passed: existsSync(METADATA_INDEX) },
  { name: 'URL links found', passed: totalUrlLinks > 0 },
  { name: 'Vercel config', passed: existsSync(vercelConfigPath) }
];

const passedChecks = checks.filter(c => c.passed).length;
const totalChecks = checks.length;

checks.forEach(check => {
  const icon = check.passed ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
});

console.log(`\n${passedChecks}/${totalChecks} checks passed`);

if (passedChecks === totalChecks) {
  console.log('\n✅ All checks passed! Your setup looks good for Vercel deployment.');
} else {
  console.log('\n⚠️  Some checks failed. Please review the issues above.');
}

console.log('\n💡 Next steps:');
console.log('   1. Run: git add . && git commit -m "fix: URL links" && git push');
console.log('   2. Wait for Vercel to deploy');
console.log('   3. Check Vercel function logs for [Vercel] messages');
console.log('   4. Test URL links on your deployed site');
