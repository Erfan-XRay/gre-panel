import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-key-change-me');

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const isAuthPage = request.nextUrl.pathname === '/';

    // Exclude API routes, next assets, fonts etc.
    if (
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    if (!token) {
        if (!isAuthPage) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    try {
        await jwtVerify(token, JWT_SECRET);
        if (isAuthPage) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.next();
    } catch (err) {
        // Invalid token
        if (!isAuthPage) {
            const response = NextResponse.redirect(new URL('/', request.url));
            response.cookies.delete('auth_token');
            return response;
        }
        return NextResponse.next();
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
