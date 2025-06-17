'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface City {
    Ref: string;
    Description: string;
}

interface Warehouse {
    Ref: string;
    Description: string;
}

interface AddClientFormProps {
    onSuccess?: () => void;
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

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const API_KEY = process.env.NOVA_POSHTA_API_KEY;

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

export default function AddClientForm({ onSuccess }: AddClientFormProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [cities, setCities] = useState<City[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [warehouseSearch, setWarehouseSearch] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCityLoading, setIsCityLoading] = useState(false);
    const [isWarehouseLoading, setIsWarehouseLoading] = useState(false);
    const [cityError, setCityError] = useState<string | null>(null);
    const [warehouseError, setWarehouseError] = useState<string | null>(null);
    const cityDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseDropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
                setShowCityDropdown(false);
            }
            if (warehouseDropdownRef.current && !warehouseDropdownRef.current.contains(event.target as Node)) {
                setShowWarehouseDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCities = async (search: string) => {
        if (search.length < 2) {
            setShowCityDropdown(false);
            return;
        }

        setIsCityLoading(true);
        setCityError(null);

        try {
            const response = await fetch(`/api/nova-poshta/cities?search=${encodeURIComponent(search)}`);
            if (!response.ok) {
                throw new Error('Помилка при пошуку міст');
            }
            const data = await response.json();
            if (data.success) {
                setCities(data.data);
                setShowCityDropdown(true);
            } else {
                throw new Error(data.error || 'Помилка при пошуку міст');
            }
        } catch (err) {
            console.error('Error fetching cities:', err);
            setCityError('Помилка при пошуку міст. Спробуйте ще раз.');
            setShowCityDropdown(false);
        } finally {
            setIsCityLoading(false);
        }
    };

    const fetchWarehouses = async (search: string) => {
        if (!selectedCity) return;

        setIsWarehouseLoading(true);
        setWarehouseError(null);

        try {
            const response = await fetch(`/api/nova-poshta/warehouses?cityRef=${selectedCity}&search=${encodeURIComponent(search)}`);
            if (!response.ok) {
                throw new Error('Помилка при пошуку відділень');
            }
            const data = await response.json();
            if (data.success) {
                setWarehouses(data.data);
                setShowWarehouseDropdown(true);
            } else {
                throw new Error(data.error || 'Помилка при пошуку відділень');
            }
        } catch (err) {
            console.error('Error fetching warehouses:', err);
            setWarehouseError('Помилка при пошуку відділень. Спробуйте ще раз.');
            setShowWarehouseDropdown(false);
        } finally {
            setIsWarehouseLoading(false);
        }
    };

    const handleCitySelect = (city: City) => {
        setSelectedCity(city.Ref);
        setCitySearch(city.Description);
        setShowCityDropdown(false);
        setWarehouseSearch('');
        setSelectedWarehouse('');
        fetchWarehouses('');
    };

    const handleWarehouseSelect = (warehouse: Warehouse) => {
        setSelectedWarehouse(warehouse.Ref);
        setWarehouseSearch(warehouse.Description);
        setShowWarehouseDropdown(false);
    };

    const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCitySearch(value);
        if (value.length >= 2) {
            const timeoutId = setTimeout(() => fetchCities(value), 300);
            return () => clearTimeout(timeoutId);
        } else {
            setShowCityDropdown(false);
        }
    };

    const handleWarehouseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setWarehouseSearch(value);
        if (selectedCity) {
            const timeoutId = setTimeout(() => fetchWarehouses(value), 300);
            return () => clearTimeout(timeoutId);
        }
    };

    const handleWarehouseInputFocus = () => {
        if (selectedCity) {
            fetchWarehouses(warehouseSearch);
        }
    };

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

            const selectedCityData = cities.find(city => city.Ref === selectedCity);
            const selectedWarehouseData = warehouses.find(warehouse => warehouse.Ref === selectedWarehouse);

            console.log('Creating Nova Poshta entities...');
            
            // Створюємо контакт та контрагента в Новій Пошті
            const contact = await createNovaPoshtaContact(firstName, lastName, formattedPhone);
            console.log('Contact created:', contact);
            
            const counterparty = await createNovaPoshtaCounterparty(firstName, lastName, formattedPhone);
            console.log('Counterparty created:', counterparty);

            console.log('Saving client to database with refs:', {
                contact_ref: contact.Ref,
                counterparty_ref: counterparty.Ref
            });

            const { error: insertError } = await supabase
                .from('clients')
                .insert([
                    {
                        first_name: firstName,
                        last_name: lastName,
                        phone: formattedPhone,
                        city_ref: selectedCity,
                        city_name: selectedCityData?.Description,
                        warehouse_ref: selectedWarehouse,
                        warehouse_desc: selectedWarehouseData?.Description,
                        user_id: user.id,
                        contact_ref: contact.Ref,
                        counterparty_ref: counterparty.Ref
                    }
                ]);

            if (insertError) {
                console.error('Error inserting client:', insertError);
                throw insertError;
            }

            setFirstName('');
            setLastName('');
            setPhone('');
            setCitySearch('');
            setWarehouseSearch('');
            setSelectedCity('');
            setSelectedWarehouse('');
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
        <div className="max-w-2xl mx-auto">
            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-6 py-8">
                    <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-6">
                        Додати нового клієнта
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
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
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
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
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                Телефон
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                value={phone}
                                onChange={handlePhoneChange}
                                required
                                placeholder="+380XXXXXXXXX"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                            />
                        </div>
                        <div className="relative" ref={cityDropdownRef}>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                                Місто
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="city"
                                    value={citySearch}
                                    onChange={handleCityInputChange}
                                    required
                                    placeholder="Введіть мінімум 2 літери для пошуку"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                                />
                                {isCityLoading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                    </div>
                                )}
                            </div>
                            {cityError && (
                                <p className="mt-2 text-sm text-red-600">{cityError}</p>
                            )}
                            {showCityDropdown && cities.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                                    {cities.map((city) => (
                                        <div
                                            key={city.Ref}
                                            className="cursor-pointer select-none relative py-2 pl-4 pr-9 hover:bg-blue-50"
                                            onClick={() => handleCitySelect(city)}
                                        >
                                            <span className="block truncate">{city.Description}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative" ref={warehouseDropdownRef}>
                            <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 mb-2">
                                Відділення
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="warehouse"
                                    value={warehouseSearch}
                                    onChange={handleWarehouseInputChange}
                                    onFocus={handleWarehouseInputFocus}
                                    required
                                    disabled={!selectedCity}
                                    placeholder={selectedCity ? "Введіть назву відділення" : "Спочатку виберіть місто"}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 disabled:bg-gray-100"
                                />
                                {isWarehouseLoading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                    </div>
                                )}
                            </div>
                            {warehouseError && (
                                <p className="mt-2 text-sm text-red-600">{warehouseError}</p>
                            )}
                            {showWarehouseDropdown && warehouses.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                                    {warehouses.map((warehouse) => (
                                        <div
                                            key={warehouse.Ref}
                                            className="cursor-pointer select-none relative py-2 pl-4 pr-9 hover:bg-blue-50"
                                            onClick={() => handleWarehouseSelect(warehouse)}
                                        >
                                            <span className="block truncate">{warehouse.Description}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    'Додати клієнта'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 