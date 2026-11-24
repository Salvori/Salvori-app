-- Lanzamiento · notificaciones (23 nov 2026).
-- 1. WhatsApp del negocio para el botón «Enviar mi pedido por WhatsApp» del comprador.
-- 2. Interesados («Avísame cuando haya combos cerca») con baja por token.
-- 3. Registro de ofertas ya avisadas a los interesados (evita correos duplicados).

-- 1. Teléfono de WhatsApp de los negocios donde el comprador tiene reservas.
--    Aparte de mis_reservas para no cambiar su firma. El comprador ya puede ver el
--    teléfono de los negocios públicos; esto cubre también los de prueba y los inactivos
--    donde reservó. No expone nada del comprador.
CREATE FUNCTION public.contacto_negocios_comprador()
RETURNS TABLE (negocio_id uuid, telefono_whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT DISTINCT n.id, n.telefono_whatsapp
  FROM public.reservas r
  JOIN public.ofertas o ON o.id = r.oferta_id
  JOIN public.negocios n ON n.id = o.negocio_id
  WHERE r.comprador_id = auth.uid() AND n.telefono_whatsapp IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.contacto_negocios_comprador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contacto_negocios_comprador() TO authenticated;
COMMENT ON FUNCTION public.contacto_negocios_comprador() IS 'WhatsApp de los negocios donde el usuario actual reservó (botón de enviar el pedido).';

-- 2. Interesados: correo, ubicación y radio. Inserta cualquiera (con autorización de
--    datos, Ley 1581 de 2012); lee solo el admin; el usuario con sesión ve y borra la suya.
CREATE TABLE public.interesados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  correo text NOT NULL CHECK (length(correo) <= 254 AND correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  origen_ubicacion text NOT NULL CHECK (origen_ubicacion IN ('direccion', 'navegador', 'mapa')),
  radio_km smallint NOT NULL CHECK (radio_km IN (1, 2, 5)),
  autoriza_datos boolean NOT NULL CHECK (autoriza_datos),
  autorizado_en timestamptz NOT NULL DEFAULT now(),
  token_baja uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ultimo_envio timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX interesados_correo_unico ON public.interesados (lower(correo));
CREATE UNIQUE INDEX interesados_usuario_unico ON public.interesados (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX interesados_ultimo_envio_idx ON public.interesados (ultimo_envio);

REVOKE ALL ON public.interesados FROM anon, authenticated;
-- Al insertar solo se eligen estos campos: el token, las fechas y el último envío los pone la base.
GRANT INSERT (user_id, correo, lat, lng, origen_ubicacion, radio_km, autoriza_datos) ON public.interesados TO anon, authenticated;
GRANT SELECT, DELETE ON public.interesados TO authenticated;
GRANT ALL ON public.interesados TO service_role;
ALTER TABLE public.interesados ENABLE ROW LEVEL SECURITY;

CREATE POLICY interesados_inscribir ON public.interesados FOR INSERT TO anon, authenticated
  WITH CHECK (autoriza_datos AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY interesados_ver ON public.interesados FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY interesados_borrar ON public.interesados FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.interesados IS 'Personas que piden un correo cuando hay combos cerca. Baja con token_baja en cada correo.';

-- Baja desde el enlace del correo: cualquiera con el token borra esa inscripción.
CREATE FUNCTION public.dar_de_baja_interesado(token uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_borradas integer;
BEGIN
  DELETE FROM public.interesados i WHERE i.token_baja = $1;
  GET DIAGNOSTICS v_borradas = ROW_COUNT;
  RETURN v_borradas > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.dar_de_baja_interesado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dar_de_baja_interesado(uuid) TO anon, authenticated;

-- 3. Ofertas ya avisadas: la Server Action al publicar y la ruta del cron compiten por
--    la misma oferta; quien inserta primero la avisa. Solo el servidor (service_role).
CREATE TABLE public.ofertas_avisadas (
  oferta_id uuid PRIMARY KEY REFERENCES public.ofertas(id) ON DELETE CASCADE,
  procesada_en timestamptz NOT NULL DEFAULT now(),
  enviados integer NOT NULL DEFAULT 0 CHECK (enviados >= 0)
);
REVOKE ALL ON public.ofertas_avisadas FROM anon, authenticated;
GRANT ALL ON public.ofertas_avisadas TO service_role;
ALTER TABLE public.ofertas_avisadas ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.ofertas_avisadas IS 'Ofertas cuyo aviso a interesados ya salió (o se intentó). Solo service_role.';
