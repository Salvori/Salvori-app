"use client";

import { useEffect } from "react";

export default function ErrorDePagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-5">
      <h1 className="font-display text-3xl font-extrabold text-primary">Algo salió mal</h1>
      <p className="text-muted-foreground">
        Tuvimos un problema al cargar esta página. Intenta de nuevo en unos segundos.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-primary px-5 py-2 font-display font-bold text-primary-foreground"
      >
        Intentar de nuevo
      </button>
    </main>
  );
}
