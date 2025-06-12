'use client';

import { useEffect, useRef, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import AddClientForm from './components/AddClientForm';
import Image from 'next/image';

interface GoogleCredentialResponse {
    credential: string;
}

interface GooglePromptNotification {
    isNotDisplayed(): boolean;
    isSkippedMoment(): boolean;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: GoogleCredentialResponse) => void;
                        auto_select?: boolean;
                        context?: string;
                        ux_mode?: string;
                        use_fedcm_for_prompt?: boolean;
                    }) => void;
                    renderButton: (
                        element: HTMLElement,
                        config: {
                            theme?: string;
                            size?: string;
                            shape?: string;
                            type?: string;
                            text?: string;
                            logo_alignment?: string;
                        }
                    ) => void;
                    prompt: (callback: (notification: GooglePromptNotification) => void) => void;
                };
            };
        };
    }
}

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const googleButtonRef = useRef<HTMLDivElement>(null);
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

    useEffect(() => {
        const loadGoogleScript = () => {
            return new Promise<void>((resolve) => {
                console.log('Starting to load Google script...');
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    console.log('Google script loaded successfully');
                    resolve();
                };
                script.onerror = (error) => {
                    console.error('Error loading Google script:', error);
                    resolve();
                };
                document.head.appendChild(script);
            });
        };

        const initializeGoogle = async () => {
            console.log('Initializing Google Sign-In...');
            console.log('Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
            console.log('Window location:', window.location.origin);

            if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
                console.log('Google script not found, loading...');
                await loadGoogleScript();
            }

            if (!window.google?.accounts?.id) {
                console.log('Google not available yet, retrying in 200ms...');
                setTimeout(initializeGoogle, 200);
                return;
            }

            console.log('Google is available, initializing...');
            window.google.accounts.id.initialize({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
                callback: async (response: GoogleCredentialResponse) => {
                    console.log('Google Sign-In callback received');
                    setLoading(true);
                    const idToken = response.credential;

                    const { error } = await supabase.auth.signInWithIdToken({
                        provider: 'google',
                        token: idToken,
                    });

                    if (error) {
                        console.error('Sign-in failed', error);
                        setLoading(false);
                    } else {
                        window.location.reload();
                    }
                },
                auto_select: true,
                context: 'signin',
                ux_mode: 'popup',
                use_fedcm_for_prompt: true,
            });

            console.log('Trying to show One Tap...');
            window.google.accounts.id.prompt((notification: GooglePromptNotification) => {
                console.log('One Tap notification:', {
                    isNotDisplayed: notification.isNotDisplayed(),
                    isSkippedMoment: notification.isSkippedMoment()
                });

                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    console.log('One Tap not shown, rendering standard button...');
                    if (googleButtonRef.current && window.google?.accounts?.id) {
                        window.google.accounts.id.renderButton(googleButtonRef.current, {
                            theme: 'outline',
                            size: 'large',
                            shape: 'pill',
                            type: 'standard',
                            text: 'signin_with',
                            logo_alignment: 'left',
                        });
                    }
                }
            });
        };

        if (!user) {
            console.log('User not logged in, starting Google initialization...');
            initializeGoogle();
        }
    }, [user, supabase.auth]);

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
            <div className="mb-4">
                <div
                    ref={googleButtonRef}
                    className="min-w-[250px] min-h-[45px] outline-none focus:outline-none"
                    tabIndex={-1}
                />
            </div>
        </main>
    );
}
