'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Modal from './Modal';
import SenderForm from './SenderForm';

interface Sender {
    id: string;
    name: string;
    phone: string;
    city_name: string;
    sender_address_name: string;
    created_at: string;
}

export default function SendersList() {
    const [senders, setSenders] = useState<Sender[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const supabase = createClientComponentClient();

    const fetchSenders = async () => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error('Необхідна авторизація');
            }

            const { data, error: fetchError } = await supabase
                .from('sender')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            setSenders(data || []);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Помилка при завантаженні відправників');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSenders();

        // Підписуємось на зміни в таблиці sender
        const channel = supabase
            .channel('sender_changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'sender' 
                }, 
                () => {
                    fetchSenders();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
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
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Відправники</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Додати відправника
                </button>
            </div>

            {senders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Немає відправників</p>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {senders.map((sender) => (
                            <li key={sender.id}>
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-blue-600 truncate">
                                                {sender.name}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {sender.city_name}, {sender.sender_address_name}
                                            </p>
                                        </div>
                                        <div className="ml-4 flex-shrink-0">
                                            <p className="text-sm text-gray-500">
                                                {sender.phone}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Додати відправника"
            >
                <SenderForm
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchSenders();
                    }}
                    onCancel={() => setShowAddModal(false)}
                />
            </Modal>
        </div>
    );
} 