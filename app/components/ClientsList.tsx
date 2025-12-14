'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AddClientForm from './AddClientForm';
import { useTTN } from '../contexts/TTNContext';

interface Client {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    created_at: string;
}

interface ClientLocation {
    id: string;
    city_name: string;
    warehouse_name: string;
    city_ref: string;
    warehouse_ref: string;
}

interface City {
    Ref: string;
    Description: string;
}

interface Warehouse {
    Ref: string;
    Description: string;
}

export default function ClientsList() {
    const [clients, setClients] = useState<Client[]>([]);
    const [clientLocations, setClientLocations] = useState<Map<string, ClientLocation[]>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addingClient, setAddingClient] = useState(false);
    const [visibleLocationsCount, setVisibleLocationsCount] = useState<Map<string, number>>(new Map());
    const { selectedClientId, selectedClientLocationId, setSelectedClientId, setSelectedClientLocationId } = useTTN();
    const supabase = createClientComponentClient();

    // Стани для додавання нової локації клієнта
    const [addingLocation, setAddingLocation] = useState(false);
    const [newCitySearch, setNewCitySearch] = useState('');
    const [newWarehouseSearch, setNewWarehouseSearch] = useState('');
    const [newCities, setNewCities] = useState<City[]>([]);
    const [newWarehouses, setNewWarehouses] = useState<Warehouse[]>([]);
    const [selectedNewCity, setSelectedNewCity] = useState('');
    const [selectedNewWarehouse, setSelectedNewWarehouse] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
    const [isCityLoading, setIsCityLoading] = useState(false);
    const [isWarehouseLoading, setIsWarehouseLoading] = useState(false);
    const [popularCities, setPopularCities] = useState<City[]>([]);
    const [loadingPopularCities, setLoadingPopularCities] = useState(false);
    const cityDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseInputRef = useRef<HTMLInputElement>(null);

    // Завантажуємо популярні міста при монтуванні
    useEffect(() => {
        const loadPopularCities = async () => {
            setLoadingPopularCities(true);
            const popularCityNames = ['Київ', 'Харків', 'Львів', 'Дніпро', 'Запоріжжя'];
            const cities: City[] = [];

            for (const cityName of popularCityNames) {
                try {
                    const response = await fetch(`/api/nova-poshta/cities?search=${encodeURIComponent(cityName)}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data && data.data.length > 0) {
                            // Знаходимо точний збіг (місто, а не село/селище)
                            const exactMatch = data.data.find((c: City) => 
                                c.Description === cityName || 
                                c.Description.startsWith(cityName + ',')
                            );
                            if (exactMatch) {
                                cities.push(exactMatch);
                            } else if (data.data[0]) {
                                cities.push(data.data[0]);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Error loading popular city ${cityName}:`, err);
                }
            }

            setPopularCities(cities);
            setLoadingPopularCities(false);
        };

        loadPopularCities();
    }, []);

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

            // Завантажуємо локації для всіх клієнтів
            if (data && data.length > 0) {
                const clientIds = data.map(c => c.id);
                const { data: locationsData, error: locationsError } = await supabase
                    .from('client_locations')
                    .select('*')
                    .in('client_id', clientIds)
                    .order('created_at', { ascending: false });

                if (locationsError) throw locationsError;

                const locationsMap = new Map<string, ClientLocation[]>();
                (locationsData || []).forEach((loc: any) => {
                    if (!locationsMap.has(loc.client_id)) {
                        locationsMap.set(loc.client_id, []);
                    }
                    locationsMap.get(loc.client_id)!.push({
                        id: loc.id,
                        city_name: loc.city_name,
                        warehouse_name: loc.warehouse_name,
                        city_ref: loc.city_ref,
                        warehouse_ref: loc.warehouse_ref,
                    });
                });
                setClientLocations(locationsMap);

                // Автоматично вибираємо першого клієнта та першу локацію, якщо нічого не вибрано
                if (!selectedClientId && data.length > 0) {
                    const firstClient = data[0];
                    setSelectedClientId(firstClient.id);
                    const firstClientLocations = locationsMap.get(firstClient.id);
                    if (firstClientLocations && firstClientLocations.length > 0) {
                        setSelectedClientLocationId(firstClientLocations[0].id);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching clients:', err);
            setError('Помилка при завантаженні клієнтів');
        } finally {
            setLoading(false);
        }
    }, [supabase, selectedClientId, setSelectedClientId, setSelectedClientLocationId]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleClientSelect = (clientId: string) => {
        setSelectedClientId(clientId);
        const locations = clientLocations.get(clientId);
        if (locations && locations.length > 0) {
            // Вибираємо першу локацію або поточну, якщо вона належить цьому клієнту
            const currentLocation = locations.find(loc => loc.id === selectedClientLocationId);
            setSelectedClientLocationId(currentLocation ? currentLocation.id : locations[0].id);
        } else {
            setSelectedClientLocationId(null);
        }
    };

    const handleLocationSelect = (locationId: string) => {
        setSelectedClientLocationId(locationId);
    };

    const handleDeleteLocation = async (locationId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Запобігаємо вибору локації при кліку на кнопку видалення
        
        if (!confirm('Ви впевнені, що хочете видалити цю локацію?')) {
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { error } = await supabase
                .from('client_locations')
                .delete()
                .eq('id', locationId);

            if (error) throw error;

            // Оновлюємо список клієнтів та локацій
            await fetchClients();
            
            // Якщо видалена локація була вибрана, скидаємо вибір
            if (selectedClientLocationId === locationId) {
                setSelectedClientLocationId(null);
            }
        } catch (err) {
            console.error('Error deleting location:', err);
            alert('Помилка при видаленні локації');
        }
    };

    const handleDeleteClient = async (clientId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Запобігаємо вибору клієнта при кліку на кнопку видалення
        
        if (!confirm('Ви впевнені, що хочете видалити цього клієнта? Всі його локації також будуть видалені.')) {
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId)
                .eq('user_id', user.id);

            if (error) throw error;

            // Оновлюємо список клієнтів
            await fetchClients();
            
            // Якщо видалений клієнт був вибраний, скидаємо вибір
            if (selectedClientId === clientId) {
                setSelectedClientId(null);
                setSelectedClientLocationId(null);
            }
        } catch (err) {
            console.error('Error deleting client:', err);
            alert('Помилка при видаленні клієнта');
        }
    };

    // Обробка кліку поза дропдаунами
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
        try {
            const response = await fetch(`/api/nova-poshta/cities?search=${encodeURIComponent(search)}`);
            if (!response.ok) {
                throw new Error('Помилка при пошуку міст');
            }
            const data = await response.json();
            if (data.success) {
                const uniqueCities = data.data.filter((city: City, index: number, self: City[]) => 
                    index === self.findIndex((c: City) => c.Ref === city.Ref)
                );
                setNewCities(uniqueCities);
                setShowCityDropdown(true);
            }
        } catch (err) {
            console.error('Error fetching cities:', err);
        } finally {
            setIsCityLoading(false);
        }
    };

    const fetchWarehouses = async (search: string) => {
        if (!selectedNewCity) return;

        setIsWarehouseLoading(true);
        try {
            const response = await fetch(`/api/nova-poshta/warehouses?cityRef=${selectedNewCity}&search=${encodeURIComponent(search)}`);
            if (!response.ok) {
                throw new Error('Помилка при пошуку відділень');
            }
            const data = await response.json();
            if (data.success) {
                const uniqueWarehouses = data.data.filter((warehouse: Warehouse, index: number, self: Warehouse[]) => 
                    index === self.findIndex((w: Warehouse) => w.Ref === warehouse.Ref)
                );
                setNewWarehouses(uniqueWarehouses);
                setShowWarehouseDropdown(true);
            }
        } catch (err) {
            console.error('Error fetching warehouses:', err);
        } finally {
            setIsWarehouseLoading(false);
        }
    };

    const handleCitySelect = (city: City) => {
        setSelectedNewCity(city.Ref);
        setNewCitySearch(city.Description);
        setShowCityDropdown(false);
        setNewWarehouseSearch('');
        setSelectedNewWarehouse('');
        setNewWarehouses([]);
        // Додаємо вибране місто до списку, якщо його там немає
        if (!newCities.find(c => c.Ref === city.Ref)) {
            setNewCities([city, ...newCities]);
        }
    };

    const handleWarehouseSelect = (warehouse: Warehouse) => {
        setSelectedNewWarehouse(warehouse.Ref);
        setNewWarehouseSearch(warehouse.Description);
        setShowWarehouseDropdown(false);
    };

    const handleAddLocation = async () => {
        if (!selectedNewCity || !selectedNewWarehouse || !selectedClientId) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Шукаємо місто в newCities або popularCities
            let selectedCityData = newCities.find(c => c.Ref === selectedNewCity);
            if (!selectedCityData) {
                selectedCityData = popularCities.find(c => c.Ref === selectedNewCity);
            }
            
            const selectedWarehouseData = newWarehouses.find(w => w.Ref === selectedNewWarehouse);

            if (!selectedCityData) {
                throw new Error('Місто не вибрано');
            }
            if (!selectedWarehouseData) {
                throw new Error('Відділення не вибрано');
            }

            // Перевіряємо, чи вже є така локація
            const existingLocations = clientLocations.get(selectedClientId) || [];
            const existingLocation = existingLocations.find(
                loc => loc.city_ref === selectedNewCity && loc.warehouse_ref === selectedNewWarehouse
            );

            if (existingLocation) {
                setSelectedClientLocationId(existingLocation.id);
                setAddingLocation(false);
                setNewCitySearch('');
                setNewWarehouseSearch('');
                setSelectedNewCity('');
                setSelectedNewWarehouse('');
                return;
            }

            // Додаємо нову локацію в БД
            const { data, error } = await supabase
                .from('client_locations')
                .insert({
                    client_id: selectedClientId,
                    city_ref: selectedNewCity,
                    city_name: selectedCityData.Description,
                    warehouse_ref: selectedNewWarehouse,
                    warehouse_name: selectedWarehouseData.Description,
                })
                .select()
                .single();

            if (error) throw error;

            // Оновлюємо список локацій
            await fetchClients();
            
            // Вибираємо нову локацію
            if (data) {
                setSelectedClientLocationId(data.id);
            }

            setAddingLocation(false);
            setNewCitySearch('');
            setNewWarehouseSearch('');
            setSelectedNewCity('');
            setSelectedNewWarehouse('');
        } catch (err) {
            console.error('Error adding location:', err);
            alert('Помилка при додаванні локації');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Завантаження...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
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
        );
    }

    return (
        <>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Клієнти</h3>
                <button
                    onClick={() => setAddingClient(!addingClient)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                    {addingClient ? 'Скасувати' : '+ Додати'}
                </button>
            </div>

            {/* Форма додавання клієнта */}
            {addingClient && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <AddClientForm
                        onSuccess={async () => {
                            setAddingClient(false);
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
                                    // Завантажуємо локації для нового клієнта
                                    const { data: locations } = await supabase
                                        .from('client_locations')
                                        .select('*')
                                        .eq('client_id', latestClient.id)
                                        .order('created_at', { ascending: false })
                                        .limit(1)
                                        .single();
                                    if (locations) {
                                        setSelectedClientLocationId(locations.id);
                                    }
                                }
                            }
                        }}
                        onCancel={() => setAddingClient(false)}
                    />
                </div>
            )}

            {clients.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>Немає клієнтів</p>
                    <p className="text-sm">Додайте першого клієнта</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Список клієнтів */}
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="flex sm:grid gap-3 sm:gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(clients.length, 4)}, 1fr)` }}>
                            {clients.map(client => {
                            const locations = clientLocations.get(client.id) || [];
                            return (
                                <div key={client.id} className="flex-shrink-0 min-w-[200px] max-w-[250px] sm:min-w-0 sm:max-w-none">
                                    <div
                                        onClick={() => handleClientSelect(client.id)}
                                        className={`px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors relative ${
                                            selectedClientId === client.id
                                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900'
                                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                    >
                                        <button
                                            onClick={(e) => handleDeleteClient(client.id, e)}
                                            className="absolute top-1 right-1 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors z-10"
                                            title="Видалити клієнта"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        <div className={`font-medium break-words pr-6 overflow-wrap-anywhere ${selectedClientId === client.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                            {client.first_name} {client.last_name}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 break-words overflow-wrap-anywhere mt-1">{client.phone}</div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>

                    {/* Локації вибраного клієнта - окремий блок */}
                    {selectedClientId && (() => {
                        const selectedClient = clients.find(c => c.id === selectedClientId);
                        const locations = clientLocations.get(selectedClientId) || [];
                        
                        if (!selectedClient) return null;
                        
                        return (
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Адреси клієнта: {selectedClient.first_name} {selectedClient.last_name}
                                    </div>
                                    <button
                                        onClick={() => setAddingLocation(!addingLocation)}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                    >
                                        {addingLocation ? 'Скасувати' : '+ Додати адресу'}
                                    </button>
                                </div>

                                {/* Форма додавання локації */}
                                {addingLocation && (
                                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                                                    <div className="relative" ref={cityDropdownRef}>
                                                        <input
                                                            type="text"
                                                            value={newCitySearch}
                                                            onChange={(e) => {
                                                                setNewCitySearch(e.target.value);
                                                                if (e.target.value.length >= 2) {
                                                                    const timeoutId = setTimeout(() => fetchCities(e.target.value), 300);
                                                                    return () => clearTimeout(timeoutId);
                                                                } else {
                                                                    setShowCityDropdown(false);
                                                                }
                                                            }}
                                                            placeholder="Введіть місто"
                                                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-2 py-1.5 text-xs"
                                                        />
                                                        {isCityLoading && (
                                                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                            </div>
                                                        )}
                                                        {showCityDropdown && newCities.length > 0 && (
                                                            <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-[70vh] sm:max-h-60 overflow-auto" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                                                                {newCities.map((city, index) => (
                                                                    <div
                                                                        key={`${city.Ref}-${index}`}
                                                                        className="cursor-pointer py-2 px-3 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs"
                                                                        onClick={() => handleCitySelect(city)}
                                                                    >
                                                                        {city.Description}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        
                                                        {/* Популярні міста */}
                                                        {!selectedNewCity && !newCitySearch && (
                                                            <div className="mt-2">
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Популярні міста:</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {loadingPopularCities ? (
                                                                        <div className="text-xs text-gray-400">Завантаження...</div>
                                                                    ) : (
                                                                        popularCities.map((city) => (
                                                                            <button
                                                                                key={city.Ref}
                                                                                type="button"
                                                                                onClick={() => handleCitySelect(city)}
                                                                                className="px-2 py-1 text-xs rounded-md bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700 transition-colors"
                                                                            >
                                                                                {city.Description.split(',')[0]}
                                                                            </button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="relative" ref={warehouseDropdownRef}>
                                                        <input
                                                            ref={warehouseInputRef}
                                                            type="text"
                                                            value={newWarehouseSearch}
                                                            onChange={(e) => {
                                                                setNewWarehouseSearch(e.target.value);
                                                                if (selectedNewCity) {
                                                                    const timeoutId = setTimeout(() => fetchWarehouses(e.target.value), 300);
                                                                    return () => clearTimeout(timeoutId);
                                                                }
                                                            }}
                                                            onFocus={() => {
                                                                if (selectedNewCity) {
                                                                    fetchWarehouses(newWarehouseSearch);
                                                                }
                                                                if (warehouseInputRef.current && window.innerWidth < 640) {
                                                                    setTimeout(() => {
                                                                        warehouseInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                    }, 100);
                                                                }
                                                            }}
                                                            disabled={!selectedNewCity}
                                                            placeholder={selectedNewCity ? "Введіть відділення" : "Спочатку виберіть місто"}
                                                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-2 py-1.5 text-xs disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-400"
                                                        />
                                                        {isWarehouseLoading && (
                                                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                            </div>
                                                        )}
                                                        {showWarehouseDropdown && newWarehouses.length > 0 && (
                                                            <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-[70vh] sm:max-h-60 overflow-auto" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                                                                {newWarehouses.map((warehouse, index) => (
                                                                    <div
                                                                        key={`${warehouse.Ref}-${index}`}
                                                                        className="cursor-pointer py-2 px-3 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs"
                                                                        onClick={() => handleWarehouseSelect(warehouse)}
                                                                    >
                                                                        {warehouse.Description}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddLocation();
                                            }}
                                            disabled={!selectedNewCity || !selectedNewWarehouse}
                                            className="w-full px-2 py-1.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                        >
                                            Додати
                                        </button>
                                    </div>
                                )}

                                {/* Список локацій */}
                                {locations.length > 0 && (() => {
                                    const visibleCount = visibleLocationsCount.get(selectedClientId) || 8;
                                    const displayedLocations = locations.slice(0, locations.length > 8 && visibleCount === 8 ? 7 : visibleCount);
                                    const showMoreButton = locations.length > 8 && visibleCount < locations.length;
                                    const totalItems = displayedLocations.length + (showMoreButton ? 1 : 0);
                                    const gridCols = Math.min(totalItems, 4);
                                    
                                    return (
                                        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                                            <div className="flex sm:grid gap-2 sm:gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                                                {displayedLocations.map((location) => (
                                                    <div
                                                        key={location.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLocationSelect(location.id);
                                                        }}
                                                        className={`px-2 py-1.5 rounded-lg border-2 cursor-pointer transition-colors text-xs relative flex-shrink-0 min-w-[150px] max-w-[200px] sm:min-w-0 sm:max-w-none ${
                                                            selectedClientLocationId === location.id
                                                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                                                        }`}
                                                    >
                                                        <button
                                                            onClick={(e) => handleDeleteLocation(location.id, e)}
                                                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors z-10"
                                                            title="Видалити локацію"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                        <div className="font-medium break-words pr-5 overflow-wrap-anywhere">{location.city_name}</div>
                                                        <div className="text-gray-500 dark:text-gray-400 break-words overflow-wrap-anywhere mt-1">{location.warehouse_name}</div>
                                                    </div>
                                                ))}
                                                {showMoreButton && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setVisibleLocationsCount(prev => {
                                                                const newMap = new Map(prev);
                                                                newMap.set(selectedClientId, Math.min((prev.get(selectedClientId) || 8) + 8, locations.length));
                                                                return newMap;
                                                            });
                                                        }}
                                                        className="px-2 py-1.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-xs flex-shrink-0 min-w-[150px] sm:min-w-0"
                                                    >
                                                        Показати ще
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })()}
                </div>
            )}
        </>
    );
}
