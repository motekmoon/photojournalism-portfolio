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
    const { title, year, location, narrative, featured_image_public_id } = body;

    const updateStory = `
      UPDATE stories 
      SET 
        title = COALESCE($1, title),
        year = $2,
        location = $3,
        narrative = $4,
        featured_image_public_id = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const story = await queryOne<Story>(updateStory, [
      title || null,
      year || null,
      location || null,
      narrative || null,
      featured_image_public_id || null,
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

