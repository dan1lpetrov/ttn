import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    console.log('Auth callback received:', {
        code,
        url: request.url
    });

    if (code) {
        const supabase = createRouteHandlerClient({ cookies });
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        console.log('Exchange code result:', {
            hasData: !!data,
            error,
            session: data?.session
        });

        if (error) {
            console.error('Error exchanging code:', error);
            return NextResponse.redirect(new URL('/', request.url));
        }

        // URL to redirect to after sign in process completes
        const redirectUrl = new URL('/dashboard', request.url);
        console.log('Redirecting to:', redirectUrl.toString());
        return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.redirect(new URL('/', request.url));
} 