import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    console.log('Middleware called for path:', req.nextUrl.pathname);

    const {
        data: { session },
    } = await supabase.auth.getSession();

    console.log('Session status:', {
        hasSession: !!session,
        path: req.nextUrl.pathname,
        cookies: req.cookies.toString()
    });

    // If user is not signed in and the current path is not / or /auth/callback
    // redirect the user to /
    if (!session && req.nextUrl.pathname !== '/' && req.nextUrl.pathname !== '/auth/callback') {
        console.log('No session, redirecting to home');
        return NextResponse.redirect(new URL('/', req.url));
    }

    // If user is signed in and the current path is / redirect the user to /dashboard
    if (session && req.nextUrl.pathname === '/') {
        console.log('Has session, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return res;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 