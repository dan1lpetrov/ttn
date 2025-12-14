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

interface SenderFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface ExistingSender {
    Ref: string;
    Description: string;
    FirstName?: string;
    LastName?: string;
    Phones?: string[];
    [key: string]: any;
}

export default function SenderForm({ onSuccess, onCancel }: SenderFormProps) {
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
    const [popularCities, setPopularCities] = useState<City[]>([]);
    const [loadingPopularCities, setLoadingPopularCities] = useState(false);
    
    // Стан для вибору існуючого відправника
    const [existingSenders, setExistingSenders] = useState<ExistingSender[]>([]);
    const [selectedExistingSender, setSelectedExistingSender] = useState<ExistingSender | null>(null);
    const [showExistingSendersDropdown, setShowExistingSendersDropdown] = useState(false);
    const [isLoadingExistingSenders, setIsLoadingExistingSenders] = useState(false);
    const [isLoadingContactPerson, setIsLoadingContactPerson] = useState(false);
    
    // Стан для контактних осіб
    const [contactPersons, setContactPersons] = useState<Array<{
        Ref: string;
        FirstName: string;
        LastName: string;
        Phones: string;
        Description: string;
    }>>([]);
    const [selectedContactPerson, setSelectedContactPerson] = useState<{
        Ref: string;
        FirstName: string;
        LastName: string;
        Phones: string;
        Description: string;
    } | null>(null);
    const [showContactPersonsDropdown, setShowContactPersonsDropdown] = useState(false);
    
    const cityDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseDropdownRef = useRef<HTMLDivElement>(null);
    const warehouseInputRef = useRef<HTMLInputElement>(null);
    const existingSendersDropdownRef = useRef<HTMLDivElement>(null);
    const contactPersonsDropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
                setShowCityDropdown(false);
            }
            if (warehouseDropdownRef.current && !warehouseDropdownRef.current.contains(event.target as Node)) {
                setShowWarehouseDropdown(false);
            }
            if (existingSendersDropdownRef.current && !existingSendersDropdownRef.current.contains(event.target as Node)) {
                setShowExistingSendersDropdown(false);
            }
            if (contactPersonsDropdownRef.current && !contactPersonsDropdownRef.current.contains(event.target as Node)) {
                setShowContactPersonsDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Функція для завантаження даних контактної особи та встановлення відправника
    const loadContactPersonAndSetSender = async (sender: ExistingSender) => {
        setIsLoadingContactPerson(true);
        try {
            // Отримуємо контактні особи для цього відправника
            const contactPersonsResponse = await fetch(`/api/nova-poshta/counterparty-contact-persons?ref=${sender.Ref}`);
            const contactPersonsData = await contactPersonsResponse.json();
            
            if (contactPersonsData.success && contactPersonsData.data && contactPersonsData.data.length > 0) {
                const persons = contactPersonsData.data.map((person: any) => ({
                    Ref: person.Ref,
                    FirstName: person.FirstName || '',
                    LastName: person.LastName || '',
                    Phones: typeof person.Phones === 'string' 
                        ? person.Phones 
                        : (Array.isArray(person.Phones) ? person.Phones[0] : ''),
                    Description: person.Description || `${person.LastName || ''} ${person.FirstName || ''}`.trim()
                }));
                
                setContactPersons(persons);
                
                // Якщо є тільки одна контактна особа, автоматично її вибираємо
                if (persons.length === 1) {
                    setSelectedContactPerson(persons[0]);
                    setPhone(persons[0].Phones);
                } else if (persons.length > 1) {
                    // Якщо є кілька, вибираємо першу за замовчуванням, але показуємо список
                    setSelectedContactPerson(persons[0]);
                    setPhone(persons[0].Phones);
                    setShowContactPersonsDropdown(true);
                }
            } else {
                // Якщо немає контактних осіб, створюємо фейкову з даних відправника
                const fakePerson = {
                    Ref: sender.Ref,
                    FirstName: sender.FirstName || '',
                    LastName: sender.LastName || '',
                    Phones: typeof sender.Phones === 'string' 
                        ? sender.Phones 
                        : (Array.isArray(sender.Phones) ? sender.Phones[0] : ''),
                    Description: sender.Description || `${sender.LastName || ''} ${sender.FirstName || ''}`.trim()
                };
                setContactPersons([fakePerson]);
                setSelectedContactPerson(fakePerson);
                setPhone(fakePerson.Phones);
            }
            
            setSelectedExistingSender(sender);
        } catch (err) {
            console.error('Error fetching contact persons:', err);
            // Якщо помилка, створюємо фейкову з даних відправника
            const fakePerson = {
                Ref: sender.Ref,
                FirstName: sender.FirstName || '',
                LastName: sender.LastName || '',
                Phones: typeof sender.Phones === 'string' 
                    ? sender.Phones 
                    : (Array.isArray(sender.Phones) ? sender.Phones[0] : ''),
                Description: sender.Description || `${sender.LastName || ''} ${sender.FirstName || ''}`.trim()
            };
            setContactPersons([fakePerson]);
            setSelectedContactPerson(fakePerson);
            setPhone(fakePerson.Phones);
            setSelectedExistingSender(sender);
        } finally {
            setIsLoadingContactPerson(false);
        }
    };

    // Автоматично завантажуємо список відправників при відкритті форми
    useEffect(() => {
        const loadSenders = async () => {
            setIsLoadingExistingSenders(true);
            try {
                const response = await fetch('/api/nova-poshta/counterparties?counterpartyProperty=Sender');
                const data = await response.json();
                if (data.success) {
                    const senders = data.data || [];
                    setExistingSenders(senders);
                    
                    // Якщо є тільки один відправник, автоматично його вибираємо
                    if (senders.length === 1) {
                        await loadContactPersonAndSetSender(senders[0]);
                    } else if (senders.length > 1) {
                        setShowExistingSendersDropdown(true);
                    }
                }
            } catch (err) {
                console.error('Error fetching existing senders:', err);
            } finally {
                setIsLoadingExistingSenders(false);
            }
        };
        
        loadSenders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectExistingSender = async (sender: ExistingSender) => {
        setShowExistingSendersDropdown(false);
        await loadContactPersonAndSetSender(sender);
    };

    const handleSelectContactPerson = (person: typeof contactPersons[0]) => {
        setSelectedContactPerson(person);
        setPhone(person.Phones);
        setShowContactPersonsDropdown(false);
    };

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
                const uniqueCities = data.data.filter((city: City, index: number, self: City[]) => 
                    index === self.findIndex((c: City) => c.Ref === city.Ref)
                );
                setCities(uniqueCities);
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
                const uniqueWarehouses = data.data.filter((warehouse: Warehouse, index: number, self: Warehouse[]) => 
                    index === self.findIndex((w: Warehouse) => w.Ref === warehouse.Ref)
                );
                setWarehouses(uniqueWarehouses);
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

            if (!selectedExistingSender) {
                throw new Error('Виберіть відправника');
            }

            if (!selectedContactPerson) {
                throw new Error('Виберіть контактну особу');
            }

            // Перевіряємо, чи вибрано місто та відділення
            if (!selectedCity) {
                throw new Error('Виберіть місто відправки');
            }
            
            const selectedCityData = cities.find(city => city.Ref === selectedCity);
            if (!selectedCityData) {
                throw new Error('Місто не знайдено');
            }

            if (!selectedWarehouse) {
                throw new Error('Виберіть відділення відправки');
            }

            const selectedWarehouseData = warehouses.find(warehouse => warehouse.Ref === selectedWarehouse);
            if (!selectedWarehouseData) {
                throw new Error('Відділення не знайдено');
            }

            const senderName = `${selectedContactPerson.LastName} ${selectedContactPerson.FirstName}`.trim() || selectedExistingSender.Description;
            const senderPhone = selectedContactPerson.Phones || '';

            const cityRef = selectedCity;
            const senderAddressRef = selectedWarehouse;
            const senderAddressName = selectedWarehouseData.Description;

            console.log('Using existing sender:', {
                sender_ref: selectedExistingSender.Ref,
                contact_sender_ref: selectedContactPerson.Ref,
                city_ref: cityRef,
                sender_address_ref: senderAddressRef
            });

            // Перевіряємо, чи вже є відправник з таким sender_ref
            const { data: existingSenderData } = await supabase
                .from('sender')
                .select('id')
                .eq('user_id', user.id)
                .eq('sender_ref', selectedExistingSender.Ref)
                .single();

            if (existingSenderData) {
                // Оновлюємо існуючий запис (тільки місто та відділення)
                const { error: updateError } = await supabase
                    .from('sender')
                    .update({
                        city_ref: cityRef,
                        city_name: selectedCityData.Description,
                        sender_address_ref: senderAddressRef,
                        sender_address_name: senderAddressName,
                    })
                    .eq('id', existingSenderData.id)
                    .eq('user_id', user.id);

                if (updateError) {
                    console.error('Error updating sender:', updateError);
                    throw updateError;
                }
            } else {
                // Створюємо новий запис
                const { error: insertError } = await supabase
                    .from('sender')
                    .insert([
                        {
                            user_id: user.id,
                            name: senderName,
                            phone: senderPhone,
                            city_ref: cityRef,
                            city_name: selectedCityData.Description,
                            sender_ref: selectedExistingSender.Ref,
                            sender_address_ref: senderAddressRef,
                            sender_address_name: senderAddressName,
                            contact_sender_ref: selectedContactPerson.Ref
                    }
                ]);

            if (insertError) {
                    console.error('Error inserting sender:', insertError);
                    throw insertError;
                }
            }

            // Очищаємо форму
            setCitySearch('');
            setWarehouseSearch('');
            setSelectedCity('');
            setSelectedWarehouse('');
            setSelectedExistingSender(null);
            setSelectedContactPerson(null);
            setContactPersons([]);
            setPhone('');
            
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Error adding sender:', err);
            setError(err instanceof Error ? err.message : 'Помилка при додаванні відправника');
        } finally {
            setLoading(false);
        }
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

            {/* Вибір існуючого відправника */}
            <div className="relative" ref={existingSendersDropdownRef}>
                {(isLoadingExistingSenders || isLoadingContactPerson) && (
                    <div className="mb-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Завантаження відправника...</p>
                    </div>
                )}
                {!isLoadingExistingSenders && !isLoadingContactPerson && !selectedExistingSender && existingSenders.length > 1 && showExistingSendersDropdown && (
                    <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Виберіть відправника
                        </label>
                        <div className="relative">
                            <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 shadow-lg max-h-[70vh] sm:max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200 dark:border-gray-600" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                                {existingSenders.map((sender, index) => (
                                    <div
                                        key={`${sender.Ref}-${index}`}
                                        className="cursor-pointer select-none relative py-2 pl-4 pr-9 hover:bg-blue-50"
                                        onClick={() => handleSelectExistingSender(sender)}
                                    >
                                        <span className="block truncate font-medium">{sender.Description}</span>
                                        {sender.Phones && (typeof sender.Phones === 'string' || (Array.isArray(sender.Phones) && sender.Phones.length > 0)) && (
                                            <span className="block text-xs text-gray-500 mt-1">
                                                {typeof sender.Phones === 'string' ? sender.Phones : sender.Phones[0]}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {!isLoadingContactPerson && selectedExistingSender && (
                    <>
                        {/* Випадаючий список контактних осіб */}
                        {contactPersons.length > 1 && (
                            <div className="mb-4 relative" ref={contactPersonsDropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                    Контактна особа
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowContactPersonsDropdown(!showContactPersonsDropdown)}
                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        {selectedContactPerson 
                                            ? `${selectedContactPerson.LastName} ${selectedContactPerson.FirstName}`.trim() || selectedContactPerson.Description
                                            : 'Виберіть контактну особу'
                                        }
                                    </button>
                                    {showContactPersonsDropdown && (
                                        <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 shadow-lg max-h-[70vh] sm:max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200 dark:border-gray-600" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                                            {contactPersons.map((person, index) => (
                                                <div
                                                    key={`${person.Ref}-${index}`}
                                                    className="cursor-pointer select-none relative py-2 pl-4 pr-9 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                    onClick={() => handleSelectContactPerson(person)}
                                                >
                                                    <span className="block truncate font-medium">
                                                        {`${person.LastName} ${person.FirstName}`.trim() || person.Description}
                                                    </span>
                                                    {person.Phones && (
                                                        <span className="block text-xs text-gray-500 mt-1">
                                                            {person.Phones}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Відображення обраної контактної особи та телефону */}
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-md border border-blue-200 dark:border-blue-700">
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                                <strong>Відправник:</strong>{' '}
                                {selectedContactPerson 
                                    ? `${selectedContactPerson.LastName} ${selectedContactPerson.FirstName}`.trim() || selectedContactPerson.Description
                                    : selectedExistingSender.Description
                                }
                            </p>
                            {selectedContactPerson?.Phones && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Телефон: {selectedContactPerson.Phones}</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="relative" ref={cityDropdownRef}>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    {isCityLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        </div>
                    )}
                </div>
                {cityError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{cityError}</p>
                )}
                {showCityDropdown && cities.length > 0 && (
                    <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 shadow-lg max-h-[70vh] sm:max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200 dark:border-gray-600" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                        {cities.map((city, index) => (
                            <div
                                key={`${city.Ref}-${index}`}
                                className="cursor-pointer select-none relative py-2 pl-4 pr-9 hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-900 dark:text-gray-100"
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
                <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
                        className={`block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 ${!selectedCity ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}
                    />
                    {isWarehouseLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        </div>
                    )}
                </div>
                {warehouseError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{warehouseError}</p>
                )}
                {showWarehouseDropdown && warehouses.length > 0 && (
                    <div className="absolute z-50 mt-1 left-0 w-[98vw] sm:w-full max-w-full bg-white dark:bg-gray-800 shadow-lg max-h-[70vh] sm:max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200 dark:border-gray-600" style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(98vw, 100%)' }}>
                        {warehouses.map((warehouse, index) => (
                            <div
                                key={`${warehouse.Ref}-${index}`}
                                className="cursor-pointer select-none relative py-2 pl-4 pr-9 hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-900 dark:text-gray-100"
                                onClick={() => handleWarehouseSelect(warehouse)}
                            >
                                <span className="block truncate">{warehouse.Description}</span>
                            </div>
                        ))}
                </div>
            )}
            </div>

            <div className="flex justify-end space-x-3">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Скасувати
                    </button>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 border border-transparent rounded-md shadow-sm hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {loading ? 'Збереження...' : 'Зберегти'}
                </button>
            </div>
        </form>
    );
} 
