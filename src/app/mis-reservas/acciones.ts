"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mensajeAmigable } from "@/lib/errores";
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
  revalidatePath("/mis-reservas");
  return null;
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
