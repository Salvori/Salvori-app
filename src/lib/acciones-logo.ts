"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { usuarioActual } from "@/lib/sesion";

const esquema = z.object({
  negocioId: z.uuid(),
  ruta: z.string().regex(/^negocios\/[0-9a-f-]{36}\/logo\.webp\?v=\d{1,20}$/i).nullable(),
});

/**
 * Guarda (o quita, con ruta null) el logo del negocio. Lo puede hacer quien opera el negocio
 * o el admin: la función cambiar_logo_negocio lo verifica en la base de datos.
 */
export async function guardarLogoNegocio(negocioId: string, ruta: string | null): Promise<{ error?: string }> {
  if (!(await usuarioActual())) return { error: "Inicia sesión de nuevo." };
  const d = esquema.safeParse({ negocioId, ruta });
  if (!d.success || (d.data.ruta && !d.data.ruta.startsWith(`negocios/${d.data.negocioId}/`))) return { error: "Logo no válido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_logo_negocio", { p_negocio_id: d.data.negocioId, p_logo_url: d.data.ruta ?? "" });
  if (error) return { error: "No pudimos guardar el logo. Intenta de nuevo." };

  revalidatePath("/", "layout");
  return {};
}
