-- Supabase SQL Editor: ejecutar TODO de una vez
-- Si el editor da error, desactiva "Explain" o ejecuta por partes

CREATE TABLE IF NOT EXISTS public.breweries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_cerveceria TEXT NOT NULL,
    razon_social TEXT,
    nit TEXT,
    direccion TEXT,
    ciudad TEXT,
    pais TEXT,
    nombre_contacto TEXT,
    nombre_cervecero TEXT,
    celular_1 TEXT,
    celular_2 TEXT,
    correo TEXT,
    maltas_utilizadas TEXT[],
    lupulos_utilizados TEXT[],
    levaduras_utilizadas TEXT[],
    utiliza_otros_productos BOOLEAN DEFAULT false,
    estilos_cerveza TEXT[],
    tipo_operacion TEXT CHECK (tipo_operacion IN ('maquila', 'planta_propia', 'ambos')),
    marca_equipo TEXT,
    capacidad_brewhouse TEXT,
    capacidad_fermentacion TEXT,
    litros_mes INTEGER,
    calidad_equipo TEXT,
    formatos_venta TEXT[],
    donde_vende TEXT,
    observaciones TEXT,
    oportunidades TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_breweries_nit ON public.breweries(nit);
CREATE INDEX idx_breweries_ciudad ON public.breweries(ciudad);
CREATE INDEX idx_breweries_estilos ON public.breweries USING gin(estilos_cerveza);
CREATE INDEX idx_breweries_formatos ON public.breweries USING gin(formatos_venta);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_breweries_updated_at
    BEFORE UPDATE ON public.breweries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.breweries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.breweries
    FOR ALL USING (true) WITH CHECK (true);
