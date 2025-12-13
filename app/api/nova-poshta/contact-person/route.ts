import { NextResponse } from 'next/server';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const API_KEY = process.env.NOVA_POSHTA_API_KEY;

export async function POST(request: Request) {
    try {
        if (!API_KEY) {
            console.error('NOVA_POSHTA_API_KEY is not set');
            return NextResponse.json(
                { success: false, error: 'API key is not configured' },
                { status: 500 }
            );
        }

        const { counterpartyRef, firstName, lastName, middleName = '', phone } = await request.json();

        if (!counterpartyRef || !firstName || !lastName || !phone) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: counterpartyRef, firstName, lastName, phone' },
                { status: 400 }
            );
        }

        console.log('Creating contact person with:', { counterpartyRef, firstName, lastName, middleName, phone });

        const requestData = {
            apiKey: API_KEY,
            modelName: 'ContactPersonGeneral',
            calledMethod: 'save',
            methodProperties: {
                CounterpartyRef: counterpartyRef,
                FirstName: firstName,
                LastName: lastName,
                MiddleName: middleName,
                Phone: phone
            }
        };

        console.log('Nova Poshta contact person request:', JSON.stringify(requestData, null, 2));

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();
        console.log('Nova Poshta contact person response:', JSON.stringify(data, null, 2));
        
        if (!data.success) {
            const errorMessage = data.errors?.join(', ') || data.errorCodes?.join(', ') || 'Unknown error';
            console.error('Nova Poshta API error:', errorMessage);
            return NextResponse.json(
                { success: false, error: errorMessage }
            );
        }

        if (!data.data || !data.data[0]) {
            return NextResponse.json(
                { success: false, error: 'No contact person data returned' }
            );
        }

        const contactPerson = data.data[0];
        
        return NextResponse.json({
            success: true,
            data: {
                Ref: contactPerson.Ref,
                CounterpartyRef: counterpartyRef,
                FirstName: contactPerson.FirstName,
                LastName: contactPerson.LastName,
                MiddleName: contactPerson.MiddleName,
                Phone: contactPerson.Phone
            }
        });
    } catch (error) {
        console.error('Error creating contact person:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

