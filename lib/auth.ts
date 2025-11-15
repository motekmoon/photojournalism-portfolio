import { NextRequest, NextResponse } from 'next/server';

// Simple auth check - in production, use Vercel Auth or similar
export async function requireAuth(request: NextRequest): Promise<boolean> {
  // TODO: Implement proper authentication with Vercel Auth
  // For now, temporarily allowing all requests to enable admin functionality
  // SECURITY WARNING: This bypasses authentication - implement proper auth before production use
  
  // Temporarily allow all requests (both dev and production)
  // TODO: Replace with actual Vercel Auth or similar authentication
  return true;
  
  // Original auth check (commented out until proper auth is implemented):
  // if (process.env.NODE_ENV === 'development') {
  //   return true;
  // }
  // 
  // const authHeader = request.headers.get('authorization');
  // const sessionCookie = request.cookies.get('session');
  // 
  // return !!sessionCookie || !!authHeader;
}

export function redirectToLogin() {
  return NextResponse.redirect(new URL('/admin/login', process.env.AUTH_URL || 'http://localhost:3000'));
}

