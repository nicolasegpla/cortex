CREATE TABLE IF NOT EXISTS public.animal_feed_producers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razon_social TEXT NOT NULL,
    marca TEXT,
    nit TEXT,
    direccion TEXT,
    departamento TEXT,
    ciudad TEXT,
    pais TEXT,
    nombre_contacto TEXT,
    celular TEXT,
    correo TEXT,
    especies_manejadas TEXT[],
    productos_fabricados TEXT[],
    observaciones TEXT,
    oportunidades TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_animal_feed_producers_nit ON public.animal_feed_producers(nit);
CREATE INDEX idx_animal_feed_producers_ciudad ON public.animal_feed_producers(ciudad);
CREATE INDEX idx_animal_feed_producers_especies ON public.animal_feed_producers USING gin(especies_manejadas);

CREATE TRIGGER update_animal_feed_producers_updated_at
    BEFORE UPDATE ON public.animal_feed_producers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.animal_feed_producers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.animal_feed_producers
    FOR ALL USING (true) WITH CHECK (true);
