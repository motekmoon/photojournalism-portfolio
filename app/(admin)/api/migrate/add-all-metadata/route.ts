import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Add all_metadata column to media table
export async function GET() {
  try {
    // Check if column exists
    const checkColumn = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'media' AND column_name = 'all_metadata';
    `;
    
    const existing = await query(checkColumn);
    
    if (existing.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Column all_metadata already exists' 
      });
    }
    
    // Add the column
    await query('ALTER TABLE media ADD COLUMN all_metadata JSONB');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Column all_metadata added successfully' 
    });
  } catch (error: any) {
    console.error('Error adding column:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to add column' 
      },
      { status: 500 }
    );
  }
}

