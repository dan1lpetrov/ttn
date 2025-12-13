'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import AddClientForm from './components/AddClientForm';
import Image from 'next/image';

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase.auth]);

    const handleGoogleSignIn = async () => {
        console.log('Starting Google Sign-In process...');
        try {
            // Визначаємо правильний URL для редиректу
            // Використовуємо window.location.origin, який завжди правильний для поточного домену
            const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
            const redirectUrl = `${currentOrigin}/auth/callback`;
            
            console.log('Using redirect URL:', redirectUrl);
            console.log('Current origin:', currentOrigin);
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    // Явно вказуємо site_url, щоб Supabase не використовував налаштування з Dashboard
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    // Додаємо site_url в опції, щоб Supabase використовував правильний URL
                    ...(currentOrigin && { 
                        queryParams: {
                            ...{ access_type: 'offline', prompt: 'consent' },
                            // Передаємо site_url через queryParams, якщо Supabase підтримує
                        }
                    }),
                },
            });

            console.log('Sign in response:', { data, error });

            if (error) {
                console.error('Error during sign in:', error);
                throw error;
            }

            if (data?.url) {
                console.log('Redirecting to:', data.url);
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error in handleGoogleSignIn:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Завантаження...</p>
                </div>
            </div>
        );
    }

    if (user) {
        return (
            <main className="p-4">
                <div className="mb-4 flex items-center gap-4">
                    {user.user_metadata.avatar_url && (
                        <Image
                            src={user.user_metadata.avatar_url}
                            alt={user.user_metadata.full_name || 'User'}
                            width={40}
                            height={40}
                            className="rounded-full"
                        />
                    )}
                    <div>
                        <p className="font-medium">{user.user_metadata.full_name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="ml-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Вийти
                    </button>
                </div>
                <AddClientForm />
            </main>
        );
    }

    return (
        <main className="p-4">
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
                        Вхід в систему
                    </h1>
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Увійти через Google
                    </button>
                </div>
            </div>
        </main>
    );
}
