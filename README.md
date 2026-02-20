# i18n File Server

A fast, lightweight file browsing and download server with internationalization support (English, Chinese, Japanese).

## Features

- Lightning-fast loading with Vite
- Multi-language support (EN/中文/日本語)
- Folder navigation and file browsing
- **Metadata sharding for fast loading** - Only loads metadata for current directory
- Optimized for small files (JS, CSS, JSON, etc.)
- Clean, minimal UI
- Ready for Vercel deployment

## Setup

1. Place your files in `public/files/` directory
2. Install dependencies: `pnpm install`
3. Run development server: `pnpm run dev` (starts Vite)
4. Run API server: `pnpm run server` (for file browsing and admin panel)

## Admin Panel

A web-based admin panel is available for managing files:

### Access Admin Panel

1. Start the server: `pnpm run server`
2. Open browser: `http://localhost:3000/admin`
3. Login with password (default: `admin123`)

### Admin Features

- 📤 Upload files (single or multiple)
- 📁 Create folders
- ✏️ Edit metadata.json files
- 🗑️ Delete files and folders
- 📝 Add file descriptions

### Set Custom Password

```bash
# Windows PowerShell
$env:ADMIN_PASSWORD="your_password"
pnpm run server

# Linux/Mac
export ADMIN_PASSWORD=your_password
pnpm run server
```

**Note:** Admin panel files are in `admin/` folder and excluded from Git.

For detailed admin documentation, see [admin/README.md](admin/README.md)

## File Structure

```
public/
  files/           # Put your files here
    metadata-index.json      # Metadata index (auto-generated)
    metadata-root.json       # Root directory metadata
    folder1/
      metadata.json          # Folder1 metadata
      file1.js
    folder2/
      metadata.json          # Folder2 metadata
      file2.css
```

## Metadata Management

This system uses a sharded metadata approach for optimal performance. Instead of loading one large metadata file, it loads only the metadata needed for the current directory.

### Adding File Metadata

Edit the `metadata.json` file in the corresponding directory:

```json
{
  "file1.js": {
    "modified": "2026-02-06T10:00:00Z",
    "description": "File description"
  }
}
```

### Adding Folder Descriptions

Edit `public/files/metadata-root.json`:

```json
{
  "folder1": {
    "description": "Folder description"
  }
}
```
## Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Upload your files to `public/files/` directory
4. Deploy automatically

## Warning

This system is designed for small files only. Large files may experience slow download speeds due to serverless function limitations.
