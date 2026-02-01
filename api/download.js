import { normalize, join } from 'path';
import { existsSync, statSync, createReadStream, mkdirSync } from 'fs';

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
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      res.status(400).json({ error: 'Cannot download directory' });
      return;
    }

    const fileName = path.split('/').pop();
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
