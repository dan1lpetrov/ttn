'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Modal from './Modal';

interface City {
    Ref: string;
    Description: string;
}

interface Warehouse {
    Ref: string;
    Description: string;
}

interface EditSenderLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    senderRef: string;
    currentCityName: string;
    currentWarehouseName: string;
    onSuccess: () => void;
}

export default function EditSenderLocationModal({
    isOpen,
    onClose,
    senderRef,
    currentCityName,
    currentWarehouseName,
    onSuccess,
}: EditSenderLocationModalProps) {
    const [cities, setCities] = useState<City[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [citySearch, setCitySearch] = useState(currentCityName);
    const [warehouseSearch, setWarehouseSearch] = useState(currentWarehouseName);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCityLoading, setIsCityLoading] = useState(false);
    const [isWarehouseLoading, setIsWarehouseLoading] = useState(false);
    const [popularCities, setPopularCities] = useState<City[]>([]);
    const [loadingPopularCities, setLoadingPopularCities] = useState(false);
    const cityDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClientComponentClient();

    // Завантажуємо популярні міста при монтуванні
    useEffect(() => {
        const loadPopularCities = async () => {
            setLoadingPopularCities(true);
            const popularCityNames = ['Київ', 'Харків', 'Львів', 'Дніпро', 'Запоріжжя'];
            const loadedCities: City[] = [];

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
                                loadedCities.push(exactMatch);
                            } else if (data.data[0]) {
                                loadedCities.push(data.data[0]);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Error loading popular city ${cityName}:`, err);
                }
            }

            setPopularCities(loadedCities);
            setLoadingPopularCities(false);
        };

        if (isOpen) {
            loadPopularCities();
        }
    }, [isOpen]);

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
                setCities(uniqueCities);
                setShowCityDropdown(true);
            }
        } catch (err) {
            console.error('Error fetching cities:', err);
        } finally {
            setIsCityLoading(false);
        }
    };

    const fetchWarehouses = async (search: string) => {
        if (!selectedCity) return;

        setIsWarehouseLoading(true);
        try {
            const response = await fetch(`/api/nova-poshta/warehouses?cityRef=${selectedCity}&search=${encodeURIComponent(search)}`);
            if (!response.ok) {
                throw new Error('Помилка при пошуку відділень');
            }
            const data = await response.json();
            if (data.success) {
                const uniqueWarehouses = data.data.filter((warehouse: Warehouse, index: number, self: Warehouse[]) =>
                    index === self.findIndex((w: Warehouse) => w.Ref === warehouse.Ref)
                );
                setWarehouses(uniqueWarehouses);
                setShowWarehouseDropdown(true);
            }
        } catch (err) {
            console.error('Error fetching warehouses:', err);
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
        // Прокручуємо інпут до верху екрана на мобільних пристроях
        if (warehouseInputRef.current && window.innerWidth < 640) {
            setTimeout(() => {
                const input = warehouseInputRef.current;
                if (input) {
                    // Знаходимо модальне вікно
                    const modal = input.closest('[role="dialog"], .fixed');
                    if (modal) {
                        // Прокручуємо модалку так, щоб інпут був вгорі
                        const inputTop = input.getBoundingClientRect().top;
                        const modalTop = (modal as HTMLElement).getBoundingClientRect().top;
                        const scrollOffset = inputTop - modalTop - 10; // 10px відступ зверху
                        (modal as HTMLElement).scrollTop = (modal as HTMLElement).scrollTop + scrollOffset;
                    } else {
                        // Якщо не знайшли модалку, використовуємо стандартну прокрутку
                        input.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                    }
                }
            }, 300); // Збільшуємо затримку, щоб клавіатура встигла відкритись
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const selectedCityData = cities.find(city => city.Ref === selectedCity);
            const selectedWarehouseData = warehouses.find(warehouse => warehouse.Ref === selectedWarehouse);

            if (!selectedCityData) {
                throw new Error('Місто не вибрано');
            }
            if (!selectedWarehouseData && !warehouseSearch) {
                throw new Error('Відділення не вибрано');
            }

            const { error: updateError } = await supabase
                .from('sender')
                .update({
                    city_ref: selectedCity,
                    city_name: selectedCityData.Description,
                    sender_address_ref: selectedWarehouse,
                    sender_address_name: selectedWarehouseData?.Description || warehouseSearch,
                })
                .eq('sender_ref', senderRef)
                .eq('user_id', user.id);

            if (updateError) {
                throw updateError;
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error updating sender location:', err);
            setError(err instanceof Error ? err.message : 'Помилка при оновленні локації відправника');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Оберіть місто та відділення">
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

                <div className="relative" ref={cityDropdownRef}>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                        />
                        {isCityLoading && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                            </div>
                        )}
                    </div>
                    {showCityDropdown && cities.length > 0 && (
                        <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-[70vh] sm:max-h-60 overflow-auto focus:outline-none sm:text-sm" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                            {cities.map((city, index) => (
                                <div
                                    key={`${city.Ref}-${index}`}
                                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                    onClick={() => handleCitySelect(city)}
                                >
                                    <span className="block truncate">{city.Description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Популярні міста */}
                    {!selectedCity && !citySearch && (
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
                    <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 mb-1">
                        Відділення
                    </label>
                    <div className="relative">
                        <input
                            ref={warehouseInputRef}
                            type="text"
                            id="warehouse"
                            value={warehouseSearch}
                            onChange={handleWarehouseInputChange}
                            onFocus={handleWarehouseInputFocus}
                            required
                            disabled={!selectedCity}
                            placeholder={selectedCity ? "Введіть назву відділення" : "Спочатку виберіть місто"}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        {isWarehouseLoading && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                            </div>
                        )}
                    </div>
                    {showWarehouseDropdown && warehouses.length > 0 && (
                        <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-[70vh] sm:max-h-60 overflow-auto focus:outline-none sm:text-sm" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                            {warehouses.map((warehouse, index) => (
                                <div
                                    key={`${warehouse.Ref}-${index}`}
                                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                    onClick={() => handleWarehouseSelect(warehouse)}
                                >
                                    <span className="block truncate">{warehouse.Description}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Скасувати
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </Modal>
    );
}

