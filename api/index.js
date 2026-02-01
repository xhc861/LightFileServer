export default async function handler(req, res) {
  const { parse } = await import('url');
  const { normalize, join } = await import('path');
  const fs = await import('fs');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { pathname, query } = parse(req.url, true);
  
  // Storage directory - use /tmp for Vercel
  const STORAGE_DIR = process.env.VERCEL ? '/tmp/files' : join(process.cwd(), 'public', 'files');
  
  // Ensure storage directory exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  function safePath(requestPath) {
    const normalized = normalize(join(STORAGE_DIR, requestPath || ''));
    if (!normalized.startsWith(STORAGE_DIR)) {
      throw new Error('Invalid path');
    }
    return normalized;
  }

  try {
    if (pathname === '/api/browse' || pathname === '/api') {
      const path = query.path || '';
      const fullPath = safePath(path);
      
      if (!fs.existsSync(fullPath)) {
        res.status(404).json({ error: 'Path not found' });
        return;
      }

      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        res.status(400).json({ error: 'Not a directory' });
        return;
      }

      const items = fs.readdirSync(fullPath).map(name => {
        const itemPath = join(fullPath, name);
        const itemStats = fs.statSync(itemPath);
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
    } else if (pathname === '/api/download') {
      const path = query.path || '';
      const fullPath = safePath(path);
      
      if (!fs.existsSync(fullPath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        res.status(400).json({ error: 'Cannot download directory' });
        return;
      }

      const fileName = path.split('/').pop();
      const encodedFileName = encodeURIComponent(fileName);
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
      res.setHeader('Content-Length', stats.size);
      
      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
