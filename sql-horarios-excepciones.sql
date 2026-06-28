-- Horarios temporales por rango de fechas para profesionales.

CREATE TABLE IF NOT EXISTS public.horarios_excepciones_profesionales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    profesional_id integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    horarios_por_dia jsonb NOT NULL DEFAULT '{}',
    descansos_por_dia jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    CONSTRAINT horarios_excepciones_rango_valido CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_horarios_excepciones_negocio_profesional_inicio
ON public.horarios_excepciones_profesionales (negocio_id, profesional_id, fecha_inicio);

ALTER TABLE public.horarios_excepciones_profesionales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "horarios_excepciones_acceso_por_negocio" ON public.horarios_excepciones_profesionales;

CREATE POLICY "horarios_excepciones_acceso_por_negocio"
ON public.horarios_excepciones_profesionales
FOR ALL
USING (negocio_id IS NOT NULL)
WITH CHECK (negocio_id IS NOT NULL);
