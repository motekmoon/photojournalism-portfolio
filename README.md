# Photojournalism Portfolio Site

A photography portfolio site built with Next.js, Cloudinary, and Vercel Postgres.

## Tech Stack

- **Next.js 16** (App Router)
- **Cloudinary** (Image storage and metadata extraction)
- **Vercel Postgres** (Database)
- **Radix UI** (UI components)
- **TypeScript** (Type safety)
- **Sharp** (Image compression)

## Features

### Public Site
- **Main Page:**
  - Sticky header (32px) with logo and navigation
  - Stories dropdown menu listing all featured stories
  - Masthead carousel with horizontal scrolling and pagination dots
  - Featured stories section with vertical tiling
  - Story title overlay and "See more from this story" button on each featured story
  - 3:2 aspect ratio (5760×3840) for all images
  - Full image display in masthead (no cropping)
- Story detail pages with image galleries
- About page with dynamic content

### Admin Interface

#### Story Management
- Create, edit, and delete stories
- Batch delete multiple stories
- Drag-and-drop image reordering within stories
- Up/down arrow buttons for image reordering
- Inline caption editing for story images
- Set featured image for each story
- Batch upload images directly to stories
- Batch delete images from stories
- Optimistic UI updates (no page refresh on reorder)

#### Media Library
- Upload single or multiple images at once
- Batch upload with progress tracking
- View all uploaded media with thumbnails
- Filter by featured, masthead, or all
- Inline caption editing
- Batch operations:
  - Mark as featured
  - Mark as masthead
  - Clear flags
  - Delete selected
- Individual media detail pages with full metadata display
- Select all / clear selection functionality

#### Metadata Extraction
- Extracts specific metadata fields from images:
  - Caption
  - Image detail
  - Details
  - Creator
  - Date
  - Image title
  - Location
- Preserves metadata during image compression
- Automatic compression for images over 10MB
- Face detection disabled (privacy-focused)
- Comprehensive metadata display in media detail pages

#### Page Editors
- **Main Page Editor:**
  - Configure masthead images (drag-and-drop reordering)
  - Manage featured stories (stories with is_featured flag)
  - Drag-and-drop reordering for featured stories
  - Display story featured images in featured section
- About page editor with markdown support
- Settings page for site-wide configuration

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Vercel account (for database)
- Cloudinary account (for image storage)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Database
POSTGRES_URL=your_postgres_connection_string
```

3. Initialize the database schema:
```bash
# Start the dev server first
npm run dev

# Then visit in your browser:
http://localhost:3000/api/init
```

4. Run the development server:
```bash
npm run dev
```

5. Access the admin interface:
```
http://localhost:3000/admin
```

## Database Schema

The application uses the following tables:

- **stories**: Story metadata (title, year, location, narrative, featured image, is_featured, featured_order)
- **story_images**: Images within stories (with order_index for sorting)
- **media**: Media library (Cloudinary public IDs, metadata, flags, masthead_order, featured_order)
- **settings**: Site-wide settings (key-value pairs)
- **pages**: Dynamic page content (about page, etc.)

## API Routes

### Admin Routes (`/api/*`)
- `GET/POST /api/stories` - List/create stories (supports ?is_featured=true filter)
- `GET/PUT/DELETE /api/stories/[id]` - Story operations
- `PUT /api/stories/reorder` - Reorder featured stories
- `GET/POST/PUT/DELETE /api/stories/[id]/images` - Story image management
- `GET/PUT/DELETE /api/media` - Media library operations (supports ?is_masthead=true, ?is_featured=true filters)
- `GET/PUT/DELETE /api/media/[id]` - Individual media operations
- `PUT /api/media/reorder` - Reorder masthead/featured images
- `GET /api/media/dimensions` - Get image dimensions from Cloudinary
- `POST /api/cloudinary/upload` - Image upload with metadata extraction
- `GET /api/init` - Initialize database schema
- `GET /api/check-tables` - Check database table existence
- `POST /api/migrate/add-order-columns` - Add order columns to media table
- `POST /api/migrate/add-story-featured-columns` - Add featured columns to stories table

## Image Upload Features

- **Automatic Compression**: Images over 10MB are automatically compressed using Sharp
- **Metadata Preservation**: EXIF/IPTC/XMP metadata is preserved during compression
- **Batch Upload**: Upload multiple images at once with progress tracking
- **Metadata Extraction**: Automatically extracts caption, creator, date, title, location, and details
- **Face Detection**: Disabled by default for privacy

## Development Notes

- Uses Next.js 15+ async params pattern (`use()` hook for client components, `await params` for server components)
- Optimistic UI updates prevent page jumps during drag-and-drop operations
- All text uses `text-gray-900` for better visibility
- Batch operations support select all / clear selection
- Error handling with detailed logging in development mode
- Images use 3:2 aspect ratio (5760×3840)
- Masthead displays full images with `object-contain` (no cropping)
- Featured stories use story's featured_image_public_id, not separate featured images

## Deployment

Deploy to Vercel with automatic database and environment variable configuration:

```bash
vercel
```

Make sure to set all environment variables in the Vercel dashboard.

## License

Private project - All rights reserved
