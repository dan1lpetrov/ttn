import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL exists:', !!supabaseUrl);
console.log('Supabase Service Key exists:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
    console.log('Received POST request to /api/clients');
    
    try {
        const body = await request.json();
        console.log('Received request body:', body);

        const { 
            firstName, 
            lastName, 
            phone, 
            cityName, 
            warehouseDesc,
            cityRef, 
            warehouseRef,
            contactRef,
            counterpartyRef,
            userId
        } = body;

        // Validate required fields
        if (!firstName || !lastName || !phone || !cityName || !warehouseDesc || !cityRef || !warehouseRef || !contactRef || !counterpartyRef || !userId) {
            console.log('Missing required fields:', {
                firstName: !firstName,
                lastName: !lastName,
                phone: !phone,
                cityName: !cityName,
                warehouseDesc: !warehouseDesc,
                cityRef: !cityRef,
                warehouseRef: !warehouseRef,
                contactRef: !contactRef,
                counterpartyRef: !counterpartyRef,
                userId: !userId
            });
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log('Attempting to insert client with data:', {
            first_name: firstName,
            last_name: lastName,
            phone,
            city_name: cityName,
            warehouse_desc: warehouseDesc,
            city_ref: cityRef,
            warehouse_ref: warehouseRef,
            contact_ref: contactRef,
            counterparty_ref: counterpartyRef,
            user_id: userId
        });

        // Insert client into database
        const { data, error } = await supabase
            .from('clients')
            .insert([
                {
                    first_name: firstName,
                    last_name: lastName,
                    phone,
                    city_name: cityName,
                    warehouse_desc: warehouseDesc,
                    city_ref: cityRef,
                    warehouse_ref: warehouseRef,
                    contact_ref: contactRef,
                    counterparty_ref: counterpartyRef,
                    user_id: userId
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return NextResponse.json(
                { error: 'Failed to create client', details: error.message },
                { status: 500 }
            );
        }

        console.log('Successfully inserted client:', data);
        return NextResponse.json({ 
            message: 'Client created successfully',
            client: data 
        });
    } catch (error) {
        console.error('Error in POST /api/clients:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 