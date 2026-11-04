-- P3 · Avisos en tiempo real para el panel del negocio.
-- El negocio no lee la tabla reservas (datos del comprador): escucha la tabla
-- eventos, que sí puede leer por RLS (eventos_ver_miembro), y recarga su bandeja
-- con reservas_negocio(). Cada cambio de reserva inserta un evento.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'eventos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;
  END IF;
END;
$$;
