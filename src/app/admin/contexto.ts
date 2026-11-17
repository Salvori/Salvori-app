import "server-only";
import { redirect } from "next/navigation";
import { rolesActuales } from "@/lib/roles";
import type { UsuarioSesion } from "@/lib/sesion";

/** Verifica en el servidor (además de RLS) que quien entra sea del equipo Salvori. */
export async function requerirAdmin(): Promise<UsuarioSesion> {
  const { usuario, roles } = await rolesActuales();
  if (!usuario) redirect("/entrar?next=/admin");
  if (!roles.includes("admin")) redirect("/");
  return usuario;
}
