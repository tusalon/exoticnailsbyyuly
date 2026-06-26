-- Agrega rango de precio y moneda por servicio.
-- Ejecutar una vez en Supabase SQL Editor.

ALTER TABLE public.servicios
ADD COLUMN IF NOT EXISTS precio_desde numeric,
ADD COLUMN IF NOT EXISTS precio_hasta numeric,
ADD COLUMN IF NOT EXISTS precio_moneda text DEFAULT 'CUP';

UPDATE public.servicios
SET
  precio_desde = COALESCE(precio_desde, precio),
  precio_moneda = COALESCE(NULLIF(UPPER(precio_moneda), ''), 'CUP')
WHERE precio_desde IS NULL
   OR precio_moneda IS NULL
   OR precio_moneda = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'servicios_precio_moneda_check'
  ) THEN
    ALTER TABLE public.servicios
    ADD CONSTRAINT servicios_precio_moneda_check
    CHECK (precio_moneda IN ('CUP', 'USD'));
  END IF;
END $$;
