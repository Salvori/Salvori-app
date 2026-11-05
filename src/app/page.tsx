import { Suspense } from "react";
import { MapPin } from "lucide-react";
import { Cabecera } from "@/components/cabecera";
import { ExploradorOfertas } from "@/components/explorador-ofertas";
import { ofertasPublicas } from "@/lib/catalogo";

async function Catalogo() {
  const ofertas = await ofertasPublicas();

  // Sin Supabase en este entorno (Production antes del P7): portada provisional.
  if (ofertas === null) {
    return (
      <div className="mx-auto max-w-5xl px-5 pb-10">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-display text-base font-bold text-accent-foreground">
          <MapPin className="size-4" aria-hidden />
          Muy pronto en Popayán
        </p>
        <a href="/demo" className="ml-3 inline-block rounded-full bg-primary px-5 py-2 font-display font-bold text-primary-foreground">
          Ver la demo
        </a>
      </div>
    );
  }

  return <ExploradorOfertas ofertas={ofertas} />;
}

function CargandoCatalogo() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-10" aria-busy="true">
      <div className="h-11 w-64 animate-pulse rounded-full bg-muted" />
      <p className="sr-only">Cargando ofertas…</p>
    </div>
  );
}

export default function Portada() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Cabecera />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-5 pb-8 pt-4">
          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-primary md:text-6xl">
            Lo bueno
            <br />
            se aprovecha.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Reserva combos de negocios cerca de ti, con foto real, precio y horario claros. Pagas al recogerlo.
          </p>
          <a
            href="#titulo-ofertas"
            className="mt-5 inline-flex rounded-full bg-accent px-6 py-3 font-display text-lg font-extrabold text-accent-foreground shadow-card"
          >
            Reservar un combo ↓
          </a>
        </section>
        <Suspense fallback={<CargandoCatalogo />}>
          <Catalogo />
        </Suspense>
      </main>
      <footer className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-4 gap-y-1 px-5 py-8 text-sm text-muted-foreground">
        <span>Salvori · Popayán, Colombia · Paga en el local al recoger</span>
        <a href="/privacidad" className="underline underline-offset-4">
          Tratamiento de datos
        </a>
      </footer>
    </div>
  );
}
