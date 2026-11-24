-- Lanzamiento (23 nov 2026) · Planes y mensualidad de los negocios.
-- Modelo: 15 días de prueba y luego plan Básico desde $50.000 al mes. Los planes se
-- diferencian por cuántas ofertas activas puede tener el negocio al mismo tiempo.
-- La mensualidad se paga fuera de la app (efectivo, Nequi, transferencia) y la
-- registra el admin; no hay pasarela.

-- 1. Planes (los edita el admin desde /admin/planes).
CREATE TABLE public.planes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE CHECK (length(btrim(nombre)) BETWEEN 1 AND 40),
  precio_mensual integer NOT NULL DEFAULT 0 CHECK (precio_mensual >= 0),
  max_ofertas_activas integer CHECK (max_ofertas_activas IS NULL OR max_ofertas_activas > 0),
  dias_prueba integer CHECK (dias_prueba IS NULL OR dias_prueba BETWEEN 1 AND 90),
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.planes IS 'Planes de la mensualidad. max_ofertas_activas null = sin límite. dias_prueba no nulo = plan de prueba (el que recibe un negocio nuevo).';
COMMENT ON COLUMN public.planes.precio_mensual IS 'COP sin decimales.';

INSERT INTO public.planes (nombre, precio_mensual, max_ofertas_activas, dias_prueba, activo, orden) VALUES
  ('Prueba', 0, 5, 15, true, 0),
  ('Básico', 50000, 5, NULL, true, 1);

-- 2. Suscripción: una por negocio.
CREATE TYPE public.estado_suscripcion AS ENUM ('prueba', 'activa', 'vencida', 'suspendida');

CREATE TABLE public.suscripciones (
  negocio_id uuid PRIMARY KEY REFERENCES public.negocios(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.planes(id) ON DELETE RESTRICT,
  estado public.estado_suscripcion NOT NULL DEFAULT 'prueba',
  inicia_en timestamptz NOT NULL DEFAULT now(),
  vence_en timestamptz NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (vence_en > inicia_en)
);
COMMENT ON TABLE public.suscripciones IS 'Plan vigente de cada negocio. Tras vence_en hay 3 días de gracia; después no puede activar ofertas (ver validar_plan_oferta).';

-- 3. Pagos de la mensualidad (registrados por el admin con registrar_pago_mensualidad).
CREATE TABLE public.pagos_mensualidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocios(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.planes(id) ON DELETE RESTRICT,
  valor integer NOT NULL CHECK (valor >= 0),
  metodo text NOT NULL CHECK (metodo IN ('efectivo', 'nequi', 'transferencia', 'otro')),
  periodo_desde timestamptz NOT NULL,
  periodo_hasta timestamptz NOT NULL CHECK (periodo_hasta > periodo_desde),
  registrado_por uuid DEFAULT auth.uid(),
  nota text NOT NULL DEFAULT '' CHECK (length(nota) <= 500),
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pagos_mensualidad_negocio_idx ON public.pagos_mensualidad(negocio_id, creado_en DESC);

-- 4. Permisos y RLS: el admin todo; el negocio lee solo lo suyo; nadie más.
--    Los planes activos son públicos (la portada muestra el precio).
REVOKE ALL ON public.planes, public.suscripciones, public.pagos_mensualidad FROM anon, authenticated;
GRANT SELECT ON public.planes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.planes TO authenticated;
GRANT SELECT, UPDATE ON public.suscripciones TO authenticated;
GRANT SELECT ON public.pagos_mensualidad TO authenticated;
GRANT ALL ON public.planes, public.suscripciones, public.pagos_mensualidad TO service_role;
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_mensualidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY planes_lectura_publica ON public.planes FOR SELECT TO anon, authenticated USING (activo);
CREATE POLICY planes_admin_gestion ON public.planes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- es_miembro_negocio ya incluye al admin.
CREATE POLICY suscripciones_lectura_miembro ON public.suscripciones FOR SELECT TO authenticated
  USING (public.es_miembro_negocio(negocio_id));
CREATE POLICY suscripciones_admin_edita ON public.suscripciones FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY pagos_lectura_miembro ON public.pagos_mensualidad FOR SELECT TO authenticated
  USING (public.es_miembro_negocio(negocio_id));
-- Un negocio con un plan inactivo sigue viendo el nombre de su plan.
CREATE POLICY planes_lectura_suscrito ON public.planes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.suscripciones s WHERE s.plan_id = planes.id));

-- 5. Todo negocio nuevo arranca en el plan de prueba.
CREATE FUNCTION public.crear_suscripcion_prueba() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.suscripciones (negocio_id, plan_id, estado, inicia_en, vence_en)
  SELECT NEW.id, p.id, 'prueba', now(), now() + make_interval(days => p.dias_prueba)
  FROM public.planes p
  WHERE p.dias_prueba IS NOT NULL AND p.activo
  ORDER BY p.orden, p.creado_en
  LIMIT 1
  ON CONFLICT (negocio_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.crear_suscripcion_prueba() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER crear_suscripcion_prueba_trigger AFTER INSERT ON public.negocios
  FOR EACH ROW EXECUTE FUNCTION public.crear_suscripcion_prueba();

-- Los negocios que ya existen reciben 15 días de prueba desde hoy.
INSERT INTO public.suscripciones (negocio_id, plan_id, estado, inicia_en, vence_en)
SELECT n.id, p.id, 'prueba', now(), now() + interval '15 days'
FROM public.negocios n
CROSS JOIN (SELECT id FROM public.planes WHERE nombre = 'Prueba') p
ON CONFLICT (negocio_id) DO NOTHING;

-- 6. Límite del plan, en la base de datos. Se revisa cuando una oferta QUEDA activa:
--    al insertarla activa (publicar, duplicar, publicar por el negocio desde admin,
--    cron de programadas) o al pasar de borrador/cerrada a activa. No se revisa
--    activa ↔ agotada (reservar, rechazar, cancelar, editar cupos): eso no abre una
--    oferta nueva y bloquearlo rompería las reservas.
--    Cuenta las ofertas 'activa' del negocio cuya ventana no ha terminado.
--    Bloquea también si la suscripción está suspendida o si pasaron 3 días de
--    gracia desde vence_en.
--    En el cron (publicar_programadas, sesión directa a la base) no lanza error:
--    deja esa oferta en borrador para no frenar la publicación de los demás negocios.
CREATE FUNCTION public.validar_plan_oferta() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_s public.suscripciones;
  v_plan public.planes;
  v_activas integer;
  v_msg text;
BEGIN
  IF NEW.estado <> 'activa' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.estado IN ('activa', 'agotada') THEN RETURN NEW; END IF;

  -- FOR UPDATE: dos publicaciones simultáneas del mismo negocio se esperan.
  SELECT * INTO v_s FROM public.suscripciones WHERE negocio_id = NEW.negocio_id FOR UPDATE;

  IF v_s.negocio_id IS NULL THEN
    v_msg := 'Este negocio todavía no tiene un plan. Escríbele al equipo Salvori para activarlo.';
  ELSIF v_s.estado = 'suspendida' THEN
    v_msg := 'La cuenta de este negocio está suspendida. Escríbele al equipo Salvori para reactivarla.';
  ELSIF clock_timestamp() > v_s.vence_en + interval '3 days' THEN
    v_msg := format('Tu plan venció el %s. Para seguir publicando, paga la mensualidad a Salvori.',
                    to_char(v_s.vence_en AT TIME ZONE 'America/Bogota', 'DD/MM/YYYY'));
  ELSE
    SELECT * INTO v_plan FROM public.planes WHERE id = v_s.plan_id;
    IF v_plan.max_ofertas_activas IS NOT NULL THEN
      SELECT count(*) INTO v_activas FROM public.ofertas o
      WHERE o.negocio_id = NEW.negocio_id AND o.estado = 'activa'
        AND o.recogida_hasta > clock_timestamp() AND o.id <> NEW.id;
      IF v_activas >= v_plan.max_ofertas_activas THEN
        v_msg := format('Llegaste al límite de tu plan %s: %s %s al mismo tiempo. Cierra una oferta activa o pide un plan mayor.',
                        v_plan.nombre, v_plan.max_ofertas_activas,
                        CASE WHEN v_plan.max_ofertas_activas = 1 THEN 'oferta activa' ELSE 'ofertas activas' END);
      END IF;
    END IF;
  END IF;

  IF v_msg IS NULL THEN RETURN NEW; END IF;

  IF session_user <> 'authenticator' AND current_query() ILIKE '%publicar_programadas%' THEN
    RAISE WARNING 'Oferta programada de % queda en borrador: %', NEW.negocio_id, v_msg;
    NEW.estado := 'borrador';
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '%', v_msg USING ERRCODE = 'P0001', HINT = 'plan_salvori';
END;
$$;
REVOKE ALL ON FUNCTION public.validar_plan_oferta() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validar_plan_oferta_trigger BEFORE INSERT OR UPDATE ON public.ofertas
  FOR EACH ROW EXECUTE FUNCTION public.validar_plan_oferta();

-- 7. Estado del plan para el panel del negocio (un negocio) y el admin (todos).
--    El estado se calcula al leer: vence_en pasado = vencida, aunque el cron
--    diario todavía no lo haya marcado.
CREATE FUNCTION public.estado_planes(p_negocio uuid DEFAULT NULL)
RETURNS TABLE (
  negocio_id uuid,
  negocio_nombre text,
  negocio_slug text,
  negocio_es_prueba boolean,
  plan_id uuid,
  plan_nombre text,
  precio_mensual integer,
  max_ofertas_activas integer,
  estado public.estado_suscripcion,
  vence_en timestamptz,
  bloquea_en timestamptz,
  ofertas_activas integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_negocio IS NULL THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Solo el equipo Salvori ve los planes de todos los negocios.' USING ERRCODE = '42501';
    END IF;
  ELSIF auth.uid() IS NULL OR NOT public.es_miembro_negocio(p_negocio) THEN
    RAISE EXCEPTION 'No tienes acceso al plan de este negocio.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT n.id, n.nombre, n.slug, n.es_prueba, p.id, p.nombre, p.precio_mensual, p.max_ofertas_activas,
         CASE
           WHEN s.negocio_id IS NULL THEN NULL
           WHEN s.estado = 'suspendida' THEN 'suspendida'::public.estado_suscripcion
           WHEN s.vence_en < clock_timestamp() THEN 'vencida'::public.estado_suscripcion
           WHEN s.estado = 'vencida' THEN 'activa'::public.estado_suscripcion
           ELSE s.estado
         END,
         s.vence_en,
         s.vence_en + interval '3 days',
         (SELECT count(*)::integer FROM public.ofertas o
          WHERE o.negocio_id = n.id AND o.estado = 'activa' AND o.recogida_hasta > clock_timestamp())
  FROM public.negocios n
  LEFT JOIN public.suscripciones s ON s.negocio_id = n.id
  LEFT JOIN public.planes p ON p.id = s.plan_id
  WHERE p_negocio IS NULL OR n.id = p_negocio
  ORDER BY n.es_prueba, s.vence_en NULLS FIRST, n.nombre;
END;
$$;
REVOKE ALL ON FUNCTION public.estado_planes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estado_planes(uuid) TO authenticated;

-- 8. Registrar un pago: guarda el pago, extiende vence_en y deja la suscripción activa.
--    El periodo empieza donde termina el anterior (o hoy, si ya venció): pagar durante
--    la prueba no pierde los días de prueba.
CREATE FUNCTION public.registrar_pago_mensualidad(
  p_negocio uuid,
  p_plan uuid,
  p_valor integer,
  p_metodo text,
  p_meses integer DEFAULT 1,
  p_nota text DEFAULT ''
) RETURNS public.pagos_mensualidad
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_s public.suscripciones;
  v_desde timestamptz;
  v_hasta timestamptz;
  v_pago public.pagos_mensualidad;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo el equipo Salvori registra pagos.' USING ERRCODE = '42501';
  END IF;
  IF p_meses IS NULL OR p_meses NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'Los meses pagados van de 1 a 12.' USING ERRCODE = '22023';
  END IF;
  IF p_valor IS NULL OR p_valor < 0 THEN
    RAISE EXCEPTION 'El valor no es válido.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.negocios WHERE id = p_negocio) THEN
    RAISE EXCEPTION 'El negocio no existe.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.planes WHERE id = p_plan) THEN
    RAISE EXCEPTION 'El plan no existe.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_s FROM public.suscripciones WHERE negocio_id = p_negocio FOR UPDATE;
  v_desde := greatest(coalesce(v_s.vence_en, clock_timestamp()), clock_timestamp());
  v_hasta := v_desde + make_interval(months => p_meses);

  INSERT INTO public.pagos_mensualidad (negocio_id, plan_id, valor, metodo, periodo_desde, periodo_hasta, registrado_por, nota)
  VALUES (p_negocio, p_plan, p_valor, p_metodo, v_desde, v_hasta, auth.uid(), coalesce(btrim(p_nota), ''))
  RETURNING * INTO v_pago;

  INSERT INTO public.suscripciones (negocio_id, plan_id, estado, inicia_en, vence_en)
  VALUES (p_negocio, p_plan, 'activa', v_desde, v_hasta)
  ON CONFLICT (negocio_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id, estado = 'activa', vence_en = EXCLUDED.vence_en, actualizado_en = now();

  RETURN v_pago;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_pago_mensualidad(uuid, uuid, integer, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pago_mensualidad(uuid, uuid, integer, text, integer, text) TO authenticated;

-- 9. Cambio automático a «vencida»: un cron diario (00:05 en Colombia) marca las
--    suscripciones cuyo vence_en ya pasó. estado_planes() ya lo calcula al leer, así
--    que el panel y el admin no dependen de que el cron haya corrido.
CREATE FUNCTION public.marcar_suscripciones_vencidas() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_total integer;
BEGIN
  UPDATE public.suscripciones SET estado = 'vencida', actualizado_en = now()
  WHERE estado IN ('prueba', 'activa') AND vence_en < clock_timestamp();
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.marcar_suscripciones_vencidas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_suscripciones_vencidas() TO service_role;
COMMENT ON FUNCTION public.marcar_suscripciones_vencidas() IS 'pg_cron diario 05:05 UTC (00:05 en Colombia): prueba/activa con vence_en pasado → vencida.';

SELECT cron.schedule('salvori-vencer-suscripciones', '5 5 * * *', $$SELECT public.marcar_suscripciones_vencidas();$$);
