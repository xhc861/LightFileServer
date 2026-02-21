// Debug endpoint for Vercel deployment
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  const STORAGE_DIR = join(process.cwd(), 'public', 'files');
  const METADATA_INDEX = join(STORAGE_DIR, 'metadata-index.json');
  
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      cwd: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform,
      isVercel: process.env.VERCEL === '1',
      vercelEnv: process.env.VERCEL_ENV || 'N/A'
    },
    paths: {
      storageDir: STORAGE_DIR,
      storageDirExists: existsSync(STORAGE_DIR),
      metadataIndex: METADATA_INDEX,
      metadataIndexExists: existsSync(METADATA_INDEX)
    },
    files: {},
    metadata: {},
    errors: []
  };
  
  try {
    // List files in storage directory
    if (existsSync(STORAGE_DIR)) {
      debug.files.storageContents = readdirSync(STORAGE_DIR);
      
      // Check Apps directory
      const appsDir = join(STORAGE_DIR, 'Apps');
      debug.files.appsDir = appsDir;
      debug.files.appsDirExists = existsSync(appsDir);
      
      if (existsSync(appsDir)) {
        debug.files.appsContents = readdirSync(appsDir);
      }
    }
    
    // Load metadata index
    if (existsSync(METADATA_INDEX)) {
      const indexContent = readFileSync(METADATA_INDEX, 'utf-8');
      const index = JSON.parse(indexContent);
      debug.metadata.index = index;
      
      // Check Apps shard
      const appsShardFile = index.shards['Apps'];
      debug.metadata.appsShardFile = appsShardFile;
      
      if (appsShardFile) {
        const appsShardPath = join(STORAGE_DIR, appsShardFile);
        debug.metadata.appsShardPath = appsShardPath;
        debug.metadata.appsShardExists = existsSync(appsShardPath);
        
        if (existsSync(appsShardPath)) {
          const shardContent = readFileSync(appsShardPath, 'utf-8');
          const rawMetadata = JSON.parse(shardContent);
          debug.metadata.appsShardContent = rawMetadata;
          
          // Convert to object format
          let metadata = {};
          if (rawMetadata.items && Array.isArray(rawMetadata.items)) {
            rawMetadata.items.forEach(item => {
              if (item.name) {
                metadata[item.name] = item;
              }
            });
            debug.metadata.appsShardFormat = 'items array';
          } else {
            metadata = rawMetadata;
            debug.metadata.appsShardFormat = 'object';
          }
          
          debug.metadata.appsMetadata = metadata;
          
          // Find URL links
          const urlLinks = [];
          for (const [key, value] of Object.entries(metadata)) {
            if (value.type === 'url' && value.url) {
              urlLinks.push({
                name: key,
                type: value.type,
                url: value.url,
                description: value.description
              });
            }
          }
          
          debug.metadata.urlLinks = urlLinks;
          debug.metadata.urlLinksCount = urlLinks.length;
        }
      }
    }
    
    // Check file sizes
    function getFileSize(path) {
      try {
        return statSync(path).size;
      } catch {
        return null;
      }
    }
    
    debug.files.metadataIndexSize = getFileSize(METADATA_INDEX);
    
    if (debug.metadata.appsShardPath) {
      debug.files.appsShardSize = getFileSize(debug.metadata.appsShardPath);
    }
    
  } catch (err) {
    debug.errors.push({
      message: err.message,
      stack: err.stack
    });
  }
  
  res.status(200).json(debug);
}
