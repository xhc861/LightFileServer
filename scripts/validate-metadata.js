import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const STORAGE_DIR = join(process.cwd(), 'public', 'files');
const METADATA_INDEX = join(STORAGE_DIR, 'metadata-index.json');

console.log('Validating metadata files...\n');

// Load index
const index = JSON.parse(readFileSync(METADATA_INDEX, 'utf-8'));
console.log(`Found ${Object.keys(index.shards).length} shards in index\n`);

let hasErrors = false;

// Validate each shard
for (const [path, shardFile] of Object.entries(index.shards)) {
  const shardPath = join(STORAGE_DIR, shardFile);
  
  try {
    const content = readFileSync(shardPath, 'utf-8');
    const metadata = JSON.parse(content);
    
    // Check format
    let itemCount = 0;
    let urlCount = 0;
    
    if (metadata.items && Array.isArray(metadata.items)) {
      // Items array format
      itemCount = metadata.items.length;
      urlCount = metadata.items.filter(item => item.type === 'url').length;
      
      console.log(`✓ ${shardFile} (items array format)`);
      console.log(`  - ${itemCount} items, ${urlCount} URL links`);
      
      // Validate each item
      metadata.items.forEach(item => {
        if (!item.name) {
          console.error(`  ✗ Item missing 'name' field`);
          hasErrors = true;
        }
        if (item.type === 'url' && !item.url) {
          console.error(`  ✗ URL item '${item.name}' missing 'url' field`);
          hasErrors = true;
        }
      });
    } else {
      // Object format
      itemCount = Object.keys(metadata).length;
      urlCount = Object.values(metadata).filter(item => item.type === 'url').length;
      
      console.log(`✓ ${shardFile} (object format)`);
      console.log(`  - ${itemCount} items, ${urlCount} URL links`);
      
      // Validate each item
      for (const [name, item] of Object.entries(metadata)) {
        if (item.type === 'url' && !item.url) {
          console.error(`  ✗ URL item '${name}' missing 'url' field`);
          hasErrors = true;
        }
      }
    }
    
    console.log('');
  } catch (err) {
    console.error(`✗ ${shardFile}: ${err.message}\n`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('Validation failed with errors!');
  process.exit(1);
} else {
  console.log('All metadata files are valid!');
}
