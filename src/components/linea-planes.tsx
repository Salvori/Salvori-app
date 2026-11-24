import "server-only";
import { connection } from "next/server";
import { TEXTO_PLANES_FIJO, textoPlanes } from "@/lib/planes";
import { clientePublico } from "@/lib/supabase/publico";

/** «15 días gratis. Después, desde $ 50.000 al mes.» leído de los planes activos; sin Supabase, texto fijo. */
export async function LineaPlanes() {
  const db = clientePublico();
  if (!db) return <>{TEXTO_PLANES_FIJO}</>;
  await connection(); // el admin puede cambiar los precios: leerlos en cada petición
  const { data, error } = await db.from("planes").select("precio_mensual, dias_prueba").eq("activo", true);
  return <>{error || !data ? TEXTO_PLANES_FIJO : textoPlanes(data)}</>;
}
