import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/hs/', '/ws/', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  // express-session stores the session cookie as connect.sid
  const sessionCookie = request.cookies.get('connect.sid');
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/hs/:path*', '/ws/:path*', '/settings/:path*'],
};
