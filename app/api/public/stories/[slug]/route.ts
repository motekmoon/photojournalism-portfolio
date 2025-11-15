import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { Story, StoryImage } from '@/types';

// GET story by slug (public route, no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Fetch story by slug
    const story = await queryOne<Story>(
      'SELECT * FROM stories WHERE slug = $1',
      [slug]
    );

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Get story images ordered by order_index
    const images = await query<StoryImage>(
      `SELECT * FROM story_images 
       WHERE story_id = $1 
       ORDER BY order_index ASC`,
      [story.id]
    );

    return NextResponse.json({ story, images });
  } catch (error: any) {
    console.error('Error fetching story by slug:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

