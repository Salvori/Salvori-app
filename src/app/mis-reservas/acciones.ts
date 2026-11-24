"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { avisarNegocio } from "@/lib/avisos-negocio";
import { mensajeAmigable } from "@/lib/errores";
import { origenActual } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export type EstadoCancelar = { error: string } | null;

export async function cancelarReserva(_previo: EstadoCancelar, form: FormData): Promise<EstadoCancelar> {
  const id = z.uuid().safeParse(form.get("reservaId"));
  if (!id.success) return { error: "Reserva no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_estado_reserva", {
    reserva_id: id.data,
    nuevo_estado: "cancelada",
    datos: {},
  });
  if (error) return { error: mensajeAmigable(error) };
  const reservaId = id.data;
  const origen = await origenActual();
  after(() => avisarNegocio(reservaId, "cancelada", origen));
  revalidatePath("/mis-reservas");
  return null;
}

export type EstadoCalificar = { error: string } | { ok: true } | null;

const puntaje = z.coerce.number().int().min(1, "Elige de 1 a 5 estrellas.").max(5);
const esquemaCalificacion = z.object({
  reservaId: z.uuid(),
  negocioId: z.uuid(),
  calidad: puntaje,
  aseo: puntaje,
  atencion: puntaje,
  comentario: z.string().trim().max(280, "El comentario admite hasta 280 caracteres.").default(""),
});

/** Una sola calificación por reserva entregada; la base de datos lo garantiza (RLS, trigger y reserva_id único). */
export async function calificarReserva(_previo: EstadoCalificar, form: FormData): Promise<EstadoCalificar> {
  const datos = esquemaCalificacion.safeParse({
    reservaId: form.get("reservaId"),
    negocioId: form.get("negocioId"),
    calidad: form.get("calidad") ?? 0,
    aseo: form.get("aseo") ?? 0,
    atencion: form.get("atencion") ?? 0,
    comentario: form.get("comentario") ?? "",
  });
  if (!datos.success) {
    const faltan = ["calidad", "aseo", "atencion"].some((c) => !form.get(c));
    return { error: faltan ? "Califica calidad, aseo y atención (de 1 a 5)." : (datos.error.issues[0]?.message ?? "Revisa la calificación.") };
  }

  const { reservaId, negocioId, calidad, aseo, atencion, comentario } = datos.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("calificaciones")
    .insert({ reserva_id: reservaId, negocio_id: negocioId, calidad, aseo, atencion, comentario });
  if (error) {
    if (error.code === "23505") return { error: "Ya calificaste esta compra. ¡Gracias!" };
    if (error.code === "23514" || error.code === "42501") return { error: "Solo puedes calificar tus compras entregadas." };
    return { error: mensajeAmigable(error) };
  }
  revalidatePath("/mis-reservas");
  return { ok: true };
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
