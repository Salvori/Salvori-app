import Link from "next/link";
import { Suspense } from "react";
import { Marca } from "@/components/marca";
import { rolesActuales } from "@/lib/roles";

// Todas las píldoras miden 40 px de alto (zona táctil cómoda) y nunca parten su texto.
const base = "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full text-sm font-semibold";
const pildora = `${base} bg-secondary px-4 text-secondary-foreground transition-colors hover:bg-secondary/70`;
const contorno = `${base} border border-primary/30 bg-card px-3.5 text-primary`;
const principal = `${base} bg-primary px-4 text-primary-foreground`;

// En celular, si no caben junto al logo, las opciones bajan a su propia fila y se desplazan de lado.
const nav = "-mx-5 flex max-w-[calc(100%+2.5rem)] gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:max-w-none sm:px-0";

async function Acceso() {
  const { usuario, roles } = await rolesActuales();
  if (!usuario) {
    return (
      <nav className={nav}>
        <Link href="/entrar?next=/negocio" className={contorno}>
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
    <nav className={nav}>
      {roles.includes("admin") && (
        <Link href="/admin" className={contorno}>
          Admin
        </Link>
      )}
      {operador && (
        <Link href="/negocio" className={principal}>
          Mi negocio
        </Link>
      )}
      <Link href="/mis-reservas" className={pildora}>
        Mis reservas
      </Link>
      <Link href="/perfil" className={pildora} aria-label="Mi perfil">
        Perfil
      </Link>
    </nav>
  );
}

export function Cabecera() {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 sm:py-5">
      <Link href="/" aria-label="Salvori, ir al inicio" className="shrink-0">
        <Marca />
      </Link>
      <Suspense fallback={<span className="h-10 w-24" aria-hidden />}>
        <Acceso />
      </Suspense>
    </header>
  );
}
