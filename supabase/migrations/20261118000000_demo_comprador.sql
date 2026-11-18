-- Demo del 18 nov · Combos editables, etiqueta Combo/Promoción y dirección del comprador.

-- 1. Etiqueta de la oferta comercial: «Combo» o «Promoción» (la tarjeta la muestra).
ALTER TABLE public.ofertas
  ADD COLUMN formato text NOT NULL DEFAULT 'combo' CHECK (formato IN ('combo', 'promocion'));
COMMENT ON COLUMN public.ofertas.formato IS 'Etiqueta visible de la oferta comercial: combo o promocion.';

-- 2. Cupos de una oferta con reservas: se pueden subir o bajar mientras no queden
--    por debajo de lo ya reservado. Total y disponibles cambian en la misma cantidad,
--    así lo reservado no se mueve (las reservas guardan su propio precio y ventana).
CREATE OR REPLACE FUNCTION public.proteger_inventario_oferta() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE tiene_reservas boolean;
BEGIN
 IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
 IF TG_OP = 'INSERT' THEN
  IF NEW.cupos_disponibles <> NEW.cupos_total THEN RAISE EXCEPTION 'La oferta debe iniciar con todos sus cupos disponibles.' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.negocio_id IS DISTINCT FROM OLD.negocio_id OR NEW.publicada_por IS DISTINCT FROM OLD.publicada_por OR NEW.es_prueba IS DISTINCT FROM OLD.es_prueba THEN
   RAISE EXCEPTION 'No puedes cambiar el negocio ni el autor de una oferta.' USING ERRCODE='42501'; END IF;
  tiene_reservas := public.oferta_tiene_reservas(OLD.id);
  IF tiene_reservas
     AND (NEW.cupos_total IS DISTINCT FROM OLD.cupos_total OR NEW.cupos_disponibles IS DISTINCT FROM OLD.cupos_disponibles)
     AND (NEW.cupos_total - OLD.cupos_total) IS DISTINCT FROM (NEW.cupos_disponibles - OLD.cupos_disponibles) THEN
   RAISE EXCEPTION 'Los cupos de una oferta con reservas solo cambian al reservar, rechazar o cancelar.' USING ERRCODE='42501'; END IF;
  IF NOT tiene_reservas AND NEW.cupos_disponibles <> NEW.cupos_total THEN
   RAISE EXCEPTION 'La oferta sin reservas debe conservar todos sus cupos disponibles.' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.proteger_inventario_oferta() FROM PUBLIC, anon, authenticated;

-- 3. Edición de una oferta por su negocio (o el admin). Corre con los permisos de quien
--    llama: RLS (ofertas_editar_miembro) y el trigger de inventario siguen aplicando.
--    Bloquea la fila, como solicitar_reserva, para que nadie reserve a mitad de la edición.
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
  p_tiempo_preparacion_min integer
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
    RAISE EXCEPTION 'Ya hay % cupos reservados: la oferta no puede quedar con menos.', v_reservados USING ERRCODE = '22023'; END IF;
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
    estado = CASE WHEN v_disponibles = 0 THEN 'agotada'::public.estado_oferta ELSE 'activa'::public.estado_oferta END
  WHERE o.id = p_oferta_id
  RETURNING * INTO v_oferta;
  RETURN v_oferta;
END;
$$;
REVOKE ALL ON FUNCTION public.editar_oferta(uuid, text, text, public.categoria, text, text, integer, integer, integer, timestamptz, timestamptz, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_oferta(uuid, text, text, public.categoria, text, text, integer, integer, integer, timestamptz, timestamptz, integer) TO authenticated;

-- 4. La publicación programada copia también la etiqueta.
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
    SELECT p.id AS programacion_id, o.negocio_id, o.tipo, o.formato, o.titulo, o.contenido, o.categoria, o.foto_url,
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
        negocio_id, tipo, formato, titulo, contenido, categoria, foto_url,
        precio_habitual, precio_final, cupos_total, cupos_disponibles,
        recogida_desde, recogida_hasta, tiempo_preparacion_min, elaborado_en,
        estado, publicada_por, es_prueba
      ) VALUES (
        v_prog.negocio_id, v_prog.tipo, v_prog.formato, v_prog.titulo, v_prog.contenido, v_prog.categoria, v_prog.foto_url,
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

-- 5. Dirección del comprador: origen de las distancias. Solo la ve su dueño
--    (ni el negocio ni el admin desde la app); se borra con el usuario.
CREATE TABLE public.direcciones_comprador (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  direccion text NOT NULL CHECK (length(btrim(direccion)) BETWEEN 3 AND 200),
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.direcciones_comprador IS 'Dirección y punto del comprador para calcular distancias. RLS: solo el propio comprador.';
REVOKE ALL ON public.direcciones_comprador FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direcciones_comprador TO authenticated;
GRANT ALL ON public.direcciones_comprador TO service_role;
ALTER TABLE public.direcciones_comprador ENABLE ROW LEVEL SECURITY;
CREATE POLICY direccion_propia ON public.direcciones_comprador FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
