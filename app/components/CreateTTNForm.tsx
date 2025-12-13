'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface CreateTTNFormProps {
    onSuccess?: () => void;
}

interface Client {
    id: string;
    first_name: string;
    last_name: string;
    city_name: string;
    warehouse_name: string;
}

interface Sender {
    id: string;
    name: string;
    city_name: string;
    sender_address_name: string;
}

export default function CreateTTNForm({ onSuccess }: CreateTTNFormProps) {
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState('');
    const [clientId, setClientId] = useState('');
    const [senderId, setSenderId] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [senders, setSenders] = useState<Sender[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Завантажуємо клієнтів
                const { data: clientsData } = await supabase
                    .from('clients')
                    .select('id, first_name, last_name, city_name, warehouse_name')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                // Завантажуємо відправників
                const { data: sendersData } = await supabase
                    .from('sender')
                    .select('id, name, city_name, sender_address_name')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                setClients(clientsData || []);
                setSenders(sendersData || []);
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };

        fetchData();
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Користувач не авторизований');

            if (!clientId || !senderId) {
                throw new Error('Виберіть клієнта та відправника');
            }

            const response = await fetch('/api/ttn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId,
                    senderId,
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

            setDescription('');
            setCost('');
            setClientId('');
            setSenderId('');
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
            {error && (
                <div className="bg-red-50 p-4 rounded-md">
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

            <div>
                <label htmlFor="sender" className="block text-sm font-medium text-gray-700 mb-2">
                    Відправник
                </label>
                <select
                    id="sender"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                    required
                >
                    <option value="">Виберіть відправника</option>
                    {senders.map((sender) => (
                        <option key={sender.id} value={sender.id}>
                            {sender.name} - {sender.city_name}, {sender.sender_address_name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-2">
                    Отримувач (клієнт)
                </label>
                <select
                    id="client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                    required
                >
                    <option value="">Виберіть клієнта</option>
                    {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} - {client.city_name}, {client.warehouse_name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Опис вантажу
                </label>
                <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                    required
                    placeholder="Опишіть вантаж"
                />
            </div>

            <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-2">
                    Вартість (грн)
                </label>
                <input
                    type="number"
                    id="cost"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                />
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {loading ? 'Створення...' : 'Створити ТТН'}
                </button>
            </div>
        </form>
    );
} 