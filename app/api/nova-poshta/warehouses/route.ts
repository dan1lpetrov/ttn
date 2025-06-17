import { NextResponse } from 'next/server';

const NOVA_POSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const API_KEY = process.env.NOVA_POSHTA_API_KEY;

interface Warehouse {
    Description: string;
    Ref: string;
    [key: string]: string | number | boolean;
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
        const response = await fetch(NOVA_POSHTA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey: API_KEY,
                modelName: 'Address',
                calledMethod: 'getWarehouses',
                methodProperties: {
                    CityRef: cityRef,
                    FindByString: searchQuery,
                    Page: '1',
                    Limit: '100',
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

        // Якщо пошук - число, шукаємо відділення, що містять це число
        if (!isNaN(Number(searchQuery))) {
            const filteredData = data.data.filter((warehouse: Warehouse) => 
                warehouse.Description.includes(searchQuery)
            );
            return NextResponse.json({ success: true, data: filteredData });
        }

        return NextResponse.json({ success: true, data: data.data });
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch warehouses' },
            { status: 500 }
        );
    }
} 