import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AccessLogger } from '@/lib/access-logger';

const PUBLIC_PATHS = ['/login', '/api/auth'];

function isPublicPath(pathname: string) {
    return PUBLIC_PATHS.some(
        (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`)
    );
}

function shouldLogAccess(pathname: string): boolean {
    // Skip logging for static assets and internal paths
    return (
        !pathname.startsWith('/_next') &&
        !pathname.includes('/favicon.ico') &&
        !pathname.includes('.') &&
        pathname !== '/api/auth/session'
    ); // Skip frequent session checks
}

export async function middleware(request: NextRequest) {
    const startTime = Date.now();
    const { pathname } = request.nextUrl;

    // Skip processing for static assets and internal paths
    if (
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico' ||
        (pathname.includes('.') && !pathname.startsWith('/api'))
    ) {
        return NextResponse.next();
    }

    const sessionCookie =
        request.cookies.get('__Secure-better-auth.session_token') ??
        request.cookies.get('better-auth.session_token') ??
        request.cookies.get('session');
    const hasSession = Boolean(sessionCookie?.value);

    let response: NextResponse;
    let statusCode: number;

    if (hasSession && pathname === '/login') {
        response = NextResponse.redirect(new URL('/', request.url));
        statusCode = 302;
    } else if (!hasSession && !isPublicPath(pathname)) {
        const loginUrl = new URL('/login', request.url);
        if (pathname !== '/') {
            loginUrl.searchParams.set('redirect', pathname);
        }
        response = NextResponse.redirect(loginUrl);
        statusCode = 302;
    } else {
        response = NextResponse.next();
        statusCode = 200;
    }

    // Log access asynchronously (don't await to avoid blocking the request)
    if (shouldLogAccess(pathname)) {
        const responseTime = Date.now() - startTime;
        const ipAddress = AccessLogger.getClientIP(request);
        const userAgent = request.headers.get('user-agent') || undefined;
        const referrer = request.headers.get('referer') || undefined;
        const deviceId = request.headers.get('x-device-id') || undefined;
        const platform = AccessLogger.extractPlatform(userAgent);
        const appVersion = AccessLogger.extractAppVersion(userAgent);

        // Don't await - log in background
        AccessLogger.logAccess({
            method: request.method,
            path: pathname,
            query: request.nextUrl.search ? request.nextUrl.search.substring(1) : undefined,
            statusCode,
            responseTime,
            ipAddress,
            userAgent,
            referrer,
            platform,
            appVersion,
            deviceId,
            // Note: userId and sessionId will be added later when we have session context
        }).catch((error) => {
            console.error('Access logging failed:', error);
        });
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
