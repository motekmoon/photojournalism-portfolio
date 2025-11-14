import { NextResponse } from 'next/server';
import { initializeSchema } from '@/lib/db';

// Initialize database schema
export async function GET() {
  try {
    await initializeSchema();
    return NextResponse.json({ 
      success: true, 
      message: 'Database schema initialized successfully' 
    });
  } catch (error: any) {
    console.error('Error initializing schema:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to initialize database schema' 
      },
      { status: 500 }
    );
  }
}

