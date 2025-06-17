-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city_name TEXT NOT NULL,
    warehouse_name TEXT NOT NULL,
    city_ref TEXT NOT NULL,
    warehouse_ref TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients (phone);

-- Create index on city_ref and warehouse_ref for faster lookups
CREATE INDEX IF NOT EXISTS clients_city_warehouse_idx ON clients (city_ref, warehouse_ref);

-- Add RLS policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to select clients
CREATE POLICY "Allow authenticated users to select clients"
    ON clients
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy for authenticated users to insert clients
CREATE POLICY "Allow authenticated users to insert clients"
    ON clients
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy for authenticated users to update clients
CREATE POLICY "Allow authenticated users to update clients"
    ON clients
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy for authenticated users to delete clients
CREATE POLICY "Allow authenticated users to delete clients"
    ON clients
    FOR DELETE
    TO authenticated
    USING (true); 