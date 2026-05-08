-- Tabla para bloquear clientes por negocio
create table if not exists public.clientes_bloqueados (
    id uuid primary key default gen_random_uuid(),
    negocio_id uuid not null references public.negocios(id) on delete cascade,
    nombre text,
    whatsapp text not null,
    motivo text,
    activo boolean not null default true,
    fecha_bloqueo timestamptz not null default now(),
    fecha_desbloqueo timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_clientes_bloqueados_negocio_whatsapp
on public.clientes_bloqueados (negocio_id, whatsapp);

create unique index if not exists uniq_cliente_bloqueado_activo
on public.clientes_bloqueados (negocio_id, whatsapp)
where activo = true;

alter table public.clientes_bloqueados enable row level security;

drop policy if exists "clientes_bloqueados_read" on public.clientes_bloqueados;
create policy "clientes_bloqueados_read"
on public.clientes_bloqueados for select
using (true);

drop policy if exists "clientes_bloqueados_insert" on public.clientes_bloqueados;
create policy "clientes_bloqueados_insert"
on public.clientes_bloqueados for insert
with check (true);

drop policy if exists "clientes_bloqueados_update" on public.clientes_bloqueados;
create policy "clientes_bloqueados_update"
on public.clientes_bloqueados for update
using (true)
with check (true);
