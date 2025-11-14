import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { deleteImage } from '@/lib/cloudinary';
import type { Media } from '@/types';

// GET all media
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('story_id');
    const isFeatured = searchParams.get('is_featured');
    const isMasthead = searchParams.get('is_masthead');

    let queryText = 'SELECT * FROM media WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (storyId) {
      queryText += ` AND story_id = $${paramIndex}`;
      params.push(storyId);
      paramIndex++;
    }

    if (isFeatured === 'true') {
      queryText += ` AND is_featured = true`;
      // Order by featured_order when filtering for featured images
      queryText += ' ORDER BY featured_order ASC NULLS LAST, created_at DESC';
    } else if (isMasthead === 'true') {
      queryText += ` AND is_masthead = true`;
      // Order by masthead_order when filtering for masthead images
      queryText += ' ORDER BY masthead_order ASC NULLS LAST, created_at DESC';
    } else {
      // Default ordering for all media
      queryText += ' ORDER BY created_at DESC';
    }

    const media = await query<Media>(queryText, params);

    // Always return an array, even if empty
    return NextResponse.json({ media: media || [] });
  } catch (error: any) {
    console.error('Error fetching media:', error);
    
    // If table doesn't exist, return empty array instead of error
    if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
      console.warn('Media table does not exist yet. Please initialize the database schema.');
      return NextResponse.json({ media: [] });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch media', media: [] },
      { status: 500 }
    );
  }
}

// DELETE batch media
export async function DELETE(request: NextRequest) {
  try {
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body; // Array of media IDs

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      );
    }

    // Get public_ids before deleting
    const mediaToDelete = await query<Media>(
      `SELECT cloudinary_public_id FROM media WHERE id = ANY($1)`,
      [ids]
    );

    // Delete from Cloudinary
    for (const media of mediaToDelete) {
      try {
        await deleteImage(media.cloudinary_public_id);
      } catch (error) {
        console.error(`Failed to delete ${media.cloudinary_public_id} from Cloudinary:`, error);
      }
    }

    // Delete from database
    await query('DELETE FROM media WHERE id = ANY($1)', [ids]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete media' },
      { status: 500 }
    );
  }
}

