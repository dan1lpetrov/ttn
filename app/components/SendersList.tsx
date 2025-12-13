'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Modal from './Modal';
import SenderForm from './SenderForm';
import EditSenderLocationModal from './EditSenderLocationModal';
import { useTTN } from '../contexts/TTNContext';

interface Sender {
    id: string;
    name: string;
    phone: string;
    city_name: string;
    sender_address_name: string;
    sender_ref: string;
    created_at: string;
}

export default function SendersList() {
    const [senders, setSenders] = useState<Sender[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSenderId, setEditingSenderId] = useState<string | null>(null);
    const [editingSender, setEditingSender] = useState<Sender | null>(null);
    const [visibleCount, setVisibleCount] = useState(8);
    const { selectedSenderId, setSelectedSenderId } = useTTN();
    const supabase = createClientComponentClient();

    const fetchSenders = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Отримуємо унікальних відправників (по sender_ref)
            const { data, error } = await supabase
                .from('sender')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Групуємо по sender_ref, беремо останній запис для кожного відправника
            const sendersMap = new Map<string, Sender>();
            (data || []).forEach((sender: any) => {
                const key = sender.sender_ref;
                if (!sendersMap.has(key) || new Date(sender.updated_at) > new Date(sendersMap.get(key)!.created_at)) {
                    sendersMap.set(key, sender);
                }
            });
            
            const sendersData = Array.from(sendersMap.values());
            setSenders(sendersData);
            
            // Автоматично вибираємо першого відправника, якщо є
            if (sendersData.length > 0 && !selectedSenderId) {
                setSelectedSenderId(sendersData[0].id);
            }
        } catch (err) {
            console.error('Error fetching senders:', err);
            setError('Помилка при завантаженні відправників');
        } finally {
            setLoading(false);
        }
    }, [supabase, selectedSenderId, setSelectedSenderId]);

    useEffect(() => {
        fetchSenders();
    }, [fetchSenders]);

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

    const visibleSenders = senders.slice(0, visibleCount);
    const hasMore = senders.length > visibleCount;

    const handleSenderClick = (sender: Sender) => {
        setSelectedSenderId(sender.id);
        setEditingSender(sender);
        setEditingSenderId(sender.id);
    };

    const handleShowMore = () => {
        setVisibleCount(prev => Math.min(prev + 8, senders.length));
    };

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {visibleSenders.map((sender) => (
                    <div
                        key={sender.id}
                        onClick={() => handleSenderClick(sender)}
                        className={`px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                            selectedSenderId === sender.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <div className="text-sm font-medium truncate">{sender.name}</div>
                    </div>
                ))}
                {hasMore && (
                    <button
                        onClick={handleShowMore}
                        className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm"
                    >
                        Показати ще
                    </button>
                )}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm"
                >
                    + Додати
                </button>
            </div>

            {senders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>Немає відправників</p>
                    <p className="text-sm">Додайте першого відправника</p>
                </div>
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Додати відправника"
            >
                <SenderForm
                    onSuccess={async () => {
                        setShowAddModal(false);
                        await fetchSenders();
                        // Після оновлення списку, вибираємо останнього доданого відправника
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const { data: latestSender } = await supabase
                                .from('sender')
                                .select('id')
                                .eq('user_id', user.id)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .single();
                            if (latestSender) {
                                setSelectedSenderId(latestSender.id);
                            }
                        }
                    }}
                    onCancel={() => setShowAddModal(false)}
                />
            </Modal>

            {editingSender && (
                <EditSenderLocationModal
                    isOpen={editingSenderId !== null}
                    onClose={() => {
                        setEditingSenderId(null);
                        setEditingSender(null);
                    }}
                    senderRef={editingSender.sender_ref}
                    currentCityName={editingSender.city_name}
                    currentWarehouseName={editingSender.sender_address_name}
                    onSuccess={async () => {
                        await fetchSenders();
                        setEditingSenderId(null);
                        setEditingSender(null);
                    }}
                />
            )}
        </>
    );
} 