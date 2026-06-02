CREATE TABLE IF NOT EXISTS public.coffee_farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_finca TEXT NOT NULL,
    razon_social TEXT,
    nit TEXT,
    direccion TEXT,
    departamento TEXT,
    ciudad TEXT,
    pais TEXT,
    nombre_contacto TEXT,
    celular TEXT,
    correo TEXT,
    tipo_actividad TEXT CHECK (tipo_actividad IN ('Productor', 'Cooperativa', 'Asociacion', 'Exportador', 'Tostador')),
    hectareas_totales NUMERIC(10, 2),
    hectareas_cafe NUMERIC(10, 2),
    numero_arboles INTEGER,
    variedades_sembradas TEXT[],
    tipo_proceso TEXT CHECK (tipo_proceso IN ('Lavado', 'Natural', 'Honey', 'Anaerobico', 'Maceracion carbonica')),
    puntaje_cafe NUMERIC(3, 1),
    nivel_tecnificacion TEXT CHECK (nivel_tecnificacion IN ('Manual', 'Semi automatizado', 'Tecnificado')),
    equipos TEXT[],
    observaciones TEXT,
    oportunidades TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coffee_farms_nit ON public.coffee_farms(nit);
CREATE INDEX idx_coffee_farms_ciudad ON public.coffee_farms(ciudad);
CREATE INDEX idx_coffee_farms_tipo_actividad ON public.coffee_farms(tipo_actividad);
CREATE INDEX idx_coffee_farms_variedades ON public.coffee_farms USING gin(variedades_sembradas);

CREATE TRIGGER update_coffee_farms_updated_at
    BEFORE UPDATE ON public.coffee_farms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.coffee_farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.coffee_farms
    FOR ALL USING (true) WITH CHECK (true);
