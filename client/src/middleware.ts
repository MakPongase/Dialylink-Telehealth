import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  if (isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Decode JWT payload (Edge compatible base64 parsing)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));

      if (payload.role !== 'admin') {
        // Redirect non-admins to their respective dashboards
        if (payload.role === 'doctor') {
          return NextResponse.redirect(new URL('/doctor/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/patient/dashboard', request.url));
        }
      }
    } catch (error) {
      // Invalid token format
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
