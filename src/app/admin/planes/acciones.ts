"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { METODOS_MENSUALIDAD } from "@/lib/planes";
import { rolesActuales } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type EstadoPlanes = { ok?: string; error?: string } | null;

// El rol se revisa aquí y otra vez en la base (RLS y registrar_pago_mensualidad).
async function esAdmin(): Promise<boolean> {
  const { usuario, roles } = await rolesActuales();
  return Boolean(usuario) && roles.includes("admin");
}

const NO_ADMIN = { error: "Solo el equipo Salvori gestiona planes y pagos." };

function revalidar() {
  revalidatePath("/admin/planes");
  revalidatePath("/negocio");
  revalidatePath("/");
}

const entero = (min: number, max: number, msg: string) => z.coerce.number({ error: msg }).int(msg).min(min, msg).max(max, msg);

const esquemaPlan = z.object({
  id: z.uuid().optional(),
  nombre: z.string().trim().min(1, "Escribe el nombre del plan.").max(40, "El nombre es muy largo."),
  precio: entero(0, 10_000_000, "Escribe el precio mensual en pesos, sin puntos."),
  // Vacío = sin límite.
  max: z.union([z.literal(""), entero(1, 1000, "El límite va de 1 a 1.000 ofertas, o vacío para sin límite.")]),
  orden: entero(0, 1000, "El orden es un número de 0 a 1.000."),
  activo: z.boolean(),
});

/** Crea o edita un plan. RLS (planes_admin_gestion) también lo exige. */
export async function guardarPlan(_p: EstadoPlanes, form: FormData): Promise<EstadoPlanes> {
  if (!(await esAdmin())) return NO_ADMIN;
  const d = esquemaPlan.safeParse({
    id: form.get("id") || undefined,
    nombre: form.get("nombre"),
    precio: form.get("precio"),
    max: String(form.get("max") ?? "").trim(),
    orden: form.get("orden") || 0,
    activo: form.get("activo") === "on",
  });
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa los datos del plan." };

  const fila = {
    nombre: d.data.nombre,
    precio_mensual: d.data.precio,
    max_ofertas_activas: d.data.max === "" ? null : d.data.max,
    orden: d.data.orden,
    activo: d.data.activo,
  };
  const supabase = await createClient();
  const { error } = d.data.id
    ? await supabase.from("planes").update(fila).eq("id", d.data.id)
    : await supabase.from("planes").insert(fila);
  if (error) {
    if (error.code === "23505") return { error: "Ya existe un plan con ese nombre." };
    return { error: "No pudimos guardar el plan. Intenta de nuevo." };
  }
  revalidar();
  return { ok: d.data.id ? "Plan guardado." : `Plan «${d.data.nombre}» creado.` };
}

const esquemaCambio = z.object({ negocioId: z.uuid(), planId: z.uuid() });

/** Cambia el plan de un negocio sin tocar el vencimiento (el límite nuevo aplica a lo que publique después). */
export async function cambiarPlan(_p: EstadoPlanes, form: FormData): Promise<EstadoPlanes> {
  if (!(await esAdmin())) return NO_ADMIN;
  const d = esquemaCambio.safeParse({ negocioId: form.get("negocioId"), planId: form.get("planId") });
  if (!d.success) return { error: "Elige un plan." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suscripciones")
    .update({ plan_id: d.data.planId, actualizado_en: new Date().toISOString() })
    .eq("negocio_id", d.data.negocioId)
    .select("negocio_id");
  if (error || !data?.length) return { error: "No pudimos cambiar el plan. Intenta de nuevo." };
  revalidar();
  return { ok: "Plan cambiado." };
}

const esquemaPago = z.object({
  negocioId: z.uuid(),
  planId: z.uuid({ error: "Elige el plan que pagó." }),
  valor: entero(0, 100_000_000, "Escribe el valor recibido en pesos, sin puntos."),
  metodo: z.enum(METODOS_MENSUALIDAD, { error: "Elige cómo pagó." }),
  meses: entero(1, 12, "Los meses pagados van de 1 a 12."),
  nota: z.string().trim().max(500, "La nota es muy larga.").default(""),
});

/** Registra la mensualidad (pagada fuera de la app): extiende el vencimiento y deja el plan al día. */
export async function registrarPago(_p: EstadoPlanes, form: FormData): Promise<EstadoPlanes> {
  if (!(await esAdmin())) return NO_ADMIN;
  const d = esquemaPago.safeParse({
    negocioId: form.get("negocioId"),
    planId: form.get("planId"),
    valor: form.get("valor"),
    metodo: form.get("metodo"),
    meses: form.get("meses") || 1,
    nota: form.get("nota") ?? "",
  });
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Revisa los datos del pago." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_pago_mensualidad", {
    p_negocio: d.data.negocioId,
    p_plan: d.data.planId,
    p_valor: d.data.valor,
    p_metodo: d.data.metodo,
    p_meses: d.data.meses,
    p_nota: d.data.nota,
  });
  if (error || !data) return { error: "No pudimos registrar el pago. Intenta de nuevo." };
  revalidar();
  const hasta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }).format(
    new Date(data.periodo_hasta),
  );
  return { ok: `Pago registrado. El plan queda al día hasta el ${hasta}.` };
}

const esquemaEstado = z.object({ negocioId: z.uuid(), accion: z.enum(["suspender", "reactivar"]) });

/** Suspende (bloquea publicar de inmediato) o reactiva la suscripción de un negocio. */
export async function cambiarEstadoSuscripcion(form: FormData) {
  if (!(await esAdmin())) return;
  const d = esquemaEstado.safeParse({ negocioId: form.get("negocioId"), accion: form.get("accion") });
  if (!d.success) return;
  const supabase = await createClient();
  // Reactivar deja «activa»; si la fecha ya pasó, estado_planes la muestra como vencida.
  await supabase
    .from("suscripciones")
    .update({ estado: d.data.accion === "suspender" ? "suspendida" : "activa", actualizado_en: new Date().toISOString() })
    .eq("negocio_id", d.data.negocioId);
  revalidar();
}
