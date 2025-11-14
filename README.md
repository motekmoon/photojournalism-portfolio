# Photojournalism Portfolio Site

A photography portfolio site built with Next.js, Cloudinary, and Vercel Postgres.

## Tech Stack

- **Next.js 14+** (App Router)
- **Cloudinary** (Image storage and IPTC/EXIF extraction)
- **Vercel Postgres** (Database)
- **Vercel Auth** (Admin authentication)
- **Radix UI** (UI components)
- **TypeScript** (Type safety)

## Features

### Public Site
- Main page with masthead carousel and featured images
- Story detail pages with image galleries
- About page with dynamic content

### Admin Interface
- Story management (create, edit, delete)
- Media library with batch operations
- Main page editor with drag-and-drop ordering
- About page editor
- IPTC/EXIF metadata extraction from images

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (see `.env.example`)

3. Run the development server:
```bash
npm run dev
```

## Deployment

Deploy to Vercel with automatic database and environment variable configuration.
