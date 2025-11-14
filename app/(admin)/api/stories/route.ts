import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { Story } from '@/types';

// GET all stories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isFeatured = searchParams.get('is_featured');

    let queryText = 'SELECT * FROM stories WHERE 1=1';
    
    if (isFeatured === 'true') {
      queryText += ` AND is_featured = true`;
      queryText += ' ORDER BY featured_order ASC NULLS LAST, created_at DESC';
    } else {
      queryText += ' ORDER BY created_at DESC';
    }

    const stories = await query<Story>(queryText);

    return NextResponse.json({ stories: stories || [] });
  } catch (error: any) {
    console.error('Error fetching stories:', error);
    
    // If table doesn't exist, return empty array instead of error
    if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
      console.warn('Stories table does not exist yet. Please initialize the database schema.');
      return NextResponse.json({ stories: [] });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stories', stories: [] },
      { status: 500 }
    );
  }
}

// POST create new story
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, year, location, narrative, featured_image_public_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const insertStory = `
      INSERT INTO stories (slug, title, year, location, narrative, featured_image_public_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const story = await queryOne<Story>(insertStory, [
      slug,
      title,
      year || null,
      location || null,
      narrative || null,
      featured_image_public_id || null,
    ]);

    return NextResponse.json({ story }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating story:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create story' },
        { status: 500 }
      );
    }
  }

  // DELETE batch stories
  export async function DELETE(request: NextRequest) {
    try {
      const isAuthenticated = await requireAuth(request);
      if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { ids } = body; // Array of story IDs

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: 'ids array is required' },
          { status: 400 }
        );
      }

      // Delete stories (cascade will handle story_images)
      await query('DELETE FROM stories WHERE id = ANY($1)', [ids]);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting stories:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete stories' },
        { status: 500 }
      );
    }
  }

