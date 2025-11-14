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
    const { slug, content } = body;

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    if (content === undefined) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const upsertPage = `
      INSERT INTO pages (slug, content, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (slug) 
      DO UPDATE SET
        content = EXCLUDED.content,
        updated_at = NOW()
      RETURNING *
    `;

    const page = await queryOne<Page>(upsertPage, [slug, content]);

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update page' },
      { status: 500 }
    );
  }
}

