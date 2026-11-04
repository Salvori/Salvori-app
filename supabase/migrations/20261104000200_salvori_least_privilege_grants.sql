REVOKE ALL ON public.user_roles, public.negocios, public.negocio_miembros, public.ofertas, public.oferta_programacion, public.reservas, public.calificaciones, public.eventos FROM anon, authenticated;
GRANT SELECT ON public.negocios, public.ofertas TO anon;
GRANT SELECT ON public.user_roles, public.reservas, public.eventos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.negocios, public.negocio_miembros, public.oferta_programacion TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ofertas TO authenticated;
GRANT SELECT, INSERT ON public.calificaciones TO authenticated;
GRANT ALL ON public.user_roles, public.negocios, public.negocio_miembros, public.ofertas, public.oferta_programacion, public.reservas, public.calificaciones, public.eventos TO service_role;
COMMENT ON TABLE public.user_roles IS 'Roles asignados solo por procesos privilegiados. Registro automático: comprador. No se permite autoasignación ni cambios desde el cliente.';
