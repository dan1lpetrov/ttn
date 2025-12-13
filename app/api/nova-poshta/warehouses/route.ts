import { NextResponse } from 'next/server';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

interface Warehouse {
    Description: string;
    DescriptionRu?: string;
    Ref: string;
    Number?: string;
    [key: string]: string | number | boolean | undefined;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cityRef = searchParams.get('cityRef');
    const searchQuery = searchParams.get('search') || '';

    if (!cityRef) {
        return NextResponse.json(
            { success: false, error: 'City reference is required' },
            { status: 400 }
        );
    }

    try {
        // Використовуємо публічне API без ключа
        const requestBody: any = {
            modelName: 'Address',
            calledMethod: 'getWarehouses',
            methodProperties: {
                CityRef: cityRef,
                Limit: '100',
                Language: 'UA',
            },
        };

        // Додаємо пошук, якщо він є
        if (searchQuery && searchQuery.trim()) {
            requestBody.methodProperties.FindByString = searchQuery.trim();
        }

        console.log('Nova Poshta warehouses request:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log('Nova Poshta warehouses response:', JSON.stringify(data, null, 2));

        if (!data.success) {
            const errorMessage = data.errors?.[0] || data.errorCodes?.[0] || 'Unknown error';
            console.error('Nova Poshta API error:', errorMessage, data);
            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: 400 }
            );
        }

        let warehouses = data.data || [];

        // Якщо пошук - число, фільтруємо відділення за номером
        if (searchQuery && !isNaN(Number(searchQuery))) {
            warehouses = warehouses.filter((warehouse: Warehouse) => 
                warehouse.Number === searchQuery || 
                warehouse.Description?.includes(searchQuery) ||
                warehouse.DescriptionRu?.includes(searchQuery)
            );
        }

        return NextResponse.json({ success: true, data: warehouses });
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch warehouses' },
            { status: 500 }
        );
    }
} 