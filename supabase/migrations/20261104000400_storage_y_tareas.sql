-- P1 · Storage y tareas programadas (pg_cron).
-- Las migraciones 0000–0003 vienen de Lovable sin cambios; esto las completa.

-- 1. Bucket público de fotos de ofertas (las políticas de escritura están en la 0000).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ofertas', 'ofertas', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Cierre automático: reservas no recogidas y ofertas vencidas.
-- Corre como dueño (sin usuario), por eso no pasa por cambiar_estado_reserva.
-- No devuelve cupos: la ventana ya terminó.
CREATE FUNCTION public.cerrar_vencidas() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_ahora timestamptz := clock_timestamp();
  v_reservas integer;
  v_ofertas integer;
BEGIN
  WITH vencidas AS (
    UPDATE public.reservas r
    SET estado = 'no_recogida', no_recogida_en = v_ahora
    WHERE r.estado IN ('confirmada', 'lista') AND r.recogida_hasta < v_ahora
    RETURNING r.oferta_id, r.origen
  ), eventos AS (
    INSERT INTO public.eventos (tipo, negocio_id, oferta_id, origen, creado_en)
    SELECT 'no_recogida', o.negocio_id, v.oferta_id, v.origen, v_ahora
    FROM vencidas v JOIN public.ofertas o ON o.id = v.oferta_id
    RETURNING 1
  )
  SELECT count(*) INTO v_reservas FROM eventos;

  UPDATE public.ofertas o
  SET estado = 'cerrada'
  WHERE o.estado IN ('activa', 'agotada') AND o.recogida_hasta < v_ahora;
  GET DIAGNOSTICS v_ofertas = ROW_COUNT;

  RETURN jsonb_build_object('no_recogidas', v_reservas, 'ofertas_cerradas', v_ofertas);
END;
$$;
REVOKE ALL ON FUNCTION public.cerrar_vencidas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cerrar_vencidas() TO service_role;
COMMENT ON FUNCTION public.cerrar_vencidas() IS 'pg_cron cada 15 min: confirmada/lista vencida → no_recogida (con evento) y ofertas activas/agotadas vencidas → cerrada.';

-- 3. Publicación de ofertas programadas.
-- Marca de la última publicación para no duplicar el mismo día.
ALTER TABLE public.oferta_programacion ADD COLUMN ultima_publicacion date;
COMMENT ON COLUMN public.oferta_programacion.ultima_publicacion IS 'Fecha local (America/Bogota) de la última oferta creada desde esta programación.';

-- Copia la plantilla con la misma hora local de recogida, pero en la fecha de hoy.
-- Si la hora ya pasó cuando corre, se publica igual mientras la ventana siga abierta.
CREATE FUNCTION public.publicar_programadas() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_ahora timestamptz := clock_timestamp();
  v_local timestamp := v_ahora AT TIME ZONE 'America/Bogota';
  v_hoy date := v_local::date;
  v_dia smallint := extract(isodow FROM v_local)::smallint;
  v_prog record;
  v_desplazamiento interval;
  v_desde timestamptz;
  v_hasta timestamptz;
  v_total integer := 0;
BEGIN
  FOR v_prog IN
    SELECT p.id AS programacion_id, o.negocio_id, o.tipo, o.titulo, o.contenido, o.categoria, o.foto_url,
           o.precio_habitual, o.precio_final, o.cupos_total, o.recogida_desde, o.recogida_hasta,
           o.tiempo_preparacion_min, o.elaborado_en, o.publicada_por, o.es_prueba
    FROM public.oferta_programacion p
    JOIN public.ofertas o ON o.id = p.plantilla_oferta_id
    JOIN public.negocios n ON n.id = p.negocio_id
    WHERE p.activa AND n.activo
      AND v_dia = ANY (p.dias_semana)
      AND p.hora_publicacion <= v_local::time
      AND (p.ultima_publicacion IS NULL OR p.ultima_publicacion < v_hoy)
    FOR UPDATE OF p SKIP LOCKED
  LOOP
    v_desde := (v_hoy + (v_prog.recogida_desde AT TIME ZONE 'America/Bogota')::time) AT TIME ZONE 'America/Bogota';
    v_hasta := v_desde + (v_prog.recogida_hasta - v_prog.recogida_desde);
    v_desplazamiento := v_desde - v_prog.recogida_desde;

    IF v_hasta > v_ahora THEN
      INSERT INTO public.ofertas (
        negocio_id, tipo, titulo, contenido, categoria, foto_url,
        precio_habitual, precio_final, cupos_total, cupos_disponibles,
        recogida_desde, recogida_hasta, tiempo_preparacion_min, elaborado_en,
        estado, publicada_por, es_prueba
      ) VALUES (
        v_prog.negocio_id, v_prog.tipo, v_prog.titulo, v_prog.contenido, v_prog.categoria, v_prog.foto_url,
        v_prog.precio_habitual, v_prog.precio_final, v_prog.cupos_total, v_prog.cupos_total,
        v_desde, v_hasta, v_prog.tiempo_preparacion_min,
        CASE WHEN v_prog.elaborado_en IS NULL THEN NULL
             ELSE least(v_prog.elaborado_en + v_desplazamiento, v_hasta) END,
        'activa', v_prog.publicada_por, v_prog.es_prueba
      );
      v_total := v_total + 1;
    END IF;

    UPDATE public.oferta_programacion SET ultima_publicacion = v_hoy WHERE id = v_prog.programacion_id;
  END LOOP;

  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.publicar_programadas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_programadas() TO service_role;
COMMENT ON FUNCTION public.publicar_programadas() IS 'pg_cron cada 5 min: crea la oferta del día desde cada programación activa (día ISO y hora en America/Bogota).';

-- 4. Programar las tareas.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule('salvori-cerrar-vencidas', '*/15 * * * *', $$SELECT public.cerrar_vencidas();$$);
SELECT cron.schedule('salvori-publicar-programadas', '*/5 * * * *', $$SELECT public.publicar_programadas();$$);
