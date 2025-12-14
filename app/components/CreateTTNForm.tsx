'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useTTN } from '../contexts/TTNContext';

interface CreateTTNFormProps {
    onSuccess?: () => void;
}

export default function CreateTTNForm({ onSuccess }: CreateTTNFormProps) {
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [ttnNumber, setTtnNumber] = useState<string | null>(null);
    const { selectedSenderId, selectedClientLocationId } = useTTN();
    const supabase = createClientComponentClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setTtnNumber(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Користувач не авторизований');

            if (!selectedClientLocationId || !selectedSenderId) {
                throw new Error('Виберіть локацію клієнта та відправника');
            }

            const response = await fetch('/api/ttn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientLocationId: selectedClientLocationId,
                    senderId: selectedSenderId,
                    description,
                    cost: parseFloat(cost),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                const errorMessage = error.error || error.message || 'Помилка при створенні ТТН';
                const errorDetails = error.details ? ` (${error.details})` : '';
                throw new Error(`${errorMessage}${errorDetails}`);
            }

            const result = await response.json();
            const newTtnNumber = result.nova_poshta_number || result.int_doc_number || null;
            
            setDescription('');
            setCost('');
            setSuccessMessage('ТТН успішно створена!');
            setTtnNumber(newTtnNumber);
            
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error creating TTN:', error);
            setError(error instanceof Error ? error.message : 'Помилка при створенні ТТН');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md border border-green-200 dark:border-green-700">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                                {successMessage}
                                {ttnNumber && (
                                    <span className="ml-2">
                                        Номер:{' '}
                                        <a
                                            href={`https://novaposhta.ua/tracking/${ttnNumber}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 underline font-semibold"
                                        >
                                            {ttnNumber}
                                        </a>
                                    </span>
                                )}
                            </h3>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md">
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

            {(!selectedSenderId || !selectedClientLocationId) && (
                <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {!selectedSenderId && !selectedClientLocationId 
                            ? 'Виберіть відправника та локацію клієнта вище'
                            : !selectedSenderId 
                            ? 'Виберіть відправника вище'
                            : 'Виберіть локацію клієнта вище'
                        }
                    </p>
                </div>
            )}

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Опис вантажу *
                </label>
                <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    required
                    placeholder="Опишіть вантаж"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                    {['Одяг', 'Взуття', 'Особисті речі'].map(item => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setDescription(item)}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Вартість (грн) *
                </label>
                <input
                    type="number"
                    id="cost"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                    {['200', '500', '1000', '5000'].map(costValue => (
                        <button
                            key={costValue}
                            type="button"
                            onClick={() => setCost(costValue)}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            {costValue} грн
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex space-x-3">
                <button
                    type="submit"
                    disabled={loading || !selectedSenderId || !selectedClientLocationId}
                    className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                        loading || !selectedSenderId || !selectedClientLocationId
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600'
                    }`}
                >
                    {loading ? 'Створення...' : 'Створити ТТН'}
                </button>
            </div>
        </form>
    );
} 