import Link from "next/link";

const PESTANAS = [
  { ruta: "/admin", texto: "Negocios" },
  { ruta: "/admin/publicar", texto: "Publicar" },
  { ruta: "/admin/reservas", texto: "Reservas" },
] as const;

export function NavegacionAdmin({ actual }: { actual: (typeof PESTANAS)[number]["ruta"] }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl font-extrabold text-primary">Admin Salvori</h1>
      <nav className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-secondary p-1" aria-label="Panel de administración">
        {PESTANAS.map((p) => (
          <Link
            key={p.ruta}
            href={p.ruta}
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
