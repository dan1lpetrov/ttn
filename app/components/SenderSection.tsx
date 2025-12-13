'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Modal from './Modal';
import SenderForm from './SenderForm';
import { useTTN } from '../contexts/TTNContext';

interface Sender {
    id: string;
    name: string;
    phone: string;
    city_name: string;
    sender_address_name: string;
    sender_ref: string;
    city_ref: string;
    sender_address_ref: string;
    contact_sender_ref: string;
    created_at: string;
}

interface SenderLocation {
    id: string;
    city_name: string;
    sender_address_name: string;
    city_ref: string;
    sender_address_ref: string;
}

interface City {
    Ref: string;
    Description: string;
}

interface Warehouse {
    Ref: string;
    Description: string;
}

export default function SenderSection() {
    const [sender, setSender] = useState<Sender | null>(null);
    const [locations, setLocations] = useState<SenderLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [visibleLocationsCount, setVisibleLocationsCount] = useState(8);
    const { selectedSenderId, setSelectedSenderId } = useTTN();
    const supabase = createClientComponentClient();

    // Стани для додавання нового міста/відділення
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
    const cityDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseInputRef = useRef<HTMLInputElement>(null);

    const fetchSender = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Отримуємо останній запис відправника (якщо є)
            const { data, error } = await supabase
                .from('sender')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setSender(data);
                setSelectedSenderId(data.id);
                
                // Отримуємо всі локації для цього відправника
                const { data: locationsData, error: locationsError } = await supabase
                    .from('sender')
                    .select('id, city_name, sender_address_name, city_ref, sender_address_ref, updated_at')
                    .eq('user_id', user.id)
                    .eq('sender_ref', data.sender_ref)
                    .order('updated_at', { ascending: false });

                if (locationsError) throw locationsError;
                
                // Групуємо по city_ref + sender_address_ref для унікальності, беремо останній запис для кожної комбінації
                const locationsMap = new Map<string, SenderLocation>();
                (locationsData || []).forEach((loc: any) => {
                    const key = `${loc.city_ref}-${loc.sender_address_ref}`;
                    if (!locationsMap.has(key)) {
                        locationsMap.set(key, {
                            id: loc.id,
                            city_name: loc.city_name,
                            sender_address_name: loc.sender_address_name,
                            city_ref: loc.city_ref,
                            sender_address_ref: loc.sender_address_ref,
                        });
                    }
                });
                
                const uniqueLocations = Array.from(locationsMap.values());
                setLocations(uniqueLocations);
                
                // Вибираємо першу локацію за замовчуванням (або поточну, якщо вона є)
                if (uniqueLocations.length > 0) {
                    if (selectedLocationId && uniqueLocations.find(loc => loc.id === selectedLocationId)) {
                        // Залишаємо поточну вибрану локацію
                    } else {
                        setSelectedLocationId(uniqueLocations[0].id);
                        setSelectedSenderId(uniqueLocations[0].id);
                    }
                }
                
                // Скидаємо лічильник видимих локацій при оновленні
                setVisibleLocationsCount(8);
            } else {
                setSender(null);
                setLocations([]);
            }
        } catch (err) {
            console.error('Error fetching sender:', err);
            setError('Помилка при завантаженні відправника');
        } finally {
            setLoading(false);
        }
    }, [supabase, selectedLocationId, setSelectedSenderId]);

    useEffect(() => {
        fetchSender();
    }, [fetchSender]);

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
            if (!response.ok) throw new Error('Помилка при пошуку міст');
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
            if (!response.ok) throw new Error('Помилка при пошуку відділень');
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
        fetchWarehouses('');
    };

    const handleWarehouseSelect = (warehouse: Warehouse) => {
        setSelectedNewWarehouse(warehouse.Ref);
        setNewWarehouseSearch(warehouse.Description);
        setShowWarehouseDropdown(false);
    };

    const handleAddLocation = async () => {
        if (!sender || !selectedNewCity || !selectedNewWarehouse) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const selectedCityData = newCities.find(city => city.Ref === selectedNewCity);
            const selectedWarehouseData = newWarehouses.find(warehouse => warehouse.Ref === selectedNewWarehouse);

            if (!selectedCityData || !selectedWarehouseData) {
                throw new Error('Місто або відділення не вибрано');
            }

            // Оновлюємо або створюємо запис
            const { data: existingLocation } = await supabase
                .from('sender')
                .select('id')
                .eq('user_id', user.id)
                .eq('sender_ref', sender.sender_ref)
                .eq('city_ref', selectedNewCity)
                .eq('sender_address_ref', selectedNewWarehouse)
                .maybeSingle();

            if (existingLocation) {
                // Оновлюємо існуючий запис
                const { error: updateError } = await supabase
                    .from('sender')
                    .update({
                        city_name: selectedCityData.Description,
                        sender_address_name: selectedWarehouseData.Description,
                    })
                    .eq('id', existingLocation.id);
                
                if (updateError) throw updateError;
            } else {
                // Створюємо новий запис
                const { error: insertError } = await supabase
                    .from('sender')
                    .insert([
                        {
                            user_id: user.id,
                            name: sender.name,
                            phone: sender.phone,
                            city_ref: selectedNewCity,
                            city_name: selectedCityData.Description,
                            sender_ref: sender.sender_ref,
                            sender_address_ref: selectedNewWarehouse,
                            sender_address_name: selectedWarehouseData.Description,
                            contact_sender_ref: sender.contact_sender_ref || '',
                        }
                    ]);
                
                if (insertError) throw insertError;
            }

            // Очищаємо форму
            setNewCitySearch('');
            setNewWarehouseSearch('');
            setSelectedNewCity('');
            setSelectedNewWarehouse('');
            setAddingLocation(false);
            
            await fetchSender();
            
            // Автоматично вибираємо додану локацію
            const { data: { user: userAfter } } = await supabase.auth.getUser();
            if (userAfter) {
                const { data: newLocation } = await supabase
                    .from('sender')
                    .select('id')
                    .eq('user_id', userAfter.id)
                    .eq('sender_ref', sender.sender_ref)
                    .eq('city_ref', selectedNewCity)
                    .eq('sender_address_ref', selectedNewWarehouse)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (newLocation) {
                    setSelectedLocationId(newLocation.id);
                    setSelectedSenderId(newLocation.id);
                }
            }
        } catch (err) {
            console.error('Error adding location:', err);
            setError(err instanceof Error ? err.message : 'Помилка при додаванні локації');
        }
    };

    const handleLocationSelect = async (locationId: string) => {
        setSelectedLocationId(locationId);
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
            // Знаходимо повний запис відправника з цією локацією
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: senderData } = await supabase
                    .from('sender')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('sender_ref', sender!.sender_ref)
                    .eq('city_ref', location.city_ref)
                    .eq('sender_address_ref', location.sender_address_ref)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (senderData) {
                    setSelectedSenderId(senderData.id);
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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

    if (!sender) {
        return (
            <>
                <div className="text-center py-8 text-gray-500">
                    <p>Немає відправника</p>
                    <p className="text-sm">Додайте відправника</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    + Додати відправника
                </button>
                <Modal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    title="Додати відправника"
                >
                    <SenderForm
                        onSuccess={async () => {
                            setShowAddModal(false);
                            await fetchSender();
                        }}
                        onCancel={() => setShowAddModal(false)}
                    />
                </Modal>
            </>
        );
    }

    // Розбиваємо name на прізвище та ім'я
    const nameParts = sender.name.split(' ');
    const lastName = nameParts[0] || '';
    const firstName = nameParts.slice(1).join(' ') || '';

    return (
        <>
            {/* Відправник */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {lastName} {firstName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {sender.phone}
                </div>
            </div>

            {/* Локації */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Місто та відділення</h3>
                    <button
                        onClick={() => setAddingLocation(!addingLocation)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                        {addingLocation ? 'Скасувати' : '+ Додати'}
                    </button>
                </div>

                {/* Форма додавання нової локації */}
                {addingLocation && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
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
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                            />
                            {isCityLoading && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                            {showCityDropdown && newCities.length > 0 && (
                                <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-[70vh] sm:max-h-60 overflow-auto" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                                    {newCities.map((city, index) => (
                                        <div
                                            key={`${city.Ref}-${index}`}
                                            className="cursor-pointer py-2 px-3 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            onClick={() => handleCitySelect(city)}
                                        >
                                            {city.Description}
                                        </div>
                                    ))}
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
                                    // Прокручуємо інпут до верху екрана на мобільних пристроях
                                    if (warehouseInputRef.current && window.innerWidth < 640) {
                                        setTimeout(() => {
                                            warehouseInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 100);
                                    }
                                }}
                                disabled={!selectedNewCity}
                                placeholder={selectedNewCity ? "Введіть відділення" : "Спочатку виберіть місто"}
                                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 disabled:bg-gray-100 dark:disabled:bg-gray-700"
                            />
                            {isWarehouseLoading && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                            {showWarehouseDropdown && newWarehouses.length > 0 && (
                                <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-[70vh] sm:max-h-60 overflow-auto" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                                    {newWarehouses.map((warehouse, index) => (
                                        <div
                                            key={`${warehouse.Ref}-${index}`}
                                            className="cursor-pointer py-2 px-3 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            onClick={() => handleWarehouseSelect(warehouse)}
                                        >
                                            {warehouse.Description}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleAddLocation}
                            disabled={!selectedNewCity || !selectedNewWarehouse}
                            className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Додати
                        </button>
                    </div>
                )}

                {/* Список локацій */}
                {(() => {
                    const displayedLocations = locations.slice(0, locations.length > 8 && visibleLocationsCount === 8 ? 7 : visibleLocationsCount);
                    const showMoreButton = locations.length > 8 && visibleLocationsCount < locations.length;
                    const totalItems = displayedLocations.length + (showMoreButton ? 1 : 0);
                    const gridCols = Math.min(totalItems, 4);
                    
                    return (
                        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                            {displayedLocations.map((location) => (
                                <div
                                    key={location.id}
                                    onClick={() => handleLocationSelect(location.id)}
                                    className={`px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                                        selectedLocationId === location.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <div className="text-sm font-medium break-words">{location.city_name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 break-words">{location.sender_address_name}</div>
                                </div>
                            ))}
                            {showMoreButton && (
                                <button
                                    onClick={() => setVisibleLocationsCount(prev => Math.min(prev + 8, locations.length))}
                                    className="px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm"
                                >
                                    Показати ще
                                </button>
                            )}
                        </div>
                    );
                })()}
            </div>
        </>
    );
}

