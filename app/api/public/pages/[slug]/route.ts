import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { Page } from '@/types';

// GET page by slug (public route, no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // First, ensure the column exists
    try {
      await query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pages' AND column_name = 'profile_image_public_id'
          ) THEN
            ALTER TABLE pages ADD COLUMN profile_image_public_id VARCHAR(255);
          END IF;
        END $$;
      `);
    } catch (migrationError: any) {
      console.warn('Migration check failed (column may already exist):', migrationError.message);
    }
    
    const page = await queryOne<Page>(
      'SELECT slug, content, profile_image_public_id, updated_at FROM pages WHERE slug = $1',
      [slug]
    );

    console.log('Public API - Fetched page:', {
      hasPage: !!page,
      slug: page?.slug,
      hasContent: !!page?.content,
      profileImagePublicId: page?.profile_image_public_id,
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Error fetching page by slug:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

