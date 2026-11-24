-- Lanzamiento (23 nov 2026) · Oferta y marca:
-- logo del negocio, tamaño o gramaje, formato «Lleva N, paga M» y datos de marca en el ticket.

-- 1. Logo del negocio en Storage (bucket «ofertas», carpeta negocios/<negocio_id>/logo.webp).
--    Se guarda la ruta; «?v=<marca de tiempo>» obliga a refrescar la caché al cambiarlo.
ALTER TABLE public.negocios ADD COLUMN logo_url text;
ALTER TABLE public.negocios ADD CONSTRAINT negocios_logo_url_ruta CHECK (
  logo_url IS NULL OR logo_url ~ ('^negocios/' || id::text || '/logo\.webp(\?v=[0-9]{1,20})?$')
);
COMMENT ON COLUMN public.negocios.logo_url IS 'Ruta del logo en el bucket ofertas: negocios/<id>/logo.webp (con ?v= para refrescar). Sin logo: avatar con la inicial.';

-- Storage: además de <negocio_id>/<foto>, el miembro del negocio (o el admin) escribe negocios/<negocio_id>/logo.<ext>.
CREATE OR REPLACE FUNCTION public.puede_escribir_foto(nombre text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE partes text[]; v_negocio uuid;
  uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  partes := string_to_array(nombre, '/');
  IF cardinality(partes) = 3 AND partes[1] = 'negocios' AND partes[2] ~ uuid_re AND lower(partes[3]) ~ '^logo\.(jpg|jpeg|png|webp|avif)$' THEN
    v_negocio := partes[2]::uuid;
  ELSIF cardinality(partes) = 2 AND coalesce(partes[2], '') NOT IN ('', '.', '..') AND partes[1] ~ uuid_re AND lower(partes[2]) ~ '\.(jpg|jpeg|png|webp|avif)$' THEN
    v_negocio := partes[1]::uuid;
  ELSE
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.negocios WHERE id = v_negocio) AND public.es_miembro_negocio(v_negocio);
END;
$$;
REVOKE ALL ON FUNCTION public.puede_escribir_foto(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_escribir_foto(text) TO authenticated;

-- El negocio no puede editar su fila (solo el admin, por RLS): el logo se cambia con esta función.
CREATE FUNCTION public.cambiar_logo_negocio(p_negocio_id uuid, p_logo_url text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.es_miembro_negocio(p_negocio_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este negocio.' USING ERRCODE = '42501'; END IF;
  UPDATE public.negocios SET logo_url = nullif(btrim(p_logo_url), '') WHERE id = p_negocio_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cambiar_logo_negocio(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_logo_negocio(uuid, text) TO authenticated;

-- 2. Tamaño o gramaje de la oferta («500 g», «personal», «familiar 8 porciones»).
ALTER TABLE public.ofertas ADD COLUMN tamano text CHECK (tamano IS NULL OR length(btrim(tamano)) BETWEEN 1 AND 40);
COMMENT ON COLUMN public.ofertas.tamano IS 'Tamaño o gramaje visible en la tarjeta y la ficha. Opcional.';

-- 3. Formato «Lleva N, paga M». Precio habitual = unitario × lleva; precio final = unitario × paga.
--    Cada unidad disponible es un paquete: la reserva se hace por paquetes.
ALTER TABLE public.ofertas DROP CONSTRAINT IF EXISTS ofertas_formato_check;
ALTER TABLE public.ofertas ADD CONSTRAINT ofertas_formato_check CHECK (formato IN ('combo', 'promocion', 'lleva_paga'));
ALTER TABLE public.ofertas ADD COLUMN lleva smallint, ADD COLUMN paga smallint;
ALTER TABLE public.ofertas ADD CONSTRAINT ofertas_lleva_paga CHECK (
  CASE WHEN formato = 'lleva_paga' THEN
    lleva IS NOT NULL AND paga IS NOT NULL AND paga >= 1 AND lleva > paga AND lleva <= 20
    AND precio_final::bigint * lleva = precio_habitual::bigint * paga
  ELSE lleva IS NULL AND paga IS NULL END
);
COMMENT ON COLUMN public.ofertas.formato IS 'Etiqueta visible de la oferta comercial: combo, promocion o lleva_paga.';
COMMENT ON COLUMN public.ofertas.lleva IS 'Formato lleva_paga: unidades que se llevan por paquete.';
COMMENT ON COLUMN public.ofertas.paga IS 'Formato lleva_paga: unidades que se pagan por paquete (menos que lleva).';

-- 4. Edición: mismos pasos que antes, más tamaño y «lleva/paga».
DROP FUNCTION public.editar_oferta(uuid, text, text, public.categoria, text, text, integer, integer, integer, timestamptz, timestamptz, integer);
CREATE FUNCTION public.editar_oferta(
  p_oferta_id uuid,
  p_titulo text,
  p_contenido text,
  p_categoria public.categoria,
  p_formato text,
  p_foto_url text,
  p_precio_habitual integer,
  p_precio_final integer,
  p_cupos_total integer,
  p_recogida_desde timestamptz,
  p_recogida_hasta timestamptz,
  p_tiempo_preparacion_min integer,
  p_tamano text DEFAULT NULL,
  p_lleva integer DEFAULT NULL,
  p_paga integer DEFAULT NULL
) RETURNS public.ofertas
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_oferta public.ofertas; v_reservados integer; v_disponibles integer;
BEGIN
  SELECT * INTO v_oferta FROM public.ofertas o WHERE o.id = p_oferta_id FOR UPDATE;
  IF v_oferta.id IS NULL OR NOT public.es_miembro_negocio(v_oferta.negocio_id) THEN
    RAISE EXCEPTION 'No tienes acceso a esta oferta.' USING ERRCODE = '42501'; END IF;
  IF v_oferta.estado NOT IN ('activa', 'agotada') OR v_oferta.recogida_hasta <= clock_timestamp() THEN
    RAISE EXCEPTION 'Solo se editan ofertas vigentes.' USING ERRCODE = '22023'; END IF;
  IF p_recogida_hasta <= clock_timestamp() THEN
    RAISE EXCEPTION 'La hora de fin ya pasó.' USING ERRCODE = '22023'; END IF;
  v_reservados := v_oferta.cupos_total - v_oferta.cupos_disponibles;
  IF p_cupos_total IS NULL OR p_cupos_total < greatest(v_reservados, 1) THEN
    RAISE EXCEPTION 'Ya hay % unidades reservadas: la oferta no puede quedar con menos.', v_reservados USING ERRCODE = '22023'; END IF;
  v_disponibles := p_cupos_total - v_reservados;

  UPDATE public.ofertas o SET
    titulo = p_titulo,
    contenido = p_contenido,
    categoria = p_categoria,
    formato = p_formato,
    foto_url = p_foto_url,
    precio_habitual = p_precio_habitual,
    precio_final = p_precio_final,
    cupos_total = p_cupos_total,
    cupos_disponibles = v_disponibles,
    recogida_desde = p_recogida_desde,
    recogida_hasta = p_recogida_hasta,
    tiempo_preparacion_min = p_tiempo_preparacion_min,
    tamano = nullif(btrim(p_tamano), ''),
    lleva = CASE WHEN p_formato = 'lleva_paga' THEN p_lleva END,
    paga = CASE WHEN p_formato = 'lleva_paga' THEN p_paga END,
    estado = CASE WHEN v_disponibles = 0 THEN 'agotada'::public.estado_oferta ELSE 'activa'::public.estado_oferta END
  WHERE o.id = p_oferta_id
  RETURNING * INTO v_oferta;
  RETURN v_oferta;
END;
$$;
REVOKE ALL ON FUNCTION public.editar_oferta(uuid, text, text, public.categoria, text, text, integer, integer, integer, timestamptz, timestamptz, integer, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_oferta(uuid, text, text, public.categoria, text, text, integer, integer, integer, timestamptz, timestamptz, integer, text, integer, integer) TO authenticated;

-- 5. La publicación programada copia también tamaño y «lleva/paga».
CREATE OR REPLACE FUNCTION public.publicar_programadas() RETURNS integer
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
    SELECT p.id AS programacion_id, o.negocio_id, o.tipo, o.formato, o.tamano, o.lleva, o.paga, o.titulo, o.contenido,
           o.categoria, o.foto_url, o.precio_habitual, o.precio_final, o.cupos_total, o.recogida_desde, o.recogida_hasta,
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
        negocio_id, tipo, formato, tamano, lleva, paga, titulo, contenido, categoria, foto_url,
        precio_habitual, precio_final, cupos_total, cupos_disponibles,
        recogida_desde, recogida_hasta, tiempo_preparacion_min, elaborado_en,
        estado, publicada_por, es_prueba
      ) VALUES (
        v_prog.negocio_id, v_prog.tipo, v_prog.formato, v_prog.tamano, v_prog.lleva, v_prog.paga, v_prog.titulo,
        v_prog.contenido, v_prog.categoria, v_prog.foto_url,
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

-- 6. Reservas del comprador: suma la marca del negocio (slug y logo) y el formato para el ticket.
DROP FUNCTION public.mis_reservas();
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
  calificada boolean,
  negocio_slug text,
  negocio_logo_url text,
  formato text,
  tamano text,
  lleva smallint,
  paga smallint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.id, r.oferta_id, r.estado, r.codigo, r.cantidad, r.precio_unitario, r.precio_habitual_unitario,
         r.observaciones, r.motivo_rechazo, r.metodo_pago, r.solicitada_en, r.confirmada_en, r.lista_en,
         r.entregada_en, r.recogida_desde, r.recogida_hasta, o.titulo, o.foto_url, n.id, n.nombre, n.direccion,
         EXISTS (SELECT 1 FROM public.calificaciones c WHERE c.reserva_id = r.id),
         n.slug, n.logo_url, o.formato, o.tamano, o.lleva, o.paga
  FROM public.reservas r
  JOIN public.ofertas o ON o.id = r.oferta_id
  JOIN public.negocios n ON n.id = o.negocio_id
  WHERE r.comprador_id = auth.uid()
  ORDER BY r.solicitada_en DESC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.mis_reservas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_reservas() TO authenticated;
