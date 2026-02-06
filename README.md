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
2. Install dependencies: `npm install`
3. Run development server: `npm run dev` (starts both API and Vite)

Or run separately:
- API server: `npm run dev:api`
- Vite dev server: `npm run dev:vite`

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

### Automatic Shard Generation

If you have an existing `metadata.json` file, convert it to shards:

```bash
npm run generate-shards
```

### Testing Metadata

Verify your metadata shards are working correctly:

```bash
npm run test-shards
```

For detailed documentation, see [docs/METADATA-SHARDING.md](docs/METADATA-SHARDING.md)

## Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Upload your files to `public/files/` directory
4. Deploy automatically

## Warning

This system is designed for small files only. Large files may experience slow download speeds due to serverless function limitations.
