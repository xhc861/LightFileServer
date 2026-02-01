import { normalize, join } from 'path';
import { existsSync, statSync, readdirSync, mkdirSync } from 'fs';

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
  
  // Use public/files directory which will be included in deployment
  const STORAGE_DIR = join(process.cwd(), 'public', 'files');
  
  // Ensure storage directory exists
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }

  function safePath(requestPath) {
    const normalized = normalize(join(STORAGE_DIR, requestPath || ''));
    if (!normalized.startsWith(STORAGE_DIR)) {
      throw new Error('Invalid path');
    }
    return normalized;
  }

  try {
    const fullPath = safePath(path);
    
    if (!existsSync(fullPath)) {
      res.status(404).json({ error: 'Path not found' });
      return;
    }

    const stats = statSync(fullPath);
    if (!stats.isDirectory()) {
      res.status(400).json({ error: 'Not a directory' });
      return;
    }

    const items = readdirSync(fullPath).map(name => {
      const itemPath = join(fullPath, name);
      const itemStats = statSync(itemPath);
      return {
        name,
        isDirectory: itemStats.isDirectory(),
        size: itemStats.size,
        modified: itemStats.mtime
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
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
