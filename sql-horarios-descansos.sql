alter table public.horarios_profesionales
add column if not exists descansos_por_dia jsonb not null default '{}'::jsonb;
