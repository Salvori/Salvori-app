import "server-only";
import type { OfertaInicial } from "@/app/negocio/publicar/formulario-publicar";
import { formatHora } from "@/lib/formato";
import type { Formato } from "@/lib/esquema-oferta";
import { urlFoto } from "@/lib/ofertas";
import { createClient } from "@/lib/supabase/server";
import { instanteActual } from "@/lib/tiempo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Una oferta del negocio como datos del formulario (para «Duplicar» y «Editar»).
 * RLS solo devuelve las ofertas propias (o todas, para el admin).
 */
export async function ofertaGuardada(
  id: string | undefined,
  negocioId: string,
): Promise<{ inicial: OfertaInicial; reservados: number; vigente: boolean } | undefined> {
  if (!id || !UUID.test(id)) return undefined;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("ofertas")
    .select(
      "titulo, contenido, categoria, formato, foto_url, precio_habitual, precio_final, cupos_total, cupos_disponibles, recogida_desde, recogida_hasta, tiempo_preparacion_min, estado",
    )
    .eq("id", id)
    .eq("negocio_id", negocioId)
    .maybeSingle();
  const vista = urlFoto(o?.foto_url);
  if (!o || !vista) return undefined;
  // Misma franja horaria si todavía no terminó hoy; si no, la de siempre (ahora a 2 horas).
  const vigente = new Date(o.recogida_hasta).getTime() > instanteActual();
  return {
    inicial: {
      foto: { ruta: o.foto_url, vista },
      formato: (o.formato === "promocion" ? "promocion" : "combo") as Formato,
      titulo: o.titulo,
      contenido: o.contenido,
      categoria: o.categoria,
      precioHabitual: String(o.precio_habitual),
      precioFinal: String(o.precio_final),
      cupos: String(o.cupos_total),
      ...(vigente ? { desde: formatHora(o.recogida_desde), hasta: formatHora(o.recogida_hasta) } : {}),
      preparacion: String(o.tiempo_preparacion_min ?? 10),
    },
    reservados: o.cupos_total - o.cupos_disponibles,
    vigente: vigente && (o.estado === "activa" || o.estado === "agotada"),
  };
}
