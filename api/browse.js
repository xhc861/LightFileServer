import { normalize, join } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

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

    function safePath(requestPath) {
      const normalized = normalize(join(STORAGE_DIR, requestPath || ''));
      if (!normalized.startsWith(STORAGE_DIR)) {
        throw new Error('Invalid path');
      }
      return normalized;
    }

    function getGitModifiedTime(filePath) {
      try {
        // Get relative path from project root
        const relativePath = filePath.replace(process.cwd() + '/', '');
        
        // Get the last commit time for this file
        const timestamp = execSync(
          `git log -1 --format=%ct -- "${relativePath}"`,
          { 
            encoding: 'utf-8', 
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
          }
        ).trim();
        
        if (timestamp && !isNaN(timestamp)) {
          return new Date(parseInt(timestamp) * 1000);
        }
      } catch (err) {
        // Git command failed, will use fallback
        console.log('Git time lookup failed for:', filePath);
      }
      return null;
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

    const items = readdirSync(fullPath).map(name => {
      const itemPath = join(fullPath, name);
      const itemStats = statSync(itemPath);
      
      // Try to get Git commit time, fall back to current time if not available
      const gitTime = getGitModifiedTime(itemPath);
      const modified = gitTime || new Date();
      
      return {
        name,
        isDirectory: itemStats.isDirectory(),
        size: itemStats.size,
        modified: modified
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
