import { MapPin } from "lucide-react";
import { Marca } from "@/components/marca";

// Portada provisional del P0: hero del prototipo, sin datos.
// El listado de ofertas por cercanía llega en el P2.
export default function Portada() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6">
        <Marca />
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-5 pb-10 pt-6">
          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-primary md:text-6xl">
            Lo bueno
            <br />
            se aprovecha.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Reserva ofertas de negocios cerca de ti, con foto real, precio y horario claros antes de
            decidir.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-display text-base font-bold text-accent-foreground">
            <MapPin className="size-4" aria-hidden />
            Muy pronto en Popayán
          </p>
        </section>

        <section className="bg-primary py-12">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="font-display text-2xl font-extrabold text-primary-foreground md:text-3xl">
              Ahorra en lo que ya te gusta
            </h2>
            <p className="mt-4 max-w-xl text-primary-foreground/80">
              Panaderías, cafés y restaurantes de tu barrio publicarán sus ofertas del día. Reservas
              desde el celular, el negocio confirma y recoges en el local.
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 py-8 text-sm text-muted-foreground">
        Salvori · Popayán, Colombia · Paga en el local al recoger
      </footer>
    </div>
  );
}
