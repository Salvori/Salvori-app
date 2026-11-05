"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Banknote, ShieldCheck, Smartphone } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { demo, franjas, useDemo, type Pago } from "../../almacen";
import { Cargando, ImagenCombo } from "../../ui";

function Confirmar() {
  const { id } = useParams<{ id: string }>();
  const cantidad = Math.max(1, Number(useSearchParams().get("cantidad")) || 1);
  const router = useRouter();
  const { combos, negocios } = useDemo();
  const c = combos.find((x) => x.id === id);
  const n = negocios.find((x) => x.id === c?.negocioId);
  const opciones = c ? franjas(c) : [];
  const [franja, setFranja] = useState<string | null>(null);
  const [pago, setPago] = useState<Pago>("efectivo");
  const [obs, setObs] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!negocios.length) return <Cargando />;
  if (!c || !n) return <p className="p-6 text-center text-muted-foreground">Este combo ya no está disponible.</p>;

  const elegida = franja ?? opciones[0];
  const total = c.precioFinal * cantidad;
  const ahorro = (c.precioHabitual - c.precioFinal) * cantidad;

  const reservar = () => {
    try {
      const pid = demo.reservar({ comboId: c.id, cantidad, franja: elegida, pago, observaciones: obs.trim() });
      router.replace(`/demo/pedidos/${pid}?nuevo=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos reservar. Intenta de nuevo.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-3">
      <button type="button" onClick={() => router.back()} className="mb-3 flex items-center gap-1 text-sm font-semibold text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Volver
      </button>
      <h1 className="font-display text-2xl font-extrabold text-primary">Confirma tu reserva</h1>

      <section className="mt-4 flex gap-3 rounded-2xl bg-card p-4 shadow-card">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl">
          <ImagenCombo combo={c} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{n.nombre}</p>
          <p className="font-display font-bold leading-snug text-primary">{c.titulo}</p>
          <p className="mt-1 text-sm">
            {cantidad} × {formatCOP(c.precioFinal)}
          </p>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="font-display text-lg font-bold text-primary">¿A qué hora lo recoges?</h2>
        <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Franja de recogida">
          {opciones.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={elegida === o}
              onClick={() => setFranja(o)}
              className={`rounded-2xl border-2 py-3 font-display font-bold ${elegida === o ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {o}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="font-display text-lg font-bold text-primary">¿Cómo pagas al recoger?</h2>
        <p className="text-sm text-muted-foreground">No pagas nada ahora: pagas en el local cuando recibes tu combo.</p>
        <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método de pago">
          {(
            [
              ["efectivo", "Efectivo", <Banknote key="e" className="size-5" aria-hidden />],
              ["nequi", "Nequi", <Smartphone key="n" className="size-5" aria-hidden />],
            ] as const
          ).map(([v, t, i]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={pago === v}
              onClick={() => setPago(v)}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 font-bold ${pago === v ? "border-primary bg-secondary text-primary" : "border-border bg-card"}`}
            >
              {i} {t}
            </button>
          ))}
        </div>
      </section>

      <label className="mt-5 flex flex-col gap-1.5">
        <span className="font-display text-lg font-bold text-primary">Nota para el negocio (opcional)</span>
        <input value={obs} onChange={(e) => setObs(e.target.value)} maxLength={120} placeholder="Ej.: llego 10 minutos tarde" className="rounded-xl border bg-card px-4 py-3" />
      </label>

      <section className="mt-6 rounded-2xl bg-card p-4 shadow-card">
        <div className="flex justify-between">
          <span>Total a pagar en el local</span>
          <span className="font-display text-xl font-extrabold">{formatCOP(total)}</span>
        </div>
        <p className="mt-1 text-right text-sm font-bold text-primary">Ahorras {formatCOP(ahorro)}</p>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive" role="alert">
          {error}
        </p>
      )}
      <button type="button" onClick={reservar} className="mt-5 w-full rounded-full bg-accent py-4 font-display text-lg font-extrabold text-accent-foreground shadow-card">
        Confirmar reserva
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
        <ShieldCheck className="size-4" aria-hidden /> El negocio confirma tu reserva y te damos un código para recoger.
      </p>
    </main>
  );
}

export default function PaginaConfirmar() {
  return (
    <Suspense fallback={<Cargando />}>
      <Confirmar />
    </Suspense>
  );
}
