"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mensajeAmigable } from "@/lib/errores";
import { createClient } from "@/lib/supabase/server";

export type EstadoGestion = { ok?: string; error?: string } | null;

const esquema = z.object({
  reservaId: z.uuid(),
  estado: z.enum(["confirmada", "rechazada", "lista", "entregada", "no_recogida"]),
  motivo: z.string().trim().max(300).optional(),
  codigo: z.string().trim().toUpperCase().optional(),
  metodo: z.enum(["efectivo", "nequi", "transferencia", "tarjeta"]).optional(),
});

const OK: Record<string, string> = {
  confirmada: "Reserva confirmada. El comprador ya ve su código.",
  rechazada: "Reserva rechazada. El cupo volvió a la oferta.",
  lista: "Marcada como lista para recoger.",
  entregada: "¡Entregada! Venta registrada.",
  no_recogida: "Marcada como no recogida.",
};

// La RPC valida rol, membresía y transición; aquí solo se arma el pedido.
export async function gestionarReserva(_p: EstadoGestion, form: FormData): Promise<EstadoGestion> {
  const d = esquema.safeParse({
    reservaId: form.get("reservaId"),
    estado: form.get("estado"),
    motivo: form.get("motivo") || undefined,
    codigo: form.get("codigo") || undefined,
    metodo: form.get("metodo") || undefined,
  });
  if (!d.success) return { error: "Datos no válidos." };

  const datos: Record<string, string> = {};
  if (d.data.estado === "rechazada") {
    if (!d.data.motivo) return { error: "Escribe el motivo del rechazo." };
    datos.motivo_rechazo = d.data.motivo;
  }
  if (d.data.estado === "entregada") {
    if (!d.data.codigo || d.data.codigo.length !== 6) return { error: "Escribe el código de 6 caracteres del comprador." };
    if (!d.data.metodo) return { error: "Elige cómo pagó." };
    datos.codigo = d.data.codigo;
    datos.metodo_pago = d.data.metodo;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_estado_reserva", {
    reserva_id: d.data.reservaId,
    nuevo_estado: d.data.estado,
    datos,
  });
  if (error) {
    if (/código de recogida no coincide/i.test(error.message)) return { error: "El código no coincide. Pídelo de nuevo al comprador." };
    if (/aún no ha terminado/i.test(error.message)) return { error: "Solo se marca «no recogida» cuando termina la ventana." };
    return { error: mensajeAmigable(error) };
  }
  revalidatePath("/negocio");
  return { ok: OK[d.data.estado] };
}

export async function cerrarOferta(form: FormData) {
  const id = z.uuid().safeParse(form.get("ofertaId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("ofertas").update({ estado: "cerrada" }).eq("id", id.data);
  revalidatePath("/negocio/ofertas");
}
