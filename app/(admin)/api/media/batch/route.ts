import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT batch update media
export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, updates } = body; // Array of IDs and update object

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.caption !== undefined) {
      setClauses.push(`caption = $${paramIndex}`);
      params.push(updates.caption);
      paramIndex++;
    }

    if (updates.is_featured !== undefined) {
      setClauses.push(`is_featured = $${paramIndex}`);
      params.push(updates.is_featured);
      paramIndex++;
    }

    if (updates.is_masthead !== undefined) {
      setClauses.push(`is_masthead = $${paramIndex}`);
      params.push(updates.is_masthead);
      paramIndex++;
    }

    if (updates.story_id !== undefined) {
      setClauses.push(`story_id = $${paramIndex}`);
      params.push(updates.story_id);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(ids);

    const updateQuery = `
      UPDATE media 
      SET ${setClauses.join(', ')}
      WHERE id = ANY($${paramIndex})
    `;

    await query(updateQuery, params);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error batch updating media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to batch update media' },
      { status: 500 }
    );
  }
}

