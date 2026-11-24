"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { avisarComprador } from "@/lib/avisos-comprador";
import { mensajeAmigable } from "@/lib/errores";
import { HORA_24, horaDentroDeVentana, minutosBogota, minutosDeHora, textoDias } from "@/lib/programacion";
import { origenActual } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { fechaBogota } from "@/lib/tiempo";

export type EstadoGestion = { ok?: string; error?: string } | null;

const esquema = z.object({
  reservaId: z.uuid(),
  estado: z.enum(["confirmada", "rechazada", "lista", "entregada", "no_recogida", "incumplida"]),
  motivo: z.string().trim().max(300).optional(),
  codigo: z.string().trim().toUpperCase().optional(),
  metodo: z.enum(["efectivo", "nequi", "transferencia", "tarjeta"]).optional(),
});

const OK: Record<string, string> = {
  confirmada: "Reserva confirmada. El comprador ya ve su código.",
  rechazada: "Reserva rechazada. La unidad volvió a la oferta.",
  lista: "Marcada como lista para recoger.",
  entregada: "¡Entregada! Venta registrada.",
  no_recogida: "Marcada como no recogida.",
  incumplida: "Reserva cancelada. Le avisamos al comprador; cuenta como un incumplimiento en tu puntaje.",
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
  // «No pude cumplir» tiene su propia función: motivo obligatorio y marca de incumplimiento.
  if (d.data.estado === "incumplida" && !d.data.motivo) return { error: "Escribe por qué no pudiste cumplir." };
  const { error } =
    d.data.estado === "incumplida"
      ? await supabase.rpc("no_pude_cumplir", { reserva_id: d.data.reservaId, motivo: d.data.motivo! })
      : await supabase.rpc("cambiar_estado_reserva", {
          reserva_id: d.data.reservaId,
          nuevo_estado: d.data.estado,
          datos,
        });
  if (error) {
    if (/código de recogida no coincide/i.test(error.message)) return { error: "El código no coincide. Pídelo de nuevo al comprador." };
    if (/aún no ha terminado/i.test(error.message)) return { error: "Solo se marca «no recogida» cuando termina la ventana." };
    return { error: mensajeAmigable(error) };
  }
  // Correo al comprador, después de responder: si falla o falta el SMTP, la gestión ya quedó hecha.
  if (d.data.estado === "confirmada" || d.data.estado === "rechazada" || d.data.estado === "incumplida") {
    const { reservaId, estado } = d.data;
    const origen = await origenActual();
    after(() => avisarComprador(reservaId, estado, origen));
  }
  revalidatePath("/negocio");
  revalidatePath("/admin/reservas");
  return { ok: OK[d.data.estado] };
}

export async function cerrarOferta(form: FormData) {
  const id = z.uuid().safeParse(form.get("ofertaId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("ofertas").update({ estado: "cerrada" }).eq("id", id.data);
  revalidatePath("/negocio/ofertas");
}

const esquemaProgramar = z.object({
  ofertaId: z.uuid(),
  dias: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Elige al menos un día."),
  hora: z.string().regex(HORA_24, "Hora de publicación no válida."),
});

/** Convierte una oferta en plantilla: el cron la publica sola los días y a la hora elegidos. */
export async function programarOferta(_p: EstadoGestion, form: FormData): Promise<EstadoGestion> {
  const d = esquemaProgramar.safeParse({
    ofertaId: form.get("ofertaId"),
    dias: form.getAll("dias"),
    hora: form.get("hora"),
  });
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa los datos." };
  const dias = [...new Set(d.data.dias)].sort((a, b) => a - b);

  // RLS: solo devuelve la oferta si quien llama es miembro del negocio (o admin).
  const supabase = await createClient();
  const { data: oferta } = await supabase
    .from("ofertas")
    .select("id, negocio_id, recogida_desde, recogida_hasta")
    .eq("id", d.data.ofertaId)
    .maybeSingle();
  if (!oferta) return { error: "No tienes acceso a esta oferta." };
  if (!horaDentroDeVentana(d.data.hora, oferta.recogida_desde, oferta.recogida_hasta)) {
    return { error: "La hora de publicación debe ser antes de que termine el horario de recogida." };
  }

  // Si la hora de hoy ya pasó, empieza el próximo día elegido (la oferta de hoy ya está publicada).
  const yaPaso = minutosDeHora(d.data.hora) <= minutosBogota(Date.now());
  const fila = {
    dias_semana: dias,
    hora_publicacion: d.data.hora,
    activa: true,
    ultima_publicacion: yaPaso ? fechaBogota() : null,
  };

  const { data: previa } = await supabase.from("oferta_programacion").select("id").eq("plantilla_oferta_id", oferta.id).limit(1).maybeSingle();
  const { error } = previa
    ? await supabase.from("oferta_programacion").update(fila).eq("id", previa.id)
    : await supabase.from("oferta_programacion").insert({ ...fila, negocio_id: oferta.negocio_id, plantilla_oferta_id: oferta.id });
  if (error) return { error: mensajeAmigable(error) };

  revalidatePath("/negocio/ofertas");
  return { ok: `Programada: se publica sola ${textoDias(dias)} a las ${d.data.hora}.` };
}

const esquemaCambio = z.object({ id: z.uuid(), accion: z.enum(["pausar", "reanudar", "eliminar"]) });

export async function cambiarProgramacion(form: FormData) {
  const d = esquemaCambio.safeParse({ id: form.get("id"), accion: form.get("accion") });
  if (!d.success) return;
  const supabase = await createClient();
  if (d.data.accion === "eliminar") await supabase.from("oferta_programacion").delete().eq("id", d.data.id);
  else await supabase.from("oferta_programacion").update({ activa: d.data.accion === "reanudar" }).eq("id", d.data.id);
  revalidatePath("/negocio/ofertas");
}
