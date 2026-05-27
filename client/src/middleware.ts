/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;
  
  const isAdminRoute = path.startsWith('/admin');
  const isDoctorRoute = path.startsWith('/doctor');
  const isPatientRoute = path.startsWith('/patient');

  // If it's a protected route
  if (isAdminRoute || isDoctorRoute || isPatientRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Decode JWT payload (Edge compatible base64 parsing)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));

      // Check role authorization
      if (isAdminRoute && payload.role !== 'admin') {
        return NextResponse.redirect(new URL(`/${payload.role}/dashboard`, request.url));
      }
      if (isDoctorRoute && payload.role !== 'doctor') {
        return NextResponse.redirect(new URL(`/${payload.role}/dashboard`, request.url));
      }
      if (isPatientRoute && payload.role !== 'patient') {
        return NextResponse.redirect(new URL(`/${payload.role}/dashboard`, request.url));
      }
    } catch (error) {
      // Invalid token format
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/doctor/:path*', '/patient/:path*'],
};
