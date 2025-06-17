import { NextResponse } from 'next/server';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const API_KEY = process.env.NOVA_POSHTA_API_KEY;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || '';

    try {
        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey: API_KEY,
                modelName: 'Address',
                calledMethod: 'getCities',
                methodProperties: {
                    FindByString: searchQuery,
                    Page: '1',
                    Limit: '50',
                },
            }),
        });

        const data = await response.json();

        if (!data.success) {
            return NextResponse.json(
                { success: false, error: data.errors?.[0] || 'Unknown error' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data: data.data });
    } catch (error) {
        console.error('Error fetching cities:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch cities' },
            { status: 500 }
        );
    }
} 