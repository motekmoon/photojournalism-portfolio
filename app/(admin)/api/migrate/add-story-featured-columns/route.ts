import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Add featured columns if they don't exist
    const addStoryFeaturedColumns = `
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'stories' AND column_name = 'is_featured'
        ) THEN
          ALTER TABLE stories ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'stories' AND column_name = 'featured_order'
        ) THEN
          ALTER TABLE stories ADD COLUMN featured_order INTEGER;
        END IF;
      END $$;
    `;

    await query(addStoryFeaturedColumns);

    // Initialize order values for existing featured stories
    const featuredStories = await query(
      'SELECT id FROM stories WHERE is_featured = true ORDER BY created_at ASC'
    );
    for (let i = 0; i < featuredStories.length; i++) {
      await query('UPDATE stories SET featured_order = $1 WHERE id = $2', [i, featuredStories[i].id]);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Story featured columns added and initialized successfully',
      featuredCount: featuredStories.length
    });
  } catch (error: any) {
    console.error('Error adding story featured columns:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add story featured columns' },
      { status: 500 }
    );
  }
}

