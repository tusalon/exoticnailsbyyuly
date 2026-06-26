-- Anticipos independientes por servicio.
-- Ejecutar una vez en Supabase SQL Editor.

ALTER TABLE public.negocios
ADD COLUMN IF NOT EXISTS anticipos_por_servicio boolean DEFAULT false;

ALTER TABLE public.servicios
ADD COLUMN IF NOT EXISTS requiere_anticipo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tipo_anticipo text DEFAULT 'fijo',
ADD COLUMN IF NOT EXISTS valor_anticipo numeric;

UPDATE public.negocios
SET anticipos_por_servicio = COALESCE(anticipos_por_servicio, false);

UPDATE public.servicios
SET
  requiere_anticipo = COALESCE(requiere_anticipo, false),
  tipo_anticipo = COALESCE(NULLIF(tipo_anticipo, ''), 'fijo');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'servicios_tipo_anticipo_check'
  ) THEN
    ALTER TABLE public.servicios
    ADD CONSTRAINT servicios_tipo_anticipo_check
    CHECK (tipo_anticipo IN ('fijo', 'porcentaje'));
  END IF;
END $$;
