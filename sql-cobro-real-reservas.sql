-- Campos para registrar el cobro real de citas completadas.
-- Ejecutar una vez en Supabase SQL Editor.

alter table public.reservas
add column if not exists monto_cobrado numeric(10,2),
add column if not exists notas_cobro text,
add column if not exists cobro_registrado_at timestamptz;
