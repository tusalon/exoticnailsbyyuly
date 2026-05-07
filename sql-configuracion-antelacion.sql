alter table public.configuracion
add column if not exists min_antelacion_horas integer not null default 2,
add column if not exists min_cancelacion_horas integer not null default 1;

update public.configuracion
set
    min_antelacion_horas = coalesce(min_antelacion_horas, 2),
    min_cancelacion_horas = coalesce(min_cancelacion_horas, 1);
