'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddClientForm from './components/AddClientForm';
import { User } from '@supabase/supabase-js';

interface GoogleCredentialResponse {
    credential: string;
    select_by: string;
}

interface GooglePromptNotification {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    getNotDisplayedReason: () => string;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                    prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
                };
            };
        };
    }
}

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGoogleReady, setIsGoogleReady] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);

    console.log('Component rendered, user:', user, 'loading:', loading, 'isGoogleReady:', isGoogleReady);

    useEffect(() => {
        console.log('First useEffect started');
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('Session check result:', session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('Auth state changed:', session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load Google script
    useEffect(() => {
        if (isGoogleReady) return;

        console.log('Loading Google script...');
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log('Google script loaded successfully');
            setIsGoogleReady(true);
        };
        script.onerror = (error) => {
            console.error('Failed to load Google script:', error);
        };
        document.head.appendChild(script);

        return () => {
            console.log('Cleaning up Google script...');
            document.head.removeChild(script);
        };
    }, [isGoogleReady]);

    // Initialize Google Sign-In
    useEffect(() => {
        if (!isGoogleReady || user || !buttonRef.current) {
            console.log('Skipping Google initialization:', { isGoogleReady, user, hasButtonRef: !!buttonRef.current });
            return;
        }

        console.log('Initializing Google Sign-In...');
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        console.log('Using client ID:', clientId);

        const waitForGoogle = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: async (response: GoogleCredentialResponse) => {
                        setLoading(true);
                        const idToken = response.credential;

                        const { data, error } = await supabase.auth.signInWithIdToken({
                            provider: 'google',
                            token: idToken,
                        });

                        if (error) {
                            console.error('Sign-in failed', error);
                            setLoading(false);
                        } else {
                            // Reload the page after successful login
                            window.location.reload();
                        }
                    },
                    auto_select: true,
                    context: 'signin',
                    ux_mode: 'button',
                });

                // Render the standard button
                if (buttonRef.current) {
                    window.google.accounts.id.renderButton(buttonRef.current, {
                        theme: 'outline',
                        size: 'large',
                        shape: 'pill',
                        type: 'standard',
                        text: 'continue_with',
                        logo_alignment: 'left',
                    });
                }
            } else {
                setTimeout(waitForGoogle, 200);
            }
        };

        waitForGoogle();
    }, [isGoogleReady, user]);

    // Show loading state
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

    // Show user profile if logged in
    if (user) {
        console.log('Rendering main content, user:', user);
        return (
            <main className="p-4">
                <div className="mb-4 flex items-center gap-4">
                    {user.user_metadata.avatar_url && (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full"
                        />
                    )}
                    <div>
                        <p className="font-medium">{user.user_metadata.full_name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="ml-auto bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Вийти
                    </button>
                </div>
                {user && <AddClientForm />}
            </main>
        );
    }

    return (
        <main className="p-4">
            <div className="mb-4">
                <div
                    ref={buttonRef}
                    className="min-w-[250px] min-h-[45px] outline-none focus:outline-none"
                    tabIndex={-1}
                />
            </div>
        </main>
    );
}
