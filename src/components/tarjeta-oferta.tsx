import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Star } from "lucide-react";
import { formatCOP } from "@/lib/formato";
import { CATEGORIA_LABEL, descuento, formatDistancia, textoVentana, urlFoto } from "@/lib/ofertas";
import type { OfertaTarjeta } from "@/lib/catalogo";

export function TarjetaOferta({ oferta, km, prioridad = false }: { oferta: OfertaTarjeta; km: number; prioridad?: boolean }) {
  const agotada = oferta.estado === "agotada" || oferta.cupos_disponibles <= 0;
  const foto = urlFoto(oferta.foto_url);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-card">
      <div className="relative aspect-[4/3] bg-muted">
        {foto && (
          <Image
            src={foto}
            alt={oferta.titulo}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            priority={prioridad}
          />
        )}
        <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 font-display text-sm font-extrabold text-accent-foreground">
          -{descuento(oferta.precio_final, oferta.precio_habitual)}%
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORIA_LABEL[oferta.categoria] ?? oferta.categoria}
          </span>
          {oferta.calificacion ? (
            <span className="flex items-center gap-1 text-sm font-semibold">
              <Star className="size-4 fill-accent text-accent" aria-hidden />
              {oferta.calificacion.promedio.toFixed(1).replace(".", ",")}
              <span className="font-normal text-muted-foreground">({oferta.calificacion.total})</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-primary">Nuevo en Salvori</span>
          )}
        </div>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug text-primary">{oferta.titulo}</h3>
        <p className="text-sm text-muted-foreground">{oferta.negocio.nombre}</p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold">{formatCOP(oferta.precio_final)}</span>
          <span className="text-sm text-muted-foreground line-through">{formatCOP(oferta.precio_habitual)}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-mandarina-texto">
          {agotada ? "Agotada" : `Quedan ${oferta.cupos_disponibles}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            {formatDistancia(km)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-4" aria-hidden />
            {textoVentana(oferta.recogida_desde, oferta.recogida_hasta)}
          </span>
        </div>
        {agotada ? (
          <span className="mt-5 rounded-full bg-muted py-2.5 text-center font-display font-bold text-muted-foreground">
            Agotada
          </span>
        ) : (
          <Link
            href={`/oferta/${oferta.id}`}
            className="mt-5 rounded-full bg-primary py-2.5 text-center font-display font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reservar
          </Link>
        )}
      </div>
    </article>
  );
}
