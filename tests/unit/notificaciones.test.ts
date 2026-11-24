import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { sendMail, createTransport, avisarOfertasPendientes } = vi.hoisted(() => {
  const sendMail = vi.fn(async () => ({ messageId: "prueba" }));
  return {
    sendMail,
    createTransport: vi.fn(() => ({ sendMail })),
    avisarOfertasPendientes: vi.fn(async () => ({ ofertas: 1, enviados: 3 })),
  };
});
vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("@/lib/avisos-interesados", () => ({ avisarOfertasPendientes }));

import { NextRequest } from "next/server";
import { GET as rutaCron } from "@/app/api/cron/interesados/route";
import { nombreVisible } from "@/lib/avisos-negocio";
import { enviarCorreo } from "@/lib/correo";
import { correoNegocio, type DatosCorreoNegocio } from "@/lib/correo-negocio";
import { correoInteresado, destinatarios, esquemaInteresado, topePorOferta, type InteresadoCandidato } from "@/lib/interesados";
import { CENTRO_POPAYAN } from "@/lib/ofertas";
import { enlaceWhatsApp, mensajePedidoWhatsApp } from "@/lib/texto";
import { configWhatsApp, cuerpoNuevaReserva, enviarNuevaReservaWhatsApp } from "@/lib/whatsapp";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("mensaje de WhatsApp del comprador", () => {
  const base = { titulo: "Café con pandebono x2", cantidad: 2, comprador: "Laura", ventana: "Recoge de 17:00 a 19:00" };

  it("con código cuando el negocio ya confirmó", () => {
    const m = mensajePedidoWhatsApp({ ...base, codigo: "K7Q4MZ" });
    expect(m).toContain("2 × Café con pandebono x2");
    expect(m).toContain("A nombre de: Laura");
    expect(m).toContain("Recoge de 17:00 a 19:00");
    expect(m).toContain("Código: K7Q4MZ");
  });

  it("«pendiente de confirmar» mientras espera", () => {
    const m = mensajePedidoWhatsApp({ ...base, codigo: null });
    expect(m).toContain("Código: pendiente de confirmar");
    expect(m).toContain("¿Me la confirmas en Salvori");
  });

  it("enlace wa.me con el texto codificado; sin WhatsApp válido no hay enlace", () => {
    const m = mensajePedidoWhatsApp({ ...base, codigo: null });
    const url = enlaceWhatsApp("300 123 4567", m);
    expect(url).toMatch(/^https:\/\/wa\.me\/573001234567\?text=/);
    expect(decodeURIComponent(url!.split("text=")[1])).toBe(m);
    expect(enlaceWhatsApp("123", m)).toBeNull();
    expect(enlaceWhatsApp(null, m)).toBeNull();
  });
});

describe("correo al negocio", () => {
  const base: DatosCorreoNegocio = {
    tipo: "nueva",
    negocio: "Panadería El Morro",
    slug: "el-morro",
    titulo: "Combo <bono>",
    cantidad: 2,
    precioUnitario: 6000,
    comprador: "Laura",
    observaciones: "Llego 10 min tarde",
    recogidaDesde: "2026-11-23T22:00:00Z",
    recogidaHasta: "2026-11-24T00:00:00Z",
    sitio: "https://salvori.example",
  };

  it("reserva nueva: pedido, nombre, ventana, total y enlace a la bandeja", () => {
    const c = correoNegocio(base);
    expect(c.asunto).toBe("Nueva reserva en Panadería El Morro: 2 × Combo <bono>");
    expect(c.texto).toContain("A nombre de: Laura");
    expect(c.texto).toContain("Recoge de 17:00 a 19:00. Total: $ 12.000");
    expect(c.texto).toContain("Observaciones: Llego 10 min tarde");
    expect(c.texto).toContain("https://salvori.example/negocio?n=el-morro");
    expect(c.html).toContain("Combo &lt;bono&gt;");
    expect(c.html).not.toContain("<bono>");
  });

  it("cancelada: avisa que el cupo volvió", () => {
    const c = correoNegocio({ ...base, tipo: "cancelada", observaciones: null });
    expect(c.asunto).toBe("Laura canceló su reserva en Panadería El Morro");
    expect(c.texto).toContain("El cupo volvió a tu oferta.");
  });

  it("del comprador solo usa el nombre del perfil, nunca el correo", () => {
    expect(nombreVisible({ nombre: " Laura " })).toBe("Laura");
    expect(nombreVisible({ full_name: "Ana Ruiz" })).toBe("Ana Ruiz");
    expect(nombreVisible({ email: "laura@correo.com" })).toBe("Comprador");
    expect(nombreVisible(null)).toBe("Comprador");
  });
});

describe("WhatsApp Cloud (apagado por defecto)", () => {
  const datos = {
    telefono: "3001234567",
    negocio: "Panadería El Morro",
    pedido: "2 × Combo",
    comprador: "Laura",
    ventana: "Recoge de 17:00 a 19:00",
    enlace: "https://salvori.example/negocio?n=el-morro",
  };
  const ENV = { WHATSAPP_TOKEN: "token-de-prueba", WHATSAPP_PHONE_ID: "123456", WHATSAPP_PLANTILLA: "nueva_reserva" };

  it("sin las tres variables no hace nada", async () => {
    const pedir = vi.fn();
    expect(configWhatsApp({ ...ENV, WHATSAPP_TOKEN: "" })).toBeNull();
    await expect(enviarNuevaReservaWhatsApp(datos, {}, pedir)).resolves.toEqual({ enviado: false, motivo: "apagado" });
    expect(pedir).not.toHaveBeenCalled();
  });

  it("sin teléfono válido no llama a Meta", async () => {
    const pedir = vi.fn();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(enviarNuevaReservaWhatsApp({ ...datos, telefono: "12" }, ENV, pedir)).resolves.toEqual({ enviado: false, motivo: "sin-telefono" });
    expect(pedir).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("envía la plantilla con las 5 variables al número normalizado", async () => {
    const pedir = vi.fn(async () => new Response("{}", { status: 200 }));
    await expect(enviarNuevaReservaWhatsApp(datos, ENV, pedir as unknown as typeof fetch)).resolves.toEqual({ enviado: true });
    const [url, init] = pedir.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/123456/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-de-prueba");
    const cuerpo = JSON.parse(String(init.body));
    expect(cuerpo.to).toBe("573001234567");
    expect(cuerpo.template).toMatchObject({ name: "nueva_reserva", language: { code: "es" } });
    expect(cuerpo.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      "Panadería El Morro",
      "2 × Combo",
      "Laura",
      "Recoge de 17:00 a 19:00",
      "https://salvori.example/negocio?n=el-morro",
    ]);
  });

  it("limpia saltos de línea de las variables (Meta los rechaza)", () => {
    const c = cuerpoNuevaReserva("57300", "nueva_reserva", "es", { ...datos, comprador: "Laura\n\nRuiz" });
    expect(c.template.components[0].parameters[2].text).toBe("Laura Ruiz");
  });

  it("si Meta responde error, lo registra y no lanza", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const pedir = vi.fn(async () => new Response("mal", { status: 400 }));
    await expect(enviarNuevaReservaWhatsApp(datos, ENV, pedir as unknown as typeof fetch)).resolves.toEqual({ enviado: false, motivo: "error" });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("interesados", () => {
  const ahora = Date.parse("2026-11-23T20:00:00Z");
  const cerca = { lat: 2.4419, lng: -76.6063 }; // centro
  const a = (id: string, km: number, radio: number, ultimo: string | null = null): InteresadoCandidato => ({
    id,
    correo: `${id}@ejemplo.com`,
    lat: cerca.lat + km / 111.2, // ~1 km por cada 1/111,2 grados de latitud
    lng: cerca.lng,
    radio_km: radio,
    token_baja: `token-${id}`,
    ultimo_envio: ultimo,
  });

  it("solo dentro del radio, sin aviso en 6 horas, los más cercanos primero y hasta el tope", () => {
    const lista = [
      a("lejos", 3, 2),
      a("cinco", 3, 5),
      a("uno", 0.5, 1),
      a("reciente", 0.2, 5, "2026-11-23T16:00:00Z"), // hace 4 h
      a("antiguo", 0.8, 2, "2026-11-23T13:00:00Z"), // hace 7 h
    ];
    expect(destinatarios(CENTRO_POPAYAN, lista, ahora, 50).map((d) => d.id)).toEqual(["uno", "antiguo", "cinco"]);
    expect(destinatarios(CENTRO_POPAYAN, lista, ahora, 2).map((d) => d.id)).toEqual(["uno", "antiguo"]);
    expect(destinatarios(CENTRO_POPAYAN, lista, ahora, 0)).toEqual([]);
  });

  it("tope configurable con 50 por defecto", () => {
    expect(topePorOferta({})).toBe(50);
    expect(topePorOferta({ INTERESADOS_TOPE_POR_OFERTA: "20" })).toBe(20);
    expect(topePorOferta({ INTERESADOS_TOPE_POR_OFERTA: "muchos" })).toBe(50);
  });

  it("el formulario exige correo, autorización, ubicación y radio de 1, 2 o 5 km", () => {
    const ok = { correo: " Ana@Correo.com ", autoriza: "on", lat: "2.44", lng: "-76.6", origen: "mapa", radio: "2" };
    const d = esquemaInteresado.safeParse(ok);
    expect(d.success && d.data.correo).toBe("ana@correo.com");
    expect(esquemaInteresado.safeParse({ ...ok, autoriza: undefined }).error?.issues[0].message).toMatch(/autorizar el tratamiento/);
    expect(esquemaInteresado.safeParse({ ...ok, radio: "3" }).success).toBe(false);
    expect(esquemaInteresado.safeParse({ ...ok, origen: "otro" }).success).toBe(false);
    expect(esquemaInteresado.safeParse({ ...ok, correo: "no-es-correo" }).success).toBe(false);
  });

  it("el correo trae el combo, la distancia y el enlace de baja con el token", () => {
    const c = correoInteresado({
      ofertaId: "o1",
      titulo: "Combo almuerzo",
      negocio: "La Segunda",
      precioFinal: 12000,
      precioHabitual: 15000,
      cupos: 3,
      recogidaDesde: "2026-11-23T17:00:00Z",
      recogidaHasta: "2026-11-23T19:00:00Z",
      km: 0.42,
      token: "abc-123",
      sitio: "https://salvori.example",
    });
    expect(c.asunto).toBe("Combo cerca: Combo almuerzo en La Segunda (a 400 m)");
    expect(c.baja).toBe("https://salvori.example/baja?t=abc-123");
    expect(c.texto).toContain("Ahorras $ 3.000");
    expect(c.texto).toContain("https://salvori.example/baja?t=abc-123");
    expect(c.html).toContain("Dejar de recibir avisos");
    expect(c.html).toContain("/oferta/o1?utm_source=salvori");
  });

  it("el envío lleva la cabecera List-Unsubscribe", async () => {
    const SMTP = { SMTP_HOST: "smtp.ejemplo.test", SMTP_PORT: "465", SMTP_USER: "u", SMTP_PASS: "p", SMTP_FROM: "Salvori <hola@ejemplo.com>" };
    await enviarCorreo({ para: "ana@ejemplo.com", asunto: "A", texto: "T", html: "<p>T</p>", cabeceras: { "List-Unsubscribe": "<https://x/baja?t=1>" } }, SMTP);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ headers: { "List-Unsubscribe": "<https://x/baja?t=1>" } }));
  });
});

describe("ruta del cron de interesados", () => {
  const pedir = (auth?: string) =>
    new NextRequest("https://salvori.example/api/cron/interesados", auth ? { headers: { authorization: auth } } : {});

  it("sin CRON_SECRET está apagada", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await rutaCron(pedir("Bearer algo"))).status).toBe(503);
    expect(avisarOfertasPendientes).not.toHaveBeenCalled();
    aviso.mockRestore();
  });

  it("rechaza sin el secreto correcto", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-largo");
    expect((await rutaCron(pedir())).status).toBe(401);
    expect((await rutaCron(pedir("Bearer otro"))).status).toBe(401);
    expect(avisarOfertasPendientes).not.toHaveBeenCalled();
  });

  it("con el secreto avisa las ofertas pendientes", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-largo");
    const r = await rutaCron(pedir("Bearer secreto-largo"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ofertas: 1, enviados: 3 });
    expect(avisarOfertasPendientes).toHaveBeenCalledWith("https://salvori.example");
  });
});
