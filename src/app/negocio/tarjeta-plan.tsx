import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resumenPlan, textoOfertasActivas, type EstadoPlan } from "@/lib/planes";
import { instanteActual } from "@/lib/tiempo";

/** «Tu plan»: nombre, días de prueba o vencimiento, ofertas activas y aviso al final del periodo. */
export async function TarjetaPlan({ negocioId }: { negocioId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("estado_planes", { p_negocio: negocioId });
  // Sin la migración de planes (o sin acceso) el panel sigue funcionando sin la tarjeta.
  if (error || !data?.length) return null;
  const plan = data[0] as EstadoPlan;
  const { linea, aviso, puedePublicar } = resumenPlan(plan, instanteActual());
  const lleno = plan.max_ofertas_activas !== null && plan.ofertas_activas >= plan.max_ofertas_activas;

  return (
    <section aria-labelledby="titulo-plan" className="mb-4 rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="titulo-plan" className="font-display text-lg font-bold text-primary">
          Tu plan: {plan.plan_nombre ?? "sin plan"}
        </h2>
        <p className="text-sm font-semibold text-muted-foreground">{linea}</p>
      </div>
      <p className={`mt-1 text-sm ${lleno ? "font-semibold text-mandarina-texto" : "text-muted-foreground"}`}>
        {textoOfertasActivas(plan.ofertas_activas, plan.max_ofertas_activas)}
        {lleno && puedePublicar ? ": cierra una para publicar otra." : ""}
      </p>
      {aviso && (
        <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${puedePublicar ? "bg-accent/15 text-mandarina-texto" : "bg-destructive/10 text-destructive"}`}>
          {aviso}
        </p>
      )}
    </section>
  );
}
