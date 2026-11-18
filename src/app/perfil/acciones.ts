"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dentroDePopayan, geocodificar } from "@/lib/geocodificar";
import type { Punto } from "@/lib/ofertas";
import { rutaSegura, usuarioActual } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export type ResultadoBusqueda = { punto: Punto; etiqueta: string } | { error: string };

const textoDireccion = z.string().trim().min(3, "Escribe tu dirección.").max(200, "La dirección es muy larga.");

/** Busca la dirección en Nominatim desde el servidor (nunca desde el navegador). */
export async function buscarDireccion(direccion: string): Promise<ResultadoBusqueda> {
  if (!(await usuarioActual())) return { error: "Entra con tu correo para continuar." };
  const d = textoDireccion.safeParse(direccion);
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa la dirección." };
  const r = await geocodificar(d.data);
  if ("punto" in r) return r;
  return {
    error:
      r.error === "sin-resultado"
        ? "No encontramos esa dirección en Popayán. Mueve el pin en el mapa hasta tu casa."
        : "No pudimos buscar la dirección ahora. Ubica tu casa moviendo el pin en el mapa.",
  };
}

export type EstadoPerfil = { ok?: string; error?: string } | null;

const esquemaDireccion = z.object({
  direccion: textoDireccion,
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  siguiente: z.string().optional(),
});

export async function guardarDireccion(_p: EstadoPerfil, form: FormData): Promise<EstadoPerfil> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?next=/perfil");
  const d = esquemaDireccion.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa la dirección." };
  if (!dentroDePopayan({ lat: d.data.lat, lng: d.data.lng })) return { error: "El pin quedó fuera de Popayán. Muévelo hasta tu casa." };

  const supabase = await createClient();
  const { error } = await supabase.from("direcciones_comprador").upsert(
    { user_id: usuario.id, direccion: d.data.direccion, lat: d.data.lat, lng: d.data.lng, actualizado_en: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { error: "No pudimos guardar tu dirección. Intenta de nuevo." };

  revalidatePath("/");
  revalidatePath("/perfil");
  if (d.data.siguiente) redirect(rutaSegura(d.data.siguiente));
  return { ok: "Dirección guardada. Las distancias se calculan desde aquí." };
}

const esquemaNombre = z.object({ nombre: z.string().trim().min(2, "Escribe tu nombre.").max(60) });

/** Nombre que ve el negocio en su bandeja y que sale en el ticket. */
export async function guardarNombre(_p: EstadoPerfil, form: FormData): Promise<EstadoPerfil> {
  if (!(await usuarioActual())) redirect("/entrar?next=/perfil");
  const d = esquemaNombre.safeParse({ nombre: form.get("nombre") });
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa tu nombre." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { nombre: d.data.nombre } });
  if (error) return { error: "No pudimos guardar tu nombre. Intenta de nuevo." };
  revalidatePath("/perfil");
  revalidatePath("/mis-reservas");
  return { ok: "Nombre guardado." };
}

export async function borrarDireccion() {
  const usuario = await usuarioActual();
  if (!usuario) return;
  const supabase = await createClient();
  await supabase.from("direcciones_comprador").delete().eq("user_id", usuario.id);
  revalidatePath("/");
  revalidatePath("/perfil");
}
