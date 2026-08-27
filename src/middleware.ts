import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type JwtPayload = {
  sub?: string
  role?: string
  exp?: number
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const json = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

function getAccessToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('lwsrh_jwt')?.value ?? null
}

function isTokenValid(token: string | null): { ok: boolean; role?: string } {
  if (!token) return { ok: false }
  const payload = decodeJwtPayload(token)
  if (!payload?.sub) return { ok: false }
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    return { ok: false }
  }
  return { ok: true, role: payload.role }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const loggedInCookie = req.cookies.get('lwsrh_is_logged_in')?.value === 'true'
  const tokenCheck = isTokenValid(getAccessToken(req))
  // JWT preferred; login cookie covers sessionStorage-only clients until cookie is set.
  const isLoggedIn = tokenCheck.ok || loggedInCookie

  const isProtectedRoute =
    pathname.startsWith('/pages') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/boss') ||
    pathname.startsWith('/subgroup-admin') ||
    pathname.startsWith('/profile') ||
    pathname === '/home'

  const isAuthRoute = pathname.startsWith('/auth')

  if (isProtectedRoute && (!isLoggedIn || (pathname.startsWith('/admin') && !tokenCheck.ok))) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  if (tokenCheck.ok && tokenCheck.role) {
    const role = tokenCheck.role.toLowerCase()
    const adminRoles = new Set(['admin', 'hq_admin', 'super_admin', 'zone_admin', 'zone_coordinator', 'subgroup_admin', 'subgroup_coordinator'])

    if (pathname.startsWith('/admin') && !adminRoles.has(role)) {
      const url = req.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/boss') && role !== 'hq_admin' && role !== 'admin' && role !== 'super_admin') {
      const url = req.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
