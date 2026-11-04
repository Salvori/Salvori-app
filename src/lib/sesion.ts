import "server-only";
import { headers } from "next/headers";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabasePublicEnv } from "@/lib/supabase/env";

export type UsuarioSesion = { id: string; email: string | null };

/** Usuario con sesión válida (JWT verificado) o null. */
export async function usuarioActual(): Promise<UsuarioSesion | null> {
  if (!supabasePublicEnv()) return null;
  await connection(); // la sesión depende de la petición (y el cliente usa la hora)
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
}

/** Origen de la petición (local, preview o producción), para armar enlaces de vuelta. */
export async function origenActual(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

/** Solo rutas internas: evita redirecciones abiertas. */
export function rutaSegura(siguiente: string | null | undefined, porDefecto = "/"): string {
  if (!siguiente || !siguiente.startsWith("/") || siguiente.startsWith("//") || siguiente.startsWith("/\\")) {
    return porDefecto;
  }
  return siguiente;
}
