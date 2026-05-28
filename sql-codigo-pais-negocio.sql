alter table public.negocios
add column if not exists codigo_pais text not null default '53';

comment on column public.negocios.codigo_pais is 'Codigo telefonico internacional usado por el negocio para WhatsApp. Ejemplos: 53 Cuba, 1 USA, 34 Espana.';
