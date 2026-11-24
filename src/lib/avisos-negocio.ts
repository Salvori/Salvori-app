import "server-only";
import { enviarCorreo } from "@/lib/correo";
import { correoNegocio } from "@/lib/correo-negocio";
import { textoVentana } from "@/lib/ofertas";
import { clienteServicio } from "@/lib/supabase/admin";
import { enviarNuevaReservaWhatsApp } from "@/lib/whatsapp";

type Db = NonNullable<ReturnType<typeof clienteServicio>>;

/** Nombre que ve el negocio: el mismo criterio que reservas_negocio (nunca el correo). */
export function nombreVisible(meta: Record<string, unknown> | null | undefined): string {
  for (const clave of ["nombre", "full_name", "display_name"]) {
    const v = meta?.[clave];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "Comprador";
}

/** Correos de los usuarios miembros del negocio (service_role, solo servidor). */
export async function correosMiembros(db: Db, negocioId: string): Promise<string[]> {
  const { data: miembros } = await db.from("negocio_miembros").select("user_id").eq("negocio_id", negocioId);
  const correos = await Promise.all(
    (miembros ?? []).map(async (m) => (await db.auth.admin.getUserById(m.user_id)).data?.user?.email ?? null),
  );
  return [...new Set(correos.filter((c): c is string => Boolean(c)))];
}

/**
 * Correo a los miembros del negocio cuando llega una reserva o el comprador la cancela;
 * con WhatsApp Cloud configurado, también la plantilla «nueva_reserva».
 * Nunca lanza: si falta la configuración o algo falla, deja el aviso en el registro.
 */
export async function avisarNegocio(reservaId: string, tipo: "nueva" | "cancelada", origen: string): Promise<void> {
  try {
    const db = clienteServicio();
    if (!db) {
      console.warn("[correo] Sin avisar al negocio: falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");
      return;
    }
    const { data: r } = await db
      .from("reservas")
      .select(
        "comprador_id, cantidad, precio_unitario, observaciones, recogida_desde, recogida_hasta, estado, oferta:ofertas(titulo, negocio:negocios(id, nombre, slug, telefono_whatsapp))",
      )
      .eq("id", reservaId)
      .maybeSingle();
    const negocio = r?.oferta?.negocio;
    if (!r || !negocio) return;
    if (r.estado !== (tipo === "nueva" ? "solicitada" : "cancelada")) return;

    const [{ data: comprador }, para] = await Promise.all([db.auth.admin.getUserById(r.comprador_id), correosMiembros(db, negocio.id)]);
    const nombre = nombreVisible(comprador?.user?.user_metadata);
    const sitio = (process.env.NEXT_PUBLIC_SITE_URL || origen).replace(/\/+$/, "");
    const datos = {
      tipo,
      negocio: negocio.nombre,
      slug: negocio.slug,
      titulo: r.oferta!.titulo,
      cantidad: r.cantidad,
      precioUnitario: r.precio_unitario,
      comprador: nombre,
      observaciones: r.observaciones,
      recogidaDesde: r.recogida_desde,
      recogidaHasta: r.recogida_hasta,
      sitio,
    };

    if (!para.length) console.warn(`[correo] Sin avisar a ${negocio.nombre}: no tiene usuarios con correo.`);
    const correo = correoNegocio(datos);
    await Promise.all(para.map((c) => enviarCorreo({ para: c, ...correo })));

    if (tipo === "nueva") {
      await enviarNuevaReservaWhatsApp({
        telefono: negocio.telefono_whatsapp,
        negocio: negocio.nombre,
        pedido: `${r.cantidad} × ${datos.titulo}`,
        comprador: nombre,
        ventana: textoVentana(r.recogida_desde, r.recogida_hasta),
        enlace: `${sitio}/negocio?n=${encodeURIComponent(negocio.slug)}`,
      });
    }
  } catch (e) {
    console.error("[correo] Falló el aviso al negocio:", e instanceof Error ? e.message : e);
  }
}
