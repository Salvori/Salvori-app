import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera } from "@/components/cabecera";
import { requerirAdmin } from "./contexto";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin Salvori" }, robots: { index: false } };

// El rol se verifica aquí y, otra vez, en cada página y acción (el layout no se
// vuelve a ejecutar al navegar entre pestañas).
async function SoloAdmin({ children }: { children: React.ReactNode }) {
  await requerirAdmin();
  return <>{children}</>;
}

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-16">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
          <SoloAdmin>{children}</SoloAdmin>
        </Suspense>
      </main>
    </div>
  );
}
