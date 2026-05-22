-- Agrega la opcion de imagen de fondo para la app de clientes.
-- Ejecutar una sola vez en Supabase SQL Editor.

ALTER TABLE negocios
ADD COLUMN IF NOT EXISTS imagen_fondo_tipo TEXT DEFAULT 'unas';

UPDATE negocios
SET imagen_fondo_tipo = 'unas'
WHERE imagen_fondo_tipo IS NULL;

COMMENT ON COLUMN negocios.imagen_fondo_tipo IS
'Tipo de imagen de fondo para login/bienvenida de clientes: unas, belleza, barberia, peluqueria, lashes.';
