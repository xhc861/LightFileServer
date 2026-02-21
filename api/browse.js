import { normalize, join } from 'path';
import { existsSync, statSync, readdirSync, readFileSync } from 'fs';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path = '' } = req.query;
  
  try {
    // For Vercel, files should be in the root public directory
    const STORAGE_DIR = join(process.cwd(), 'public', 'files');
    const METADATA_INDEX = join(STORAGE_DIR, 'metadata-index.json');
    const METADATA_FILE = join(STORAGE_DIR, 'metadata.json');

    // Load metadata with sharding support
    let metadata = {};
    try {
      // Try to load sharded metadata first
      if (existsSync(METADATA_INDEX)) {
        const indexContent = readFileSync(METADATA_INDEX, 'utf-8');
        const index = JSON.parse(indexContent);
        
        // Determine which shard to load based on current path
        const shardKey = path || '';
        const shardFile = index.shards[shardKey];
        
        if (shardFile) {
          const shardPath = join(STORAGE_DIR, shardFile);
          if (existsSync(shardPath)) {
            const shardContent = readFileSync(shardPath, 'utf-8');
            const rawMetadata = JSON.parse(shardContent);
            
            // Handle both formats: direct object and items array
            if (rawMetadata.items && Array.isArray(rawMetadata.items)) {
              // Convert items array to object format
              metadata = {};
              rawMetadata.items.forEach(item => {
                if (item.name) {
                  metadata[item.name] = item;
                }
              });
            } else {
              metadata = rawMetadata;
            }
            
            console.log(`[Vercel] Loaded metadata shard: ${shardFile}, keys: ${Object.keys(metadata).join(', ')}`);
          } else {
            console.error(`[Vercel] Shard file not found: ${shardPath}`);
          }
        } else {
          console.warn(`[Vercel] No shard found for path: "${shardKey}"`);
        }
      } else if (existsSync(METADATA_FILE)) {
        // Fallback to monolithic metadata.json for backward compatibility
        const metadataContent = readFileSync(METADATA_FILE, 'utf-8');
        const rawMetadata = JSON.parse(metadataContent);
        
        // Handle both formats here too
        if (rawMetadata.items && Array.isArray(rawMetadata.items)) {
          metadata = {};
          rawMetadata.items.forEach(item => {
            if (item.name) {
              metadata[item.name] = item;
            }
          });
        } else {
          metadata = rawMetadata;
        }
        
        console.log('[Vercel] Loaded monolithic metadata.json');
      } else {
        console.error(`[Vercel] No metadata files found. METADATA_INDEX: ${METADATA_INDEX}, METADATA_FILE: ${METADATA_FILE}`);
      }
    } catch (err) {
      console.error('[Vercel] Failed to load metadata:', err);
    }

    function safePath(requestPath) {
      const normalized = normalize(join(STORAGE_DIR, requestPath || ''));
      if (!normalized.startsWith(STORAGE_DIR)) {
        throw new Error('Invalid path');
      }
      return normalized;
    }

    function getFileMetadata(fileName) {
      // With sharded metadata, we only need to look up by filename
      // since each shard contains only the metadata for its directory
      return metadata[fileName] || {};
    }

    const fullPath = safePath(path);
    
    if (!existsSync(fullPath)) {
      res.status(404).json({ 
        error: 'Path not found',
        requestedPath: fullPath,
        storageDir: STORAGE_DIR
      });
      return;
    }

    const stats = statSync(fullPath);
    if (!stats.isDirectory()) {
      res.status(400).json({ error: 'Not a directory' });
      return;
    }

    // First, get physical files and directories
    const physicalItems = readdirSync(fullPath)
      .filter(name => {
        // Hide all metadata-related files
        if (name === 'metadata.json') return false;
        if (name === 'metadata-index.json') return false;
        if (name === 'metadata-root.json') return false;
        if (name.startsWith('metadata-')) return false;
        if (name.endsWith('.backup.json')) return false;
        return true;
      })
      .map(name => {
        const itemPath = join(fullPath, name);
        const itemStats = statSync(itemPath);
        const fileMeta = getFileMetadata(name);
        
        // For folders, no time display needed
        // For files, ONLY use metadata time (no timezone conversion)
        let modified = null;
        if (!itemStats.isDirectory() && fileMeta.modified) {
          // Use the exact string from metadata without any conversion
          modified = fileMeta.modified;
        }
        
        return {
          name,
          type: 'file',
          isDirectory: itemStats.isDirectory(),
          size: itemStats.size,
          modified: modified,
          description: fileMeta.description || null,
          password: fileMeta.password || null,
          downloadSource: fileMeta.downloadSource || null
        };
      });

    // Then, add URL links from metadata
    const urlItems = [];
    for (const [key, value] of Object.entries(metadata)) {
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
    
    console.log(`[Vercel] Found ${urlItems.length} URL items in metadata`);

    const items = [...physicalItems, ...urlItems];

    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    res.status(200).json({ path, items });
  } catch (err) {
    console.error('Browse error:', err);
    res.status(500).json({ 
      error: 'Server error: ' + err.message,
      stack: err.stack,
      cwd: process.cwd()
    });
  }
}
