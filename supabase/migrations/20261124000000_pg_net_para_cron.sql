-- pg_net permite que pg_cron llame por HTTP a /api/cron/interesados (avisos de ofertas programadas).
-- El secreto y el cron.schedule se crean a mano en cada proyecto (ver docs/NOTIFICACIONES.md): no van en git.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
