import { cn } from "@/lib/utils";
import { inicialNegocio, urlFoto } from "@/lib/ofertas";

const TAMANOS = {
  sm: "size-8 text-sm",
  md: "size-11 text-lg",
  lg: "size-20 text-3xl",
} as const;

/**
 * Logo del negocio (Storage) o, si no tiene, un avatar con la inicial en Bosque sobre Crema.
 * Se usa <img> y no next/image: es pequeño y lleva «?v=» para refrescar la caché al cambiarlo.
 */
export function LogoNegocio({
  nombre,
  logo,
  tamano = "md",
  className,
}: {
  nombre: string;
  logo?: string | null;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  const url = urlFoto(logo);
  const base = cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary/15", TAMANOS[tamano], className);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={`Logo de ${nombre}`} crossOrigin="anonymous" loading="lazy" className={cn(base, "bg-card object-cover")} data-testid="logo-negocio" />
    );
  }
  return (
    <span aria-hidden className={cn(base, "bg-background font-display font-extrabold text-primary")} data-testid="avatar-negocio">
      {inicialNegocio(nombre)}
    </span>
  );
}
