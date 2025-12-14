'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AddClientFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

// Додаємо функцію для форматування телефону
const formatPhoneNumber = (phone: string): string => {
    // Видаляємо всі символи крім цифр
    const cleaned = phone.replace(/\D/g, '');
    
    // Якщо номер починається з 380, залишаємо як є
    if (cleaned.startsWith('380')) {
        return cleaned;
    }
    
    // Якщо номер починається з 0, замінюємо на 380
    if (cleaned.startsWith('0')) {
        return '380' + cleaned.slice(1);
    }
    
    // Якщо номер починається з 8, замінюємо на 380
    if (cleaned.startsWith('8')) {
        return '380' + cleaned.slice(1);
    }
    
    // Якщо номер починається з +380, видаляємо +
    if (cleaned.startsWith('380')) {
        return cleaned;
    }
    
    // В інших випадках додаємо 380 на початок
    return '380' + cleaned;
};

// Функція для перевірки кирилиці
const isCyrillic = (text: string): boolean => {
    return /^[\u0400-\u04FF\s]+$/.test(text);
};

// Функція для створення контакту в Новій Пошті
async function createNovaPoshtaContact(firstName: string, lastName: string, phone: string) {
    console.log('Creating Nova Poshta contact with data:', { firstName, lastName, phone });
    
    const response = await fetch('/api/nova-poshta/counterparty', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, phone }),
    });

    const data = await response.json();
    console.log('Nova Poshta contact response:', data);

    if (!data.success) {
        throw new Error(data.error);
    }

    return data.data;
}

// Функція для створення контрагента в Новій Пошті
async function createNovaPoshtaCounterparty(firstName: string, lastName: string, phone: string) {
    console.log('Creating Nova Poshta counterparty with data:', { firstName, lastName, phone });
    
    const response = await fetch('/api/nova-poshta/counterparty', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, phone }),
    });

    const data = await response.json();
    console.log('Nova Poshta counterparty response:', data);

    if (!data.success) {
        throw new Error(data.error);
    }

    return data.data;
}

export default function AddClientForm({ onSuccess, onCancel }: AddClientFormProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Перевіряємо кирилицю для імені та прізвища
            if (!isCyrillic(firstName)) {
                throw new Error('Ім&apos;я має містити тільки українські літери');
            }
            if (!isCyrillic(lastName)) {
                throw new Error('Прізвище має містити тільки українські літери');
            }

            // Форматуємо телефон
            const formattedPhone = formatPhoneNumber(phone);
            
            // Перевіряємо довжину телефону
            if (formattedPhone.length !== 12) {
                throw new Error('Номер телефону має містити 12 цифр');
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            console.log('Creating Nova Poshta entities...');
            
            // Створюємо контакт та контрагента в Новій Пошті
            const contact = await createNovaPoshtaContact(firstName, lastName, formattedPhone);
            console.log('Contact created:', contact);
            
            const counterparty = await createNovaPoshtaCounterparty(firstName, lastName, formattedPhone);
            console.log('Counterparty created:', counterparty);

            console.log('Saving client to database with refs:', {
                contact_ref: contact.ContactRef || contact.Ref,
                counterparty_ref: counterparty.Ref,
                contact_full: contact,
                counterparty_full: counterparty
            });

            // Створюємо клієнта (без локації)
            const { error: insertClientError } = await supabase
                .from('clients')
                .insert([
                    {
                        first_name: firstName,
                        last_name: lastName,
                        phone: formattedPhone,
                        user_id: user.id,
                        contact_ref: contact.ContactRef || contact.Ref,
                        counterparty_ref: counterparty.Ref
                    }
                ]);

            if (insertClientError) {
                console.error('Error inserting client:', insertClientError);
                throw insertClientError;
            }

            setFirstName('');
            setLastName('');
            setPhone('');
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Error adding client:', err);
            setError(err instanceof Error ? err.message : 'Помилка при додаванні клієнта');
        } finally {
            setLoading(false);
        }
    };

    // Додаємо обробник зміни телефону
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPhone(value);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                    Ім&apos;я
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    pattern="[\u0400-\u04FF\s]+"
                                    title="Введіть тільки українські літери"
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                    Прізвище
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    pattern="[\u0400-\u04FF\s]+"
                                    title="Введіть тільки українські літери"
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                Телефон
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                value={phone}
                                onChange={handlePhoneChange}
                                required
                                placeholder="+380XXXXXXXXX"
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                            />
                        </div>
                        <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            {onCancel && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Скасувати
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`${onCancel ? 'flex-1' : 'w-full'} py-2 px-3 rounded-lg transition-colors ${
                                    loading
                                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                }`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Збереження...
                                    </div>
                                ) : (
                                    'Зберегти'
                                )}
                            </button>
                        </div>
                    </form>
    );
} 