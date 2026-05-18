-- Detecta duplicados exactos antes de crear el indice.
select
  negocio_id,
  lower(trim(coalesce(cliente_nombre, ''))) as cliente,
  regexp_replace(coalesce(cliente_whatsapp, ''), '\D', '', 'g') as whatsapp,
  lower(trim(coalesce(servicio, ''))) as servicio,
  coalesce(profesional_id, -1) as profesional_id,
  fecha,
  hora_inicio,
  hora_fin,
  lower(trim(coalesce(estado, ''))) as estado,
  count(*) as cantidad,
  array_agg(id order by created_at) as ids
from public.reservas
where lower(trim(coalesce(estado, ''))) <> 'cancelado'
group by
  negocio_id,
  lower(trim(coalesce(cliente_nombre, ''))),
  regexp_replace(coalesce(cliente_whatsapp, ''), '\D', '', 'g'),
  lower(trim(coalesce(servicio, ''))),
  coalesce(profesional_id, -1),
  fecha,
  hora_inicio,
  hora_fin,
  lower(trim(coalesce(estado, '')))
having count(*) > 1
order by fecha desc, hora_inicio desc;

-- Ejecuta esto solo cuando la consulta anterior no devuelva filas.
-- Bloquea reservas duplicadas con el mismo cliente, servicio, profesional,
-- fecha, hora de inicio, hora fin y estado. Las canceladas quedan fuera
-- para permitir volver a reservar un turno cancelado.
create unique index if not exists reservas_no_duplicadas_idx
on public.reservas (
  negocio_id,
  regexp_replace(coalesce(cliente_whatsapp, ''), '\D', '', 'g'),
  lower(trim(coalesce(servicio, ''))),
  coalesce(profesional_id, -1),
  fecha,
  hora_inicio,
  hora_fin,
  lower(trim(coalesce(estado, '')))
)
where lower(trim(coalesce(estado, ''))) <> 'cancelado';
