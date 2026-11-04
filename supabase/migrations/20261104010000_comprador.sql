-- P2 · Lecturas del comprador y tiempo real.

-- Reservas del comprador con los datos de la oferta y del negocio.
-- La oferta deja de ser visible al cerrar su ventana; esta función
-- mantiene el historial legible sin abrir la tabla ofertas.
CREATE FUNCTION public.mis_reservas()
RETURNS TABLE (
  id uuid,
  oferta_id uuid,
  estado public.estado_reserva,
  codigo text,
  cantidad integer,
  precio_unitario integer,
  precio_habitual_unitario integer,
  observaciones text,
  motivo_rechazo text,
  metodo_pago public.metodo_pago,
  solicitada_en timestamptz,
  confirmada_en timestamptz,
  lista_en timestamptz,
  entregada_en timestamptz,
  recogida_desde timestamptz,
  recogida_hasta timestamptz,
  titulo text,
  foto_url text,
  negocio_id uuid,
  negocio_nombre text,
  negocio_direccion text,
  calificada boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.id, r.oferta_id, r.estado, r.codigo, r.cantidad, r.precio_unitario, r.precio_habitual_unitario,
         r.observaciones, r.motivo_rechazo, r.metodo_pago, r.solicitada_en, r.confirmada_en, r.lista_en,
         r.entregada_en, r.recogida_desde, r.recogida_hasta, o.titulo, o.foto_url, n.id, n.nombre, n.direccion,
         EXISTS (SELECT 1 FROM public.calificaciones c WHERE c.reserva_id = r.id)
  FROM public.reservas r
  JOIN public.ofertas o ON o.id = r.oferta_id
  JOIN public.negocios n ON n.id = o.negocio_id
  WHERE r.comprador_id = auth.uid()
  ORDER BY r.solicitada_en DESC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.mis_reservas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_reservas() TO authenticated;

-- Promedio de calificación por negocio para las tarjetas (solo negocios públicos).
CREATE FUNCTION public.resumen_calificaciones(negocio_ids uuid[])
RETURNS TABLE (negocio_id uuid, promedio numeric, total integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.negocio_id,
         round(avg((c.calidad + c.aseo + c.atencion) / 3.0), 1),
         count(*)::integer
  FROM public.calificaciones c
  JOIN public.negocios n ON n.id = c.negocio_id
  WHERE c.negocio_id = ANY (negocio_ids) AND n.activo AND NOT n.es_prueba
  GROUP BY c.negocio_id;
$$;
REVOKE ALL ON FUNCTION public.resumen_calificaciones(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resumen_calificaciones(uuid[]) TO anon, authenticated;

-- Tiempo real: el comprador recibe los cambios de SUS reservas (Realtime respeta RLS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
  END IF;
END;
$$;
