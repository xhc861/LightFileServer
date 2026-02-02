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
    const METADATA_FILE = join(STORAGE_DIR, 'metadata.json');

    // Load metadata
    let metadata = {};
    try {
      if (existsSync(METADATA_FILE)) {
        const metadataContent = readFileSync(METADATA_FILE, 'utf-8');
        metadata = JSON.parse(metadataContent);
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }

    function safePath(requestPath) {
      const normalized = normalize(join(STORAGE_DIR, requestPath || ''));
      if (!normalized.startsWith(STORAGE_DIR)) {
        throw new Error('Invalid path');
      }
      return normalized;
    }

    function getFileMetadata(fileName, relativePath) {
      // Try to find metadata by relative path first, then by filename
      const fullKey = relativePath ? `${relativePath}/${fileName}` : fileName;
      console.log('Looking for metadata:', { fileName, relativePath, fullKey, found: metadata[fullKey] || metadata[fileName] });
      return metadata[fullKey] || metadata[fileName] || {};
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

    const items = readdirSync(fullPath)
      .filter(name => name !== 'metadata.json') // Hide metadata file
      .map(name => {
        const itemPath = join(fullPath, name);
        const itemStats = statSync(itemPath);
        const fileMeta = getFileMetadata(name, path);
        
        // For folders, no time display needed
        // For files, ONLY use metadata time (no timezone conversion)
        let modified = null;
        if (!itemStats.isDirectory() && fileMeta.modified) {
          // Use the exact string from metadata without any conversion
          modified = fileMeta.modified;
        }
        
        return {
          name,
          isDirectory: itemStats.isDirectory(),
          size: itemStats.size,
          modified: modified,
          description: fileMeta.description || null
        };
      });

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
