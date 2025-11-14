import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT reorder media (masthead or featured)
export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, mediaIds } = body; // type: 'masthead' | 'featured', mediaIds: number[]

    if (!type || (type !== 'masthead' && type !== 'featured')) {
      return NextResponse.json(
        { error: 'type must be "masthead" or "featured"' },
        { status: 400 }
      );
    }

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { error: 'mediaIds array is required' },
        { status: 400 }
      );
    }

    const orderColumn = type === 'masthead' ? 'masthead_order' : 'featured_order';

    // Update order for each media item
    for (let i = 0; i < mediaIds.length; i++) {
      await query(
        `UPDATE media SET ${orderColumn} = $1 WHERE id = $2`,
        [i, mediaIds[i]]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reorder media' },
      { status: 500 }
    );
  }
}

