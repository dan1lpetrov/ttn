'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Modal from './Modal';
import AddClientForm from './AddClientForm';
import { useTTN } from '../contexts/TTNContext';

interface Client {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    city_name: string;
    warehouse_name: string;
    created_at: string;
}

export default function ClientsList() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const { selectedClientId, setSelectedClientId } = useTTN();
    const supabase = createClientComponentClient();

    const fetchClients = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (err) {
            console.error('Error fetching clients:', err);
            setError('Помилка при завантаженні клієнтів');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Завантаження...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
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
        );
    }

    return (
        <>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Клієнти</h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                    + Додати
                </button>
            </div>
            {clients.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>Немає клієнтів</p>
                    <p className="text-sm">Додайте першого клієнта</p>
                </div>
            ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(clients.length, 4)}, 1fr)` }}>
                    {clients.map(client => (
                        <div
                            key={client.id}
                            onClick={() => setSelectedClientId(client.id)}
                            className={`px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                                selectedClientId === client.id
                                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900'
                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                        >
                            <div className={`font-medium break-words ${selectedClientId === client.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                {client.first_name} {client.last_name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 break-words">{client.phone}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                                {client.city_name} - {client.warehouse_name}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Додати клієнта"
            >
                <AddClientForm
                    onSuccess={async () => {
                        setShowAddModal(false);
                        await fetchClients();
                        // Після оновлення списку, вибираємо останнього доданого клієнта
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const { data: latestClient } = await supabase
                                .from('clients')
                                .select('id')
                                .eq('user_id', user.id)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .single();
                            if (latestClient) {
                                setSelectedClientId(latestClient.id);
                            }
                        }
                    }}
                    onCancel={() => setShowAddModal(false)}
                />
            </Modal>
        </>
    );
}

