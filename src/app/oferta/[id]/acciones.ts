"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mensajeAmigable } from "@/lib/errores";
import { COOKIE_ORIGEN, origenValido } from "@/lib/origen";
import { createClient } from "@/lib/supabase/server";
import { usuarioActual } from "@/lib/sesion";

const esquema = z.object({
  ofertaId: z.uuid(),
  cantidad: z.coerce.number().int().min(1, "Elige al menos una unidad.").max(20),
  observaciones: z.string().trim().max(500, "Las observaciones son demasiado largas.").default(""),
  origen: z.string().trim().max(500).default("directo"),
});

export type EstadoReserva = { error: string } | null;

export async function reservarOferta(_previo: EstadoReserva, form: FormData): Promise<EstadoReserva> {
  const datos = esquema.safeParse({
    ofertaId: form.get("ofertaId"),
    cantidad: form.get("cantidad"),
    observaciones: form.get("observaciones") ?? "",
    origen: form.get("origen") || "directo",
  });
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos de la reserva." };

  const { ofertaId, cantidad, observaciones } = datos.data;
  // Origen «negocio:<slug>» si llegó por la ficha del negocio en los últimos 7 días.
  const guardado = origenValido((await cookies()).get(COOKIE_ORIGEN)?.value);
  const origen = guardado !== "directo" ? guardado : datos.data.origen;
  if (!(await usuarioActual())) redirect(`/entrar?next=${encodeURIComponent(`/oferta/${ofertaId}`)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("solicitar_reserva", {
    oferta_id: ofertaId,
    cantidad,
    observaciones,
    origen,
  });
  if (error) return { error: mensajeAmigable(error) };

  if (guardado !== "directo") (await cookies()).delete(COOKIE_ORIGEN);
  redirect("/mis-reservas?nueva=1");
}
