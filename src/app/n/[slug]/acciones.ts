"use server";

import { cookies } from "next/headers";
import { COOKIE_ORIGEN, DURACION_ORIGEN_S, origenValido } from "@/lib/origen";

/** Respaldo del proxy: si la ficha se abrió desde la caché del navegador, deja el origen igual. */
export async function marcarOrigen(slug: string): Promise<void> {
  const valor = origenValido(`negocio:${slug}`);
  if (valor === "directo") return;
  (await cookies()).set(COOKIE_ORIGEN, valor, { maxAge: DURACION_ORIGEN_S, path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
}
