-- Agrega mensaje configurable para notificar inasistencias.
-- Ejecutar una sola vez en Supabase SQL Editor.

ALTER TABLE negocios
ADD COLUMN IF NOT EXISTS mensaje_inasistencia TEXT;

UPDATE negocios
SET mensaje_inasistencia = 'Hola {cliente}, registramos que no asististe a tu turno en {nombre_negocio}.

Servicio: {servicio}
Fecha: {fecha}
Hora: {hora}
Profesional: {profesional}

Si necesitas reprogramar, por favor escribenos por este WhatsApp.'
WHERE mensaje_inasistencia IS NULL;

COMMENT ON COLUMN negocios.mensaje_inasistencia IS
'Plantilla de WhatsApp que puede enviar el admin cuando marca una reserva como Ausente.';
