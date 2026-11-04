import "server-only";
import { createClient } from "@/lib/supabase/server";
import { usuarioActual, type UsuarioSesion } from "@/lib/sesion";

export type Rol = "comprador" | "negocio" | "admin";

export type NegocioPanel = { id: string; nombre: string; slug: string; es_prueba: boolean };

/** Roles del usuario actual (RLS: solo puede leer los suyos). */
export async function rolesActuales(): Promise<{ usuario: UsuarioSesion | null; roles: Rol[] }> {
  const usuario = await usuarioActual();
  if (!usuario) return { usuario: null, roles: [] };
  const supabase = await createClient();
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", usuario.id);
  return { usuario, roles: (data ?? []).map((r) => r.role as Rol) };
}

/** Negocios que el usuario puede operar: los suyos (rol negocio) o todos (admin). Públicos primero. */
export async function negociosOperables(esAdmin: boolean, userId: string): Promise<NegocioPanel[]> {
  const supabase = await createClient();
  let consulta = supabase.from("negocios").select("id, nombre, slug, es_prueba").order("es_prueba").order("nombre");
  if (!esAdmin) {
    const { data: miembros } = await supabase.from("negocio_miembros").select("negocio_id").eq("user_id", userId);
    const ids = (miembros ?? []).map((m) => m.negocio_id);
    if (!ids.length) return [];
    consulta = consulta.in("id", ids);
  }
  const { data } = await consulta;
  return data ?? [];
}
