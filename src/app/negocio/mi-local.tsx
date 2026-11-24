import { MapPin, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { MapaNegocioDinamico } from "@/components/mapa-negocio-dinamico";
import { SubirLogo } from "@/components/subir-logo";
import { faltanCoordenadas } from "@/lib/ofertas";

export type DatosLocal = {
  id: string;
  nombre: string;
  slug: string;
  direccion: string;
  lat: number;
  lng: number;
  logo_url: string | null;
};

// Marca y ubicación del negocio en su panel: así lo ve el comprador.
export function MiLocal({ local }: { local: DatosLocal }) {
  const sinCoordenadas = faltanCoordenadas(local);
  return (
    <section className="mt-8 rounded-2xl bg-card p-5 shadow-card" aria-labelledby="titulo-mi-local">
      <h2 id="titulo-mi-local" className="font-display text-lg font-bold text-primary">
        Tu local en Salvori
      </h2>
      <div className="mt-3">
        <SubirLogo negocioId={local.id} nombre={local.nombre} logo={local.logo_url} />
      </div>
      <p className="mt-4 flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        {local.direccion || <span className="text-muted-foreground">Sin dirección registrada.</span>}
      </p>
      {sinCoordenadas ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent/20 px-3 py-2 text-sm text-mandarina-texto" role="alert" data-testid="aviso-coordenadas">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Falta ubicar tu local en el mapa: los compradores no ven bien la distancia. Escríbele al equipo Salvori para ajustarlo.
        </p>
      ) : (
        <div className="mt-3">
          <MapaNegocioDinamico lat={local.lat} lng={local.lng} nombre={local.nombre} direccion={local.direccion} />
        </div>
      )}
      <Link href={`/n/${local.slug}`} className="mt-1 inline-block py-2 text-sm font-semibold text-primary underline underline-offset-4">
        Ver mi ficha pública
      </Link>
    </section>
  );
}
