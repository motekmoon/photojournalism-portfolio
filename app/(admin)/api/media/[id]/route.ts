import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { Media } from '@/types';

// GET single media
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const media = await queryOne<Media>(
      'SELECT * FROM media WHERE id = $1',
      [id]
    );

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({ media });
  } catch (error: any) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

// PUT update media
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { caption, is_featured, is_masthead, story_id } = body;

    // If toggling masthead/featured on, set order to end of list
    if (is_masthead === true) {
      const maxOrder = await queryOne<{ max: number }>(
        'SELECT COALESCE(MAX(masthead_order), -1) as max FROM media WHERE is_masthead = true'
      );
      const nextOrder = (maxOrder?.max ?? -1) + 1;
      await query(
        'UPDATE media SET masthead_order = $1 WHERE id = $2',
        [nextOrder, id]
      );
    } else if (is_masthead === false) {
      // Clear order when removing from masthead
      await query(
        'UPDATE media SET masthead_order = NULL WHERE id = $1',
        [id]
      );
    }

    if (is_featured === true) {
      const maxOrder = await queryOne<{ max: number }>(
        'SELECT COALESCE(MAX(featured_order), -1) as max FROM media WHERE is_featured = true'
      );
      const nextOrder = (maxOrder?.max ?? -1) + 1;
      await query(
        'UPDATE media SET featured_order = $1 WHERE id = $2',
        [nextOrder, id]
      );
    } else if (is_featured === false) {
      // Clear order when removing from featured
      await query(
        'UPDATE media SET featured_order = NULL WHERE id = $1',
        [id]
      );
    }

    const updateMedia = `
      UPDATE media 
      SET 
        caption = COALESCE($1, caption),
        is_featured = COALESCE($2, is_featured),
        is_masthead = COALESCE($3, is_masthead),
        story_id = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const media = await queryOne<Media>(updateMedia, [
      caption !== undefined ? caption : null,
      is_featured !== undefined ? is_featured : null,
      is_masthead !== undefined ? is_masthead : null,
      story_id !== undefined ? story_id : null,
      id,
    ]);

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({ media });
  } catch (error: any) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update media' },
      { status: 500 }
    );
  }
}

// DELETE single media
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get media to delete
    const media = await queryOne<Media>(
      'SELECT cloudinary_public_id FROM media WHERE id = $1',
      [id]
    );

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Delete from Cloudinary
    try {
      const { deleteImage } = await import('@/lib/cloudinary');
      await deleteImage(media.cloudinary_public_id);
    } catch (error) {
      console.error('Failed to delete from Cloudinary:', error);
    }

    // Delete from database
    await query('DELETE FROM media WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete media' },
      { status: 500 }
    );
  }
}

