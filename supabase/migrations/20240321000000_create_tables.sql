-- Create client table
CREATE TABLE IF NOT EXISTS client (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city_ref TEXT NOT NULL,
    city_name TEXT NOT NULL,
    warehouse_ref TEXT NOT NULL,
    warehouse_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE client ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
    ON client FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
    ON client FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
    ON client FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
    ON client FOR DELETE
    USING (auth.uid() = user_id); 