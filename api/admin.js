import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 简单的 token 验证（生产环境应使用更安全的方式）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_TOKEN = 'admin-token-' + Date.now();

export default async function handler(req, res) {
  const { method } = req;
  const action = req.query.action;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Login endpoint
  if (action === 'login' && method === 'POST') {
    try {
      const body = await getBody(req);
      const { password } = JSON.parse(body);

      if (password === ADMIN_PASSWORD) {
        return res.status(200).json({ token: ADMIN_TOKEN });
      } else {
        return res.status(401).json({ error: '密码错误' });
      }
    } catch (err) {
      return res.status(400).json({ error: '请求错误' });
    }
  }

  // Verify token for other endpoints
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }

  const token = authHeader.substring(7);
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: '无效的令牌' });
  }

  // Upload files
  if (action === 'upload' && method === 'POST') {
    try {
      // Note: This is a simplified version. In production, use a proper multipart parser
      return res.status(501).json({ error: '文件上传功能需要在 server.js 中实现' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Create folder
  if (action === 'create-folder' && method === 'POST') {
    try {
      const body = await getBody(req);
      const { path: dirPath, name } = JSON.parse(body);
      
      const filesDir = path.join(process.cwd(), 'public', 'files');
      const fullPath = path.join(filesDir, dirPath, name);

      if (!fullPath.startsWith(filesDir)) {
        return res.status(400).json({ error: '无效的路径' });
      }

      if (fs.existsSync(fullPath)) {
        return res.status(400).json({ error: '文件夹已存在' });
      }

      fs.mkdirSync(fullPath, { recursive: true });
      
      // Create empty metadata.json
      const metadataPath = path.join(fullPath, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify({ items: [] }, null, 2));

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Delete file or folder
  if (action === 'delete' && method === 'DELETE') {
    try {
      const body = await getBody(req);
      const { path: itemPath } = JSON.parse(body);
      
      const filesDir = path.join(process.cwd(), 'public', 'files');
      const fullPath = path.join(filesDir, itemPath);

      if (!fullPath.startsWith(filesDir)) {
        return res.status(400).json({ error: '无效的路径' });
      }

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: '文件不存在' });
      }

      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Save metadata
  if (action === 'save-metadata' && method === 'POST') {
    try {
      const body = await getBody(req);
      const { path: metadataPath, content } = JSON.parse(body);
      
      const filesDir = path.join(process.cwd(), 'public', 'files');
      const fullPath = path.join(filesDir, metadataPath);

      if (!fullPath.startsWith(filesDir) || !fullPath.endsWith('metadata.json')) {
        return res.status(400).json({ error: '无效的路径' });
      }

      // Validate JSON
      JSON.parse(content);

      fs.writeFileSync(fullPath, content, 'utf8');

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: '未找到' });
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}
