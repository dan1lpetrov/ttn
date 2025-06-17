'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface SenderFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function SenderForm({ onSuccess, onCancel }: SenderFormProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cityRef, setCityRef] = useState('');
    const [cityName, setCityName] = useState('');
    const [senderRef, setSenderRef] = useState('');
    const [senderAddressRef, setSenderAddressRef] = useState('');
    const [senderAddressName, setSenderAddressName] = useState('');
    const [contactSenderRef, setContactSenderRef] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const supabase = createClientComponentClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error('Необхідна авторизація');
            }

            const { error: insertError } = await supabase
                .from('sender')
                .insert([
                    {
                        user_id: user.id,
                        name,
                        phone,
                        city_ref: cityRef,
                        city_name: cityName,
                        sender_ref: senderRef,
                        sender_address_ref: senderAddressRef,
                        sender_address_name: senderAddressName,
                        contact_sender_ref: contactSenderRef
                    }
                ]);

            if (insertError) {
                throw new Error(insertError.message);
            }

            setSuccess('Відправника успішно додано');
            setName('');
            setPhone('');
            setCityRef('');
            setCityName('');
            setSenderRef('');
            setSenderAddressRef('');
            setSenderAddressName('');
            setContactSenderRef('');
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Помилка при додаванні відправника');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Додати відправника</h2>
            
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Назва відправника
                </label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Телефон
                </label>
                <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="cityRef" className="block text-sm font-medium text-gray-700">
                    Реф міста
                </label>
                <input
                    type="text"
                    id="cityRef"
                    value={cityRef}
                    onChange={(e) => setCityRef(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="cityName" className="block text-sm font-medium text-gray-700">
                    Назва міста
                </label>
                <input
                    type="text"
                    id="cityName"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="senderRef" className="block text-sm font-medium text-gray-700">
                    Реф відправника
                </label>
                <input
                    type="text"
                    id="senderRef"
                    value={senderRef}
                    onChange={(e) => setSenderRef(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="senderAddressRef" className="block text-sm font-medium text-gray-700">
                    Реф адреси відправника
                </label>
                <input
                    type="text"
                    id="senderAddressRef"
                    value={senderAddressRef}
                    onChange={(e) => setSenderAddressRef(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="senderAddressName" className="block text-sm font-medium text-gray-700">
                    Назва адреси відправника
                </label>
                <input
                    type="text"
                    id="senderAddressName"
                    value={senderAddressName}
                    onChange={(e) => setSenderAddressName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="contactSenderRef" className="block text-sm font-medium text-gray-700">
                    Реф контактної особи
                </label>
                <input
                    type="text"
                    id="contactSenderRef"
                    value={contactSenderRef}
                    onChange={(e) => setContactSenderRef(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">{error}</h3>
                        </div>
                    </div>
                </div>
            )}

            {success && (
                <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-green-800">{success}</h3>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end space-x-3">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Скасувати
                    </button>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {loading ? 'Збереження...' : 'Зберегти'}
                </button>
            </div>
        </form>
    );
} 