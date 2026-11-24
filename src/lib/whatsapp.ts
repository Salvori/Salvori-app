import "server-only";
import { telefonoWhatsApp } from "@/lib/texto";

// Avisos automáticos por la API de WhatsApp Cloud de Meta. APAGADO hasta que existan
// WHATSAPP_TOKEN, WHATSAPP_PHONE_ID y WHATSAPP_PLANTILLA (ver docs/WHATSAPP.md).

type Entorno = Record<string, string | undefined>;

export type DatosNuevaReserva = {
  /** Teléfono del negocio tal como está guardado (se normaliza a 57…). */
  telefono: string | null | undefined;
  negocio: string;
  pedido: string;
  comprador: string;
  ventana: string;
  enlace: string;
};

export type ResultadoWhatsApp =
  | { enviado: true }
  | { enviado: false; motivo: "apagado" | "sin-telefono" | "error" };

const VERSION_API = "v21.0";

export function configWhatsApp(env: Entorno = process.env) {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_PLANTILLA, WHATSAPP_IDIOMA } = env;
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID || !WHATSAPP_PLANTILLA) return null;
  return { token: WHATSAPP_TOKEN, phoneId: WHATSAPP_PHONE_ID, plantilla: WHATSAPP_PLANTILLA, idioma: WHATSAPP_IDIOMA || "es" };
}

/** Cuerpo de la petición: plantilla «nueva_reserva» con 5 variables en el cuerpo (ver docs/WHATSAPP.md). */
export function cuerpoNuevaReserva(numero: string, plantilla: string, idioma: string, d: DatosNuevaReserva) {
  // Meta rechaza saltos de línea, tabulaciones y más de 4 espacios seguidos en las variables.
  const limpio = (t: string) => t.replace(/[\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 200);
  return {
    messaging_product: "whatsapp",
    to: numero,
    type: "template",
    template: {
      name: plantilla,
      language: { code: idioma },
      components: [
        {
          type: "body",
          parameters: [d.negocio, d.pedido, d.comprador, d.ventana, d.enlace].map((t) => ({ type: "text", text: limpio(t) })),
        },
      ],
    },
  };
}

/** Envía la plantilla al WhatsApp del negocio. Nunca lanza. */
export async function enviarNuevaReservaWhatsApp(
  d: DatosNuevaReserva,
  env: Entorno = process.env,
  pedir: typeof fetch = fetch,
): Promise<ResultadoWhatsApp> {
  const config = configWhatsApp(env);
  if (!config) return { enviado: false, motivo: "apagado" };
  const numero = telefonoWhatsApp(d.telefono);
  if (!numero) {
    console.info(`[whatsapp] Sin enviar: ${d.negocio} no tiene un WhatsApp válido.`);
    return { enviado: false, motivo: "sin-telefono" };
  }
  try {
    const r = await pedir(`https://graph.facebook.com/${VERSION_API}/${config.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpoNuevaReserva(numero, config.plantilla, config.idioma, d)),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      console.error(`[whatsapp] Meta respondió ${r.status}:`, (await r.text().catch(() => "")).slice(0, 300));
      return { enviado: false, motivo: "error" };
    }
    return { enviado: true };
  } catch (e) {
    console.error("[whatsapp] No se pudo enviar:", e instanceof Error ? e.message : e);
    return { enviado: false, motivo: "error" };
  }
}
