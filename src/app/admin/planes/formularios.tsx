"use client";

import { useActionState, useState } from "react";
import { formatCOP } from "@/lib/formato";
import { METODO_LABEL, METODOS_MENSUALIDAD } from "@/lib/planes";
import { cambiarPlan, guardarPlan, registrarPago, type EstadoPlanes } from "./acciones";

export type PlanOpcion = {
  id: string;
  nombre: string;
  precio_mensual: number;
  max_ofertas_activas: number | null;
  dias_prueba: number | null;
  activo: boolean;
  orden: number;
};

const campo = "w-full rounded-xl border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";
const etiqueta = "flex flex-col gap-1 text-sm font-semibold";
const boton = "rounded-full bg-primary px-5 py-2 font-display font-bold text-primary-foreground disabled:opacity-50";

function Resultado({ estado }: { estado: EstadoPlanes }) {
  if (estado?.error)
    return (
      <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
        {estado.error}
      </p>
    );
  if (estado?.ok)
    return (
      <p role="status" className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-primary">
        {estado.ok}
      </p>
    );
  return null;
}

const textoPlan = (p: PlanOpcion) =>
  `${p.nombre} · ${p.precio_mensual ? `${formatCOP(p.precio_mensual)}/mes` : "gratis"} · ${p.max_ofertas_activas ?? "sin límite de"} ofertas`;

/** Crear (sin `plan`) o editar un plan. */
export function FormularioPlan({ plan }: { plan?: PlanOpcion }) {
  const [estado, accion, enviando] = useActionState<EstadoPlanes, FormData>(guardarPlan, null);
  return (
    <form action={accion} className="grid gap-3" aria-label={plan ? `Editar plan ${plan.nombre}` : "Nuevo plan"}>
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <div className="grid grid-cols-2 gap-3">
        <label className={`${etiqueta} col-span-2`}>
          Nombre
          <input name="nombre" required maxLength={40} defaultValue={plan?.nombre} placeholder="Ej.: Plus" className={campo} />
        </label>
        <label className={etiqueta}>
          Precio mensual (COP)
          <input name="precio" required inputMode="numeric" pattern="[0-9]*" defaultValue={plan?.precio_mensual ?? ""} placeholder="90000" className={campo} />
        </label>
        <label className={etiqueta}>
          Ofertas activas máx.
          <input name="max" inputMode="numeric" pattern="[0-9]*" defaultValue={plan?.max_ofertas_activas ?? ""} placeholder="Vacío = sin límite" className={campo} />
        </label>
        <label className={etiqueta}>
          Orden
          <input name="orden" inputMode="numeric" pattern="[0-9]*" defaultValue={plan?.orden ?? 10} className={campo} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
          <input type="checkbox" name="activo" defaultChecked={plan?.activo ?? true} className="size-5 accent-primary" />
          Activo
        </label>
      </div>
      {plan?.dias_prueba ? (
        <p className="text-xs text-muted-foreground">Plan de prueba: los negocios nuevos arrancan aquí por {plan.dias_prueba} días.</p>
      ) : null}
      <Resultado estado={estado} />
      <button disabled={enviando} className={`${boton} justify-self-start`}>
        {enviando ? "Guardando…" : plan ? "Guardar plan" : "Crear plan"}
      </button>
    </form>
  );
}

export function FormularioCambiarPlan({ negocioId, planActual, planes }: { negocioId: string; planActual: string | null; planes: PlanOpcion[] }) {
  const [estado, accion, enviando] = useActionState<EstadoPlanes, FormData>(cambiarPlan, null);
  return (
    <form action={accion} className="grid gap-2">
      <input type="hidden" name="negocioId" value={negocioId} />
      <label className={etiqueta}>
        Cambiar plan
        <select name="planId" defaultValue={planActual ?? ""} className={campo}>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>
              {textoPlan(p)}
            </option>
          ))}
        </select>
      </label>
      <Resultado estado={estado} />
      <button disabled={enviando} className={`${boton} justify-self-start`}>
        {enviando ? "Cambiando…" : "Cambiar plan"}
      </button>
    </form>
  );
}

/** Registrar la mensualidad. El valor sugerido es el precio del plan elegido por los meses pagados. */
export function FormularioPago({ negocioId, planSugerido, planes }: { negocioId: string; planSugerido: string | null; planes: PlanOpcion[] }) {
  const [estado, accion, enviando] = useActionState<EstadoPlanes, FormData>(registrarPago, null);
  const pagables = planes.filter((p) => p.precio_mensual > 0);
  const inicial = pagables.find((p) => p.id === planSugerido) ?? pagables[0];
  const [planId, setPlanId] = useState(inicial?.id ?? "");
  const [meses, setMeses] = useState(1);
  const precio = pagables.find((p) => p.id === planId)?.precio_mensual ?? 0;
  const [valor, setValor] = useState(String(precio));
  const sugerir = (plan: string, m: number) => setValor(String((pagables.find((p) => p.id === plan)?.precio_mensual ?? 0) * m));

  if (!pagables.length) return <p className="text-sm text-muted-foreground">Crea un plan con precio para registrar pagos.</p>;
  return (
    <form action={accion} className="grid gap-2">
      <input type="hidden" name="negocioId" value={negocioId} />
      <div className="grid grid-cols-2 gap-2">
        <label className={`${etiqueta} col-span-2`}>
          Plan pagado
          <select
            name="planId"
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              sugerir(e.target.value, meses);
            }}
            className={campo}
          >
            {pagables.map((p) => (
              <option key={p.id} value={p.id}>
                {textoPlan(p)}
              </option>
            ))}
          </select>
        </label>
        <label className={etiqueta}>
          Meses
          <select
            name="meses"
            value={meses}
            onChange={(e) => {
              const m = Number(e.target.value);
              setMeses(m);
              sugerir(planId, m);
            }}
            className={campo}
          >
            {[1, 2, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className={etiqueta}>
          Valor recibido (COP)
          <input name="valor" required inputMode="numeric" pattern="[0-9]*" value={valor} onChange={(e) => setValor(e.target.value)} className={campo} />
        </label>
        <label className={`${etiqueta} col-span-2`}>
          Método
          <select name="metodo" defaultValue="nequi" className={campo}>
            {METODOS_MENSUALIDAD.map((m) => (
              <option key={m} value={m}>
                {METODO_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label className={`${etiqueta} col-span-2`}>
          Nota (opcional)
          <input name="nota" maxLength={500} placeholder="Ej.: pagó en el local, comprobante por WhatsApp" className={campo} />
        </label>
      </div>
      <Resultado estado={estado} />
      <button disabled={enviando} className={`${boton} justify-self-start bg-accent text-accent-foreground`}>
        {enviando ? "Registrando…" : "Registrar pago"}
      </button>
    </form>
  );
}
