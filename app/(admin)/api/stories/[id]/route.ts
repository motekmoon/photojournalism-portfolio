import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { Story } from '@/types';

// GET single story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const story = await queryOne<Story>(
      'SELECT * FROM stories WHERE id = $1',
      [id]
    );

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get story images
    const images = await query(
      `SELECT * FROM story_images 
       WHERE story_id = $1 
       ORDER BY order_index ASC`,
      [id]
    );

    return NextResponse.json({ story, images });
  } catch (error: any) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

// PUT update story
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
    const { title, year, location, narrative, featured_image_public_id, is_featured } = body;

    // If toggling featured on, set order to end of list
    if (is_featured === true) {
      const maxOrder = await queryOne<{ max: number }>(
        'SELECT COALESCE(MAX(featured_order), -1) as max FROM stories WHERE is_featured = true'
      );
      const nextOrder = (maxOrder?.max ?? -1) + 1;
      await query(
        'UPDATE stories SET featured_order = $1 WHERE id = $2',
        [nextOrder, id]
      );
    } else if (is_featured === false) {
      // Clear order when removing from featured
      await query(
        'UPDATE stories SET featured_order = NULL WHERE id = $1',
        [id]
      );
    }

    const updateStory = `
      UPDATE stories 
      SET 
        title = COALESCE($1, title),
        year = $2,
        location = $3,
        narrative = $4,
        featured_image_public_id = $5,
        is_featured = COALESCE($6, is_featured),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const story = await queryOne<Story>(updateStory, [
      title || null,
      year || null,
      location || null,
      narrative || null,
      featured_image_public_id || null,
      is_featured !== undefined ? is_featured : null,
      id,
    ]);

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    return NextResponse.json({ story });
  } catch (error: any) {
    console.error('Error updating story:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update story' },
      { status: 500 }
    );
  }
}

// DELETE story
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

    await query('DELETE FROM stories WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete story' },
      { status: 500 }
    );
  }
}

