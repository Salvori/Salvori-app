"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { origenActual, rutaSegura } from "@/lib/sesion";

const VERSION_AUTORIZACION = "2026-11-04";

const esquema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  autorizo: z.literal(true, { error: "Debes autorizar el tratamiento de tus datos para continuar." }),
  siguiente: z.string().optional(),
});

export type EstadoEntrar = { ok: boolean; mensaje: string; email?: string } | null;

export async function enviarEnlace(_previo: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const datos = esquema.safeParse({
    email: form.get("email"),
    autorizo: form.get("autorizo") === "on",
    siguiente: form.get("siguiente") ?? undefined,
  });
  if (!datos.success) {
    return { ok: false, mensaje: datos.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const fecha = new Date().toISOString();
  const autorizacion = { aceptada: true, fecha, version: VERSION_AUTORIZACION };
  // La aceptación viaja en una cookie hasta que el enlace confirme la sesión
  // (los metadatos de signInWithOtp solo se guardan en usuarios nuevos).
  (await cookies()).set("salvori_autorizacion", JSON.stringify(autorizacion), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  const siguiente = rutaSegura(datos.data.siguiente);
  const origen = await origenActual();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: datos.data.email,
    options: {
      emailRedirectTo: `${origen}/auth/callback?next=${encodeURIComponent(siguiente)}`,
      shouldCreateUser: true,
      data: { autorizacion_datos: autorizacion },
    },
  });

  if (error) {
    const limite = /rate limit|too many|security purposes/i.test(error.message);
    return {
      ok: false,
      mensaje: limite
        ? "Ya enviamos varios enlaces. Espera un minuto y vuelve a intentarlo."
        : "No pudimos enviar el enlace. Revisa el correo e intenta de nuevo.",
    };
  }
  return { ok: true, mensaje: "Te enviamos un enlace para entrar.", email: datos.data.email };
}
