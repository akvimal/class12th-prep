import { NextResponse, type NextRequest } from 'next/server';
import { isLockEnabled, isValidSessionToken, passcodeCookie } from '@/lib/passcode';

/** Everything except the unlock/offline pages, the health probe, and PWA/static assets. */
export const config = {
  matcher: [
    '/((?!unlock|offline|api/health|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|apple-touch-icon.png|icons/).*)',
  ],
};

export async function middleware(request: NextRequest) {
  if (!isLockEnabled()) return NextResponse.next();

  const token = request.cookies.get(passcodeCookie.name)?.value;
  if (await isValidSessionToken(token)) return NextResponse.next();

  const url = request.nextUrl.clone();
  const next = url.pathname + url.search;
  url.pathname = '/unlock';
  url.search = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
  return NextResponse.redirect(url);
}
