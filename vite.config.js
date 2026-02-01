import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join, normalize } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = join(__dirname, 'public', 'files');

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

export default defineConfig({
  plugins: [
    {
      name: 'file-server-api',
      configureServer(server) {
        server.middlewares.use('/api/browse', (req, res) => {
          try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const path = url.searchParams.get('path') || '';
            const fullPath = safePath(path);
            
            if (!fs.existsSync(fullPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Path not found' }));
              return;
            }

            const stats = fs.statSync(fullPath);
            if (!stats.isDirectory()) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Not a directory' }));
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

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ path, items }));
          } catch (err) {
            console.error('Browse error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to list directory' }));
          }
        });

        server.middlewares.use('/api/download', (req, res) => {
          try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const path = decodeURIComponent(url.searchParams.get('path') || '');
            
            console.log('Download request for:', path);
            
            const fullPath = safePath(path);
            
            if (!fs.existsSync(fullPath)) {
              console.error('File not found:', fullPath);
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'File not found' }));
              return;
            }

            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Cannot download directory' }));
              return;
            }

            const fileName = path.split('/').pop();
            // Use encodeURIComponent for filename with special characters
            const encodedFileName = encodeURIComponent(fileName);
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
            res.setHeader('Content-Length', stats.size);
            
            const stream = fs.createReadStream(fullPath);
            stream.on('error', (err) => {
              console.error('Stream error:', err);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Download failed' }));
              }
            });
            stream.pipe(res);
          } catch (err) {
            console.error('Download error:', err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Download failed: ' + err.message }));
            }
          }
        });
      }
    }
  ]
});
