import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Add order columns if they don't exist
    const addOrderColumns = `
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'media' AND column_name = 'masthead_order'
        ) THEN
          ALTER TABLE media ADD COLUMN masthead_order INTEGER;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'media' AND column_name = 'featured_order'
        ) THEN
          ALTER TABLE media ADD COLUMN featured_order INTEGER;
        END IF;
      END $$;
    `;

    await query(addOrderColumns);

    // Initialize order values for existing masthead/featured images
    // Get all masthead images and assign order
    const mastheadImages = await query(
      'SELECT id FROM media WHERE is_masthead = true ORDER BY created_at ASC'
    );
    for (let i = 0; i < mastheadImages.length; i++) {
      await query('UPDATE media SET masthead_order = $1 WHERE id = $2', [i, mastheadImages[i].id]);
    }

    // Get all featured images and assign order
    const featuredImages = await query(
      'SELECT id FROM media WHERE is_featured = true ORDER BY created_at ASC'
    );
    for (let i = 0; i < featuredImages.length; i++) {
      await query('UPDATE media SET featured_order = $1 WHERE id = $2', [i, featuredImages[i].id]);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Order columns added and initialized successfully',
      mastheadCount: mastheadImages.length,
      featuredCount: featuredImages.length
    });
  } catch (error: any) {
    console.error('Error adding order columns:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add order columns' },
      { status: 500 }
    );
  }
}

