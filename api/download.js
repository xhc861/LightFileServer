import { normalize, join } from 'path';
import { existsSync, statSync, createReadStream, readFileSync } from 'fs';



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

    function safePath(requestPath) {
      const normalized = normalize(join(STORAGE_DIR, requestPath || ''));
      if (!normalized.startsWith(STORAGE_DIR)) {
        throw new Error('Invalid path');
      }
      return normalized;
    }

    // Parse path to get directory and filename
    const pathParts = path.split('/');
    const fileName = pathParts.pop();
    const dirPath = pathParts.join('/');
    
    // Load metadata for the directory
    let metadata = {};
    try {
      if (existsSync(METADATA_INDEX)) {
        const indexContent = readFileSync(METADATA_INDEX, 'utf-8');
        const index = JSON.parse(indexContent);
        const shardFile = index.shards[dirPath || ''];
        
        console.log(`[Vercel Download] Looking for shard for path: "${dirPath}", found: ${shardFile}`);
        
        if (shardFile) {
          const shardPath = join(STORAGE_DIR, shardFile);
          if (existsSync(shardPath)) {
            const shardContent = readFileSync(shardPath, 'utf-8');
            const rawMetadata = JSON.parse(shardContent);
            
            // Handle both formats: direct object and items array
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
            
            console.log(`[Vercel Download] Loaded shard, keys: ${Object.keys(metadata).join(', ')}`);
          } else {
            console.error(`[Vercel Download] Shard file not found: ${shardPath}`);
          }
        }
      } else if (existsSync(METADATA_FILE)) {
        const metadataContent = readFileSync(METADATA_FILE, 'utf-8');
        const rawMetadata = JSON.parse(metadataContent);
        
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
        
        console.log('[Vercel Download] Loaded monolithic metadata.json');
      }
    } catch (err) {
      console.error('[Vercel Download] Failed to load metadata:', err);
    }

    // Check if this is a URL link
    console.log(`[Vercel Download] Checking file: "${fileName}", metadata entry:`, metadata[fileName]);
    
    if (metadata[fileName] && metadata[fileName].type === 'url' && metadata[fileName].url) {
      const originalUrl = metadata[fileName].url;
      
      console.log(`[Vercel Download] Redirecting to URL: ${originalUrl}`);
      
      // Redirect to the URL
      res.writeHead(302, { Location: originalUrl });
      res.end();
      return;
    }

    // Otherwise, handle as a regular file download
    const fullPath = safePath(path);
    
    if (!existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      res.status(400).json({ error: 'Cannot download directory' });
      return;
    }

    const encodedFileName = encodeURIComponent(fileName);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Length', stats.size);
    
    const stream = createReadStream(fullPath);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error: ' + err.message });
    }
  }
}
