import { NextResponse } from 'next/server';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const API_KEY = process.env.NOVA_POSHTA_API_KEY;

/**
 * GET /api/nova-poshta/counterparty-addresses
 * Отримує список адрес контрагента
 * 
 * Query parameters:
 * - ref: Ref контрагента (обов'язково)
 * - page: номер сторінки (опціонально, за замовчуванням '1')
 */
export async function GET(request: Request) {
    try {
        if (!API_KEY) {
            console.error('NOVA_POSHTA_API_KEY is not set');
            return NextResponse.json(
                { success: false, error: 'API key is not configured' },
                { status: 500 }
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
            modelName: 'Counterparty',
            calledMethod: 'getCounterpartyAddresses',
            methodProperties: {
                Ref: ref,
                Page: page
            }
        };

        console.log('Nova Poshta getCounterpartyAddresses request:', JSON.stringify(requestData, null, 2));

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();
        console.log('Nova Poshta getCounterpartyAddresses response:', JSON.stringify(data, null, 2));

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
        console.error('Error getting counterparty addresses:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

