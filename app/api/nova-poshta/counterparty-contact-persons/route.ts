import { NextResponse } from 'next/server';
import { getUserApiKey } from '@/lib/getUserApiKey';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

/**
 * GET /api/nova-poshta/counterparty-contact-persons
 * Отримує список контактних осіб контрагента
 * 
 * Query parameters:
 * - ref: Ref контрагента (обов'язково)
 * - page: номер сторінки (опціонально, за замовчуванням '1')
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
        const ref = searchParams.get('ref');
        const page = searchParams.get('page') || '1';

        if (!ref) {
            return NextResponse.json(
                { success: false, error: 'ref parameter is required (CounterpartyRef)' },
                { status: 400 }
            );
        }

        const requestData = {
            apiKey: API_KEY,
            modelName: 'CounterpartyGeneral',
            calledMethod: 'getCounterpartyContactPersons',
            methodProperties: {
                Ref: ref,
                Page: page
            }
        };

        console.log('Nova Poshta getCounterpartyContactPersons request:', JSON.stringify(requestData, null, 2));

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();
        console.log('Nova Poshta getCounterpartyContactPersons response:', JSON.stringify(data, null, 2));

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
        console.error('Error getting counterparty contact persons:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
