import { NextResponse } from 'next/server';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const API_KEY = process.env.NOVA_POSHTA_API_KEY;

export async function POST(request: Request) {
    try {
        const { firstName, lastName, phone } = await request.json();

        const requestData = {
            apiKey: API_KEY,
            modelName: 'Counterparty',
            calledMethod: 'save',
            methodProperties: {
                FirstName: firstName,
                LastName: lastName,
                Phone: phone,
                Email: '',
                CounterpartyType: 'PrivatePerson',
                CounterpartyProperty: 'Recipient'
            }
        };

        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();
        
        if (!data.success) {
            return NextResponse.json(
                { success: false, error: data.errors.join(', ') },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data: data.data[0] });
    } catch (error) {
        console.error('Error creating counterparty:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create counterparty' },
            { status: 500 }
        );
    }
} 