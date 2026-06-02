-- Migration: Setup role-based access control
-- This migration adds role support to Supabase Auth user_metadata

-- Function to set user role in user_metadata
CREATE OR REPLACE FUNCTION public.set_user_role(user_id UUID, user_role TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', user_role)
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Set role for existing users
-- SELECT public.set_user_role('user-uuid-here', 'super_admin');
-- SELECT public.set_user_role('user-uuid-here', 'operativo');

-- Create breweries table if not exists (should already exist from schema)
-- This is just for reference
/*
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
*/

-- Enable RLS on breweries table
ALTER TABLE public.breweries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read
CREATE POLICY "Allow authenticated read" ON public.breweries
    FOR SELECT TO authenticated USING (true);

-- Create policy to allow all authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON public.breweries
    FOR INSERT TO authenticated WITH CHECK (true);

-- Create policy to allow all authenticated users to update
CREATE POLICY "Allow authenticated update" ON public.breweries
    FOR UPDATE TO authenticated USING (true);

-- Create policy to allow only super_admin to delete
CREATE POLICY "Allow super_admin delete" ON public.breweries
    FOR DELETE TO authenticated 
    USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');
