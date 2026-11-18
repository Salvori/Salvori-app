import { z } from "zod";

// Validación compartida al publicar y al editar una oferta (mismas reglas en los dos).
export const CATEGORIAS = ["desayuno", "almuerzo", "panaderia_pasteleria", "cafe", "comida_rapida", "saludable", "postres", "bebidas", "otro"] as const;

export const FORMATOS = ["combo", "promocion"] as const;
export type Formato = (typeof FORMATOS)[number];
export const FORMATO_LABEL: Record<Formato, string> = { combo: "Combo", promocion: "Promoción" };

export function etiquetaFormato(formato: string | null | undefined): string {
  return formato === "promocion" ? FORMATO_LABEL.promocion : FORMATO_LABEL.combo;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const esquemaOferta = z
  .object({
    negocioId: z.uuid(),
    slug: z.string(),
    foto: z.string().min(1, "Agrega una foto real del producto."),
    formato: z.enum(FORMATOS).default("combo"),
    titulo: z.string().trim().min(3, "Escribe un título.").max(80),
    contenido: z.string().trim().min(5, "Describe exactamente qué recibe el comprador.").max(500),
    categoria: z.enum(CATEGORIAS),
    precioHabitual: z.coerce.number().int().min(500, "Revisa el precio habitual."),
    precioFinal: z.coerce.number().int().min(100, "Revisa el precio final."),
    cupos: z.coerce.number().int().min(1, "Al menos un cupo.").max(200),
    desde: z.string().regex(HORA, "Hora de inicio no válida."),
    hasta: z.string().regex(HORA, "Hora de fin no válida."),
    preparacion: z.coerce.number().int().min(0).max(240).optional(),
    // «admin» cuando el equipo publica a nombre del negocio desde /admin/publicar.
    destino: z.enum(["negocio", "admin"]).default("negocio"),
  })
  .refine((d) => d.precioFinal < d.precioHabitual, { message: "El precio final debe ser menor que el habitual.", path: ["precioFinal"] });

export type DatosOferta = z.infer<typeof esquemaOferta>;

/** Fecha de hoy en Bogotá + hora local → ISO con zona -05:00. */
export function hoyALas(hora: string, diasExtra = 0, ahora = new Date()): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(ahora);
  const base = new Date(`${hoy}T${hora}:00-05:00`);
  base.setUTCDate(base.getUTCDate() + diasExtra);
  return base.toISOString();
}

/** Ventana de recogida de hoy; si «hasta» es menor que «desde», cruza la medianoche. */
export function ventanaDeHoy(desde: string, hasta: string, ahora = new Date()): { desde: string; hasta: string } | { error: string } {
  const inicio = hoyALas(desde, 0, ahora);
  let fin = hoyALas(hasta, 0, ahora);
  if (new Date(fin) <= new Date(inicio)) fin = hoyALas(hasta, 1, ahora);
  if (new Date(fin) <= ahora) return { error: "La hora de fin ya pasó. Elige una ventana de recogida futura." };
  return { desde: inicio, hasta: fin };
}
