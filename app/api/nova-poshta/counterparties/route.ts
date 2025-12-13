import { NextResponse } from 'next/server';
import { getUserApiKey } from '@/lib/getUserApiKey';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

/**
 * GET /api/nova-poshta/counterparties
 * Отримує список контрагентів відправників / одержувачів / третіх осіб
 * 
 * Query parameters:
 * - counterpartyProperty: 'Sender' | 'Recipient' | 'ThirdPerson' (обов'язково)
 * - page: номер сторінки (опціонально, за замовчуванням '1')
 * - findByString: пошук по назві контрагента (опціонально)
 */
export async function GET(request: Request) {
    try {
        const API_KEY = await getUserApiKey();
        
        if (!API_KEY) {
            return NextResponse.json(
                { success: false, error: 'API key is not configured. Please set your API key in profile settings.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const counterpartyProperty = searchParams.get('counterpartyProperty');
        const page = searchParams.get('page') || '1';
        const findByString = searchParams.get('findByString') || '';

        if (!counterpartyProperty) {
            return NextResponse.json(
                { success: false, error: 'counterpartyProperty parameter is required (Sender, Recipient, or ThirdPerson)' },
                { status: 400 }
            );
        }

        if (!['Sender', 'Recipient', 'ThirdPerson'].includes(counterpartyProperty)) {
            return NextResponse.json(
                { success: false, error: 'counterpartyProperty must be one of: Sender, Recipient, ThirdPerson' },
                { status: 400 }
            );
        }

        const requestData: any = {
            apiKey: API_KEY,
            modelName: 'CounterpartyGeneral',
            calledMethod: 'getCounterparties',
            methodProperties: {
                CounterpartyProperty: counterpartyProperty,
                Page: page
            }
        };

        // Додаємо пошук, якщо він є
        if (findByString && findByString.trim()) {
            requestData.methodProperties.FindByString = findByString.trim();
        }

        console.log('Nova Poshta getCounterparties request:', JSON.stringify(requestData, null, 2));

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();
        console.log('Nova Poshta getCounterparties response:', JSON.stringify(data, null, 2));

        if (!data.success) {
            const errorMessage = data.errors?.join(', ') || data.errorCodes?.join(', ') || 'Unknown error';
            console.error('Nova Poshta API error:', errorMessage);
            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data.data || []
        });
    } catch (error) {
        console.error('Error getting counterparts:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
