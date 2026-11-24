import type { Metadata } from "next";
import { formatCOP } from "@/lib/formato";
import { ESTADO_LABEL, formatFecha, METODO_LABEL, textoOfertasActivas, type EstadoPlan } from "@/lib/planes";
import { createClient } from "@/lib/supabase/server";
import { instanteActual } from "@/lib/tiempo";
import { requerirAdmin } from "../contexto";
import { NavegacionAdmin } from "../navegacion";
import { cambiarEstadoSuscripcion } from "./acciones";
import { FormularioCambiarPlan, FormularioPago, FormularioPlan, type PlanOpcion } from "./formularios";

export const metadata: Metadata = { title: "Planes y pagos" };

const COLOR_ESTADO: Record<string, string> = {
  prueba: "bg-secondary text-primary",
  activa: "bg-primary text-primary-foreground",
  vencida: "bg-accent text-accent-foreground",
  suspendida: "bg-destructive text-white",
};

type Pago = { id: string; negocio_id: string; valor: number; metodo: string; periodo_hasta: string; creado_en: string; nota: string; plan_id: string };

export default async function AdminPlanes() {
  await requerirAdmin();
  const supabase = await createClient();
  const [estados, planesR, pagosR] = await Promise.all([
    supabase.rpc("estado_planes", {}),
    supabase.from("planes").select("id, nombre, precio_mensual, max_ofertas_activas, dias_prueba, activo, orden").order("orden").order("nombre"),
    supabase
      .from("pagos_mensualidad")
      .select("id, negocio_id, valor, metodo, periodo_hasta, creado_en, nota, plan_id")
      .order("creado_en", { ascending: false })
      .limit(500),
  ]);
  if (estados.error || planesR.error || pagosR.error) {
    throw new Error("No pudimos cargar los planes. ¿Ya se aplicó la migración de planes?");
  }
  const negocios = (estados.data ?? []) as EstadoPlan[];
  const planes = (planesR.data ?? []) as PlanOpcion[];
  const nombrePlan = new Map(planes.map((p) => [p.id, p.nombre]));
  const pagos = new Map<string, Pago[]>();
  for (const p of (pagosR.data ?? []) as Pago[]) pagos.set(p.negocio_id, [...(pagos.get(p.negocio_id) ?? []), p]);
  const activos = planes.filter((p) => p.activo);
  const ahora = instanteActual();

  return (
    <>
      <NavegacionAdmin actual="/admin/planes" />

      <section aria-labelledby="titulo-negocios-planes" className="space-y-3">
        <h2 id="titulo-negocios-planes" className="font-display text-xl font-extrabold text-primary">
          Negocios
        </h2>
        <p className="text-sm text-muted-foreground">
          La mensualidad se paga fuera de la app (efectivo, Nequi o transferencia). Tras el vencimiento hay 3 días de gracia; después el
          negocio no puede publicar.
        </p>
        {negocios.length === 0 && <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-card">Todavía no hay negocios.</p>}
        <ul className="space-y-3">
          {negocios.map((n) => {
            const historial = pagos.get(n.negocio_id) ?? [];
            const vencido = n.vence_en ? new Date(n.vence_en).getTime() < ahora : false;
            return (
              <li key={n.negocio_id} className={`rounded-2xl bg-card p-4 shadow-card ${n.negocio_es_prueba ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-lg font-bold text-primary">
                    {n.negocio_nombre}
                    {n.negocio_es_prueba && <span className="ml-2 text-xs font-semibold text-muted-foreground">(prueba)</span>}
                  </p>
                  {n.estado && (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${COLOR_ESTADO[n.estado]}`}>{ESTADO_LABEL[n.estado]}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {n.plan_nombre ?? "Sin plan"}
                  {n.vence_en && ` · ${vencido ? "venció" : "vence"} el ${formatFecha(n.vence_en)}`}
                  {" · "}
                  {textoOfertasActivas(n.ofertas_activas, n.max_ofertas_activas)}
                </p>
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-sm font-semibold text-primary underline underline-offset-4">Gestionar plan y pagos</summary>
                  <div className="mt-3 grid gap-5">
                    <FormularioPago negocioId={n.negocio_id} planSugerido={n.precio_mensual ? n.plan_id : null} planes={activos} />
                    {n.plan_id && <FormularioCambiarPlan negocioId={n.negocio_id} planActual={n.plan_id} planes={activos} />}
                    {n.estado && (
                      <form action={cambiarEstadoSuscripcion}>
                        <input type="hidden" name="negocioId" value={n.negocio_id} />
                        <input type="hidden" name="accion" value={n.estado === "suspendida" ? "reactivar" : "suspender"} />
                        <button className="text-sm font-semibold text-destructive underline underline-offset-4">
                          {n.estado === "suspendida" ? "Reactivar cuenta" : "Suspender cuenta (no podrá publicar)"}
                        </button>
                      </form>
                    )}
                    <div>
                      <p className="text-sm font-semibold">Historial de pagos</p>
                      {historial.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
                      ) : (
                        <ul className="mt-1 divide-y text-sm">
                          {historial.map((p) => (
                            <li key={p.id} className="py-1.5">
                              <span className="font-semibold">{formatCOP(p.valor)}</span> · {METODO_LABEL[p.metodo] ?? p.metodo} ·{" "}
                              {nombrePlan.get(p.plan_id) ?? "Plan"} · el {formatFecha(p.creado_en)}, cubre hasta el {formatFecha(p.periodo_hasta)}
                              {p.nota && <span className="block text-muted-foreground">{p.nota}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="titulo-planes" className="mt-10 space-y-3">
        <h2 id="titulo-planes" className="font-display text-xl font-extrabold text-primary">
          Planes
        </h2>
        <ul className="space-y-3">
          {planes.map((p) => (
            <li key={p.id} className={`rounded-2xl bg-card p-4 shadow-card ${p.activo ? "" : "opacity-60"}`}>
              <details>
                <summary className="cursor-pointer">
                  <span className="font-display text-lg font-bold text-primary">{p.nombre}</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    · {p.precio_mensual ? `${formatCOP(p.precio_mensual)} al mes` : "gratis"} · {p.max_ofertas_activas ?? "sin límite de"} ofertas activas
                    {p.dias_prueba ? ` · ${p.dias_prueba} días de prueba` : ""}
                    {p.activo ? "" : " · inactivo"}
                  </span>
                </summary>
                <div className="mt-3">
                  <FormularioPlan plan={p} />
                </div>
              </details>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl border-2 border-dashed border-primary/30 p-4">
          <p className="mb-3 font-display text-lg font-bold text-primary">Nuevo plan</p>
          <FormularioPlan />
        </div>
      </section>
    </>
  );
}
