'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const supabase = createClientComponentClient();
    const router = useRouter();

    useEffect(() => {
        const loadApiKey = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/');
                    return;
                }

                const { data, error } = await supabase
                    .from('user_settings')
                    .select('nova_poshta_api_key')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error('Error loading API key:', error);
                } else if (data) {
                    setApiKey(data.nova_poshta_api_key || '');
                }
            } catch (err) {
                console.error('Error loading API key:', err);
            } finally {
                setLoading(false);
            }
        };

        loadApiKey();
    }, [supabase, router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Користувач не авторизований');

            // Перевіряємо API ключ, спробувавши отримати відправників
            // Спочатку зберігаємо тимчасово, потім тестуємо
            const { error: tempUpsertError } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    nova_poshta_api_key: apiKey,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                });

            if (tempUpsertError) throw tempUpsertError;

            // Тестуємо API ключ
            const testResponse = await fetch('/api/nova-poshta/counterparties?counterpartyProperty=Sender');
            const testData = await testResponse.json();
            
            if (!testData.success) {
                // Видаляємо невалідний ключ
                await supabase
                    .from('user_settings')
                    .update({ nova_poshta_api_key: null })
                    .eq('user_id', user.id);
                    
                throw new Error(testData.error || 'Невірний API ключ. Перевірте правильність введення.');
            }

            // API ключ вже збережено вище при тестуванні

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
        } catch (err) {
            console.error('Error saving API key:', err);
            setError(err instanceof Error ? err.message : 'Помилка при збереженні API ключа');
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Профіль</h1>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        >
                            Назад до дашборду
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">Налаштування</h2>

                    <form onSubmit={handleSave} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md border border-red-200 dark:border-red-700">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md border border-green-200 dark:border-green-700">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-green-800 dark:text-green-200">API ключ успішно збережено!</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                API ключ Нової Пошти
                            </label>
                            <input
                                type="password"
                                id="apiKey"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                required
                                placeholder="Введіть ваш API ключ"
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                            />
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                API ключ можна отримати в{' '}
                                <a
                                    href="https://new.novaposhta.ua/dashboard/settings/developers"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                                >
                                    особистому кабінеті Нової Пошти
                                </a>
                                {' '}(залогініться, перейдіть в Налаштування → Безпека → Створити API ключ)
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Збереження...' : 'Зберегти'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleSignOut}
                            className="w-full px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
                        >
                            Вийти з акаунту
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

