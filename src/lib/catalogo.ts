import "server-only";
import { connection } from "next/server";
import { clientePublico } from "@/lib/supabase/publico";

export type OfertaTarjeta = {
  id: string;
  titulo: string;
  categoria: string;
  foto_url: string;
  precio_habitual: number;
  precio_final: number;
  cupos_disponibles: number;
  recogida_desde: string;
  recogida_hasta: string;
  estado: "activa" | "agotada" | "borrador" | "cerrada";
  negocio: { id: string; nombre: string; slug: string; lat: number; lng: number };
  calificacion: { promedio: number; total: number } | null;
};

/** Ofertas activas o agotadas con ventana vigente (RLS ya filtra las de prueba). */
export async function ofertasPublicas(): Promise<OfertaTarjeta[] | null> {
  const db = clientePublico();
  if (!db) return null;
  await connection(); // cupos y ventanas cambian: siempre en el momento de la petición

  const { data, error } = await db
    .from("ofertas")
    .select(
      "id, titulo, categoria, foto_url, precio_habitual, precio_final, cupos_disponibles, recogida_desde, recogida_hasta, estado, negocio:negocios(id, nombre, slug, lat, lng)",
    )
    .in("estado", ["activa", "agotada"])
    .gte("recogida_hasta", new Date().toISOString())
    .order("recogida_hasta")
    .limit(200);
  if (error) throw new Error("No pudimos cargar las ofertas.");

  const filas = (data ?? []).filter((o) => o.negocio);
  const ids = [...new Set(filas.map((o) => o.negocio!.id))];
  const resumen = new Map<string, { promedio: number; total: number }>();
  if (ids.length) {
    const { data: cal } = await db.rpc("resumen_calificaciones", { negocio_ids: ids });
    for (const c of cal ?? []) resumen.set(c.negocio_id, { promedio: Number(c.promedio), total: c.total });
  }

  return filas.map((o) => ({
    ...o,
    negocio: o.negocio!,
    calificacion: resumen.get(o.negocio!.id) ?? null,
  }));
}
