-- Agrega categorias a servicios para agruparlos en admin y selector cliente.
-- Ejecutar una sola vez en Supabase. Sirve para todos los negocios porque la tabla es compartida.

ALTER TABLE public.servicios
ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'otros';

UPDATE public.servicios
SET categoria = CASE
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%pedic%' THEN 'pedicura'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%pie%' THEN 'pedicura'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%facial%' THEN 'faciales'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%limpieza%' THEN 'faciales'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%barba%' THEN 'barberia'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%corte%' THEN 'barberia'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%ceja%' THEN 'cejas'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%pesta%' THEN 'cejas'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%combo%' THEN 'combos'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%paquete%' THEN 'combos'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%manic%' THEN 'manicura'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%uña%' THEN 'manicura'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%una%' THEN 'manicura'
  WHEN lower(coalesce(nombre, '') || ' ' || coalesce(descripcion, '')) LIKE '%gel%' THEN 'manicura'
  ELSE coalesce(categoria, 'otros')
END
WHERE categoria IS NULL OR categoria = '' OR categoria = 'otros';

CREATE INDEX IF NOT EXISTS idx_servicios_negocio_categoria
ON public.servicios (negocio_id, categoria);
