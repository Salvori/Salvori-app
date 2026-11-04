"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/sesion";

// Entrada con contraseña SOLO para demos y pruebas (usuarios de staging).
// Se activa con SALVORI_ENTRADA_CONTRASENA=1; en producción no se configura.
export type EstadoContrasena = { error: string } | null;

const esquema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe la contraseña."),
  siguiente: z.string().optional(),
});

export async function entrarConContrasena(_p: EstadoContrasena, form: FormData): Promise<EstadoContrasena> {
  if (process.env.SALVORI_ENTRADA_CONTRASENA !== "1") return { error: "No disponible." };
  const datos = esquema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    siguiente: form.get("siguiente") ?? undefined,
  });
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: datos.data.email, password: datos.data.password });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect(rutaSegura(datos.data.siguiente));
}
