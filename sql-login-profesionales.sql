-- Login seguro de profesionales para el panel.
-- Ejecutar una vez en Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.login_profesional(
    p_negocio_id uuid,
    p_telefono text,
    p_password text
)
returns table (
    id bigint,
    nombre text,
    telefono text,
    nivel integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_hash text;
begin
    v_hash := 'sha256$' || encode(digest(coalesce(p_password, ''), 'sha256'), 'hex');

    return query
    select
        p.id,
        p.nombre,
        p.telefono,
        coalesce(p.nivel, 1)::integer as nivel
    from public.profesionales p
    where p.negocio_id = p_negocio_id
      and p.telefono = regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g')
      and p.activo = true
      and (
          p.password = v_hash
          or p.password = coalesce(p_password, '')
      )
    limit 1;
end;
$$;

grant execute on function public.login_profesional(uuid, text, text) to anon, authenticated;
