-- Preferencias de mensajes de WhatsApp por negocio.
-- Ejecutar una sola vez en Supabase.

alter table public.negocios
    add column if not exists whatsapp_moneda text not null default 'CUP',
    add column if not exists whatsapp_mostrar_costos boolean not null default true;

update public.negocios
set whatsapp_moneda = 'CUP'
where whatsapp_moneda is null
   or upper(whatsapp_moneda) not in ('CUP', 'USD');

comment on column public.negocios.whatsapp_moneda is
    'Moneda mostrada en los mensajes generados por WhatsApp. Valores esperados: CUP o USD.';

comment on column public.negocios.whatsapp_mostrar_costos is
    'Si es false, la app oculta los totales de costo en mensajes de WhatsApp.';
