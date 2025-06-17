import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const NOVA_POSHTA_API_KEY = process.env.NOVA_POSHTA_API_KEY;

interface NovaPoshtaResponse {
    success: boolean;
    data: any[];
    errors: any[];
    warnings: any[];
    info: any[];
}

async function createNovaPoshtaTTN(client: any, sender: any, description: string, cost: number) {
    // Спочатку отримуємо місто отримувача
    const cityRequest = {
        apiKey: NOVA_POSHTA_API_KEY,
        modelName: 'Address',
        calledMethod: 'searchSettlements',
        methodProperties: {
            CityName: client.city_name,
            Limit: 1
        }
    };

    const cityResponse = await fetch(NOVA_POSHTA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cityRequest)
    });

    const cityData = await cityResponse.json();
    if (!cityData.success || !cityData.data[0]?.Addresses?.[0]) {
        throw new Error('Місто отримувача не знайдено');
    }

    const recipientCity = cityData.data[0].Addresses[0];

    // Отримуємо відділення отримувача
    const warehouseRequest = {
        apiKey: NOVA_POSHTA_API_KEY,
        modelName: 'Address',
        calledMethod: 'getWarehouses',
        methodProperties: {
            CityRef: recipientCity.Ref,
            Language: 'UA',
            TypeOfWarehouseRef: '9a68df70-0267-42a8-bb5c-37f427e36ee4' // Тип відділення: Відділення
        }
    };

    const warehouseResponse = await fetch(NOVA_POSHTA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouseRequest)
    });

    const warehouseData = await warehouseResponse.json();
    if (!warehouseData.success || !warehouseData.data?.length) {
        throw new Error('Відділення отримувача не знайдено');
    }

    // Шукаємо відділення за номером
    const warehouseNumber = client.warehouse_name.match(/\d+/)?.[0];
    const recipientWarehouse = warehouseData.data.find(w => 
        w.Number === warehouseNumber || 
        w.Description.includes(warehouseNumber || '')
    ) || warehouseData.data[0];

    // Створюємо ТТН
    const requestData = {
        apiKey: NOVA_POSHTA_API_KEY,
        modelName: 'InternetDocument',
        calledMethod: 'save',
        methodProperties: {
            PayerType: 'Recipient',
            PaymentMethod: 'Cash',
            DateTime: new Date().toISOString().split('T')[0],
            CargoType: 'Parcel',
            VolumeGeneral: '0.0004',
            Weight: '0.5',
            ServiceType: 'WarehouseWarehouse',
            SeatsAmount: '1',
            Description: description,
            Cost: cost.toString(),
            
            // Дані відправника
            CitySender: sender.city_ref,
            Sender: sender.sender_ref,
            SenderAddress: sender.sender_address_ref,
            ContactSender: sender.contact_sender_ref,
            SendersPhone: sender.phone,

            // Дані отримувача
            CityRecipient: recipientCity.Ref,
            RecipientAddress: recipientWarehouse.Ref,
            Recipient: client.contact_ref,
            ContactRecipient: client.contact_ref,
            RecipientsPhone: client.phone.replace(/\D/g, ''),
            RecipientEmail: '',
            RecipientDateTime: new Date().toISOString().split('T')[0],
            SenderWarehouseIndex: sender.sender_address_ref,
            RecipientWarehouseIndex: recipientWarehouse.Ref,
            OptionsSeat: [{
                volumetricVolume: '0.0004',
                volumetricWidth: '0.1',
                volumetricLength: '0.1',
                volumetricHeight: '0.1',
                weight: '0.5'
            }]
        }
    };

    const response = await fetch(NOVA_POSHTA_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
    });

    const data: NovaPoshtaResponse = await response.json();
    
    if (!data.success) {
        throw new Error(data.errors.join(', '));
    }

    return data.data[0];
}

export async function POST(request: Request) {
    try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
        const { clientId, description, cost, senderId } = await request.json();

        // Перевіряємо чи користувач авторизований
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Необхідна авторизація' },
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
            return NextResponse.json(
                { error: 'Клієнт не знайдений' },
                { status: 404 }
            );
        }

        // Перевіряємо чи існує відправник
        const { data: sender, error: senderError } = await supabase
            .from('sender')
            .select('*')
            .eq('id', senderId)
            .single();

        if (senderError || !sender) {
            return NextResponse.json(
                { error: 'Відправник не знайдений' },
                { status: 404 }
            );
        }

        // Створюємо ТТН в Новій Пошті
        const novaPoshtaTTN = await createNovaPoshtaTTN(client, sender, description, parseFloat(cost));

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
            console.error('Error creating TTN:', ttnError);
            return NextResponse.json(
                { error: 'Помилка при створенні ТТН' },
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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Внутрішня помилка сервера' },
            { status: 500 }
        );
    }
} 