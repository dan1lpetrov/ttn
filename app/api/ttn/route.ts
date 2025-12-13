import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserApiKey } from '@/lib/getUserApiKey';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

interface NovaPoshtaResponse {
    success: boolean;
    data: Array<{
        Ref: string;
        IntDocNumber: string;
        [key: string]: string | number | boolean;
    }>;
    errors: string[];
    warnings: string[];
    info: string[];
    errorCodes?: string[];
    warningCodes?: string[];
    infoCodes?: string[];
}

interface Client {
    id: string;
    first_name: string;
    last_name: string;
    city_name: string;
    warehouse_name: string;
    warehouse_ref: string;
    city_ref: string;
    contact_ref: string;
    counterparty_ref?: string;
    phone: string;
    [key: string]: string | number | boolean | undefined;
}

interface Sender {
    id: string;
    city_ref: string;
    sender_ref: string;
    sender_address_ref: string;
    contact_sender_ref: string;
    phone: string;
    [key: string]: string | number | boolean;
}

/**
 * Отримує дані про місто для InternetDocumentGeneral
 */
async function getCityData(cityRef: string, cityName: string): Promise<{
    cityName: string;
    areaName: string;
    areaRegionName: string;
    settlementType: string;
}> {
    try {
        // Отримуємо дані про місто через getSettlements з Ref
        const request = {
        modelName: 'Address',
            calledMethod: 'getSettlements',
        methodProperties: {
                Ref: cityRef,
                Warehouse: '1', // Отримуємо дані для населеного пункту з відділеннями
            },
        };

        console.log('Getting city data with getSettlements:', { cityRef, cityName });

        const response = await fetch(NOVA_POSHTA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });

        const data = await response.json();
        console.log('getSettlements response:', JSON.stringify(data, null, 2));
        
        if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const settlement = data.data[0];
            console.log('Found settlement:', settlement);
            
            return {
                cityName: settlement.Description || cityName,
                areaName: settlement.AreaDescription || '',
                areaRegionName: settlement.AreaRegionsDescription || settlement.RegionDescription || '',
                settlementType: settlement.SettlementTypeDescription || 'м.'
            };
        }
    } catch (error) {
        console.error('Error getting city data:', error);
    }
    
    // Повертаємо значення за замовчуванням
    console.warn('Using default city data for:', cityName);
    return {
        cityName: cityName,
        areaName: '',
        areaRegionName: '',
        settlementType: 'м.'
    };
}

/**
 * Отримує цифрову адресу відділення (номер) для WarehouseIndex
 * Формат: "101" або "101/102" (номер відділення)
 */
async function getWarehouseIndex(warehouseRef: string, cityRef: string): Promise<string> {
    // Отримуємо номер відділення через публічне API
    const request = {
        modelName: 'Address',
        calledMethod: 'getWarehouses',
        methodProperties: {
            CityRef: cityRef,
            Language: 'UA',
            Limit: '500', // Збільшуємо ліміт для отримання всіх відділень
        }
    };

    const response = await fetch(NOVA_POSHTA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
    });

    const data = await response.json();
    console.log('Getting warehouse index for ref:', warehouseRef, 'in city:', cityRef);
    
    if (data.success && data.data && Array.isArray(data.data)) {
        const warehouse = data.data.find((w: { Ref: string }) => w.Ref === warehouseRef);
        console.log('Found warehouse:', warehouse ? { Ref: warehouse.Ref, Description: warehouse.Description, Number: warehouse.Number } : 'NOT FOUND');
        
        if (warehouse) {
            // Спробуємо отримати номер з різних полів
            if (warehouse.Number) {
                console.log('Warehouse index from Number field:', warehouse.Number);
                return warehouse.Number;
            }
            
            // Якщо номер не в полі Number, спробуємо витягти з Description
            // Формат: "Відділення №1: адреса" або "№1"
            if (warehouse.Description) {
                const numberMatch = warehouse.Description.match(/№\s*(\d+)/i) || 
                                   warehouse.Description.match(/^(\d+)/);
                if (numberMatch && numberMatch[1]) {
                    console.log('Warehouse index extracted from Description:', numberMatch[1]);
                    return numberMatch[1];
                }
            }
        } else {
            console.warn('Warehouse not found in response. Looking for ref:', warehouseRef);
        }
    } else {
        console.warn('Failed to get warehouses. Response:', JSON.stringify(data, null, 2));
    }
    
    console.warn('Warehouse index not found for ref:', warehouseRef);
    // Якщо не знайдено, повертаємо порожній рядок (не передаємо поле взагалі)
    return '';
}

/**
 * Створює адресу контрагента для відправника/отримувача
 * SenderAddress/RecipientAddress має бути Ref адреси контрагента, а не Ref відділення!
 */
async function createCounterpartyAddress(
    counterpartyRef: string, 
    warehouseRef: string, 
    warehouseName: string,
    apiKey: string | null
): Promise<string> {
    if (!apiKey) {
        console.warn('API key not set, using warehouse ref as address ref');
        return warehouseRef;
    }

    try {
        const request = {
            apiKey: apiKey,
            modelName: 'Address',
            calledMethod: 'save',
            methodProperties: {
                CounterpartyRef: counterpartyRef,
                StreetRef: '', // Для відділення не потрібен StreetRef
                BuildingNumber: '',
                Flat: '',
                Note: warehouseName,
                CounterpartyProperty: 'Recipient' // Використовуємо Recipient, оскільки API не дозволяє створювати Sender
            }
        };

        console.log('Creating counterparty address:', JSON.stringify(request, null, 2));

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });

        const data = await response.json();
        console.log('Create counterparty address response:', JSON.stringify(data, null, 2));
        
        if (data.success && data.data && data.data[0]) {
            const addressRef = data.data[0].Ref;
            console.log('Counterparty address created with Ref:', addressRef);
            return addressRef;
        } else {
            console.warn('Failed to create counterparty address, using warehouse ref');
            return warehouseRef;
        }
    } catch (error) {
        console.error('Error creating counterparty address:', error);
        return warehouseRef;
    }
}

/**
 * Отримує Ref контрагента-відправника через API
 * Використовується, якщо контрагент вже створений вручну в особистому кабінеті Nova Poshta
 */
async function getSenderCounterpartyRef(phone: string, apiKey: string | null): Promise<string | null> {
    if (!apiKey) {
        return null;
    }

    const request = {
        apiKey: apiKey,
        modelName: 'Counterparty',
        calledMethod: 'getCounterparties',
        methodProperties: {
            CounterpartyProperty: 'Sender',
            Page: '1'
        }
    };

    try {
        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });

        const data = await response.json();
        if (data.success && data.data) {
            // Шукаємо контрагента за телефоном
            const counterparty = data.data.find((c: any) => 
                c.Phones && c.Phones.includes(phone.replace(/\D/g, ''))
            );
            if (counterparty) {
                return counterparty.Ref;
            }
        }
    } catch (error) {
        console.error('Error getting sender counterparty:', error);
    }

    return null;
}

async function createNovaPoshtaTTN(client: Client, sender: Sender, description: string, cost: number, apiKey: string) {
    console.log('Creating TTN for client:', { 
        id: client.id, 
        city_name: client.city_name, 
        warehouse_ref: client.warehouse_ref,
        city_ref: client.city_ref,
        contact_ref: client.contact_ref 
    });
    console.log('Creating TTN for sender:', { 
        id: sender.id, 
        city_ref: sender.city_ref,
        sender_ref: sender.sender_ref,
        sender_address_ref: sender.sender_address_ref 
    });

    // Використовуємо збережені рефи з бази даних
    const recipientCityRef = client.city_ref;
    const recipientWarehouseRef = client.warehouse_ref;
    
    if (!recipientCityRef) {
        throw new Error('Місто отримувача не вказано');
    }
    
    if (!recipientWarehouseRef) {
        throw new Error('Відділення отримувача не вказано');
    }

    // Примітка: WarehouseIndex не потрібні для InternetDocument.save
    // Вони використовуються тільки для InternetDocumentGeneral.save
    // Тому ми їх не отримуємо для InternetDocument.save

    // Створюємо адреси контрагентів
    // SenderAddress/RecipientAddress має бути Ref адреси контрагента, а не Ref відділення!
    const senderAddressRef = await createCounterpartyAddress(
        sender.sender_ref,
        sender.sender_address_ref,
        String(sender.sender_address_name || ''),
        apiKey
    );

    const recipientAddressRef = await createCounterpartyAddress(
        client.counterparty_ref || client.contact_ref,
        recipientWarehouseRef,
        client.warehouse_name || '',
        apiKey
    );

    console.log('Using saved refs:', {
        recipientCityRef,
        recipientWarehouseRef,
        senderAddressRef,
        recipientAddressRef,
        senderRef: sender.sender_ref,
        recipientRef: client.counterparty_ref || client.contact_ref
    });

    // Форматуємо дату в форматі DD.MM.YYYY
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const formattedDateTime = `${formattedDate} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Примітка: Для InternetDocument.save не потрібні дані про місто (cityData)
    // Вони використовуються тільки для InternetDocumentGeneral.save
    // Тому ми їх не отримуємо для InternetDocument.save

    // Перевіряємо наявність необхідних Ref для отримувача
    if (!client.counterparty_ref && !client.contact_ref) {
        throw new Error('Ref контрагента-отримувача не знайдено. Потрібно створити клієнта через форму.');
    }

    // Створюємо ТТН через InternetDocument (використовуємо вже створені контрагенти)
    const requestData = {
        apiKey: apiKey,
        modelName: 'InternetDocument',
        calledMethod: 'save',
        methodProperties: {
            PayerType: 'Recipient',
            PaymentMethod: 'Cash',
            DateTime: formattedDate,
            CargoType: 'Parcel',
            VolumeGeneral: '0.0004',
            Weight: '0.5',
            ServiceType: 'WarehouseWarehouse',
            SeatsAmount: '1',
            Description: description,
            Cost: cost.toString(),
            
            // Дані відправника
            CitySender: sender.city_ref,
            Sender: sender.sender_ref, // Ref контрагента-відправника
            SenderAddress: senderAddressRef, // Ref адреси контрагента-відправника
            ContactSender: sender.contact_sender_ref, // Ref контактної особи-відправника
            SendersPhone: sender.phone.replace(/\D/g, ''),

            // Дані отримувача (використовуємо Ref вже створеного контрагента)
            Recipient: client.counterparty_ref || client.contact_ref, // Ref контрагента-отримувача
            ContactRecipient: client.contact_ref, // Ref контактної особи-отримувача
            CityRecipient: recipientCityRef, // Ref міста отримувача
            RecipientAddress: recipientAddressRef, // Ref адреси контрагента-отримувача (відділення)
            RecipientsPhone: client.phone.replace(/\D/g, ''), // Телефон отримувача
            
            // Примітка: WarehouseIndex НЕ потрібні для InternetDocument.save
            // Вони використовуються тільки для InternetDocumentGeneral.save
            // Тому ми їх не передаємо
            OptionsSeat: [{
                volumetricVolume: '0.0004',
                volumetricWidth: '0.1',
                volumetricLength: '0.1',
                volumetricHeight: '0.1',
                weight: '0.5'
            }]
        }
    };

    console.log('=== TTN Creation Request ===');
    console.log('Model:', requestData.modelName);
    console.log('Method:', requestData.calledMethod);
    console.log('Sender Ref:', sender.sender_ref);
    console.log('Contact Sender Ref:', sender.contact_sender_ref);
    console.log('Sender Address Ref:', senderAddressRef);
    console.log('Full request data:', JSON.stringify(requestData, null, 2));

    const response = await fetch(NOVA_POSHTA_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
    });

    const data: NovaPoshtaResponse = await response.json();
    
    console.log('Nova Poshta TTN response:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
        // Показуємо оригінальну помилку від API Nova Poshta
        const errorMessage = data.errors?.join(', ') || data.errorCodes?.join(', ') || 'Unknown error';
        const warnings = data.warnings?.join(', ') || '';
        const fullError = warnings ? `${errorMessage}${warnings ? ` (Попередження: ${warnings})` : ''}` : errorMessage;
        
        console.error('=== Nova Poshta TTN Creation Error ===');
        console.error('Error message:', fullError);
        console.error('Error codes:', data.errorCodes);
        console.error('Warnings:', data.warnings);
        console.error('Full error response:', JSON.stringify(data, null, 2));
        console.error('Request that caused error:', JSON.stringify(requestData, null, 2));
        
        throw new Error(fullError);
    }

    if (!data.data || !data.data[0]) {
        throw new Error('No TTN data returned from API');
    }

    return data.data[0];
}

export async function POST(request: Request) {
    try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
        const { clientId, description, cost, senderId } = await request.json();

        console.log('Creating TTN with:', { clientId, senderId, description, cost });

        // Перевіряємо чи користувач авторизований
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Необхідна авторизація' },
                { status: 401 }
            );
        }

        // Отримуємо API ключ користувача
        const API_KEY = await getUserApiKey();
        if (!API_KEY) {
            return NextResponse.json(
                { error: 'API key is not configured. Please set your API key in profile settings.' },
                { status: 401 }
            );
        }

        // Перевіряємо чи існує клієнт
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError || !client) {
            console.error('Client error:', clientError);
            return NextResponse.json(
                { error: 'Клієнт не знайдений', details: clientError?.message },
                { status: 404 }
            );
        }

        console.log('Client found:', { id: client.id, city_name: client.city_name, contact_ref: client.contact_ref });

        // Перевіряємо чи існує відправник
        const { data: sender, error: senderError } = await supabase
            .from('sender')
            .select('*')
            .eq('id', senderId)
            .single();

        if (senderError || !sender) {
            console.error('Sender error:', senderError);
            return NextResponse.json(
                { error: 'Відправник не знайдений', details: senderError?.message },
                { status: 404 }
            );
        }

        console.log('Sender found:', { 
            id: sender.id, 
            city_ref: sender.city_ref, 
            sender_ref: sender.sender_ref,
            sender_address_ref: sender.sender_address_ref,
            contact_sender_ref: sender.contact_sender_ref,
            phone: sender.phone
        });
        
        // Перевіряємо, чи є всі необхідні Ref
        if (!sender.sender_ref) {
            return NextResponse.json(
                { 
                    error: 'Відсутній Ref контрагента відправника',
                    details: 'Потрібно створити відправника вручну в особистому кабінеті Nova Poshta як тип "Sender", або використати існуючого відправника. Див. інструкцію в NOVA_POSHTA_SENDER_SETUP.md'
                },
                { status: 400 }
            );
        }
        
        // Перевіряємо, чи це правильний Ref відправника (не Recipient)
        // Отримуємо список відправників через API
        if (API_KEY) {
            try {
                const senderCheckRequest = {
                    apiKey: API_KEY,
                    modelName: 'CounterpartyGeneral',
                    calledMethod: 'getCounterparties',
                    methodProperties: {
                        CounterpartyProperty: 'Sender',
                        Page: '1'
                    }
                };
                
                const senderCheckResponse = await fetch(NOVA_POSHTA_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(senderCheckRequest)
                });
                
                const senderCheckData = await senderCheckResponse.json();
                
                if (senderCheckData.success && senderCheckData.data) {
                    const isSender = senderCheckData.data.some((c: any) => c.Ref === sender.sender_ref);
                    if (!isSender) {
                        console.warn('⚠️ Sender Ref не знайдено в списку відправників. Можливо, це Recipient, а не Sender.');
                        console.warn('Available senders:', senderCheckData.data.map((c: any) => ({ Ref: c.Ref, Description: c.Description })));
                        
                        // Спробуємо знайти відправника за телефоном
                        const senderByPhone = senderCheckData.data.find((c: any) => 
                            c.Phones && Array.isArray(c.Phones) && 
                            c.Phones.some((phone: string) => phone.replace(/\D/g, '') === sender.phone.replace(/\D/g, ''))
                        );
                        
                        if (senderByPhone) {
                            console.warn('⚠️ Знайдено відправника за телефоном, але Ref не співпадає!');
                            console.warn('Found sender:', { Ref: senderByPhone.Ref, Description: senderByPhone.Description });
                            console.warn('Current sender_ref:', sender.sender_ref);
                            console.warn('💡 Рекомендація: Оновіть sender_ref в базі даних на:', senderByPhone.Ref);
                        }
                    } else {
                        console.log('✅ Sender Ref знайдено в списку відправників');
                    }
                }
            } catch (error) {
                console.warn('Could not verify sender type:', error);
            }
        }

        // Створюємо ТТН в Новій Пошті
        console.log('Creating TTN in Nova Poshta...');
        const novaPoshtaTTN = await createNovaPoshtaTTN(client, sender, description, parseFloat(cost), API_KEY);
        console.log('TTN created in Nova Poshta:', novaPoshtaTTN);

        // Зберігаємо ТТН в нашій БД
        const { data: ttn, error: ttnError } = await supabase
            .from('ttn')
            .insert([
                {
                    client_id: clientId,
                    sender_id: senderId,
                    description,
                    cost: parseFloat(cost),
                    user_id: user.id,
                    status: 'new',
                    nova_poshta_ref: novaPoshtaTTN.Ref,
                    nova_poshta_number: novaPoshtaTTN.IntDocNumber
                }
            ])
            .select()
            .single();

        if (ttnError) {
            console.error('Error saving TTN to database:', ttnError);
            return NextResponse.json(
                { error: 'Помилка при збереженні ТТН', details: ttnError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ...ttn,
            nova_poshta_number: novaPoshtaTTN.IntDocNumber,
            nova_poshta_ref: novaPoshtaTTN.Ref
        });
    } catch (error) {
        console.error('Error in TTN creation:', error);
        const errorMessage = error instanceof Error ? error.message : 'Внутрішня помилка сервера';
        return NextResponse.json(
            { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
            { status: 500 }
        );
    }
} 