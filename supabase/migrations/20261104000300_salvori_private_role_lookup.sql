CREATE OR REPLACE FUNCTION public.has_role(uid uuid, rol public.app_role) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 IF uid IS DISTINCT FROM auth.uid() AND NOT EXISTS (
 SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') THEN
 RAISE EXCEPTION 'No tienes acceso a los roles de otro usuario.' USING ERRCODE='42501';
 END IF;
 RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=uid AND role=rol);
END;
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;
COMMENT ON FUNCTION public.has_role(uuid,public.app_role) IS 'Consulta propia o de admin; evita recursión RLS sin exponer roles de otros usuarios.';
