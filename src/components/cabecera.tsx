import Link from "next/link";
import { Suspense } from "react";
import { Marca } from "@/components/marca";
import { rolesActuales } from "@/lib/roles";

const pildora =
  "rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70";

async function Acceso() {
  const { usuario, roles } = await rolesActuales();
  if (!usuario) {
    return (
      <nav className="flex gap-2">
        <Link
          href="/entrar?next=/negocio"
          className="rounded-full border border-primary/30 bg-card px-3.5 py-1.5 text-sm font-semibold text-primary"
        >
          Tengo un negocio
        </Link>
        <Link href="/entrar" className={pildora}>
          Entrar
        </Link>
      </nav>
    );
  }
  const operador = roles.includes("negocio") || roles.includes("admin");
  return (
    <nav className="flex gap-2">
      {operador && (
        <Link href="/negocio" className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
          Mi negocio
        </Link>
      )}
      <Link href="/mis-reservas" className={pildora}>
        Mis reservas
      </Link>
    </nav>
  );
}

export function Cabecera() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
      <Link href="/" aria-label="Salvori, ir al inicio">
        <Marca />
      </Link>
      <Suspense fallback={<span className="h-8 w-24" aria-hidden />}>
        <Acceso />
      </Suspense>
    </header>
  );
}
