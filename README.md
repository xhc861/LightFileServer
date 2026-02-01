# i18n File Server

A fast, lightweight file browsing and download server with internationalization support (English, Chinese, Japanese).

## Features

- Lightning-fast loading with Vite
- Multi-language support (EN/中文/日本語)
- Folder navigation and file browsing
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
    folder1/
      file1.js
    folder2/
      file2.css
```

## Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Upload your files to `public/files/` directory
4. Deploy automatically

## Warning

This system is designed for small files only. Large files may experience slow download speeds due to serverless function limitations.
