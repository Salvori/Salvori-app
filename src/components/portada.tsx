import { BadgeCheck, Camera, Clock, Coffee, Croissant, MapPin, QrCode, ReceiptText, Store, Ticket, TrendingUp, Wallet } from "lucide-react";

/** Negocios del piloto (14 nov 2026). Quitar o editar aquí si alguno no autoriza aparecer. */
export const NEGOCIOS_PILOTO = [
  { nombre: "Historia Colonial", tipo: "Pastelería y brunch" },
  { nombre: "Panadería y Pastelería La Segunda", tipo: "Panadería" },
  { nombre: "WaffCake", tipo: "Wafflería" },
  { nombre: "Burger al Cubo", tipo: "Comida rápida" },
  { nombre: "Avena Plus", tipo: "Avena y tortas" },
];

const contenedor = "mx-auto max-w-5xl px-5";

/** Tarjeta y ticket de ejemplo para el hero. Datos ilustrativos, marcados como ejemplo. */
export function EjemploCombo() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-label="Ejemplo de combo y ticket de reserva">
      <article className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
        <div className="relative flex h-36 items-end rounded-xl bg-secondary p-3">
          <div className="absolute inset-0 flex items-center justify-center gap-3 text-primary/25" aria-hidden>
            <Coffee className="size-14" />
            <Croissant className="size-14" />
          </div>
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 font-display text-sm font-extrabold text-accent-foreground">
            −20 %
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-primary">Combo</span>
          <span className="relative inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <Camera className="size-3.5" aria-hidden /> Foto real del negocio
          </span>
        </div>
        <h3 className="mt-3 font-display text-lg font-extrabold text-foreground">Café con pandebono x2</h3>
        <p className="text-sm text-muted-foreground">Panadería de tu barrio · 350 m</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold text-primary">$ 8.000</span>
          <span className="text-sm text-muted-foreground line-through">$ 10.000</span>
          <span className="ml-auto text-sm font-semibold text-mandarina-texto">quedan 3</span>
        </div>
      </article>
      <div className="absolute -bottom-12 right-2 w-48 rotate-3 rounded-2xl border-2 border-dashed border-primary/40 bg-background p-3 shadow-card md:-right-10">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Ticket className="size-3.5" aria-hidden /> Tu código
        </p>
        <p className="font-display text-2xl font-extrabold tracking-[0.2em] text-primary">K7Q4MZ</p>
        <p className="text-xs text-muted-foreground">Pagas en el local al recoger</p>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Ejemplo ilustrativo</p>
    </div>
  );
}

const PASOS = [
  { icono: MapPin, titulo: "Elige un combo cerca", texto: "Ves en el mapa los combos de hoy, con foto real, precio y a cuántos metros están de tu casa." },
  { icono: BadgeCheck, titulo: "Reserva y espera el sí", texto: "El negocio confirma tu reserva. Solo sales cuando sabes que te está esperando." },
  { icono: ReceiptText, titulo: "Recoge con tu código", texto: "Muestras el código de tu ticket, recoges y pagas en el local como siempre." },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-14" aria-labelledby="titulo-como">
      <div className={contenedor}>
        <h2 id="titulo-como" className="font-display text-3xl font-extrabold text-primary md:text-4xl">
          Así funciona
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
            <li key={titulo} className="rounded-2xl bg-card p-5 ring-1 ring-border">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary font-display font-extrabold text-primary-foreground">
                  {i + 1}
                </span>
                <Icono className="size-5 text-primary" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-extrabold">{titulo}</h3>
              <p className="mt-1 text-muted-foreground">{texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const CONFIANZA = [
  { icono: Camera, titulo: "Foto real y contenido exacto", texto: "Sabes qué recibes antes de reservar. Nada de sorpresas." },
  { icono: Wallet, titulo: "Ahorro en pesos, a la vista", texto: "Precio habitual tachado, el descuento y lo que llevas ahorrado en tu perfil." },
  { icono: Clock, titulo: "Horario claro", texto: "Cada combo dice desde y hasta qué hora lo puedes recoger." },
  { icono: BadgeCheck, titulo: "Calificaciones de verdad", texto: "Calidad, aseo y atención, calificados por quienes ya recogieron." },
];

export function Confianza() {
  return (
    <section className="bg-secondary py-14" aria-labelledby="titulo-confianza">
      <div className={contenedor}>
        <h2 id="titulo-confianza" className="max-w-xl font-display text-3xl font-extrabold text-primary md:text-4xl">
          Comprar barato, sin dudar
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {CONFIANZA.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo} className="flex gap-4 rounded-2xl bg-card p-5">
              <Icono className="mt-0.5 size-6 shrink-0 text-mandarina-texto" aria-hidden />
              <div>
                <h3 className="text-lg font-extrabold">{titulo}</h3>
                <p className="mt-1 text-muted-foreground">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function NegociosAliados() {
  return (
    <section className="py-14" aria-labelledby="titulo-aliados">
      <div className={contenedor}>
        <h2 id="titulo-aliados" className="font-display text-3xl font-extrabold text-primary md:text-4xl">
          Los primeros en Salvori
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">Negocios de Popayán que arrancan el piloto con sus combos.</p>
        <ul className="mt-6 flex flex-wrap gap-3">
          {NEGOCIOS_PILOTO.map((n) => (
            <li key={n.nombre} className="rounded-full bg-card px-4 py-2 ring-1 ring-border">
              <span className="font-display font-extrabold text-foreground">{n.nombre}</span>
              <span className="ml-2 text-sm text-muted-foreground">{n.tipo}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const BENEFICIOS_NEGOCIO = [
  { icono: Camera, texto: "Publicas un combo en menos de un minuto desde el celular: foto, precio y horario." },
  { icono: TrendingUp, texto: "Llenas los días y horas flojas con promociones que la gente de tu zona ve en el mapa." },
  { icono: Store, texto: "Confirmas cada reserva y entregas con código. El cliente paga en tu local." },
  { icono: QrCode, texto: "Ves tus cifras: vistas, reservas, entregas y calificación. Con enlace y QR propios." },
];

export function ParaNegocios({ contacto, precios }: { contacto: string; precios?: React.ReactNode }) {
  return (
    <section id="negocios" className="bg-primary py-14 text-primary-foreground" aria-labelledby="titulo-negocios">
      <div className={`${contenedor} grid gap-8 md:grid-cols-2 md:items-center`}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Para negocios</p>
          <h2 id="titulo-negocios" className="mt-2 font-display text-3xl font-extrabold md:text-4xl">
            Tus combos, frente a clientes que están cerca
          </h2>
          {precios && (
            <p data-testid="precios-negocios" className="mt-3 text-lg font-semibold">
              {precios}
            </p>
          )}
          <a
            href={contacto}
            className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 font-display text-lg font-extrabold text-accent-foreground"
          >
            Quiero publicar mis combos
          </a>
        </div>
        <ul className="grid gap-3">
          {BENEFICIOS_NEGOCIO.map(({ icono: Icono, texto }) => (
            <li key={texto} className="flex gap-3 rounded-2xl bg-primary-foreground/10 p-4">
              <Icono className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PREGUNTAS = [
  { p: "¿Cuánto cuesta usar Salvori?", r: "Para quien compra, nada. Solo pagas el combo en el local." },
  { p: "¿Cómo pago?", r: "En el local, al recoger: efectivo, Nequi, transferencia o tarjeta, según lo que reciba el negocio." },
  { p: "¿Hacen domicilios?", r: "No. Los combos se recogen en el local; por eso te mostramos los que están más cerca de ti." },
  { p: "¿Cuándo voy por mi combo?", r: "Cuando el negocio confirme tu reserva. Ahí recibes tu código y el horario de recogida." },
  { p: "¿Dónde funciona?", r: "Por ahora en Popayán. Empezamos con un grupo pequeño de negocios y vamos sumando más." },
];

export function Preguntas() {
  return (
    <section className="py-14" aria-labelledby="titulo-preguntas">
      <div className={contenedor}>
        <h2 id="titulo-preguntas" className="font-display text-3xl font-extrabold text-primary md:text-4xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-6 divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
          {PREGUNTAS.map(({ p, r }) => (
            <details key={p} className="group p-5">
              <summary className="cursor-pointer list-none font-display text-lg font-extrabold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {p}
                  <span className="text-primary transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-muted-foreground">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
