import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  // Видаляємо сесію
  await supabase.auth.signOut();

  // Очищаємо куки
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.delete('sb-auth-token');
  
  return response;
} 