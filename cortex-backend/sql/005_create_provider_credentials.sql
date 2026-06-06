-- Supabase SQL Editor: ejecutar TODO de una vez
-- Si el editor da error, desactiva "Explain" o ejecuta por partes

CREATE TABLE IF NOT EXISTS public.provider_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    label TEXT,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider)
);

ALTER TABLE public.provider_credentials
    DROP CONSTRAINT IF EXISTS provider_credentials_provider_check;

ALTER TABLE public.provider_credentials
    ADD CONSTRAINT provider_credentials_provider_check
    CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek'));

CREATE INDEX IF NOT EXISTS idx_provider_credentials_user_id ON public.provider_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider ON public.provider_credentials(provider);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_provider_credentials_updated_at ON public.provider_credentials;

CREATE TRIGGER update_provider_credentials_updated_at
    BEFORE UPDATE ON public.provider_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;

-- Policies: user can only access their own credentials
DROP POLICY IF EXISTS "Allow select own credentials" ON public.provider_credentials;
CREATE POLICY "Allow select own credentials"
    ON public.provider_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow insert own credentials" ON public.provider_credentials;
CREATE POLICY "Allow insert own credentials"
    ON public.provider_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow update own credentials" ON public.provider_credentials;
CREATE POLICY "Allow update own credentials"
    ON public.provider_credentials
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow delete own credentials" ON public.provider_credentials;
CREATE POLICY "Allow delete own credentials"
    ON public.provider_credentials
    FOR DELETE
    USING (auth.uid() = user_id);
