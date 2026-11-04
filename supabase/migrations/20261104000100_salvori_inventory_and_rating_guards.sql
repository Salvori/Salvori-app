CREATE FUNCTION public.oferta_tiene_reservas(oferta uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.ofertas o WHERE o.id=$1 AND public.es_miembro_negocio(o.negocio_id)) THEN
 RAISE EXCEPTION 'No tienes acceso a esta oferta.' USING ERRCODE='42501';
 END IF;
 RETURN EXISTS(SELECT 1 FROM public.reservas WHERE oferta_id=$1);
END;
$$;
REVOKE ALL ON FUNCTION public.oferta_tiene_reservas(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.oferta_tiene_reservas(uuid) TO authenticated;
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
  IF tiene_reservas AND (NEW.cupos_total IS DISTINCT FROM OLD.cupos_total OR NEW.cupos_disponibles IS DISTINCT FROM OLD.cupos_disponibles) THEN
   RAISE EXCEPTION 'Los cupos de una oferta con reservas solo cambian al reservar, rechazar o cancelar.' USING ERRCODE='42501'; END IF;
  IF NOT tiene_reservas AND NEW.cupos_disponibles <> NEW.cupos_total THEN
   RAISE EXCEPTION 'La oferta sin reservas debe conservar todos sus cupos disponibles.' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER proteger_inventario_oferta_trigger BEFORE INSERT OR UPDATE ON public.ofertas FOR EACH ROW EXECUTE FUNCTION public.proteger_inventario_oferta();
ALTER POLICY calificaciones_crear_entregadas ON public.calificaciones
 WITH CHECK (comprador_id=auth.uid() AND public.has_role(auth.uid(),'comprador'));
COMMENT ON FUNCTION public.validar_calificacion() IS 'Valida propiedad, entrega y negocio incluso cuando la oferta ya no es visible al comprador.';
