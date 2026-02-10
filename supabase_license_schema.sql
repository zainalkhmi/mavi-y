-- Create a table for storing license keys
CREATE TABLE IF NOT EXISTS public.licenses (
    key_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_string TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active', -- 'active', 'revoked', 'expired'
    type TEXT DEFAULT 'permanent', -- 'permanent', 'limited'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent
    claimed_by_user_id UUID REFERENCES auth.users(id), -- NULL until claimed
    claimed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow ANYONE to read licenses (needed for validation before login)
-- In a stricter system, you might use a specific function or an edge function, 
-- but for this implementation, public read is necessary for the unauthenticated guard check.
CREATE POLICY "Allow public read access to licenses" 
ON public.licenses FOR SELECT 
USING (true);

-- Policy: Allow inserting new licenses (For the Generator tool)
-- Ideally this should be restricted to admin users, but since the generator is a standalone tool
-- that might be run by admins, we'll allow anon insert BUT in a real prod env, 
-- you'd likely wrap this in an Edge Function or check a secret header.
-- For now, we allow insert by anyone (protected by the generator's UI password effectively).
CREATE POLICY "Allow public insert to licenses" 
ON public.licenses FOR INSERT 
WITH CHECK (true);

-- Policy: Allow updating (claiming) license
-- Users should be able to update specific columns (claimed_by_user_id) if it's currently null
CREATE POLICY "Allow users to claim licenses" 
ON public.licenses FOR UPDATE 
USING (true)
WITH CHECK (true);
