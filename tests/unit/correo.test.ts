import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn(async () => ({ messageId: "prueba" }));
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock("nodemailer", () => ({ default: { createTransport } }));

import { configSmtp, enviarCorreo } from "@/lib/correo";
import { correoReserva, type DatosCorreoReserva } from "@/lib/correo-reserva";

const SMTP = { SMTP_HOST: "smtp.ejemplo.test", SMTP_PORT: "465", SMTP_USER: "usuario", SMTP_PASS: "clave-de-prueba", SMTP_FROM: "Salvori <hola@ejemplo.com>" };
const correo = { para: "ana@ejemplo.com", asunto: "Asunto", texto: "Texto", html: "<p>Texto</p>" };

const base: DatosCorreoReserva = {
  estado: "confirmada",
  titulo: "Combo 6 panes <de bono>",
  cantidad: 2,
  precioUnitario: 6000,
  negocio: "Panadería El Morro",
  direccion: "Barrio El Morro",
  recogidaDesde: "2026-11-16T22:00:00Z",
  recogidaHasta: "2026-11-17T00:00:00Z",
  codigo: "AB12CD",
  motivo: null,
  sitio: "https://salvori.example",
};

afterEach(() => vi.clearAllMocks());

describe("correo de la reserva", () => {
  it("confirmada: código, ventana, total y pago en el local", () => {
    const c = correoReserva(base);
    expect(c.asunto).toBe("Reserva confirmada en Panadería El Morro: ya puedes ir");
    expect(c.texto).toContain("Tu código de recogida: AB12CD");
    expect(c.texto).toContain("Recoge de 17:00 a 19:00 en Panadería El Morro (Barrio El Morro).");
    expect(c.texto).toContain("Total: $ 12.000. Se paga en el local al recoger");
    expect(c.texto).toContain("https://salvori.example/mis-reservas");
    expect(c.html).toContain("AB12CD");
    expect(c.html).toContain("Se paga en el local al recoger");
    expect(c.html).toContain("Combo 6 panes &lt;de bono&gt;");
    expect(c.html).not.toContain("<de bono>");
  });

  it("rechazada: motivo y sin cobro", () => {
    const c = correoReserva({ ...base, estado: "rechazada", codigo: null, motivo: "Se acabó el producto" });
    expect(c.asunto).toBe("Panadería El Morro no pudo atender tu reserva");
    expect(c.texto).toContain("Motivo: Se acabó el producto");
    expect(c.texto).toContain("No tienes que pagar nada");
    expect(c.html).toContain("Ver otras ofertas");
    expect(c.html).not.toContain("AB12CD");
  });
});

describe("envío por SMTP", () => {
  it("sin variables: avisa en el registro y no rompe", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(configSmtp({})).toBeNull();
    expect(configSmtp({ ...SMTP, SMTP_PASS: "" })).toBeNull();
    await expect(enviarCorreo(correo, {})).resolves.toEqual({ enviado: false, motivo: "sin-configurar" });
    expect(aviso).toHaveBeenCalledOnce();
    expect(createTransport).not.toHaveBeenCalled();
    aviso.mockRestore();
  });

  it("con variables: envía con los datos del entorno", async () => {
    await expect(enviarCorreo(correo, SMTP)).resolves.toEqual({ enviado: true });
    expect(createTransport).toHaveBeenCalledWith({ host: "smtp.ejemplo.test", port: 465, secure: true, auth: { user: "usuario", pass: "clave-de-prueba" } });
    expect(sendMail).toHaveBeenCalledWith({ from: SMTP.SMTP_FROM, to: "ana@ejemplo.com", subject: "Asunto", text: "Texto", html: "<p>Texto</p>" });
    expect(configSmtp({ ...SMTP, SMTP_PORT: "587" })?.secure).toBe(false);
  });

  it("si el servidor falla, lo registra y no lanza", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMail.mockRejectedValueOnce(new Error("conexión rechazada"));
    await expect(enviarCorreo(correo, SMTP)).resolves.toEqual({ enviado: false, motivo: "error" });
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("no escribe a los usuarios de prueba", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(enviarCorreo({ ...correo, para: "comprador.prueba@salvori.test" }, SMTP)).resolves.toEqual({ enviado: false, motivo: "destinatario-de-prueba" });
    expect(sendMail).not.toHaveBeenCalled();
    info.mockRestore();
  });
});
