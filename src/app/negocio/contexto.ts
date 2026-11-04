import "server-only";
import { redirect } from "next/navigation";
import { negociosOperables, rolesActuales, type NegocioPanel } from "@/lib/roles";

/**
 * Verifica en el servidor que quien entra sea negocio o admin (además de RLS)
 * y elige el negocio activo: ?n=<slug> o el primero (los públicos van primero).
 */
export async function contextoNegocio(slug?: string | null): Promise<{
  negocio: NegocioPanel;
  negocios: NegocioPanel[];
  esAdmin: boolean;
}> {
  const { usuario, roles } = await rolesActuales();
  if (!usuario) redirect("/entrar?next=/negocio");
  const esAdmin = roles.includes("admin");
  if (!esAdmin && !roles.includes("negocio")) redirect("/");

  const negocios = await negociosOperables(esAdmin, usuario.id);
  if (!negocios.length) redirect("/");
  const negocio = negocios.find((n) => n.slug === slug) ?? negocios[0];
  return { negocio, negocios, esAdmin };
}
