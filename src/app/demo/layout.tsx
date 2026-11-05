import type { Metadata } from "next";
import { Suspense } from "react";
import { BarraDemo, Cargando } from "./ui";

export const metadata: Metadata = {
  title: { default: "Demo", template: "%s · Demo Salvori" },
  robots: { index: false, follow: false },
};

// Todo en /demo es de cliente y lee la URL: va dentro de <Suspense>.
export default function LayoutDemo({ children }: LayoutProps<"/demo">) {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <Suspense fallback={<div className="h-7 bg-primary" />}>
        <BarraDemo />
      </Suspense>
      <Suspense fallback={<Cargando />}>{children}</Suspense>
    </div>
  );
}
