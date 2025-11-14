import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Check which tables exist in the database
export async function GET() {
  try {
    // Query to get all tables in the public schema
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tables = await query<{ table_name: string }>(tablesQuery);
    const tableNames = tables.map(t => t.table_name);

    // Expected tables from our schema
    const expectedTables = [
      'stories',
      'story_images',
      'media',
      'settings',
      'pages'
    ];

    const missingTables = expectedTables.filter(
      table => !tableNames.includes(table)
    );
    const extraTables = tableNames.filter(
      table => !expectedTables.includes(table)
    );

    return NextResponse.json({
      success: true,
      tables: {
        existing: tableNames,
        expected: expectedTables,
        missing: missingTables,
        extra: extraTables,
        allPresent: missingTables.length === 0
      }
    });
  } catch (error: any) {
    console.error('Error checking tables:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check tables',
        tables: {
          existing: [],
          expected: ['stories', 'story_images', 'media', 'settings', 'pages'],
          missing: ['stories', 'story_images', 'media', 'settings', 'pages'],
          extra: [],
          allPresent: false
        }
      },
      { status: 500 }
    );
  }
}

