import { esc, p, plantilla } from "./correo-reserva";
import { formatCOP, formatHora } from "./formato";

// Correo a los miembros del negocio cuando llega una reserva o el comprador la cancela.
// Del comprador solo va su nombre y sus observaciones: nunca su correo ni su teléfono.
export type DatosCorreoNegocio = {
  tipo: "nueva" | "cancelada";
  negocio: string;
  /** slug del negocio, para abrir su bandeja (/negocio?n=slug). */
  slug: string;
  titulo: string;
  cantidad: number;
  precioUnitario: number;
  comprador: string;
  observaciones: string | null;
  recogidaDesde: string;
  recogidaHasta: string;
  /** Origen del sitio, sin barra final. */
  sitio: string;
};

export function correoNegocio(d: DatosCorreoNegocio): { asunto: string; texto: string; html: string } {
  const pedido = `${d.cantidad} × ${d.titulo}`;
  const total = formatCOP(d.precioUnitario * d.cantidad);
  const ventana = `de ${formatHora(d.recogidaDesde)} a ${formatHora(d.recogidaHasta)}`;
  const bandeja = `${d.sitio}/negocio?n=${encodeURIComponent(d.slug)}`;
  const obs = d.observaciones?.trim();

  if (d.tipo === "nueva") {
    return {
      asunto: `Nueva reserva en ${d.negocio}: ${pedido}`,
      texto: [
        `¡Tienes una reserva nueva en Salvori!`,
        ``,
        pedido,
        `A nombre de: ${d.comprador}`,
        `Recoge ${ventana}. Total: ${total}, se paga en el local.`,
        obs ? `Observaciones: ${obs}` : ``,
        ``,
        `Confírmala para que el comprador vaya: ${bandeja}`,
        ``,
        `Salvori · Lo bueno se aprovecha.`,
      ]
        .filter((l, i, a) => l !== `` || a[i - 1] !== ``)
        .join("\n"),
      html: plantilla(
        "¡Tienes una reserva nueva!",
        [
          p(`<strong>${esc(pedido)}</strong>`),
          p(`A nombre de <strong>${esc(d.comprador)}</strong>.`),
          p(`Recoge <strong>${ventana}</strong>. Total: <strong>${total}</strong>, se paga en el local.`),
          obs ? p(`Observaciones: ${esc(obs)}`) : "",
          p(`El comprador solo sale cuando la confirmas.`),
        ].join("\n"),
        { texto: "Confirmar la reserva", url: bandeja },
      ),
    };
  }

  return {
    asunto: `${d.comprador} canceló su reserva en ${d.negocio}`,
    texto: [
      `${d.comprador} canceló su reserva.`,
      ``,
      pedido,
      `El cupo volvió a tu oferta.`,
      ``,
      `Tu bandeja: ${bandeja}`,
      ``,
      `Salvori · Lo bueno se aprovecha.`,
    ].join("\n"),
    html: plantilla(
      `${esc(d.comprador)} canceló su reserva`,
      [p(`<strong>${esc(pedido)}</strong>`), p(`El cupo volvió a tu oferta.`)].join("\n"),
      { texto: "Ver mi bandeja", url: bandeja },
    ),
  };
}
