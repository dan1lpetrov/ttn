import { NextResponse } from 'next/server';
import { getUserApiKey } from '@/lib/getUserApiKey';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

export async function POST(request: Request) {
    try {
        const API_KEY = await getUserApiKey();
        
        if (!API_KEY) {
            return NextResponse.json(
                { success: false, error: 'API key is not configured. Please set your API key in profile settings.' },
                { status: 401 }
            );
        }

        const { firstName, lastName, phone, counterpartyProperty = 'Recipient' } = await request.json();

        console.log('Creating counterparty with:', { firstName, lastName, phone, counterpartyProperty, apiKeyExists: !!API_KEY });

        const requestData = {
            apiKey: API_KEY,
            modelName: 'Counterparty',
            calledMethod: 'save',
            methodProperties: {
                FirstName: firstName,
                LastName: lastName,
                Phone: phone,
                CounterpartyType: 'PrivatePerson',
                CounterpartyProperty: counterpartyProperty // 'Recipient' або 'Sender'
            }
        };

        console.log('Nova Poshta request:', JSON.stringify(requestData, null, 2));

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();
        console.log('Nova Poshta response:', JSON.stringify(data, null, 2));
        
        if (!data.success) {
            const errorMessage = data.errors?.join(', ') || data.errorCodes?.join(', ') || 'Unknown error';
            console.error('Nova Poshta API error:', errorMessage);
            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: 400 }
            );
        }

        // Отримуємо дані контрагента та контактної особи
        const counterpartyData = data.data?.[0];
        if (!counterpartyData) {
            return NextResponse.json(
                { success: false, error: 'No data returned from API' },
                { status: 400 }
            );
        }

        // Отримуємо contactRef з ContactPerson, якщо він є
        const contactRef = counterpartyData.ContactPerson?.data?.[0]?.Ref || counterpartyData.Ref;

        return NextResponse.json({ 
            success: true, 
            data: {
                Ref: counterpartyData.Ref,
                ContactRef: contactRef,
                ...counterpartyData
            }
        });
    } catch (error) {
        console.error('Error creating counterparty:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create counterparty' },
            { status: 500 }
        );
    }
} 