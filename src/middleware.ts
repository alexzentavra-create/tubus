import { NextRequest, NextResponse } from 'next/server'

const BOT_PATTERNS = [
  'googlebot',
  'bingbot',
  'baiduspider',
  'yandexbot',
  'petalbot',
  'semrushbot',
  'ahrefsbot',
  'dotbot',
  'mj12bot',
  'censys',
  'shodan',
  'python-requests',
  'curl/',
  'wget/',
  'scrapy',
  'bytespider',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase()

  // 1. Immediately drop aggressive automated bots and scanners
  if (BOT_PATTERNS.some((bot) => userAgent.includes(bot))) {
    return new NextResponse('Access Denied: Automated bot activity is blocked.', { status: 403 })
  }

  // 2. Allow static files, assets, service worker, manifest, robots.txt
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }

  // 3. Allow access to verification endpoints and the access gate
  if (pathname === '/access' || pathname === '/api/verify-access') {
    return NextResponse.next()
  }

  // 4. Verify Private Deployment Access Cookie
  const accessCookie = request.cookies.get('bp_access')?.value
  const hasValidAccess = accessCookie === 'granted_2026'

  if (!hasValidAccess) {
    // If hitting an API route without access, reject immediately with 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Unauthorized: Deployment is private to developers only.' },
        { status: 401 }
      )
    }

    // If navigating to any page, redirect to the private access gate
    const accessUrl = new URL('/access', request.url)
    return NextResponse.redirect(accessUrl)
  }

  // 5. Attach standard cybersecurity headers for authorized users
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()')

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}