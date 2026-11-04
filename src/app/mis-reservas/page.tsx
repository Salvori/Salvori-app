import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Clock, MapPin } from "lucide-react";
import { Cabecera } from "@/components/cabecera";
import { ESTADO_COMPRADOR, muestraCodigo, textoEstado, type EstadoReserva } from "@/lib/estados";
import { formatCOP } from "@/lib/formato";
import { textoVentana } from "@/lib/ofertas";
import { usuarioActual } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { salir } from "./acciones";
import { BotonCancelar } from "./boton-cancelar";
import { TiempoReal } from "./tiempo-real";

export const metadata: Metadata = { title: "Mis reservas" };

const TONO: Record<string, string> = {
  espera: "bg-secondary text-secondary-foreground",
  ok: "bg-primary text-primary-foreground",
  listo: "bg-accent text-accent-foreground",
  fin: "bg-muted text-muted-foreground",
  mal: "bg-destructive/10 text-destructive",
};

async function Lista({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?next=/mis-reservas");
  const { nueva } = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mis_reservas");
  if (error) throw new Error("No pudimos cargar tus reservas.");
  const reservas = data ?? [];

  return (
    <>
      <TiempoReal
        compradorId={usuario.id}
        hayEnCurso={reservas.some((r) => ["solicitada", "confirmada", "lista"].includes(r.estado))}
      />
      {nueva && (
        <p className="mb-4 rounded-2xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground" role="status">
          ¡Reserva enviada! Te avisamos aquí cuando el negocio la confirme.
        </p>
      )}
      {reservas.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center shadow-card">
          <p className="text-muted-foreground">Todavía no tienes reservas.</p>
          <Link href="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 font-display font-bold text-primary-foreground">
            Ver ofertas cerca
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {reservas.map((r) => {
            const estado = r.estado as EstadoReserva;
            const info = ESTADO_COMPRADOR[estado];
            return (
              <li key={r.id} className="rounded-2xl bg-card p-5 shadow-card" data-estado={estado}>
                <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${TONO[info.tono]}`}>
                  {textoEstado(estado, r.motivo_rechazo)}
                </span>
                <h2 className="mt-3 font-display text-lg font-bold leading-snug text-primary">{r.titulo}</h2>
                <p className="text-sm text-muted-foreground">
                  {r.negocio_nombre} · {r.cantidad} × {formatCOP(r.precio_unitario)}
                </p>
                {muestraCodigo(estado) && r.codigo && (
                  <div className="mt-4 rounded-2xl bg-primary px-4 py-5 text-center text-primary-foreground">
                    <p className="text-sm">Muestra este código en el local</p>
                    <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.3em]" data-testid="codigo">
                      {r.codigo}
                    </p>
                  </div>
                )}
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0" aria-hidden />
                    {textoVentana(r.recogida_desde, r.recogida_hasta)}
                  </li>
                  {r.negocio_direccion && (
                    <li className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0" aria-hidden />
                      {r.negocio_direccion}
                    </li>
                  )}
                </ul>
                {estado === "entregada" && (
                  <p className="mt-3 text-sm font-semibold text-primary">
                    Ahorraste {formatCOP((r.precio_habitual_unitario - r.precio_unitario) * r.cantidad)}
                  </p>
                )}
                {estado === "solicitada" && (
                  <div className="mt-4">
                    <BotonCancelar reservaId={r.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form action={salir} className="mt-10 text-center">
        <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4">
          Salir de mi cuenta ({usuario.email})
        </button>
      </form>
    </>
  );
}

export default function MisReservas(props: PageProps<"/mis-reservas">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-2">
        <h1 className="mb-5 font-display text-3xl font-extrabold text-primary">Mis reservas</h1>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted" />}>
          <Lista searchParams={props.searchParams as Promise<{ nueva?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
