import { formatCOP, formatHora } from "./formato";

// Correos al comprador cuando el negocio confirma o rechaza su reserva.
export type DatosCorreoReserva = {
  estado: "confirmada" | "rechazada";
  titulo: string;
  cantidad: number;
  precioUnitario: number;
  negocio: string;
  direccion: string;
  recogidaDesde: string;
  recogidaHasta: string;
  codigo: string | null;
  motivo: string | null;
  /** Origen del sitio, sin barra final (https://…). */
  sitio: string;
};

const BOSQUE = "#174C3C";
const MANDARINA = "#F57A35";
const CREMA = "#F8F5EA";
const CARBON = "#242824";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function plantilla(titular: string, cuerpo: string, boton: { texto: string; url: string }): string {
  return `<!doctype html>
<html lang="es-CO">
<body style="margin:0;padding:0;background:${CREMA};font-family:'Source Sans 3',Arial,Helvetica,sans-serif;color:${CARBON};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:${BOSQUE};padding:20px 24px;">
<span style="font-family:Manrope,Arial,Helvetica,sans-serif;font-size:24px;font-weight:800;color:${CREMA};">Salvori</span>
</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 12px;font-family:Manrope,Arial,Helvetica,sans-serif;font-size:22px;line-height:1.25;color:${BOSQUE};">${titular}</h1>
${cuerpo}
<p style="margin:24px 0 0;"><a href="${esc(boton.url)}" style="display:inline-block;background:${MANDARINA};color:${CARBON};font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px;">${esc(boton.texto)}</a></p>
</td></tr>
<tr><td style="padding:16px 24px;background:${CREMA};font-size:13px;color:#5b615b;">Salvori · Lo bueno se aprovecha. Popayán, Colombia.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const p = (html: string) => `<p style="margin:0 0 10px;font-size:16px;line-height:1.5;">${html}</p>`;

export function correoReserva(d: DatosCorreoReserva): { asunto: string; texto: string; html: string } {
  const pedido = `${d.cantidad} × ${d.titulo}`;
  const total = formatCOP(d.precioUnitario * d.cantidad);
  const ventana = `de ${formatHora(d.recogidaDesde)} a ${formatHora(d.recogidaHasta)}`;

  if (d.estado === "confirmada") {
    const reservas = `${d.sitio}/mis-reservas`;
    const lugar = d.direccion ? `${d.negocio} (${d.direccion})` : d.negocio;
    return {
      asunto: `Reserva confirmada en ${d.negocio}: ya puedes ir`,
      texto: [
        `¡Tu reserva está confirmada!`,
        ``,
        `${pedido}`,
        `Recoge ${ventana} en ${lugar}.`,
        `Tu código de recogida: ${d.codigo ?? "míralo en Mis reservas"}`,
        `Total: ${total}. Se paga en el local al recoger; Salvori no cobra en línea.`,
        ``,
        `Mis reservas: ${reservas}`,
        ``,
        `Salvori · Lo bueno se aprovecha.`,
      ].join("\n"),
      html: plantilla(
        "¡Tu reserva está confirmada!",
        [
          p(`<strong>${esc(pedido)}</strong>`),
          p(`Recoge <strong>${ventana}</strong> en ${esc(lugar)}.`),
          d.codigo
            ? `<p style="margin:16px 0;padding:16px;background:${CREMA};border-radius:12px;text-align:center;"><span style="display:block;font-size:13px;color:#5b615b;">Tu código de recogida</span><span style="font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:${BOSQUE};">${esc(d.codigo)}</span></p>`
            : "",
          p(`Total: <strong>${total}</strong>. Se paga en el local al recoger; Salvori no cobra en línea.`),
        ].join("\n"),
        { texto: "Ver mi reserva", url: reservas },
      ),
    };
  }

  const motivo = d.motivo?.trim();
  return {
    asunto: `${d.negocio} no pudo atender tu reserva`,
    texto: [
      `${d.negocio} no pudo atender tu reserva.`,
      ``,
      `${pedido}`,
      motivo ? `Motivo: ${motivo}` : ``,
      `No tienes que pagar nada: en Salvori solo se paga en el local al recoger.`,
      ``,
      `Mira otras ofertas cerca de ti: ${d.sitio}/`,
      ``,
      `Salvori · Lo bueno se aprovecha.`,
    ]
      .filter((l, i, a) => l !== `` || a[i - 1] !== ``)
      .join("\n"),
    html: plantilla(
      `${esc(d.negocio)} no pudo atender tu reserva`,
      [
        p(`<strong>${esc(pedido)}</strong>`),
        motivo ? p(`Motivo: ${esc(motivo)}`) : "",
        p(`No tienes que pagar nada: en Salvori solo se paga en el local al recoger.`),
      ].join("\n"),
      { texto: "Ver otras ofertas", url: `${d.sitio}/` },
    ),
  };
}
