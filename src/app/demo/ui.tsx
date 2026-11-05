"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClipboardList, House, Package, RotateCcw, Store, UserRound } from "lucide-react";
import { Marca } from "@/components/marca";
import { CATEGORIAS, demo, MI_NEGOCIO, useDemo, type Combo } from "./almacen";

/** Foto del combo o, si no hay, una ilustración con los colores de marca. */
export function ImagenCombo({ combo, className = "" }: { combo: Pick<Combo, "foto" | "emoji" | "titulo" | "categoria">; className?: string }) {
  if (combo.foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={combo.foto} alt={combo.titulo} className={`size-full object-cover ${className}`} />;
  }
  return (
    <div
      role="img"
      aria-label={combo.titulo}
      className={`grid size-full place-items-center bg-[linear-gradient(135deg,#F8C9A4_0%,#F8F5EA_55%,#CFE3D6_100%)] ${className}`}
    >
      <span className="text-6xl drop-shadow-sm" aria-hidden>
        {combo.emoji || CATEGORIAS[combo.categoria].emoji}
      </span>
    </div>
  );
}

/** Franja superior: deja claro que es una demo y permite cambiar de lado o reiniciar. */
export function BarraDemo() {
  const ruta = usePathname();
  const enNegocio = ruta.startsWith("/demo/negocio");
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-1.5 text-xs">
        <span className="font-semibold">Modo demo · datos de muestra</span>
        <div className="flex items-center gap-3">
          <Link href={enNegocio ? "/demo" : "/demo/negocio"} className="font-bold underline underline-offset-2">
            {enNegocio ? "Ver como cliente" : "Ver como negocio"}
          </Link>
          <button
            type="button"
            onClick={() => confirm("¿Reiniciar la demo con los datos de muestra?") && demo.reiniciar()}
            className="flex items-center gap-1 opacity-90"
            aria-label="Reiniciar la demo"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
}

export function CabeceraCliente() {
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-4">
      <Link href="/demo" aria-label="Salvori, inicio">
        <Marca />
      </Link>
      <Link
        href="/demo/negocio"
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-card px-3.5 py-1.5 text-sm font-bold text-primary"
      >
        <Store className="size-4" aria-hidden /> Tengo un negocio
      </Link>
    </header>
  );
}

function Pestana({ href, icono, texto, activa, globo }: { href: string; icono: React.ReactNode; texto: string; activa: boolean; globo?: number }) {
  return (
    <Link
      href={href}
      aria-current={activa ? "page" : undefined}
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ${activa ? "text-primary" : "text-muted-foreground"}`}
    >
      {icono}
      {texto}
      {!!globo && (
        <span className="absolute right-[calc(50%-22px)] top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-accent-foreground">
          {globo}
        </span>
      )}
    </Link>
  );
}

export function NavCliente() {
  const ruta = usePathname();
  const { pedidos } = useDemo();
  const activos = pedidos.filter((p) => p.esMio && (p.estado === "por_confirmar" || p.estado === "confirmado")).length;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur" aria-label="Menú del cliente">
      <div className="mx-auto flex max-w-xl">
        <Pestana href="/demo" icono={<House className="size-5" aria-hidden />} texto="Inicio" activa={ruta === "/demo" || ruta.startsWith("/demo/combo")} />
        <Pestana href="/demo/pedidos" icono={<ClipboardList className="size-5" aria-hidden />} texto="Mis pedidos" activa={ruta.startsWith("/demo/pedidos")} globo={activos} />
        <Pestana href="/demo/negocio" icono={<UserRound className="size-5" aria-hidden />} texto="Soy negocio" activa={false} />
      </div>
    </nav>
  );
}

export function NavNegocio() {
  const ruta = usePathname();
  const { pedidos } = useDemo();
  const porConfirmar = pedidos.filter((p) => p.negocioId === MI_NEGOCIO && p.estado === "por_confirmar").length;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur" aria-label="Menú del negocio">
      <div className="mx-auto flex max-w-xl">
        <Pestana href="/demo/negocio" icono={<House className="size-5" aria-hidden />} texto="Inicio" activa={ruta === "/demo/negocio"} />
        <Pestana href="/demo/negocio/combos" icono={<Package className="size-5" aria-hidden />} texto="Mis combos" activa={ruta.startsWith("/demo/negocio/combos")} />
        <Pestana href="/demo/negocio/pedidos" icono={<ClipboardList className="size-5" aria-hidden />} texto="Pedidos" activa={ruta.startsWith("/demo/negocio/pedidos")} globo={porConfirmar} />
      </div>
    </nav>
  );
}

/** Aviso flotante breve. */
export function Aviso({ texto, onCerrar }: { texto: string | null; onCerrar: () => void }) {
  useEffect(() => {
    if (!texto) return;
    const t = setTimeout(onCerrar, 6000);
    return () => clearTimeout(t);
  }, [texto, onCerrar]);
  if (!texto) return null;
  return (
    <div className="fixed inset-x-0 top-10 z-30 mx-auto w-[calc(100%-2rem)] max-w-md" role="alert">
      <button
        type="button"
        onClick={onCerrar}
        className="w-full rounded-2xl bg-accent px-4 py-3 text-left font-display font-bold text-accent-foreground shadow-card"
      >
        {texto}
      </button>
    </div>
  );
}

/** Sonido corto de aviso (Web Audio). El navegador solo lo permite después de un toque. */
export function useSonido() {
  const ctx = useRef<AudioContext | null>(null);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const activar = () => {
      ctx.current ??= new AudioContext();
      ctx.current.resume().then(() => setListo(true));
    };
    window.addEventListener("pointerdown", activar, { once: true });
    return () => window.removeEventListener("pointerdown", activar);
  }, []);
  const sonar = () => {
    const c = ctx.current;
    if (!c) return;
    [880, 1175].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.25, c.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.18 + 0.16);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime + i * 0.18);
      o.stop(c.currentTime + i * 0.18 + 0.17);
    });
    navigator.vibrate?.([200, 100, 200]);
  };
  return { sonar, listo };
}

export function Cargando() {
  return <div className="mx-4 mt-4 h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" />;
}
