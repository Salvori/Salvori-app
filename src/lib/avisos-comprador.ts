import "server-only";
import { enviarCorreo } from "@/lib/correo";
import { correoReserva } from "@/lib/correo-reserva";
import { clienteServicio } from "@/lib/supabase/admin";

/**
 * Correo al comprador cuando su reserva se confirma, se rechaza o el negocio no pudo cumplirla.
 * Lee el correo del comprador con la service_role, solo en el servidor: el negocio nunca lo ve.
 * Nunca lanza: si falta la configuración o algo falla, deja el aviso en el registro.
 */
export async function avisarComprador(reservaId: string, estado: "confirmada" | "rechazada" | "incumplida", origen: string): Promise<void> {
  try {
    const db = clienteServicio();
    if (!db) {
      console.warn("[correo] Sin enviar el aviso de la reserva: falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");
      return;
    }
    const { data: r } = await db
      .from("reservas")
      .select(
        "comprador_id, cantidad, precio_unitario, codigo, motivo_rechazo, motivo_incumplimiento, incumplida_por, recogida_desde, recogida_hasta, estado, oferta:ofertas(titulo, negocio:negocios(nombre, direccion))",
      )
      .eq("id", reservaId)
      .maybeSingle();
    const incumplida = estado === "incumplida";
    if (!r || !r.oferta?.negocio) return;
    if (incumplida ? r.estado !== "cancelada" || !r.incumplida_por : r.estado !== estado) return;

    const { data: usuario } = await db.auth.admin.getUserById(r.comprador_id);
    const para = usuario?.user?.email;
    if (!para) {
      console.warn("[correo] Sin enviar el aviso de la reserva: el comprador no tiene correo.");
      return;
    }

    const sitio = (process.env.NEXT_PUBLIC_SITE_URL || origen).replace(/\/+$/, "");
    await enviarCorreo({
      para,
      ...correoReserva({
        // «No pude cumplir» usa el mismo correo que el rechazo: el negocio no pudo atenderla, con su motivo.
        estado: incumplida ? "rechazada" : (estado as "confirmada" | "rechazada"),
        titulo: r.oferta.titulo,
        cantidad: r.cantidad,
        precioUnitario: r.precio_unitario,
        negocio: r.oferta.negocio.nombre,
        direccion: r.oferta.negocio.direccion,
        recogidaDesde: r.recogida_desde,
        recogidaHasta: r.recogida_hasta,
        codigo: r.codigo,
        motivo: incumplida ? r.motivo_incumplimiento : r.motivo_rechazo,
        sitio,
      }),
    });
  } catch (e) {
    console.error("[correo] Falló el aviso de la reserva:", e instanceof Error ? e.message : e);
  }
}
