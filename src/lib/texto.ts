/** «Panadería El Morro» → «panaderia-el-morro» (formato que exige negocios.slug). */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Horario como texto editable: una línea por tramo, «lun-sab: 11:30-15:00». */
export function horarioATexto(horario: unknown): string {
  if (!horario || typeof horario !== "object" || Array.isArray(horario)) return "";
  return Object.entries(horario as Record<string, unknown>)
    .map(([dias, horas]) => `${dias}: ${String(horas)}`)
    .join("\n");
}

export function textoAHorario(texto: string): Record<string, string> {
  const horario: Record<string, string> = {};
  for (const linea of texto.split(/\r?\n/)) {
    const corte = linea.indexOf(":");
    if (corte < 1) continue;
    const dias = linea.slice(0, corte).trim();
    const horas = linea.slice(corte + 1).trim();
    if (dias && horas) horario[dias] = horas;
  }
  return horario;
}

/** Celular colombiano o número con indicativo → solo dígitos con 57 al inicio. Null si no es válido. */
export function telefonoWhatsApp(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (/^3\d{9}$/.test(digitos)) return `57${digitos}`;
  if (digitos.length >= 11 && digitos.length <= 15) return digitos;
  return null;
}

/** Enlace wa.me con el texto ya escrito. Null si el negocio no tiene WhatsApp válido. */
export function enlaceWhatsApp(telefono: string | null | undefined, texto: string): string | null {
  const numero = telefonoWhatsApp(telefono);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;
}

export type DatosPedidoWhatsApp = {
  titulo: string;
  cantidad: number;
  comprador: string;
  /** Ventana de recogida ya en texto, p. ej. «Recoge hoy de 17:00 a 19:00». */
  ventana: string;
  codigo: string | null;
};

/** Mensaje que el comprador envía al negocio desde su WhatsApp (solo su nombre, nada más de él). */
export function mensajePedidoWhatsApp(d: DatosPedidoWhatsApp): string {
  return [
    "Hola, te escribo desde Salvori. Acabo de reservar:",
    `${d.cantidad} × ${d.titulo}`,
    `A nombre de: ${d.comprador}`,
    d.ventana,
    `Código: ${d.codigo ?? "pendiente de confirmar"}`,
    d.codigo ? "¡Nos vemos en el local!" : "¿Me la confirmas en Salvori, por favor?",
  ].join("\n");
}
