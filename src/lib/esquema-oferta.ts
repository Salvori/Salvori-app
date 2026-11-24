import { z } from "zod";

// Validación compartida al publicar y al editar una oferta (mismas reglas en los dos).
export const CATEGORIAS = ["desayuno", "almuerzo", "panaderia_pasteleria", "cafe", "comida_rapida", "saludable", "postres", "bebidas", "otro"] as const;

export const FORMATOS = ["combo", "promocion", "lleva_paga"] as const;
export type Formato = (typeof FORMATOS)[number];
export const FORMATO_LABEL: Record<Formato, string> = { combo: "Combo", promocion: "Promoción", lleva_paga: "Lleva y paga" };

export function esFormato(v: unknown): v is Formato {
  return typeof v === "string" && (FORMATOS as readonly string[]).includes(v);
}

/** Insignia de la oferta: «Combo», «Promoción» o «Lleva 3, paga 2». */
export function etiquetaFormato(formato: string | null | undefined, lleva?: number | null, paga?: number | null): string {
  if (formato === "lleva_paga" && lleva && paga) return `Lleva ${lleva}, paga ${paga}`;
  return formato === "promocion" ? FORMATO_LABEL.promocion : FORMATO_LABEL.combo;
}

/** «Lleva N, paga M»: precio habitual = unitario × lleva; precio final = unitario × paga. */
export function preciosLlevaPaga(unitario: number, lleva: number, paga: number): { precioHabitual: number; precioFinal: number } {
  return { precioHabitual: unitario * lleva, precioFinal: unitario * paga };
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
// Los campos ocultos llegan como "" cuando no aplican.
const entero = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().optional());

export const esquemaOferta = z
  .object({
    negocioId: z.uuid(),
    slug: z.string(),
    foto: z.string().min(1, "Agrega una foto real del producto."),
    formato: z.enum(FORMATOS).default("combo"),
    titulo: z.string().trim().min(3, "Escribe un título.").max(80),
    contenido: z.string().trim().min(5, "Describe exactamente qué recibe el comprador.").max(500),
    tamano: z.string().trim().max(40, "El tamaño debe ser corto (máximo 40 caracteres).").default(""),
    categoria: z.enum(CATEGORIAS),
    precioHabitual: entero,
    precioFinal: entero,
    precioUnitario: entero,
    lleva: entero,
    paga: entero,
    cupos: z.coerce.number().int().min(1, "Al menos una unidad.").max(200),
    desde: z.string().regex(HORA, "Hora de inicio no válida."),
    hasta: z.string().regex(HORA, "Hora de fin no válida."),
    preparacion: z.coerce.number().int().min(0).max(240).optional(),
    // «admin» cuando el equipo publica a nombre del negocio desde /admin/publicar.
    destino: z.enum(["negocio", "admin"]).default("negocio"),
  })
  .superRefine((d, ctx) => {
    if (d.formato === "lleva_paga") {
      if (!d.precioUnitario || d.precioUnitario < 100) ctx.addIssue({ code: "custom", message: "Revisa el precio por unidad.", path: ["precioUnitario"] });
      if (!d.lleva || d.lleva < 2 || d.lleva > 20) ctx.addIssue({ code: "custom", message: "«Lleva» debe ser entre 2 y 20.", path: ["lleva"] });
      else if (!d.paga || d.paga < 1 || d.paga >= d.lleva) ctx.addIssue({ code: "custom", message: "«Paga» debe ser menor que «lleva» y al menos 1.", path: ["paga"] });
      return;
    }
    if (!d.precioHabitual || d.precioHabitual < 500) ctx.addIssue({ code: "custom", message: "Revisa el precio habitual.", path: ["precioHabitual"] });
    else if (!d.precioFinal || d.precioFinal < 100) ctx.addIssue({ code: "custom", message: "Revisa el precio final.", path: ["precioFinal"] });
    else if (d.precioFinal >= d.precioHabitual) ctx.addIssue({ code: "custom", message: "El precio final debe ser menor que el habitual.", path: ["precioFinal"] });
  })
  .transform(({ precioUnitario, lleva, paga, ...d }) => {
    const lp = d.formato === "lleva_paga";
    const precios = lp ? preciosLlevaPaga(precioUnitario!, lleva!, paga!) : { precioHabitual: d.precioHabitual!, precioFinal: d.precioFinal! };
    return { ...d, ...precios, tamano: d.tamano || null, lleva: lp ? lleva! : null, paga: lp ? paga! : null };
  });

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
