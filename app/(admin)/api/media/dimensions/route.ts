import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cloudinary } from '@/lib/cloudinary';
import type { Media } from '@/types';

// GET dimensions for all media or specific media
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get media from database
    const media = await query<Media>(
      'SELECT * FROM media ORDER BY created_at DESC LIMIT $1',
      [limit]
    );

    // Fetch dimensions from Cloudinary
    const mediaWithDimensions = await Promise.all(
      media.map(async (item) => {
        try {
          const resource = await cloudinary.api.resource(item.cloudinary_public_id, {
            image_metadata: false,
          });
          return {
            id: item.id,
            public_id: item.cloudinary_public_id,
            width: resource.width,
            height: resource.height,
            aspect_ratio: (resource.width / resource.height).toFixed(2),
            format: resource.format,
          };
        } catch (error) {
          return {
            id: item.id,
            public_id: item.cloudinary_public_id,
            error: 'Failed to fetch dimensions',
          };
        }
      })
    );

    return NextResponse.json({ media: mediaWithDimensions });
  } catch (error: any) {
    console.error('Error fetching dimensions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dimensions' },
      { status: 500 }
    );
  }
}

