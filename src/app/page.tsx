import { Suspense } from "react";
import { MapPin } from "lucide-react";
import { Cabecera } from "@/components/cabecera";
import { ExploradorOfertas } from "@/components/explorador-ofertas";
import { ComoFunciona, Confianza, EjemploCombo, NegociosAliados, ParaNegocios, Preguntas } from "@/components/portada";
import { ofertasPublicas } from "@/lib/catalogo";
import { direccionGuardada } from "@/lib/direccion";
import { usuarioActual } from "@/lib/sesion";

async function Catalogo() {
  const ofertas = await ofertasPublicas();

  // Sin Supabase en este entorno (Production antes del P7): portada provisional.
  if (ofertas === null) {
    return (
      <section className="bg-primary py-12" aria-labelledby="titulo-ofertas">
        <div className="mx-auto max-w-5xl px-5 text-primary-foreground">
          <h2 id="titulo-ofertas" className="font-display text-2xl font-extrabold md:text-3xl">
            Combos de hoy
          </h2>
          <p className="mt-2 max-w-lg">
            Estamos sumando los primeros negocios de Popayán. Mientras tanto, mira cómo funciona en la demo.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-display text-base font-bold text-accent-foreground">
              <MapPin className="size-4" aria-hidden />
              Muy pronto en Popayán
            </p>
            <a href="/demo" className="inline-block rounded-full bg-primary-foreground px-5 py-2 font-display font-bold text-primary">
              Ver la demo
            </a>
          </div>
        </div>
      </section>
    );
  }

  const usuario = await usuarioActual();
  const direccion = usuario ? await direccionGuardada(usuario.id) : null;
  return <ExploradorOfertas ofertas={ofertas} direccion={direccion} pedirDireccion={Boolean(usuario) && !direccion} />;
}

/** WhatsApp de Salvori para negocios (NEXT_PUBLIC_WHATSAPP_SALVORI, solo dígitos con indicativo); si no está, el acceso de negocios. */
function contactoNegocios() {
  const numero = process.env.NEXT_PUBLIC_WHATSAPP_SALVORI?.replace(/\D/g, "");
  if (!numero) return "/entrar?next=/negocio";
  const texto = encodeURIComponent("Hola, tengo un negocio en Popayán y quiero publicar mis combos en Salvori.");
  return `https://wa.me/${numero}?text=${texto}`;
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
        <section className="mx-auto grid max-w-5xl gap-12 px-5 pb-16 pt-4 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary">
              <MapPin className="size-4" aria-hidden />
              Ya en Popayán
            </p>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-primary md:text-7xl">
              Lo bueno
              <br />
              se aprovecha.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Combos y promociones de los negocios de tu barrio, con descuento real. Reservas desde el celular, el
              negocio te confirma y pagas al recoger.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#titulo-ofertas"
                className="inline-flex rounded-full bg-accent px-6 py-3 font-display text-lg font-extrabold text-accent-foreground shadow-card"
              >
                Ver combos cerca ↓
              </a>
              <a
                href="#negocios"
                className="inline-flex rounded-full border-2 border-primary px-6 py-3 font-display text-lg font-extrabold text-primary"
              >
                Tengo un negocio
              </a>
            </div>
          </div>
          <EjemploCombo />
        </section>
        <ComoFunciona />
        <Suspense fallback={<CargandoCatalogo />}>
          <Catalogo />
        </Suspense>
        <Confianza />
        <NegociosAliados />
        <ParaNegocios contacto={contactoNegocios()} />
        <Preguntas />
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
