CREATE TABLE IF NOT EXISTS public.wine_producers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial TEXT NOT NULL,
    razon_social TEXT,
    nit TEXT,
    direccion TEXT,
    ciudad TEXT,
    pais TEXT,
    nombre_contacto TEXT,
    celular TEXT,
    correo TEXT,
    marcas TEXT[],
    fuente_azucar TEXT,
    tipo_uva TEXT[],
    tipo_vino TEXT[],
    levaduras_utilizadas TEXT[],
    botellas_utilizadas TEXT[],
    nutrientes_utilizados TEXT[],
    conservantes_utilizados TEXT[],
    clarificantes_utilizados TEXT[],
    produccion_anual TEXT,
    observaciones TEXT,
    oportunidades TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wine_producers_nit ON public.wine_producers(nit);
CREATE INDEX idx_wine_producers_ciudad ON public.wine_producers(ciudad);
CREATE INDEX idx_wine_producers_marcas ON public.wine_producers USING gin(marcas);
CREATE INDEX idx_wine_producers_tipo_uva ON public.wine_producers USING gin(tipo_uva);

CREATE TRIGGER update_wine_producers_updated_at
    BEFORE UPDATE ON public.wine_producers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.wine_producers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.wine_producers
    FOR ALL USING (true) WITH CHECK (true);
