import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, normalize } from 'path';
import fs from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;



// Middleware
app.use(express.json());

// Admin authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
let adminToken = null;

function generateToken() {
  return 'admin-token-' + Math.random().toString(36).substring(2) + Date.now();
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const token = authHeader.substring(7);
  if (token !== adminToken) {
    return res.status(401).json({ error: '无效的令牌' });
  }
  
  next();
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Path will be set in the route handler
      cb(null, STORAGE_DIR);
    },
    filename: (req, file, cb) => {
      cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'));
    }
  })
});

// Use public directory for file storage
const STORAGE_DIR = join(__dirname, 'public', 'files');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Prevent path traversal
function safePath(requestPath) {
  const normalized = normalize(join(STORAGE_DIR, requestPath || ''));
  if (!normalized.startsWith(STORAGE_DIR)) {
    throw new Error('Invalid path');
  }
  return normalized;
}

// List files and folders
app.get('/api/browse', (req, res) => {
  try {
    const path = req.query.path || '';
    const fullPath = safePath(path);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stats = fs.statSync(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }

    // Read metadata
    let metadata = {};
    let folderMetadata = {};
    
    if (path === '') {
      // Root level - read metadata-root.json
      const rootMetadataPath = join(STORAGE_DIR, 'metadata-root.json');
      if (fs.existsSync(rootMetadataPath)) {
        folderMetadata = JSON.parse(fs.readFileSync(rootMetadataPath, 'utf8'));
      }
    }
    
    // Read current directory metadata.json
    const metadataPath = join(fullPath, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metaContent = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Support both formats: object and items array
      if (Array.isArray(metaContent.items)) {
        // New format: { items: [...] }
        metaContent.items.forEach(item => {
          metadata[item.name] = item;
        });
      } else if (typeof metaContent === 'object') {
        // Old format: { "filename": { "description": "..." } }
        metadata = metaContent;
      }
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
      
      let description = '';
      let customModified = '';
      let type = 'file';
      let downloadSource = '';
      let password = '';
      
      if (isDirectory && path === '' && folderMetadata[name]) {
        // Root level folder description
        description = folderMetadata[name].description || '';
      } else if (metadata[name]) {
        // File or subfolder description from metadata.json
        description = metadata[name].description || '';
        // Check for custom modified time
        customModified = metadata[name].modified || '';
        // Check for type
        type = metadata[name].type || 'file';
        // Check for download source (admin only)
        downloadSource = metadata[name].downloadSource || '';
        // Check for password
        password = metadata[name].password || '';
      }
      
      const item = {
        name,
        type,
        isDirectory,
        size: itemStats.size,
        modified: itemStats.mtime,
        customModified,
        description,
        downloadSource,
        password
      };
      
      // Debug log
      if (name === 'gzzk-article-card.pdf') {
        console.log('PDF item:', JSON.stringify(item, null, 2));
      }
      
      return item;
    });

    // Add URL links from metadata
    for (const [key, value] of Object.entries(metadata)) {
      if (value.type === 'url' && value.url) {
        items.push({
          name: key,
          type: 'url',
          isDirectory: false,
          size: 0,
          fileSize: value.fileSize || null,
          modified: value.modified || null,
          customModified: value.modified || '',
          description: value.description || '',
          url: value.url,
          password: value.password || '',
          downloadSource: value.downloadSource || ''
        });
      }
    }

    // Sort: directories first, then by name
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log('Browse API returning items:', JSON.stringify(items, null, 2));
    res.json({ path, items });
  } catch (err) {
    console.error('Browse error:', err);
    res.status(500).json({ error: 'Failed to list directory' });
  }
});

// Download file
app.get('/api/download', async (req, res) => {
  try {
    const path = req.query.path || '';
    
    console.log('Download request for path:', path);
    
    // Parse path to get directory and filename
    const pathParts = path.split('/');
    const fileName = pathParts.pop();
    const dirPath = pathParts.join('/');
    
    console.log('Parsed - dirPath:', dirPath, 'fileName:', fileName);
    
    // Check if this is a URL link
    const metadataPath = join(safePath(dirPath), 'metadata.json');
    console.log('Checking metadata at:', metadataPath);
    
    if (fs.existsSync(metadataPath)) {
      const metaContent = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      let metadata = {};
      
      // Support both formats: object and items array
      if (Array.isArray(metaContent.items)) {
        // New format: { items: [...] }
        metaContent.items.forEach(item => {
          metadata[item.name] = item;
        });
        console.log('Loaded metadata (new format), items:', Object.keys(metadata));
      } else if (typeof metaContent === 'object') {
        // Old format: { "filename": { "description": "..." } }
        metadata = metaContent;
        console.log('Loaded metadata (old format), items:', Object.keys(metadata));
      }
      
      console.log('Looking for fileName:', fileName, 'in metadata');
      console.log('Metadata entry:', metadata[fileName]);
      
      if (metadata[fileName] && metadata[fileName].type === 'url' && metadata[fileName].url) {
        const originalUrl = metadata[fileName].url;
        
        console.log('Found URL link:', originalUrl);
        
        // Redirect to the original URL
        console.log('Redirecting to original URL:', originalUrl);
        return res.redirect(originalUrl);
      }
    }
    
    // Otherwise, handle as regular file download
    console.log('Not a URL link, treating as regular file');
    const fullPath = safePath(path);
    
    if (!fs.existsSync(fullPath)) {
      console.log('File not found at:', fullPath);
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download directory' });
    }

    res.download(fullPath);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});



// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    adminToken = generateToken();
    return res.json({ token: adminToken });
  }
  
  return res.status(401).json({ error: '密码错误' });
});

// Admin upload files
app.post('/api/admin/upload', verifyToken, upload.array('files'), (req, res) => {
  try {
    const description = req.body.description;
    const uploadPath = req.body.path || '';
    const targetDir = safePath(uploadPath);
    
    // Move files from temp location to target directory
    req.files.forEach(file => {
      const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const targetPath = join(targetDir, fileName);
      
      // Move file if not already in target directory
      if (file.path !== targetPath) {
        fs.renameSync(file.path, targetPath);
      }
    });
    
    // Update metadata if description provided
    if (description && req.files.length > 0) {
      const metadataPath = join(targetDir, 'metadata.json');
      let metadata = {};
      
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }
      
      // Support both formats
      const isNewFormat = Array.isArray(metadata.items);
      
      req.files.forEach(file => {
        const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        if (isNewFormat) {
          const existingIndex = metadata.items.findIndex(item => item.name === fileName);
          if (existingIndex >= 0) {
            metadata.items[existingIndex].description = description;
          } else {
            metadata.items.push({ name: fileName, description });
          }
        } else {
          // Old format
          if (!metadata[fileName]) {
            metadata[fileName] = {};
          }
          metadata[fileName].description = description;
        }
      });
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
    
    res.json({ success: true, files: req.files.length });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin create folder
app.post('/api/admin/create-folder', verifyToken, (req, res) => {
  try {
    const { path: dirPath, name } = req.body;
    const fullPath = join(safePath(dirPath), name);
    
    if (fs.existsSync(fullPath)) {
      return res.status(400).json({ error: '文件夹已存在' });
    }
    
    fs.mkdirSync(fullPath, { recursive: true });
    
    // Create empty metadata.json
    const metadataPath = join(fullPath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify({ items: [] }, null, 2));
    
    res.json({ success: true });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin delete file or folder
app.delete('/api/admin/delete', verifyToken, (req, res) => {
  try {
    const { path: itemPath } = req.body;
    
    // Parse path to check if it's a URL link
    const pathParts = itemPath.split('/');
    const itemName = pathParts.pop();
    const dirPath = pathParts.join('/');
    
    // Check metadata first to see if this is a URL link
    const metadataPath = join(safePath(dirPath), 'metadata.json');
    let isUrlLink = false;
    
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Check if it's a URL link in metadata
      if (metadata[itemName] && metadata[itemName].type === 'url') {
        isUrlLink = true;
        
        // Remove from metadata
        delete metadata[itemName];
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        return res.json({ success: true });
      }
    }
    
    // If not a URL link, delete physical file/folder
    const fullPath = safePath(itemPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin save metadata
app.post('/api/admin/save-metadata', verifyToken, (req, res) => {
  try {
    const { path: metadataPath, content } = req.body;
    const fullPath = safePath(metadataPath);
    
    if (!fullPath.endsWith('metadata.json')) {
      return res.status(400).json({ error: '只能编辑 metadata.json 文件' });
    }
    
    // Validate JSON
    JSON.parse(content);
    
    fs.writeFileSync(fullPath, content, 'utf8');
    
    res.json({ success: true });
  } catch (err) {
    console.error('Save metadata error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin update file properties
app.post('/api/admin/update-file-properties', verifyToken, (req, res) => {
  try {
    const { path: dirPath, fileName, description, modified, url, password, fileSize, downloadSource } = req.body;
    console.log('Update file properties:', { dirPath, fileName, description, modified, url, password: password ? '***' : '', fileSize, downloadSource });
    
    const metadataPath = join(safePath(dirPath), 'metadata.json');
    
    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }
    
    console.log('Existing metadata format:', Array.isArray(metadata.items) ? 'new (items array)' : 'old (object)');
    
    // Support both formats
    if (Array.isArray(metadata.items)) {
      // New format: { items: [...] }
      const existingIndex = metadata.items.findIndex(item => item.name === fileName);
      
      if (existingIndex >= 0) {
        // Update existing item
        if (description) {
          metadata.items[existingIndex].description = description;
        } else {
          delete metadata.items[existingIndex].description;
        }
        
        if (modified) {
          metadata.items[existingIndex].modified = modified;
        } else {
          delete metadata.items[existingIndex].modified;
        }
        
        if (url) {
          metadata.items[existingIndex].url = url;
        } else {
          delete metadata.items[existingIndex].url;
        }
        
        if (password) {
          metadata.items[existingIndex].password = password;
        } else {
          delete metadata.items[existingIndex].password;
        }
        
        if (fileSize !== null && fileSize !== undefined) {
          metadata.items[existingIndex].fileSize = fileSize;
        } else {
          delete metadata.items[existingIndex].fileSize;
        }
        
        if (downloadSource) {
          metadata.items[existingIndex].downloadSource = downloadSource;
        } else {
          delete metadata.items[existingIndex].downloadSource;
        }
        
        // Remove item if no properties left
        if (!metadata.items[existingIndex].description && 
            !metadata.items[existingIndex].modified && 
            !metadata.items[existingIndex].url && 
            !metadata.items[existingIndex].password &&
            !metadata.items[existingIndex].fileSize &&
            !metadata.items[existingIndex].type && 
            !metadata.items[existingIndex].downloadSource) {
          metadata.items.splice(existingIndex, 1);
        }
      } else if (description || modified || url || password || fileSize || downloadSource) {
        // Add new item
        const newItem = { name: fileName };
        if (description) newItem.description = description;
        if (modified) newItem.modified = modified;
        if (url) newItem.url = url;
        if (password) newItem.password = password;
        if (fileSize !== null && fileSize !== undefined) newItem.fileSize = fileSize;
        if (downloadSource) newItem.downloadSource = downloadSource;
        metadata.items.push(newItem);
      }
    } else {
      // Old format: { "filename": { "description": "...", "modified": "..." } }
      if (description || modified || url || password || fileSize || downloadSource) {
        if (!metadata[fileName]) {
          metadata[fileName] = {};
        }
        if (description) {
          metadata[fileName].description = description;
        } else {
          delete metadata[fileName].description;
        }
        
        if (modified) {
          metadata[fileName].modified = modified;
        } else {
          delete metadata[fileName].modified;
        }
        
        if (url) {
          metadata[fileName].url = url;
        } else {
          delete metadata[fileName].url;
        }
        
        if (password) {
          metadata[fileName].password = password;
        } else {
          delete metadata[fileName].password;
        }
        
        if (fileSize !== null && fileSize !== undefined) {
          metadata[fileName].fileSize = fileSize;
        } else {
          delete metadata[fileName].fileSize;
        }
        
        if (downloadSource) {
          metadata[fileName].downloadSource = downloadSource;
        } else {
          delete metadata[fileName].downloadSource;
        }
        
        // Remove entry if no properties left
        if (Object.keys(metadata[fileName]).length === 0) {
          delete metadata[fileName];
        }
      } else {
        // Remove all properties if both empty
        if (metadata[fileName]) {
          delete metadata[fileName];
        }
      }
    }
    
    console.log('Saving metadata to:', metadataPath);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('Metadata saved successfully');
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update file properties error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin update folder properties
app.post('/api/admin/update-folder-properties', verifyToken, (req, res) => {
  try {
    const { path: dirPath, folderName, description } = req.body;
    
    // Determine which metadata file to update
    let metadataPath;
    if (dirPath === '') {
      // Root level - update metadata-root.json
      metadataPath = join(STORAGE_DIR, 'metadata-root.json');
    } else {
      // Subdirectory - update parent's metadata.json
      metadataPath = join(safePath(dirPath), 'metadata.json');
    }
    
    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }
    
    // For root level, use old format (direct object)
    if (dirPath === '') {
      if (description) {
        metadata[folderName] = { description };
      } else {
        delete metadata[folderName];
      }
    } else {
      // For subdirectories, support both formats
      if (Array.isArray(metadata.items)) {
        // New format: { items: [...] }
        const existingIndex = metadata.items.findIndex(item => item.name === folderName);
        
        if (existingIndex >= 0) {
          if (description) {
            metadata.items[existingIndex].description = description;
          } else {
            delete metadata.items[existingIndex].description;
          }
        } else if (description) {
          metadata.items.push({ name: folderName, description });
        }
      } else {
        // Old format: { "foldername": { "description": "..." } }
        if (description) {
          if (!metadata[folderName]) {
            metadata[folderName] = {};
          }
          metadata[folderName].description = description;
        } else {
          if (metadata[folderName]) {
            delete metadata[folderName].description;
            if (Object.keys(metadata[folderName]).length === 0) {
              delete metadata[folderName];
            }
          }
        }
      }
    }
    
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update folder properties error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin add URL link
app.post('/api/admin/add-url', verifyToken, (req, res) => {
  try {
    const { path: dirPath, name, url, password, description, modified, downloadSource } = req.body;
    console.log('Add URL:', { dirPath, name, url, password: password ? '***' : '', description, modified, downloadSource });
    
    if (!name || !url) {
      return res.status(400).json({ error: '名称和URL不能为空' });
    }
    
    const metadataPath = join(safePath(dirPath), 'metadata.json');
    
    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }
    
    // Support both formats
    if (Array.isArray(metadata.items)) {
      // New format: { items: [...] }
      const existingIndex = metadata.items.findIndex(item => item.name === name);
      
      if (existingIndex >= 0) {
        return res.status(400).json({ error: '该名称已存在' });
      }
      
      const newItem = {
        name,
        type: 'url',
        url
      };
      if (description) newItem.description = description;
      if (modified) newItem.modified = modified;
      if (password) newItem.password = password;
      if (downloadSource) newItem.downloadSource = downloadSource;
      
      metadata.items.push(newItem);
    } else {
      // Old format: { "filename": { ... } }
      if (metadata[name]) {
        return res.status(400).json({ error: '该名称已存在' });
      }
      
      metadata[name] = {
        type: 'url',
        url
      };
      if (description) metadata[name].description = description;
      if (modified) metadata[name].modified = modified;
      if (password) metadata[name].password = password;
      if (downloadSource) metadata[name].downloadSource = downloadSource;
    }
    
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    res.json({ success: true });
  } catch (err) {
    console.error('Add URL error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve admin panel
app.use('/admin', express.static(join(__dirname, 'admin')));

// Serve test files
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
});
