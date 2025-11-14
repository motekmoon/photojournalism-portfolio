import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT reorder featured stories
export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storyIds } = body; // Array of story IDs in new order

    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      return NextResponse.json(
        { error: 'storyIds array is required' },
        { status: 400 }
      );
    }

    // Update order for each story
    for (let i = 0; i < storyIds.length; i++) {
      await query(
        'UPDATE stories SET featured_order = $1 WHERE id = $2',
        [i, storyIds[i]]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering stories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reorder stories' },
      { status: 500 }
    );
  }
}

