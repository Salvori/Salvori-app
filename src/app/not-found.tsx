import Link from "next/link";
import { Marca } from "@/components/marca";

export default function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-5">
      <Marca />
      <h1 className="font-display text-3xl font-extrabold text-primary">
        No encontramos esta página
      </h1>
      <p className="text-muted-foreground">
        Puede que el enlace esté mal escrito o que la oferta ya no esté disponible.
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary px-5 py-2 font-display font-bold text-primary-foreground"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
