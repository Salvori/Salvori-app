"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dentroDePopayan } from "@/lib/geocodificar";
import { esquemaInteresado } from "@/lib/interesados";
import { usuarioActual } from "@/lib/sesion";
import { clienteServicio } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EstadoInteres = { ok?: string; error?: string } | null;

const LISTO = "¡Listo! Te escribimos cuando haya combos cerca (máximo un correo cada 6 horas).";

/** Inscripción en «Avísame cuando haya combos cerca». Con o sin sesión (RLS: inserta cualquiera). */
export async function inscribirInteresado(_p: EstadoInteres, form: FormData): Promise<EstadoInteres> {
  const d = esquemaInteresado.safeParse({
    correo: form.get("correo") ?? "",
    autoriza: form.get("autoriza") ?? undefined,
    lat: form.get("lat"),
    lng: form.get("lng"),
    origen: form.get("origen"),
    radio: form.get("radio"),
  });
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa los datos." };
  if (!dentroDePopayan({ lat: d.data.lat, lng: d.data.lng })) {
    return { error: "Por ahora solo avisamos en Popayán. Elige un punto dentro de la ciudad." };
  }

  const usuario = await usuarioActual();
  const supabase = await createClient();
  const fila = {
    correo: d.data.correo,
    lat: d.data.lat,
    lng: d.data.lng,
    origen_ubicacion: d.data.origen,
    radio_km: d.data.radio,
    autoriza_datos: true,
    ...(usuario ? { user_id: usuario.id } : {}),
  };

  // Con sesión, la inscripción nueva reemplaza la anterior del usuario.
  if (usuario) await supabase.from("interesados").delete().eq("user_id", usuario.id);
  let { error } = await supabase.from("interesados").insert(fila);

  // El correo ya estaba inscrito sin cuenta: si es el correo verificado del usuario, la toma él.
  if (error?.code === "23505" && usuario?.email && usuario.email.toLowerCase() === d.data.correo) {
    const db = clienteServicio();
    if (db) {
      await db.from("interesados").delete().eq("correo", d.data.correo);
      ({ error } = await supabase.from("interesados").insert(fila));
    }
  }
  if (error?.code === "23505") {
    // No confirma ni niega si un correo ajeno está inscrito.
    return { ok: "Ese correo ya recibe avisos. Para cambiar la ubicación, date de baja desde un correo y vuelve a inscribirte." };
  }
  if (error) return { error: "No pudimos guardar tu inscripción. Intenta de nuevo en unos segundos." };

  revalidatePath("/perfil");
  return { ok: LISTO };
}

/** El usuario con sesión borra su inscripción (RLS: solo la propia). */
export async function borrarMiInscripcion() {
  const usuario = await usuarioActual();
  if (!usuario) return;
  const supabase = await createClient();
  await supabase.from("interesados").delete().eq("user_id", usuario.id);
  revalidatePath("/perfil");
}

/** Baja desde el enlace del correo (token). */
export async function darDeBaja(_p: EstadoInteres, form: FormData): Promise<EstadoInteres> {
  const token = z.uuid().safeParse(form.get("token"));
  if (!token.success) return { error: "El enlace de baja no es válido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("dar_de_baja_interesado", { token: token.data });
  if (error) return { error: "No pudimos darte de baja. Intenta de nuevo en unos segundos." };
  return { ok: "Listo. Ya no te enviaremos avisos de combos cerca." };
}
