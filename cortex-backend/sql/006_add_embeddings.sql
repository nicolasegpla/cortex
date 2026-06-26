-- Idempotent migration to add brewery embedding columns for pgvector.
-- Safe to re-run: each column is added only if it does not already exist.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.breweries
    ADD COLUMN IF NOT EXISTS embedding vector(1536),
    ADD COLUMN IF NOT EXISTS embedding_status text DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS embedding_model text,
    ADD COLUMN IF NOT EXISTS embedding_source_hash text,
    ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_breweries_embedding_source_hash
    ON public.breweries(embedding_source_hash);
