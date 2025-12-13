import { NextResponse } from 'next/server';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || '';

    if (!searchQuery || searchQuery.length < 2) {
        return NextResponse.json(
            { success: true, data: [] },
            { status: 200 }
        );
    }

    try {
        // Використовуємо публічне API без ключа
        const requestBody = {
            modelName: 'Address',
            calledMethod: 'searchSettlements',
            methodProperties: {
                CityName: searchQuery,
                Limit: '50',
            },
        };

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!data.success) {
            const errorMessage = data.errors?.[0] || data.errorCodes?.[0] || 'Unknown error';
            console.error('Nova Poshta API error:', errorMessage);
            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: 400 }
            );
        }

        // Обробка відповіді від searchSettlements
        let cities: any[] = [];
        if (data.data && Array.isArray(data.data)) {
            // searchSettlements повертає масив об'єктів з Addresses
            data.data.forEach((item: any) => {
                if (item.Addresses && Array.isArray(item.Addresses)) {
                    item.Addresses.forEach((address: any) => {
                        cities.push({
                            Ref: address.DeliveryCity,
                            Description: address.Present,
                            DescriptionRu: address.Present,
                            Area: item.Area || '',
                            AreaDescription: item.AreaDescription || '',
                            AreaDescriptionRu: item.AreaDescriptionRu || '',
                        });
                    });
                }
            });
        }

        return NextResponse.json({ success: true, data: cities });
    } catch (error) {
        console.error('Error fetching cities:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch cities' },
            { status: 500 }
        );
    }
} 