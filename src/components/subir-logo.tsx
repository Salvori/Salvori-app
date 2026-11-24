"use client";

import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { guardarLogoNegocio } from "@/lib/acciones-logo";
import { rutaLogo } from "@/lib/ofertas";
import { createClient } from "@/lib/supabase/client";
import { LogoNegocio } from "./logo-negocio";

/**
 * Sube el logo del negocio a Storage (negocios/<id>/logo.webp, comprimido en el navegador)
 * y guarda la ruta. Lo usan /admin/negocios/[id] y el panel del negocio.
 */
export function SubirLogo({ negocioId, nombre, logo }: { negocioId: string; nombre: string; logo: string | null }) {
  const router = useRouter();
  const [actual, setActual] = useState(logo);
  const [estado, setEstado] = useState<"nada" | "subiendo" | "listo" | "error">("nada");
  const [mensaje, setMensaje] = useState("");

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setEstado("subiendo");
    try {
      const comprimido = await imageCompression(archivo, { maxSizeMB: 0.15, maxWidthOrHeight: 512, fileType: "image/webp", useWebWorker: true });
      const ruta = rutaLogo(negocioId);
      const { error } = await createClient()
        .storage.from("ofertas")
        .upload(ruta.split("?")[0], comprimido, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const r = await guardarLogoNegocio(negocioId, ruta);
      if (r.error) throw new Error(r.error);
      setActual(ruta);
      setEstado("listo");
      setMensaje("Logo actualizado.");
      router.refresh();
    } catch (err) {
      setEstado("error");
      setMensaje(err instanceof Error && err.message.startsWith("No pudimos") ? err.message : "No pudimos subir el logo. Intenta con otra imagen.");
    }
  }

  async function quitar() {
    setEstado("subiendo");
    const r = await guardarLogoNegocio(negocioId, null);
    if (r.error) {
      setEstado("error");
      setMensaje(r.error);
      return;
    }
    setActual(null);
    setEstado("listo");
    setMensaje("Logo quitado: se muestra la inicial.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <LogoNegocio nombre={nombre} logo={actual} tamano="lg" />
      <div className="flex flex-col items-start gap-1.5">
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary">
          <ImagePlus className="size-4" aria-hidden />
          {estado === "subiendo" ? "Subiendo…" : actual ? "Cambiar logo" : "Subir logo"}
          <input type="file" accept="image/*" onChange={elegir} disabled={estado === "subiendo"} className="sr-only" aria-label="Logo del negocio" />
        </label>
        {actual && estado !== "subiendo" && (
          <button type="button" onClick={quitar} className="text-xs font-semibold text-muted-foreground underline underline-offset-4">
            Quitar logo
          </button>
        )}
        {mensaje && (
          <p className={`text-sm font-semibold ${estado === "error" ? "text-destructive" : "text-primary"}`} role={estado === "error" ? "alert" : "status"}>
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
}
