import { NextResponse, type NextRequest } from 'next/server';
import { isLockEnabled, PARENT_ALLOWED, passcodeCookie, readSession } from '@/lib/passcode';

/** Everything except the unlock/offline pages, the health probe, and PWA/static assets. */
export const config = {
  matcher: [
    '/((?!unlock|offline|api/health|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|apple-touch-icon.png|icons/).*)',
  ],
};

export async function middleware(request: NextRequest) {
  if (!isLockEnabled()) return NextResponse.next();

  const session = await readSession(request.cookies.get(passcodeCookie.name)?.value);

  if (!session) {
    const url = request.nextUrl.clone();
    const next = url.pathname + url.search;
    url.pathname = '/unlock';
    url.search = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
    return NextResponse.redirect(url);
  }

  // A parent session is confined to the summary.
  if (session.role === 'parent' && !PARENT_ALLOWED.has(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/parent';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
