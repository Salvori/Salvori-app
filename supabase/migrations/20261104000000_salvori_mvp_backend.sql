CREATE TYPE public.app_role AS ENUM ('comprador', 'negocio', 'admin');
CREATE TYPE public.categoria AS ENUM ('desayuno', 'almuerzo', 'panaderia_pasteleria', 'cafe', 'comida_rapida', 'saludable', 'postres', 'bebidas', 'otro');
CREATE TYPE public.tipo_oferta AS ENUM ('comercial', 'lote');
CREATE TYPE public.estado_oferta AS ENUM ('borrador', 'activa', 'agotada', 'cerrada');
CREATE TYPE public.estado_reserva AS ENUM ('solicitada', 'confirmada', 'rechazada', 'cancelada', 'lista', 'entregada', 'no_recogida');
CREATE TYPE public.metodo_pago AS ENUM ('efectivo', 'nequi', 'transferencia', 'tarjeta');
CREATE TYPE public.tipo_evento AS ENUM ('view_item', 'reserva_solicitada', 'reserva_confirmada', 'reserva_entregada', 'no_recogida', 'reserva_cancelada', 'reserva_rechazada', 'reserva_lista');

CREATE TABLE public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role public.app_role NOT NULL,
 UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.has_role(uid uuid, rol public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = rol);
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
CREATE POLICY roles_ver_propios_o_admin ON public.user_roles FOR SELECT TO authenticated
 USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.negocios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 nombre text NOT NULL CHECK (length(btrim(nombre)) > 0),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 categoria public.categoria NOT NULL,
 descripcion text NOT NULL DEFAULT '',
 direccion text NOT NULL DEFAULT '',
 lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
 lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
 horario jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(horario) = 'object'),
 telefono_whatsapp text,
 foto_portada text,
 activo boolean NOT NULL DEFAULT true,
 es_prueba boolean NOT NULL DEFAULT false,
 creado_en timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.negocios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.negocios TO authenticated;
GRANT ALL ON public.negocios TO service_role;
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.negocio_miembros (
 negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL,
 creado_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (negocio_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.negocio_miembros TO authenticated;
GRANT ALL ON public.negocio_miembros TO service_role;
ALTER TABLE public.negocio_miembros ENABLE ROW LEVEL SECURITY;
CREATE INDEX negocio_miembros_user_idx ON public.negocio_miembros(user_id, negocio_id);
CREATE FUNCTION public.es_miembro_negocio(negocio uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.has_role(auth.uid(), 'admin') OR (
 public.has_role(auth.uid(), 'negocio') AND EXISTS (
 SELECT 1 FROM public.negocio_miembros WHERE negocio_id = negocio AND user_id = auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.es_miembro_negocio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_miembro_negocio(uuid) TO authenticated, service_role;
CREATE POLICY negocios_lectura_publica ON public.negocios FOR SELECT TO anon, authenticated USING (activo AND NOT es_prueba);
CREATE POLICY negocios_lectura_miembro ON public.negocios FOR SELECT TO authenticated USING (public.es_miembro_negocio(id));
CREATE POLICY negocios_admin_gestion ON public.negocios FOR ALL TO authenticated
 USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY miembros_ver_propios_o_admin ON public.negocio_miembros FOR SELECT TO authenticated
 USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY miembros_admin_gestion ON public.negocio_miembros FOR ALL TO authenticated
 USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ofertas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE RESTRICT,
 tipo public.tipo_oferta NOT NULL,
 titulo text NOT NULL CHECK (length(btrim(titulo)) > 0),
 contenido text NOT NULL CHECK (length(btrim(contenido)) > 0),
 categoria public.categoria NOT NULL,
 foto_url text NOT NULL CHECK (length(btrim(foto_url)) > 0),
 precio_habitual integer NOT NULL CHECK (precio_habitual > 0),
 precio_final integer NOT NULL CHECK (precio_final > 0 AND precio_final < precio_habitual),
 cupos_total integer NOT NULL CHECK (cupos_total > 0),
 cupos_disponibles integer NOT NULL CHECK (cupos_disponibles BETWEEN 0 AND cupos_total),
 recogida_desde timestamptz NOT NULL,
 recogida_hasta timestamptz NOT NULL CHECK (recogida_hasta > recogida_desde),
 tiempo_preparacion_min integer CHECK (tiempo_preparacion_min >= 0),
 elaborado_en timestamptz,
 estado public.estado_oferta NOT NULL DEFAULT 'borrador',
 publicada_por uuid DEFAULT auth.uid(),
 es_prueba boolean NOT NULL DEFAULT false,
 creado_en timestamptz NOT NULL DEFAULT now(),
 CHECK (tipo <> 'lote' OR elaborado_en IS NOT NULL),
 CHECK (elaborado_en IS NULL OR elaborado_en <= recogida_hasta),
 CHECK (estado <> 'agotada' OR cupos_disponibles = 0),
 CHECK (estado <> 'activa' OR cupos_disponibles > 0)
);
GRANT SELECT ON public.ofertas TO anon;
GRANT SELECT, INSERT, UPDATE ON public.ofertas TO authenticated;
GRANT ALL ON public.ofertas TO service_role;
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;
CREATE INDEX ofertas_negocio_estado_recogida_idx ON public.ofertas(negocio_id, estado, recogida_hasta);
CREATE POLICY ofertas_lectura_publica ON public.ofertas FOR SELECT TO anon, authenticated
 USING (NOT es_prueba AND estado IN ('activa', 'agotada') AND recogida_hasta >= now()
 AND EXISTS (SELECT 1 FROM public.negocios n WHERE n.id = negocio_id AND n.activo AND NOT n.es_prueba));
CREATE POLICY ofertas_lectura_miembro ON public.ofertas FOR SELECT TO authenticated USING (public.es_miembro_negocio(negocio_id));
CREATE POLICY ofertas_publicar_miembro ON public.ofertas FOR INSERT TO authenticated
 WITH CHECK (public.es_miembro_negocio(negocio_id) AND publicada_por = auth.uid());
CREATE POLICY ofertas_editar_miembro ON public.ofertas FOR UPDATE TO authenticated
 USING (public.es_miembro_negocio(negocio_id)) WITH CHECK (public.es_miembro_negocio(negocio_id));

CREATE TABLE public.oferta_programacion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE RESTRICT,
 plantilla_oferta_id uuid NOT NULL REFERENCES public.ofertas(id) ON DELETE RESTRICT,
 dias_semana smallint[] NOT NULL CHECK (cardinality(dias_semana) BETWEEN 1 AND 7 AND dias_semana <@ ARRAY[1,2,3,4,5,6,7]::smallint[]),
 hora_publicacion time NOT NULL,
 activa boolean NOT NULL DEFAULT true,
 creado_en timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.oferta_programacion.dias_semana IS 'ISO: lunes=1, domingo=7. Hora local America/Bogota.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oferta_programacion TO authenticated;
GRANT ALL ON public.oferta_programacion TO service_role;
ALTER TABLE public.oferta_programacion ENABLE ROW LEVEL SECURITY;
CREATE INDEX programacion_negocio_idx ON public.oferta_programacion(negocio_id);
CREATE POLICY programacion_miembro_gestion ON public.oferta_programacion FOR ALL TO authenticated
 USING (public.es_miembro_negocio(negocio_id)) WITH CHECK (public.es_miembro_negocio(negocio_id));
CREATE FUNCTION public.validar_programacion() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
 BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.ofertas WHERE id = NEW.plantilla_oferta_id AND negocio_id = NEW.negocio_id) THEN
 RAISE EXCEPTION 'La plantilla debe pertenecer al mismo negocio.' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
 END;
$$;
CREATE TRIGGER validar_programacion_trigger BEFORE INSERT OR UPDATE ON public.oferta_programacion FOR EACH ROW EXECUTE FUNCTION public.validar_programacion();

CREATE TABLE public.reservas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 oferta_id uuid NOT NULL REFERENCES public.ofertas(id) ON DELETE RESTRICT,
 comprador_id uuid NOT NULL,
 cantidad integer NOT NULL CHECK (cantidad > 0),
 precio_unitario integer NOT NULL CHECK (precio_unitario > 0),
 precio_habitual_unitario integer NOT NULL CHECK (precio_habitual_unitario > precio_unitario),
 codigo text UNIQUE CHECK (codigo IS NULL OR codigo ~ '^[A-Z0-9]{6}$'),
 estado public.estado_reserva NOT NULL DEFAULT 'solicitada',
 motivo_rechazo text,
 observaciones text NOT NULL DEFAULT '' CHECK (length(observaciones) <= 1000),
 metodo_pago public.metodo_pago,
 origen text NOT NULL DEFAULT 'directo' CHECK (length(origen) <= 500),
 solicitada_en timestamptz NOT NULL DEFAULT now(),
 confirmada_en timestamptz,
 lista_en timestamptz,
 entregada_en timestamptz,
 rechazada_en timestamptz,
 cancelada_en timestamptz,
 no_recogida_en timestamptz,
 recogida_desde timestamptz NOT NULL,
 recogida_hasta timestamptz NOT NULL CHECK (recogida_hasta > recogida_desde),
 CHECK (estado <> 'rechazada' OR length(btrim(motivo_rechazo)) > 0 AND motivo_rechazo IS NOT NULL),
 CHECK (estado NOT IN ('confirmada','lista','entregada','no_recogida') OR codigo IS NOT NULL AND confirmada_en IS NOT NULL),
 CHECK (estado <> 'entregada' OR metodo_pago IS NOT NULL AND entregada_en IS NOT NULL)
);
GRANT SELECT ON public.reservas TO authenticated;
GRANT ALL ON public.reservas TO service_role;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
CREATE INDEX reservas_oferta_estado_idx ON public.reservas(oferta_id, estado);
CREATE INDEX reservas_comprador_fecha_idx ON public.reservas(comprador_id, solicitada_en DESC);
CREATE POLICY reservas_ver_propias_o_admin ON public.reservas FOR SELECT TO authenticated
 USING (comprador_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.proteger_inventario_oferta() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 BEGIN
 IF current_user <> 'authenticated' AND current_user <> 'anon' AND session_user <> 'authenticator' THEN RETURN NEW; END IF;
 IF TG_OP = 'INSERT' THEN
 IF NEW.cupos_disponibles <> NEW.cupos_total THEN RAISE EXCEPTION 'La oferta debe iniciar con todos sus cupos disponibles.' USING ERRCODE = '23514'; END IF;
 ELSE
 IF NEW.negocio_id IS DISTINCT FROM OLD.negocio_id OR NEW.publicada_por IS DISTINCT FROM OLD.publicada_por OR NEW.es_prueba IS DISTINCT FROM OLD.es_prueba THEN
 RAISE EXCEPTION 'No puedes cambiar el negocio ni el autor de una oferta.' USING ERRCODE = '42501'; END IF;
 IF EXISTS (SELECT 1 FROM public.reservas WHERE oferta_id = OLD.id) AND
 (NEW.cupos_total IS DISTINCT FROM OLD.cupos_total OR NEW.cupos_disponibles IS DISTINCT FROM OLD.cupos_disponibles) THEN
 RAISE EXCEPTION 'Los cupos de una oferta con reservas solo cambian al reservar, rechazar o cancelar.' USING ERRCODE = '42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.reservas WHERE oferta_id = OLD.id) AND NEW.cupos_disponibles <> NEW.cupos_total THEN
 RAISE EXCEPTION 'La oferta sin reservas debe conservar todos sus cupos disponibles.' USING ERRCODE = '23514'; END IF;
 END IF;
 RETURN NEW;
 END;
$$;

CREATE TABLE public.calificaciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reserva_id uuid NOT NULL UNIQUE REFERENCES public.reservas(id) ON DELETE RESTRICT,
 negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE RESTRICT,
 comprador_id uuid NOT NULL DEFAULT auth.uid(),
 calidad smallint NOT NULL CHECK (calidad BETWEEN 1 AND 5),
 aseo smallint NOT NULL CHECK (aseo BETWEEN 1 AND 5),
 atencion smallint NOT NULL CHECK (atencion BETWEEN 1 AND 5),
 comentario text NOT NULL DEFAULT '' CHECK (length(comentario) <= 280),
 creado_en timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.calificaciones TO authenticated;
GRANT ALL ON public.calificaciones TO service_role;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
CREATE INDEX calificaciones_negocio_idx ON public.calificaciones(negocio_id);
CREATE POLICY calificaciones_ver_propias_o_admin ON public.calificaciones FOR SELECT TO authenticated
 USING (comprador_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY calificaciones_crear_entregadas ON public.calificaciones FOR INSERT TO authenticated
 WITH CHECK (comprador_id = auth.uid() AND EXISTS (
 SELECT 1 FROM public.reservas r JOIN public.ofertas o ON o.id = r.oferta_id
 WHERE r.id = reserva_id AND r.comprador_id = auth.uid() AND r.estado = 'entregada' AND o.negocio_id = calificaciones.negocio_id));
CREATE FUNCTION public.validar_calificacion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.reservas r JOIN public.ofertas o ON o.id = r.oferta_id
 WHERE r.id = NEW.reserva_id AND r.comprador_id = NEW.comprador_id AND r.estado = 'entregada' AND o.negocio_id = NEW.negocio_id) THEN
 RAISE EXCEPTION 'Solo puedes calificar tus reservas entregadas en ese negocio.' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
 END;
$$;
CREATE TRIGGER validar_calificacion_trigger BEFORE INSERT OR UPDATE ON public.calificaciones FOR EACH ROW EXECUTE FUNCTION public.validar_calificacion();

CREATE TABLE public.eventos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tipo public.tipo_evento NOT NULL,
 negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE RESTRICT,
 oferta_id uuid NOT NULL REFERENCES public.ofertas(id) ON DELETE RESTRICT,
 origen text NOT NULL DEFAULT 'directo' CHECK (length(origen) <= 500),
 creado_en timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE INDEX eventos_negocio_fecha_idx ON public.eventos(negocio_id, creado_en DESC);
CREATE POLICY eventos_ver_miembro ON public.eventos FOR SELECT TO authenticated USING (public.es_miembro_negocio(negocio_id));

CREATE FUNCTION public.asignar_rol_comprador() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 BEGIN
 INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'comprador') ON CONFLICT DO NOTHING;
 RETURN NEW;
 END;
$$;
REVOKE ALL ON FUNCTION public.asignar_rol_comprador() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER salvori_asignar_comprador AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.asignar_rol_comprador();

CREATE FUNCTION public.solicitar_reserva(oferta_id uuid, cantidad integer, observaciones text DEFAULT '', origen text DEFAULT 'directo') RETURNS public.reservas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 DECLARE v_oferta public.ofertas; v_reserva public.reservas; v_ahora timestamptz;
 BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'comprador') THEN
 RAISE EXCEPTION 'Inicia sesión como comprador para reservar.' USING ERRCODE = '42501'; END IF;
 IF cantidad IS NULL OR cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor que cero.' USING ERRCODE = '22023'; END IF;
 IF length(coalesce(observaciones,'')) > 1000 OR length(coalesce(origen,'directo')) > 500 THEN
 RAISE EXCEPTION 'Las observaciones o el origen superan el máximo permitido.' USING ERRCODE = '22023'; END IF;
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
REVOKE ALL ON FUNCTION public.solicitar_reserva(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_reserva(uuid, integer, text, text) TO authenticated;

CREATE FUNCTION public.cambiar_estado_reserva(reserva_id uuid, nuevo_estado public.estado_reserva, datos jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
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
 RAISE EXCEPTION 'Solo el comprador puede cancelar su reserva solicitada.' USING ERRCODE = '42501'; END IF;
 ELSIF NOT v_operador THEN RAISE EXCEPTION 'No tienes permiso para gestionar esta reserva.' USING ERRCODE = '42501'; END IF;
 IF v_reserva.estado = nuevo_estado THEN RETURN jsonb_build_object('id',v_reserva.id,'estado',v_reserva.estado,'codigo',v_reserva.codigo,'metodo_pago',v_reserva.metodo_pago); END IF;
 IF NOT ((v_reserva.estado = 'solicitada' AND nuevo_estado IN ('confirmada','rechazada','cancelada')) OR
 (v_reserva.estado = 'confirmada' AND nuevo_estado IN ('lista','entregada','no_recogida')) OR
 (v_reserva.estado = 'lista' AND nuevo_estado IN ('entregada','no_recogida'))) THEN
 RAISE EXCEPTION 'El cambio de estado no está permitido.' USING ERRCODE = '22023'; END IF;
 IF nuevo_estado IN ('confirmada','lista','entregada') AND v_ahora > v_reserva.recogida_hasta THEN
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
REVOKE ALL ON FUNCTION public.cambiar_estado_reserva(uuid, public.estado_reserva, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_reserva(uuid, public.estado_reserva, jsonb) TO authenticated;

CREATE FUNCTION public.ahorro_comprador(uid uuid) RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
 BEGIN
 IF auth.uid() IS NULL OR (uid IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN
 RAISE EXCEPTION 'No tienes acceso al ahorro de otro comprador.' USING ERRCODE = '42501'; END IF;
 RETURN (SELECT coalesce(sum((precio_habitual_unitario::bigint-precio_unitario::bigint)*cantidad),0) FROM public.reservas WHERE comprador_id = uid AND estado = 'entregada');
 END;
$$;
REVOKE ALL ON FUNCTION public.ahorro_comprador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ahorro_comprador(uuid) TO authenticated;

CREATE FUNCTION public.reservas_negocio(negocio_id uuid)
RETURNS TABLE (id uuid, oferta_id uuid, titulo text, nombre_comprador text, cantidad integer, precio_unitario integer, estado public.estado_reserva, codigo text, observaciones text, metodo_pago public.metodo_pago, solicitada_en timestamptz, confirmada_en timestamptz, lista_en timestamptz, entregada_en timestamptz, recogida_desde timestamptz, recogida_hasta timestamptz, motivo_rechazo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
 BEGIN
 IF auth.uid() IS NULL OR NOT public.es_miembro_negocio($1) THEN RAISE EXCEPTION 'No tienes acceso a las reservas de este negocio.' USING ERRCODE = '42501'; END IF;
 RETURN QUERY SELECT r.id,r.oferta_id,o.titulo,
 coalesce(nullif(u.raw_user_meta_data->>'nombre',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'display_name',''),'Comprador'),
 r.cantidad,r.precio_unitario,r.estado,r.codigo,r.observaciones,r.metodo_pago,r.solicitada_en,r.confirmada_en,r.lista_en,r.entregada_en,r.recogida_desde,r.recogida_hasta,r.motivo_rechazo
 FROM public.reservas r JOIN public.ofertas o ON o.id=r.oferta_id LEFT JOIN auth.users u ON u.id=r.comprador_id WHERE o.negocio_id=$1 ORDER BY r.solicitada_en DESC;
 END;
$$;
REVOKE ALL ON FUNCTION public.reservas_negocio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reservas_negocio(uuid) TO authenticated;

CREATE FUNCTION public.calificaciones_negocio(negocio_id uuid)
RETURNS TABLE (calidad smallint, aseo smallint, atencion smallint, comentario text, creado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
 BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.negocios n WHERE n.id=$1 AND n.activo AND NOT n.es_prueba) THEN RETURN; END IF;
 RETURN QUERY SELECT c.calidad,c.aseo,c.atencion,c.comentario,c.creado_en FROM public.calificaciones c WHERE c.negocio_id=$1 ORDER BY c.creado_en DESC;
 END;
$$;
REVOKE ALL ON FUNCTION public.calificaciones_negocio(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calificaciones_negocio(uuid) TO anon, authenticated;

CREATE FUNCTION public.registrar_vista(oferta_id uuid, origen text DEFAULT 'directo') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 DECLARE v_negocio uuid;
 BEGIN
 IF length(coalesce(origen,'directo')) > 500 THEN RAISE EXCEPTION 'El origen supera el máximo permitido.' USING ERRCODE='22023'; END IF;
 SELECT o.negocio_id INTO v_negocio FROM public.ofertas o JOIN public.negocios n ON n.id=o.negocio_id WHERE o.id=$1 AND o.estado IN ('activa','agotada') AND o.recogida_hasta>=clock_timestamp() AND NOT o.es_prueba AND n.activo AND NOT n.es_prueba;
 IF v_negocio IS NULL THEN RAISE EXCEPTION 'La oferta no está disponible.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.eventos(tipo,negocio_id,oferta_id,origen) VALUES('view_item',v_negocio,$1,coalesce(nullif(btrim($2),''),'directo'));
 END;
$$;
REVOKE ALL ON FUNCTION public.registrar_vista(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_vista(uuid,text) TO anon,authenticated;

CREATE FUNCTION public.puede_escribir_foto(nombre text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
 DECLARE partes text[]; v_negocio uuid;
 BEGIN
 partes := string_to_array(nombre,'/');
 IF cardinality(partes) <> 2 OR coalesce(partes[2],'') IN ('','.','..') OR partes[1] !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR lower(partes[2]) !~ '\.(jpg|jpeg|png|webp|avif)$' THEN RETURN false; END IF;
 v_negocio := partes[1]::uuid;
 RETURN EXISTS(SELECT 1 FROM public.negocios WHERE id=v_negocio) AND public.es_miembro_negocio(v_negocio);
 END;
$$;
REVOKE ALL ON FUNCTION public.puede_escribir_foto(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_escribir_foto(text) TO authenticated;
CREATE POLICY ofertas_fotos_lectura_publica ON storage.objects FOR SELECT TO anon,authenticated USING (bucket_id='ofertas');
CREATE POLICY ofertas_fotos_insertar_miembro ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='ofertas' AND public.puede_escribir_foto(name));
CREATE POLICY ofertas_fotos_actualizar_miembro ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='ofertas' AND public.puede_escribir_foto(name)) WITH CHECK (bucket_id='ofertas' AND public.puede_escribir_foto(name));
CREATE POLICY ofertas_fotos_eliminar_miembro ON storage.objects FOR DELETE TO authenticated USING (bucket_id='ofertas' AND public.puede_escribir_foto(name));

REVOKE ALL ON FUNCTION public.validar_programacion(), public.validar_calificacion(), public.proteger_inventario_oferta() FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.reservas IS 'Escrituras solo mediante solicitar_reserva y cambiar_estado_reserva. Negocios usan reservas_negocio para no exponer datos personales.';
COMMENT ON COLUMN public.reservas.recogida_hasta IS 'Ventana copiada al reservar, no depende de posteriores ediciones de la oferta.';
COMMENT ON COLUMN public.negocios.es_prueba IS 'Datos de prueba, excluidos del catálogo público.';
COMMENT ON COLUMN public.ofertas.es_prueba IS 'Datos de prueba, excluidos del catálogo público.';
