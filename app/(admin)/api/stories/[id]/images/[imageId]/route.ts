import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// DELETE remove image from story
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await params;
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await query(
      'DELETE FROM story_images WHERE id = $1 AND story_id = $2',
      [imageId, id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing image from story:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove image' },
      { status: 500 }
    );
  }
}

