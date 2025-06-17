-- Create sender table
CREATE TABLE IF NOT EXISTS sender (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    city_ref VARCHAR(36) NOT NULL,
    city_name VARCHAR(255) NOT NULL,
    sender_ref VARCHAR(36) NOT NULL,
    sender_address_ref VARCHAR(36) NOT NULL,
    sender_address_name VARCHAR(255) NOT NULL,
    contact_sender_ref VARCHAR(36) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE sender ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own senders"
    ON sender FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own senders"
    ON sender FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own senders"
    ON sender FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own senders"
    ON sender FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX sender_user_id_idx ON sender(user_id);
CREATE INDEX sender_city_ref_idx ON sender(city_ref);
CREATE INDEX sender_created_at_idx ON sender(created_at);

-- Create updated_at trigger
CREATE TRIGGER set_sender_updated_at
    BEFORE UPDATE ON sender
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 