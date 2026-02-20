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
            
            // Load metadata with sharding support
            const METADATA_INDEX = join(STORAGE_DIR, 'metadata-index.json');
            const METADATA_ROOT = join(STORAGE_DIR, 'metadata-root.json');
            let metadata = {};
            let folderMetadata = {};
            
            try {
              // Load root metadata for folder descriptions
              if (path === '' && fs.existsSync(METADATA_ROOT)) {
                const rootContent = fs.readFileSync(METADATA_ROOT, 'utf-8');
                folderMetadata = JSON.parse(rootContent);
              }
              
              // Load local metadata.json for current directory
              const localMetadata = join(fullPath, 'metadata.json');
              if (fs.existsSync(localMetadata)) {
                const localContent = fs.readFileSync(localMetadata, 'utf-8');
                const localMeta = JSON.parse(localContent);
                
                // Support both formats
                if (Array.isArray(localMeta.items)) {
                  // New format: { items: [...] }
                  localMeta.items.forEach(item => {
                    metadata[item.name] = item;
                  });
                } else if (typeof localMeta === 'object') {
                  // Old format: { "filename": { "description": "...", "modified": "..." } }
                  metadata = localMeta;
                }
                console.log(`Loaded local metadata for ${path || 'root'}`);
              }
            } catch (err) {
              console.error('Failed to load metadata:', err);
            }
            
            function getFileMetadata(fileName) {
              // With sharded metadata, we only need to look up by filename
              // since each shard contains only the metadata for its directory
              return metadata[fileName] || {};
            }
            
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

            const items = fs.readdirSync(fullPath)
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
                const itemStats = fs.statSync(itemPath);
                const isDirectory = itemStats.isDirectory();
                const fileMeta = getFileMetadata(name);
                
                let description = '';
                let customModified = '';
                let type = 'file';
                let downloadSource = '';
                
                if (isDirectory && path === '' && folderMetadata[name]) {
                  // Root level folder description
                  description = folderMetadata[name].description || '';
                } else if (fileMeta) {
                  description = fileMeta.description || '';
                  customModified = fileMeta.modified || '';
                  type = fileMeta.type || 'file';
                  downloadSource = fileMeta.downloadSource || '';
                }
                
                return {
                  name,
                  type,
                  isDirectory,
                  size: itemStats.size,
                  modified: itemStats.mtime,
                  customModified,
                  description,
                  downloadSource,
                  fileSize: fileMeta.fileSize,
                  password: fileMeta.password
                };
              });

            // Add URL links from metadata
            for (const [key, value] of Object.entries(metadata)) {
              if (value.type === 'url' && value.url) {
                items.push({
                  name: key,
                  type: 'url',
                  isDirectory: false,
                  size: 0,
                  fileSize: value.fileSize,
                  modified: value.modified || null,
                  customModified: value.modified || '',
                  description: value.description || '',
                  url: value.url,
                  password: value.password,
                  downloadSource: value.downloadSource || ''
                });
              }
            }

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
            
            // Parse path to get directory and filename
            const pathParts = path.split('/');
            const fileName = pathParts.pop();
            const dirPath = pathParts.join('/');
            
            // Check if this is a URL link
            const dirFullPath = safePath(dirPath);
            const metadataPath = join(dirFullPath, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
              
              if (metadata[fileName] && metadata[fileName].type === 'url' && metadata[fileName].url) {
                // Redirect to the URL
                res.statusCode = 302;
                res.setHeader('Location', metadata[fileName].url);
                res.end();
                return;
              }
            }
            
            // Otherwise handle as regular file download
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
