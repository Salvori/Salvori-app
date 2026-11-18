"use client";

import { useRef, useState } from "react";
import { Download, FileText } from "lucide-react";

export type DatosTicket = {
  codigo: string;
  titulo: string;
  cantidad: number;
  total: string;
  comprador: string;
  negocio: string;
  direccion: string | null;
  ventana: string;
};

const FONDO = "#F8F5EA";

async function comoImagen(nodo: HTMLElement): Promise<string> {
  const { toPng } = await import("html-to-image");
  const opciones = { pixelRatio: 2, backgroundColor: FONDO, cacheBust: true };
  try {
    return await toPng(nodo, opciones);
  } catch {
    // Si las fuentes no se pueden incrustar, sale con las del sistema.
    return toPng(nodo, { ...opciones, skipFonts: true });
  }
}

function descargar(url: string, nombre: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Ticket de la reserva confirmada. La imagen y el PDF se generan en el navegador.
export function TicketReserva({ d }: { d: DatosTicket }) {
  const ref = useRef<HTMLDivElement>(null);
  const [generando, setGenerando] = useState<"png" | "pdf" | null>(null);
  const [error, setError] = useState(false);
  const nombre = `salvori-reserva-${d.codigo}`;

  async function generar(tipo: "png" | "pdf") {
    if (!ref.current) return;
    setGenerando(tipo);
    setError(false);
    try {
      const png = await comoImagen(ref.current);
      if (tipo === "png") {
        descargar(png, `${nombre}.png`);
      } else {
        const { jsPDF } = await import("jspdf");
        const ancho = ref.current.offsetWidth;
        const alto = ref.current.offsetHeight;
        const pdf = new jsPDF({ orientation: alto >= ancho ? "portrait" : "landscape", unit: "px", format: [ancho + 48, alto + 48], hotfixes: ["px_scaling"] });
        pdf.setFillColor(FONDO);
        pdf.rect(0, 0, ancho + 48, alto + 48, "F");
        pdf.addImage(png, "PNG", 24, 24, ancho, alto);
        pdf.setProperties({ title: `Reserva Salvori ${d.codigo}`, creator: "Salvori" });
        pdf.save(`${nombre}.pdf`);
      }
    } catch {
      setError(true);
    } finally {
      setGenerando(null);
    }
  }

  return (
    <div className="mt-4">
      <div ref={ref} data-testid="ticket" className="overflow-hidden rounded-2xl border-2 border-primary bg-card text-foreground">
        <div className="flex items-center justify-between bg-primary px-5 py-3 text-primary-foreground">
          <span className="font-display text-xl font-extrabold tracking-tight">Salvori</span>
          <span className="text-xs font-semibold uppercase tracking-wide">Reserva confirmada</span>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div>
            <p className="font-display text-lg font-bold leading-snug text-primary">
              {d.cantidad} × {d.titulo}
            </p>
            <p className="text-sm text-muted-foreground">A nombre de {d.comprador}</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">{d.negocio}</p>
            {d.direccion && <p className="text-muted-foreground">{d.direccion}</p>}
            <p className="mt-1">{d.ventana}</p>
          </div>
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-background px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código de recogida</p>
            <p className="font-mono text-4xl font-extrabold tracking-[0.3em] text-primary" data-testid="codigo">
              {d.codigo}
            </p>
          </div>
          <p className="rounded-xl bg-accent px-4 py-2.5 text-center font-display font-extrabold text-accent-foreground">
            Pagas en el local al recoger · {d.total}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => generar("png")}
          disabled={generando !== null}
          className="flex items-center justify-center gap-2 rounded-full border border-primary py-2.5 text-sm font-bold text-primary disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden /> {generando === "png" ? "Generando…" : "Descargar imagen"}
        </button>
        <button
          type="button"
          onClick={() => generar("pdf")}
          disabled={generando !== null}
          className="flex items-center justify-center gap-2 rounded-full border border-primary py-2.5 text-sm font-bold text-primary disabled:opacity-50"
        >
          <FileText className="size-4" aria-hidden /> {generando === "pdf" ? "Generando…" : "Descargar PDF"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm font-semibold text-destructive" role="alert">
          No pudimos generar el archivo. Toma una captura de pantalla del ticket.
        </p>
      )}
    </div>
  );
}
