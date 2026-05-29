-- Tabla para lista de espera por turno ocupado
-- Ejecutar una vez en Supabase SQL Editor.

create table if not exists public.lista_espera (
    id bigserial primary key,
    negocio_id uuid not null,
    cliente_nombre text not null,
    cliente_whatsapp text not null,
    servicio text not null,
    duracion integer,
    profesional_id integer not null,
    profesional_nombre text,
    fecha date not null,
    hora_inicio time not null,
    hora_fin time,
    estado text not null default 'esperando',
    fecha_notificacion timestamptz,
    created_at timestamptz not null default now()
);

create unique index if not exists lista_espera_unica_turno_activo
on public.lista_espera (negocio_id, profesional_id, fecha, hora_inicio)
where estado in ('esperando', 'notificada');

create index if not exists lista_espera_negocio_fecha_idx
on public.lista_espera (negocio_id, fecha, profesional_id);

alter table public.lista_espera enable row level security;

drop policy if exists "lista_espera_select_public" on public.lista_espera;
create policy "lista_espera_select_public"
on public.lista_espera for select
using (true);

drop policy if exists "lista_espera_insert_public" on public.lista_espera;
create policy "lista_espera_insert_public"
on public.lista_espera for insert
with check (true);

drop policy if exists "lista_espera_update_public" on public.lista_espera;
create policy "lista_espera_update_public"
on public.lista_espera for update
using (true)
with check (true);
