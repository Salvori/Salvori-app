import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { createClient } from "@/lib/supabase/server";
import { fechaBogota, instanteActual } from "@/lib/tiempo";
import { AvisosNegocio } from "./avisos";
import { contextoNegocio } from "./contexto";
import { NavegacionNegocio } from "./navegacion";
import { TarjetaReserva, type ReservaBandeja } from "./tarjeta-reserva";

export const metadata: Metadata = { title: "Reservas" };

const ORDEN: Record<string, number> = { solicitada: 0, confirmada: 1, lista: 2, entregada: 3, no_recogida: 4, rechazada: 5, cancelada: 6 };

async function Bandeja({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const { negocio, negocios } = await contextoNegocio(n);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reservas_negocio", { negocio_id: negocio.id });
  if (error) throw new Error("No pudimos cargar las reservas.");

  // Reservas de hoy (hora de Colombia), nuevas arriba.
  const ahora = instanteActual();
  const hoy = fechaBogota(ahora);
  const reservas = ((data ?? []) as ReservaBandeja[])
    .filter((r) => fechaBogota(r.solicitada_en) === hoy || ["solicitada", "confirmada", "lista"].includes(r.estado))
    .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || b.solicitada_en.localeCompare(a.solicitada_en));
  const pendientes = reservas.filter((r) => r.estado === "solicitada").length;
  const entregadas = reservas.filter((r) => r.estado === "entregada");
  const ingresos = entregadas.reduce((s, r) => s + r.precio_unitario * r.cantidad, 0);

  return (
    <>
      <NavegacionNegocio actual="/negocio" negocio={negocio} negocios={negocios} />
      <AvisosNegocio negocioId={negocio.id} pendientes={pendientes} />
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-card p-3 shadow-card">
          <p className="font-display text-2xl font-extrabold text-mandarina-texto">{pendientes}</p>
          <p className="text-xs text-muted-foreground">por confirmar</p>
        </div>
        <div className="rounded-2xl bg-card p-3 shadow-card">
          <p className="font-display text-2xl font-extrabold text-primary">{entregadas.length}</p>
          <p className="text-xs text-muted-foreground">entregadas hoy</p>
        </div>
        <div className="rounded-2xl bg-card p-3 shadow-card">
          <p className="font-display text-lg font-extrabold text-primary">
            {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(ingresos).replace(/ /g, " ")}
          </p>
          <p className="text-xs text-muted-foreground">ventas hoy</p>
        </div>
      </div>
      {reservas.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-card">
          Aún no hay reservas hoy. Cuando alguien reserve, te avisamos aquí.
        </p>
      ) : (
        <ul className="space-y-4">
          {reservas.map((r) => (
            <TarjetaReserva key={`${r.id}-${r.estado}`} r={r} ahora={ahora} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function PanelNegocio(props: PageProps<"/negocio">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
          <Bandeja searchParams={props.searchParams as Promise<{ n?: string }>} />
        </Suspense>
      </main>
    </div>
  );
}
