import Link from "next/link";
import { Suspense } from "react";
import { Marca } from "@/components/marca";
import { usuarioActual } from "@/lib/sesion";

const pildora =
  "rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70";

async function Acceso() {
  const usuario = await usuarioActual();
  return usuario ? (
    <Link href="/mis-reservas" className={pildora}>
      Mis reservas
    </Link>
  ) : (
    <Link href="/entrar" className={pildora}>
      Entrar
    </Link>
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
