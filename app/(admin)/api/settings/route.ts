import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { Setting } from '@/types';

// GET setting by key
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'key parameter is required' }, { status: 400 });
    }

    const setting = await queryOne<Setting>(
      'SELECT * FROM settings WHERE key = $1',
      [key]
    );

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error('Error fetching setting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

// PUT update setting
export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    if (value === undefined) {
      return NextResponse.json({ error: 'value is required' }, { status: 400 });
    }

    const upsertSetting = `
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
      RETURNING *
    `;

    const setting = await queryOne<Setting>(upsertSetting, [
      key,
      JSON.stringify(value),
    ]);

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update setting' },
      { status: 500 }
    );
  }
}

