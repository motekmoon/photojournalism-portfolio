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
      try {
        // Get max order excluding current story (in case it's already featured)
        const maxOrder = await queryOne<{ max: number }>(
          'SELECT COALESCE(MAX(featured_order), -1) as max FROM stories WHERE is_featured = true AND id != $1',
          [id]
        );
        const nextOrder = (maxOrder?.max ?? -1) + 1;
        await query(
          'UPDATE stories SET featured_order = $1 WHERE id = $2',
          [nextOrder, id]
        );
      } catch (orderError: any) {
        // If column doesn't exist, try to add it via migration
        if (orderError.code === '42703' || orderError.message?.includes('column') && orderError.message?.includes('does not exist')) {
          console.error('Featured columns may not exist. Please run /api/migrate/add-story-featured-columns');
          throw new Error('Database columns missing. Please run the migration endpoint: /api/migrate/add-story-featured-columns');
        }
        throw orderError;
      }
    } else if (is_featured === false) {
      // Clear order when removing from featured
      try {
        await query(
          'UPDATE stories SET featured_order = NULL WHERE id = $1',
          [id]
        );
      } catch (orderError: any) {
        // If column doesn't exist, that's okay - just continue
        if (orderError.code === '42703' || (orderError.message?.includes('column') && orderError.message?.includes('does not exist'))) {
          console.warn('featured_order column does not exist, skipping order update');
        } else {
          throw orderError;
        }
      }
    }

    // Only update fields that are explicitly provided
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(title);
    }
    if (year !== undefined) {
      updateFields.push(`year = $${paramIndex++}`);
      updateValues.push(year);
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      updateValues.push(location);
    }
    if (narrative !== undefined) {
      updateFields.push(`narrative = $${paramIndex++}`);
      updateValues.push(narrative);
    }
    if (featured_image_public_id !== undefined) {
      updateFields.push(`featured_image_public_id = $${paramIndex++}`);
      updateValues.push(featured_image_public_id);
    }
    if (is_featured !== undefined) {
      updateFields.push(`is_featured = $${paramIndex++}`);
      updateValues.push(is_featured);
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      // Only updated_at, nothing to update
      const story = await queryOne<Story>('SELECT * FROM stories WHERE id = $1', [id]);
      if (!story) {
        return NextResponse.json({ error: 'Story not found' }, { status: 404 });
      }
      return NextResponse.json({ story });
    }

    updateValues.push(id);
    const updateStory = `
      UPDATE stories 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const story = await queryOne<Story>(updateStory, updateValues);

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    return NextResponse.json({ story });
  } catch (error: any) {
    console.error('Error updating story:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update story',
        details: error.detail || error.hint || undefined,
      },
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

