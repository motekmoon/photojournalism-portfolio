import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { Page } from '@/types';

// GET page by slug
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') || 'about';

    const page = await queryOne<Page>(
      'SELECT * FROM pages WHERE slug = $1',
      [slug]
    );

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// PUT update page
export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, content, profile_image_public_id } = body;

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    if (content === undefined) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // First, try to ensure the column exists
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

    const upsertPage = `
      INSERT INTO pages (slug, content, profile_image_public_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (slug) 
      DO UPDATE SET
        content = EXCLUDED.content,
        profile_image_public_id = EXCLUDED.profile_image_public_id,
        updated_at = NOW()
      RETURNING *
    `;

    const page = await queryOne<Page>(upsertPage, [slug, content, profile_image_public_id || null]);

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Error updating page:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update page',
        details: error.detail || error.hint || 'Check server logs for more information'
      },
      { status: 500 }
    );
  }
}

