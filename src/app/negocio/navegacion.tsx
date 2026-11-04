import Link from "next/link";
import type { NegocioPanel } from "@/lib/roles";

const PESTANAS = [
  { ruta: "/negocio", texto: "Reservas" },
  { ruta: "/negocio/publicar", texto: "Publicar" },
  { ruta: "/negocio/ofertas", texto: "Mis ofertas" },
] as const;

export function NavegacionNegocio({
  actual,
  negocio,
  negocios,
}: {
  actual: (typeof PESTANAS)[number]["ruta"];
  negocio: NegocioPanel;
  negocios: NegocioPanel[];
}) {
  const q = `?n=${negocio.slug}`;
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold text-primary">{negocio.nombre}</h1>
        {negocios.length > 1 && (
          <form action={actual} className="text-sm">
            <label className="sr-only" htmlFor="selector-negocio">
              Negocio
            </label>
            <select
              id="selector-negocio"
              name="n"
              defaultValue={negocio.slug}
              className="rounded-full border bg-card px-3 py-1.5"
            >
              {negocios.map((n) => (
                <option key={n.id} value={n.slug}>
                  {n.nombre}
                  {n.es_prueba ? " (prueba)" : ""}
                </option>
              ))}
            </select>
            <button type="submit" className="ml-2 font-semibold text-primary underline underline-offset-4">
              Cambiar
            </button>
          </form>
        )}
      </div>
      {negocio.es_prueba && (
        <p className="mt-2 rounded-xl bg-accent/20 px-3 py-2 text-sm text-mandarina-texto">
          Negocio de prueba: sus ofertas no salen en el catálogo público.
        </p>
      )}
      <nav className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-secondary p-1" aria-label="Panel del negocio">
        {PESTANAS.map((p) => (
          <Link
            key={p.ruta}
            href={`${p.ruta}${q}`}
            aria-current={actual === p.ruta ? "page" : undefined}
            className={`rounded-full py-2 text-center text-sm font-bold ${
              actual === p.ruta ? "bg-primary text-primary-foreground" : "text-secondary-foreground"
            }`}
          >
            {p.texto}
          </Link>
        ))}
      </nav>
    </div>
  );
}
