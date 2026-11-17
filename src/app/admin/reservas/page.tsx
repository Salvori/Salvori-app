import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { TarjetaReserva, type ReservaBandeja } from "@/app/negocio/tarjeta-reserva";
import { formatHora } from "@/lib/formato";
import { origenActual } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { enlaceWhatsApp } from "@/lib/texto";
import { fechaBogota, instanteActual } from "@/lib/tiempo";
import { requerirAdmin } from "../contexto";
import { NavegacionAdmin } from "../navegacion";

export const metadata: Metadata = { title: "Reservas" };

const ORDEN: Record<string, number> = { solicitada: 0, confirmada: 1, lista: 2, entregada: 3, no_recogida: 4, rechazada: 5, cancelada: 6 };
const POR_GESTIONAR = ["solicitada", "confirmada", "lista"];
const ESTADOS = [
  ["", "Todos los estados"],
  ["por-gestionar", "Por gestionar"],
  ["solicitada", "Por confirmar"],
  ["confirmada", "Confirmadas"],
  ["lista", "Listas"],
  ["entregada", "Entregadas"],
  ["rechazada", "Rechazadas"],
  ["cancelada", "Canceladas"],
  ["no_recogida", "No recogidas"],
] as const;
const CUANDO = [
  ["hoy", "Hoy"],
  ["semana", "Últimos 7 días"],
  ["todas", "Todas"],
] as const;

type Negocio = { id: string; nombre: string; slug: string; telefono_whatsapp: string | null; es_prueba: boolean };

function textoAviso(r: ReservaBandeja, negocio: Negocio, origen: string): string {
  const pedido = `${r.cantidad} × ${r.titulo}, a nombre de ${r.nombre_comprador}, para recoger de ${formatHora(r.recogida_desde)} a ${formatHora(r.recogida_hasta)}`;
  const que =
    r.estado === "solicitada"
      ? "Tienes una reserva en Salvori por confirmar"
      : POR_GESTIONAR.includes(r.estado)
        ? "Tienes una reserva en Salvori pendiente de entrega"
        : "Te escribimos por esta reserva en Salvori";
  return `Hola, ${negocio.nombre}. ${que}: ${pedido}. Gestiónala aquí: ${origen}/negocio?n=${negocio.slug}`;
}

const selector = "min-w-0 rounded-xl border bg-background px-3 py-2.5 text-sm";

export default async function AdminReservas(props: PageProps<"/admin/reservas">) {
  await requerirAdmin();
  const filtros = (await props.searchParams) as { n?: string; estado?: string; cuando?: string };
  const cuando = CUANDO.some(([v]) => v === filtros.cuando) ? filtros.cuando! : "hoy";
  const estado = ESTADOS.some(([v]) => v === filtros.estado) ? filtros.estado! : "";

  const supabase = await createClient();
  const { data: lista, error } = await supabase
    .from("negocios")
    .select("id, nombre, slug, telefono_whatsapp, es_prueba")
    .order("es_prueba")
    .order("nombre");
  if (error) throw new Error("No pudimos cargar los negocios.");
  const negocios: Negocio[] = lista ?? [];
  const elegido = negocios.find((x) => x.slug === filtros.n);

  // reservas_negocio no expone correo ni teléfono del comprador; el admin pasa la verificación de cada negocio.
  const porNegocio = await Promise.all(
    (elegido ? [elegido] : negocios).map(async (negocio) => {
      const { data, error: e } = await supabase.rpc("reservas_negocio", { negocio_id: negocio.id });
      if (e) throw new Error("No pudimos cargar las reservas.");
      return ((data ?? []) as ReservaBandeja[]).map((r) => ({ r, negocio }));
    }),
  );

  const ahora = instanteActual();
  const hoy = fechaBogota(ahora);
  const desde = ahora - 7 * 24 * 60 * 60 * 1000;
  const reservas = porNegocio
    .flat()
    .filter(({ r }) => {
      if (estado === "por-gestionar" ? !POR_GESTIONAR.includes(r.estado) : estado && r.estado !== estado) return false;
      if (cuando === "todas") return true;
      if (cuando === "semana") return new Date(r.solicitada_en).getTime() >= desde;
      return fechaBogota(r.solicitada_en) === hoy || POR_GESTIONAR.includes(r.estado);
    })
    .sort((a, b) => ORDEN[a.r.estado] - ORDEN[b.r.estado] || b.r.solicitada_en.localeCompare(a.r.solicitada_en))
    .slice(0, 100);
  const origen = await origenActual();

  return (
    <>
      <NavegacionAdmin actual="/admin/reservas" />
      <form action="/admin/reservas" className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-card p-4 shadow-card" aria-label="Filtros">
        <label className="sr-only" htmlFor="filtro-negocio">
          Negocio
        </label>
        <select id="filtro-negocio" name="n" defaultValue={elegido?.slug ?? ""} className={`${selector} col-span-2`}>
          <option value="">Todos los negocios</option>
          {negocios.map((x) => (
            <option key={x.id} value={x.slug}>
              {x.nombre}
              {x.es_prueba ? " (prueba)" : ""}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filtro-estado">
          Estado
        </label>
        <select id="filtro-estado" name="estado" defaultValue={estado} className={selector}>
          {ESTADOS.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filtro-cuando">
          Fecha
        </label>
        <select id="filtro-cuando" name="cuando" defaultValue={cuando} className={selector}>
          {CUANDO.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        <button className="col-span-2 rounded-full bg-primary py-2.5 font-bold text-primary-foreground">Filtrar</button>
      </form>

      {reservas.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-muted-foreground shadow-card">No hay reservas con estos filtros.</p>
      ) : (
        <ul className="space-y-4">
          {reservas.map(({ r, negocio }) => {
            const whatsapp = enlaceWhatsApp(negocio.telefono_whatsapp, textoAviso(r, negocio, origen));
            return (
              <TarjetaReserva key={`${r.id}-${r.estado}`} r={r} ahora={ahora} negocio={negocio.nombre}>
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 rounded-full border border-primary px-4 py-3 font-display font-bold text-primary"
                  >
                    <MessageCircle className="size-4" aria-hidden /> Avisar por WhatsApp
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Este negocio no tiene WhatsApp registrado.</p>
                )}
              </TarjetaReserva>
            );
          })}
        </ul>
      )}
    </>
  );
}
