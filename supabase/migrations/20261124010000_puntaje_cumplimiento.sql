-- P4 · 10. Puntaje de cumplimiento en los dos extremos (valores confirmados por Dicson el 24 nov 2026).
-- Comprador: promedio de sus últimas 10 reservas cerradas: entregada = 5, cancelada por él después de
--   confirmada = 3, no recogida = 1. Sin historial: «Nuevo» (cuenta como 5). Se calcula; nadie lo edita.
-- Negocio: su puntaje público es el promedio de calificaciones, y cada «No pude cumplir» cuenta como un 1.
-- Consecuencias mínimas: comprador con puntaje < 3 y al menos 3 cerradas solo puede tener una reserva activa;
--   negocio con 2 incumplimientos en 7 días aparece resaltado en /admin. Sin bloqueos ni multas.

-- 1. Marca del incumplimiento del negocio (la reserva pasa a cancelada).
ALTER TABLE public.reservas
  ADD COLUMN incumplida_por text CHECK (incumplida_por IN ('negocio')),
  ADD COLUMN motivo_incumplimiento text CHECK (motivo_incumplimiento IS NULL OR length(motivo_incumplimiento) <= 300),
  ADD CONSTRAINT reservas_incumplida_con_motivo CHECK (
    incumplida_por IS NULL OR (estado = 'cancelada' AND length(btrim(coalesce(motivo_incumplimiento, ''))) > 0)
  );
COMMENT ON COLUMN public.reservas.incumplida_por IS 'negocio = el negocio no pudo cumplir una reserva confirmada («No pude cumplir»). Cuenta como calificación de 1.';
CREATE INDEX reservas_incumplidas_idx ON public.reservas (cancelada_en) WHERE incumplida_por IS NOT NULL;

-- 2. Puntaje del comprador (interno, sin control de acceso: lo usan otras funciones).
CREATE FUNCTION public.calcular_puntaje_comprador(uid uuid)
RETURNS TABLE (puntaje numeric, cerradas integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH ultimas AS (
    SELECT CASE
             WHEN r.estado = 'entregada' THEN 5
             WHEN r.estado = 'no_recogida' THEN 1
             ELSE 3
           END AS valor
    FROM public.reservas r
    WHERE r.comprador_id = uid
      AND (r.estado IN ('entregada', 'no_recogida')
           OR (r.estado = 'cancelada' AND r.confirmada_en IS NOT NULL AND r.incumplida_por IS NULL))
    ORDER BY coalesce(r.entregada_en, r.no_recogida_en, r.cancelada_en) DESC
    LIMIT 10
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(avg(valor), 1) END, count(*)::integer FROM ultimas;
$$;
REVOKE ALL ON FUNCTION public.calcular_puntaje_comprador(uuid) FROM PUBLIC, anon, authenticated;

-- Versión pública: el propio comprador o un admin (el negocio lo ve dentro de reservas_negocio).
CREATE FUNCTION public.puntaje_comprador(uid uuid)
RETURNS TABLE (puntaje numeric, cerradas integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR (uid <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'No tienes acceso a este puntaje.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.calcular_puntaje_comprador(uid);
END;
$$;
REVOKE ALL ON FUNCTION public.puntaje_comprador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puntaje_comprador(uuid) TO authenticated;

-- 3. Reservar: con puntaje < 3 y al menos 3 cerradas, una sola reserva activa a la vez.
CREATE OR REPLACE FUNCTION public.solicitar_reserva(oferta_id uuid, cantidad integer, observaciones text DEFAULT '', origen text DEFAULT 'directo') RETURNS public.reservas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 DECLARE v_oferta public.ofertas; v_reserva public.reservas; v_ahora timestamptz; v_puntaje numeric; v_cerradas integer;
 BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'comprador') THEN
 RAISE EXCEPTION 'Inicia sesión como comprador para reservar.' USING ERRCODE = '42501'; END IF;
 IF cantidad IS NULL OR cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor que cero.' USING ERRCODE = '22023'; END IF;
 IF length(coalesce(observaciones,'')) > 1000 OR length(coalesce(origen,'directo')) > 500 THEN
 RAISE EXCEPTION 'Las observaciones o el origen superan el máximo permitido.' USING ERRCODE = '22023'; END IF;
 SELECT p.puntaje, p.cerradas INTO v_puntaje, v_cerradas FROM public.calcular_puntaje_comprador(auth.uid()) p;
 IF v_cerradas >= 3 AND v_puntaje < 3 AND EXISTS (
   SELECT 1 FROM public.reservas r WHERE r.comprador_id = auth.uid() AND r.estado IN ('solicitada','confirmada','lista')) THEN
 RAISE EXCEPTION 'Por tu puntaje de cumplimiento solo puedes tener una reserva activa a la vez.' USING ERRCODE = '22023'; END IF;
 SELECT * INTO v_oferta FROM public.ofertas o WHERE o.id = $1 FOR UPDATE;
 v_ahora := clock_timestamp();
 IF v_oferta.id IS NULL OR v_oferta.estado <> 'activa' OR NOT EXISTS (SELECT 1 FROM public.negocios n WHERE n.id = v_oferta.negocio_id AND n.activo) THEN
 RAISE EXCEPTION 'La oferta no está activa.' USING ERRCODE = '22023'; END IF;
 IF v_ahora < v_oferta.recogida_desde OR v_ahora > v_oferta.recogida_hasta THEN
 RAISE EXCEPTION 'La oferta está fuera del horario de recogida.' USING ERRCODE = '22023'; END IF;
 IF v_oferta.cupos_disponibles < cantidad THEN RAISE EXCEPTION 'No hay suficientes cupos disponibles.' USING ERRCODE = '22023'; END IF;
 UPDATE public.ofertas o SET cupos_disponibles = o.cupos_disponibles - $2,
 estado = CASE WHEN o.cupos_disponibles - $2 = 0 THEN 'agotada'::public.estado_oferta ELSE o.estado END WHERE o.id = $1;
 INSERT INTO public.reservas(oferta_id, comprador_id, cantidad, precio_unitario, precio_habitual_unitario, observaciones, origen, solicitada_en, recogida_desde, recogida_hasta)
 VALUES ($1, auth.uid(), $2, v_oferta.precio_final, v_oferta.precio_habitual, coalesce($3,''), coalesce(nullif(btrim($4),''),'directo'), v_ahora, v_oferta.recogida_desde, v_oferta.recogida_hasta) RETURNING * INTO v_reserva;
 INSERT INTO public.eventos(tipo, negocio_id, oferta_id, origen) VALUES ('reserva_solicitada',v_oferta.negocio_id,$1,v_reserva.origen);
 RETURN v_reserva;
 END;
$$;

-- 4. Cambiar estado: el comprador ahora también puede cancelar una reserva confirmada o lista
--    (antes de que termine la ventana). Vale 3 en su puntaje y devuelve la unidad a la oferta.
CREATE OR REPLACE FUNCTION public.cambiar_estado_reserva(reserva_id uuid, nuevo_estado public.estado_reserva, datos jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 DECLARE v_reserva public.reservas; v_oferta public.ofertas; v_oferta_id uuid; v_operador boolean; v_admin boolean; v_ahora timestamptz; v_codigo text; v_pago public.metodo_pago; v_tipo public.tipo_evento;
 BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para gestionar la reserva.' USING ERRCODE = '42501'; END IF;
 IF nuevo_estado IS NULL OR datos IS NULL OR jsonb_typeof(datos) <> 'object' THEN RAISE EXCEPTION 'Los datos de la reserva no son válidos.' USING ERRCODE = '22023'; END IF;
 SELECT r.oferta_id INTO v_oferta_id FROM public.reservas r WHERE r.id = $1;
 IF v_oferta_id IS NULL THEN RAISE EXCEPTION 'No tienes acceso a esta reserva.' USING ERRCODE = '42501'; END IF;
 SELECT * INTO v_oferta FROM public.ofertas WHERE id = v_oferta_id FOR UPDATE;
 SELECT * INTO v_reserva FROM public.reservas WHERE id = $1 FOR UPDATE;
 v_ahora := clock_timestamp();
 v_admin := public.has_role(auth.uid(), 'admin');
 v_operador := public.es_miembro_negocio(v_oferta.negocio_id);
 IF nuevo_estado = 'cancelada' THEN
 IF NOT v_admin AND (v_reserva.comprador_id <> auth.uid() OR NOT public.has_role(auth.uid(), 'comprador')) THEN
 RAISE EXCEPTION 'Solo el comprador puede cancelar su reserva.' USING ERRCODE = '42501'; END IF;
 ELSIF NOT v_operador THEN RAISE EXCEPTION 'No tienes permiso para gestionar esta reserva.' USING ERRCODE = '42501'; END IF;
 IF v_reserva.estado = nuevo_estado THEN RETURN jsonb_build_object('id',v_reserva.id,'estado',v_reserva.estado,'codigo',v_reserva.codigo,'metodo_pago',v_reserva.metodo_pago); END IF;
 IF NOT ((v_reserva.estado = 'solicitada' AND nuevo_estado IN ('confirmada','rechazada','cancelada')) OR
 (v_reserva.estado = 'confirmada' AND nuevo_estado IN ('lista','entregada','no_recogida','cancelada')) OR
 (v_reserva.estado = 'lista' AND nuevo_estado IN ('entregada','no_recogida','cancelada'))) THEN
 RAISE EXCEPTION 'El cambio de estado no está permitido.' USING ERRCODE = '22023'; END IF;
 IF (nuevo_estado IN ('confirmada','lista','entregada') OR (nuevo_estado = 'cancelada' AND v_reserva.estado <> 'solicitada'))
    AND v_ahora > v_reserva.recogida_hasta THEN
 RAISE EXCEPTION 'El horario de recogida ya terminó.' USING ERRCODE = '22023'; END IF;
 IF nuevo_estado = 'rechazada' AND length(btrim(coalesce(datos->>'motivo_rechazo',''))) = 0 THEN
 RAISE EXCEPTION 'Indica el motivo del rechazo.' USING ERRCODE = '22023'; END IF;
 IF nuevo_estado = 'no_recogida' AND v_ahora <= v_reserva.recogida_hasta THEN
 RAISE EXCEPTION 'El horario de recogida aún no ha terminado.' USING ERRCODE = '22023'; END IF;
 IF nuevo_estado = 'entregada' THEN
 IF upper(btrim(coalesce(datos->>'codigo',''))) <> v_reserva.codigo THEN RAISE EXCEPTION 'El código de recogida no coincide.' USING ERRCODE = '22023'; END IF;
 IF coalesce(datos->>'metodo_pago','') NOT IN ('efectivo','nequi','transferencia','tarjeta') THEN RAISE EXCEPTION 'Registra un método de pago válido.' USING ERRCODE = '22023'; END IF;
 v_pago := (datos->>'metodo_pago')::public.metodo_pago;
 END IF;
 v_codigo := v_reserva.codigo;
 IF nuevo_estado = 'confirmada' THEN
 LOOP
 v_codigo := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
 EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservas WHERE codigo = v_codigo);
 END LOOP;
 END IF;
 IF nuevo_estado IN ('rechazada','cancelada') THEN
 UPDATE public.ofertas SET cupos_disponibles = cupos_disponibles + v_reserva.cantidad,
 estado = CASE WHEN estado = 'agotada' AND recogida_hasta > v_ahora THEN 'activa'::public.estado_oferta ELSE CASE WHEN estado = 'agotada' THEN 'cerrada'::public.estado_oferta ELSE estado END END
 WHERE id = v_oferta_id;
 END IF;
 UPDATE public.reservas SET estado = $2, codigo = v_codigo,
 motivo_rechazo = CASE WHEN $2 = 'rechazada' THEN btrim($3->>'motivo_rechazo') ELSE motivo_rechazo END,
 metodo_pago = CASE WHEN $2 = 'entregada' THEN v_pago ELSE metodo_pago END,
 confirmada_en = CASE WHEN $2 = 'confirmada' THEN v_ahora ELSE confirmada_en END,
 lista_en = CASE WHEN $2 = 'lista' THEN v_ahora ELSE lista_en END,
 entregada_en = CASE WHEN $2 = 'entregada' THEN v_ahora ELSE entregada_en END,
 rechazada_en = CASE WHEN $2 = 'rechazada' THEN v_ahora ELSE rechazada_en END,
 cancelada_en = CASE WHEN $2 = 'cancelada' THEN v_ahora ELSE cancelada_en END,
 no_recogida_en = CASE WHEN $2 = 'no_recogida' THEN v_ahora ELSE no_recogida_en END WHERE id = $1;
 v_tipo := CASE nuevo_estado WHEN 'confirmada' THEN 'reserva_confirmada' WHEN 'rechazada' THEN 'reserva_rechazada' WHEN 'cancelada' THEN 'reserva_cancelada' WHEN 'lista' THEN 'reserva_lista' WHEN 'entregada' THEN 'reserva_entregada' WHEN 'no_recogida' THEN 'no_recogida' END;
 INSERT INTO public.eventos(tipo,negocio_id,oferta_id,origen,creado_en) VALUES(v_tipo,v_oferta.negocio_id,v_oferta_id,v_reserva.origen,v_ahora);
 RETURN jsonb_build_object('id',v_reserva.id,'estado',nuevo_estado,'codigo',v_codigo,'metodo_pago',coalesce(v_pago,v_reserva.metodo_pago));
 END;
$$;

-- 5. «No pude cumplir»: el negocio cancela una reserva confirmada o lista, con motivo obligatorio.
--    No devuelve la unidad a la oferta (lo normal es que se haya agotado o el local cerró).
CREATE FUNCTION public.no_pude_cumplir(reserva_id uuid, motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 DECLARE v_reserva public.reservas; v_negocio uuid; v_ahora timestamptz := clock_timestamp();
 BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión para gestionar la reserva.' USING ERRCODE = '42501'; END IF;
 SELECT o.negocio_id INTO v_negocio FROM public.reservas r JOIN public.ofertas o ON o.id = r.oferta_id WHERE r.id = $1;
 IF v_negocio IS NULL OR NOT public.es_miembro_negocio(v_negocio) THEN
 RAISE EXCEPTION 'No tienes permiso para gestionar esta reserva.' USING ERRCODE = '42501'; END IF;
 IF length(btrim(coalesce(motivo, ''))) = 0 THEN RAISE EXCEPTION 'Indica por qué no pudiste cumplir.' USING ERRCODE = '22023'; END IF;
 IF length(motivo) > 300 THEN RAISE EXCEPTION 'El motivo supera el máximo permitido.' USING ERRCODE = '22023'; END IF;
 SELECT * INTO v_reserva FROM public.reservas WHERE id = $1 FOR UPDATE;
 IF v_reserva.estado NOT IN ('confirmada', 'lista') THEN
 RAISE EXCEPTION 'Solo se marca «No pude cumplir» en una reserva confirmada o lista.' USING ERRCODE = '22023'; END IF;
 UPDATE public.reservas SET estado = 'cancelada', cancelada_en = v_ahora, incumplida_por = 'negocio',
   motivo_incumplimiento = btrim(motivo) WHERE id = $1;
 INSERT INTO public.eventos(tipo, negocio_id, oferta_id, origen, creado_en)
 VALUES ('reserva_cancelada', v_negocio, v_reserva.oferta_id, v_reserva.origen, v_ahora);
 END;
$$;
REVOKE ALL ON FUNCTION public.no_pude_cumplir(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.no_pude_cumplir(uuid, text) TO authenticated;

-- 6. Puntaje público del negocio: promedio de calificaciones con cada incumplimiento como un 1.
CREATE OR REPLACE FUNCTION public.resumen_calificaciones(negocio_ids uuid[])
RETURNS TABLE (negocio_id uuid, promedio numeric, total integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH notas AS (
    SELECT c.negocio_id, (c.calidad + c.aseo + c.atencion) / 3.0 AS nota
    FROM public.calificaciones c
    WHERE c.negocio_id = ANY (negocio_ids)
    UNION ALL
    SELECT o.negocio_id, 1.0
    FROM public.reservas r JOIN public.ofertas o ON o.id = r.oferta_id
    WHERE r.incumplida_por = 'negocio' AND o.negocio_id = ANY (negocio_ids)
  )
  SELECT t.negocio_id, round(avg(t.nota), 1), count(*)::integer
  FROM notas t
  JOIN public.negocios n ON n.id = t.negocio_id
  WHERE n.activo AND NOT n.es_prueba
  GROUP BY t.negocio_id;
$$;

-- 7. Bandeja del negocio: suma el puntaje del comprador y el incumplimiento.
DROP FUNCTION public.reservas_negocio(uuid);
CREATE FUNCTION public.reservas_negocio(negocio_id uuid)
RETURNS TABLE (id uuid, oferta_id uuid, titulo text, nombre_comprador text, cantidad integer, precio_unitario integer, estado public.estado_reserva, codigo text, observaciones text, metodo_pago public.metodo_pago, solicitada_en timestamptz, confirmada_en timestamptz, lista_en timestamptz, entregada_en timestamptz, recogida_desde timestamptz, recogida_hasta timestamptz, motivo_rechazo text,
  puntaje_comprador numeric, cerradas_comprador integer, incumplida_por text, motivo_incumplimiento text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
 BEGIN
 IF auth.uid() IS NULL OR NOT public.es_miembro_negocio($1) THEN RAISE EXCEPTION 'No tienes acceso a las reservas de este negocio.' USING ERRCODE = '42501'; END IF;
 RETURN QUERY SELECT r.id,r.oferta_id,o.titulo,
 coalesce(nullif(u.raw_user_meta_data->>'nombre',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'display_name',''),'Comprador'),
 r.cantidad,r.precio_unitario,r.estado,r.codigo,r.observaciones,r.metodo_pago,r.solicitada_en,r.confirmada_en,r.lista_en,r.entregada_en,r.recogida_desde,r.recogida_hasta,r.motivo_rechazo,
 p.puntaje, p.cerradas, r.incumplida_por, r.motivo_incumplimiento
 FROM public.reservas r JOIN public.ofertas o ON o.id=r.oferta_id LEFT JOIN auth.users u ON u.id=r.comprador_id
 CROSS JOIN LATERAL public.calcular_puntaje_comprador(r.comprador_id) p
 WHERE o.negocio_id=$1 ORDER BY r.solicitada_en DESC;
 END;
$$;
REVOKE ALL ON FUNCTION public.reservas_negocio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reservas_negocio(uuid) TO authenticated;

-- 8. Reservas del comprador: suma el incumplimiento del negocio para mostrar el motivo.
DROP FUNCTION public.mis_reservas();
CREATE FUNCTION public.mis_reservas()
RETURNS TABLE (
  id uuid, oferta_id uuid, estado public.estado_reserva, codigo text, cantidad integer, precio_unitario integer,
  precio_habitual_unitario integer, observaciones text, motivo_rechazo text, metodo_pago public.metodo_pago,
  solicitada_en timestamptz, confirmada_en timestamptz, lista_en timestamptz, entregada_en timestamptz,
  recogida_desde timestamptz, recogida_hasta timestamptz, titulo text, foto_url text, negocio_id uuid,
  negocio_nombre text, negocio_direccion text, calificada boolean, negocio_slug text, negocio_logo_url text,
  formato text, tamano text, lleva smallint, paga smallint, incumplida_por text, motivo_incumplimiento text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.id, r.oferta_id, r.estado, r.codigo, r.cantidad, r.precio_unitario, r.precio_habitual_unitario,
         r.observaciones, r.motivo_rechazo, r.metodo_pago, r.solicitada_en, r.confirmada_en, r.lista_en,
         r.entregada_en, r.recogida_desde, r.recogida_hasta, o.titulo, o.foto_url, n.id, n.nombre, n.direccion,
         EXISTS (SELECT 1 FROM public.calificaciones c WHERE c.reserva_id = r.id),
         n.slug, n.logo_url, o.formato, o.tamano, o.lleva, o.paga, r.incumplida_por, r.motivo_incumplimiento
  FROM public.reservas r
  JOIN public.ofertas o ON o.id = r.oferta_id
  JOIN public.negocios n ON n.id = o.negocio_id
  WHERE r.comprador_id = auth.uid()
  ORDER BY r.solicitada_en DESC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.mis_reservas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_reservas() TO authenticated;

-- 9. Para /admin: incumplimientos de los últimos 7 días por negocio.
CREATE FUNCTION public.incumplimientos_recientes()
RETURNS TABLE (negocio_id uuid, total integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo el equipo de Salvori ve esta información.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT o.negocio_id, count(*)::integer
    FROM public.reservas r JOIN public.ofertas o ON o.id = r.oferta_id
    WHERE r.incumplida_por = 'negocio' AND r.cancelada_en >= now() - interval '7 days'
    GROUP BY o.negocio_id;
END;
$$;
REVOKE ALL ON FUNCTION public.incumplimientos_recientes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.incumplimientos_recientes() TO authenticated;
