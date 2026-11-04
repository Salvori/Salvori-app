"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { usuarioActual } from "@/lib/sesion";

export type EstadoPublicar = { error: string } | null;

const CATEGORIAS = [
  "desayuno",
  "almuerzo",
  "panaderia_pasteleria",
  "cafe",
  "comida_rapida",
  "saludable",
  "postres",
  "bebidas",
  "otro",
] as const;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const esquema = z
  .object({
    negocioId: z.uuid(),
    slug: z.string(),
    foto: z.string().min(1, "Agrega una foto real del producto."),
    tipo: z.enum(["comercial", "lote"]),
    titulo: z.string().trim().min(3, "Escribe un título.").max(80),
    contenido: z.string().trim().min(5, "Describe exactamente qué recibe el comprador.").max(500),
    categoria: z.enum(CATEGORIAS),
    precioHabitual: z.coerce.number().int().min(500, "Revisa el precio habitual."),
    precioFinal: z.coerce.number().int().min(100, "Revisa el precio final."),
    cupos: z.coerce.number().int().min(1, "Al menos un cupo.").max(200),
    desde: z.string().regex(HORA, "Hora de inicio no válida."),
    hasta: z.string().regex(HORA, "Hora de fin no válida."),
    preparacion: z.coerce.number().int().min(0).max(240).optional(),
    elaborado: z.string().optional(),
  })
  .refine((d) => d.precioFinal < d.precioHabitual, { message: "El precio final debe ser menor que el habitual.", path: ["precioFinal"] })
  .refine((d) => d.tipo !== "lote" || (d.elaborado && HORA.test(d.elaborado)), {
    message: "Indica a qué hora se elaboró el producto del día.",
    path: ["elaborado"],
  });

/** Fecha de hoy en Bogotá + hora local → ISO con zona -05:00. */
function hoyALas(hora: string, diasExtra = 0): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const base = new Date(`${hoy}T${hora}:00-05:00`);
  base.setUTCDate(base.getUTCDate() + diasExtra);
  return base.toISOString();
}

export async function publicarOferta(_p: EstadoPublicar, form: FormData): Promise<EstadoPublicar> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?next=/negocio/publicar");

  const datos = esquema.safeParse(Object.fromEntries(form));
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  const d = datos.data;

  // La foto debe estar en la carpeta del negocio (la política de Storage ya lo exige al subirla).
  if (!d.foto.startsWith(`${d.negocioId}/`)) return { error: "La foto no corresponde a este negocio." };

  const desde = hoyALas(d.desde);
  let hasta = hoyALas(d.hasta);
  if (new Date(hasta) <= new Date(desde)) hasta = hoyALas(d.hasta, 1); // cruza la medianoche
  if (new Date(hasta) <= new Date()) return { error: "La hora de fin ya pasó. Elige una ventana de recogida futura." };

  const supabase = await createClient();
  const { data: negocio } = await supabase.from("negocios").select("es_prueba").eq("id", d.negocioId).maybeSingle();
  if (!negocio) return { error: "No tienes acceso a este negocio." };

  const { error } = await supabase.from("ofertas").insert({
    negocio_id: d.negocioId,
    tipo: d.tipo,
    titulo: d.titulo,
    contenido: d.contenido,
    categoria: d.categoria,
    foto_url: d.foto,
    precio_habitual: d.precioHabitual,
    precio_final: d.precioFinal,
    cupos_total: d.cupos,
    cupos_disponibles: d.cupos,
    recogida_desde: desde,
    recogida_hasta: hasta,
    tiempo_preparacion_min: d.tipo === "comercial" ? (d.preparacion ?? null) : null,
    elaborado_en: d.tipo === "lote" && d.elaborado ? hoyALas(d.elaborado) : null,
    estado: "activa",
    publicada_por: usuario.id,
    es_prueba: negocio.es_prueba,
  });
  if (error) return { error: "No pudimos publicar la oferta. Revisa los datos e intenta de nuevo." };

  redirect(`/negocio/ofertas?n=${encodeURIComponent(d.slug)}&publicada=1`);
}
