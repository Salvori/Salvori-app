import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { esquemaOferta, etiquetaFormato, ventanaDeHoy } from "@/lib/esquema-oferta";
import { minutosAPie, textoDescuento, textoDistancia } from "@/lib/ofertas";

const base = {
  negocioId: "5a1a0000-0000-4000-8000-000000000001",
  slug: "la-fonda",
  foto: "5a1a0000-0000-4000-8000-000000000001/a.webp",
  titulo: "Combo almuerzo",
  contenido: "Sopa, seco y jugo natural",
  categoria: "almuerzo",
  precioHabitual: "18000",
  precioFinal: "12000",
  cupos: "5",
  desde: "11:30",
  hasta: "14:00",
};

describe("validación de la oferta (publicar y editar)", () => {
  it("acepta un combo y deja «combo» por defecto", () => {
    const d = esquemaOferta.parse(base);
    expect(d.formato).toBe("combo");
    expect(d.precioFinal).toBe(12000);
  });

  it("rechaza precio final mayor o igual al habitual y etiquetas desconocidas", () => {
    expect(esquemaOferta.safeParse({ ...base, precioFinal: "18000" }).error?.issues[0]?.message).toBe("El precio final debe ser menor que el habitual.");
    expect(esquemaOferta.safeParse({ ...base, formato: "lote" }).success).toBe(false);
    expect(esquemaOferta.parse({ ...base, formato: "promocion" }).formato).toBe("promocion");
  });

  it("arma la ventana de hoy en hora de Colombia y cruza la medianoche", () => {
    const ahora = new Date("2026-11-18T15:00:00Z"); // 10:00 en Bogotá
    expect(ventanaDeHoy("11:30", "14:00", ahora)).toEqual({ desde: "2026-11-18T16:30:00.000Z", hasta: "2026-11-18T19:00:00.000Z" });
    expect(ventanaDeHoy("22:00", "01:00", ahora)).toEqual({ desde: "2026-11-19T03:00:00.000Z", hasta: "2026-11-19T06:00:00.000Z" });
    expect(ventanaDeHoy("08:00", "09:00", ahora)).toEqual({ error: "La hora de fin ya pasó. Elige una ventana de recogida futura." });
  });
});

describe("tarjeta", () => {
  it("muestra el descuento como «−33 %» y la etiqueta", () => {
    expect(textoDescuento(12000, 18000)).toBe("−33 %");
    expect(etiquetaFormato("promocion")).toBe("Promoción");
    expect(etiquetaFormato("combo")).toBe("Combo");
    expect(etiquetaFormato(undefined)).toBe("Combo");
  });

  it("calcula el tiempo a pie en línea recta", () => {
    expect(minutosAPie(0.05)).toBe(1);
    expect(minutosAPie(0.75)).toBe(10);
    expect(textoDistancia(0.43)).toBe("450 m · 6 min a pie");
    expect(textoDistancia(2.34)).toBe("2,3 km · 31 min a pie");
  });
});

describe("geocodificación con Nominatim", () => {
  const fetchFalso = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchFalso);
    vi.stubEnv("SALVORI_GEOCODIFICADOR", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://salvori.example");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchFalso.mockReset();
  });

  const responde = (lista: unknown[]) => fetchFalso.mockResolvedValueOnce({ ok: true, json: async () => lista });

  it("busca acotado a Popayán con un User-Agent de la app y guarda en caché", async () => {
    const { geocodificar } = await import("@/lib/geocodificar");
    responde([{ lat: "2.4419", lon: "-76.6063", display_name: "Parque Caldas, Popayán" }]);
    const r = await geocodificar("  Parque   Caldas ");
    expect(r).toEqual({ punto: { lat: 2.4419, lng: -76.6063 }, etiqueta: "Parque Caldas, Popayán" });

    const [url, opciones] = fetchFalso.mock.calls[0];
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(u.searchParams.get("q")).toBe("Parque Caldas, Popayán, Cauca, Colombia");
    expect(u.searchParams.get("bounded")).toBe("1");
    expect(u.searchParams.get("countrycodes")).toBe("co");
    expect(u.searchParams.get("viewbox")).toBe("-76.68,2.52,-76.53,2.38");
    expect(opciones.headers["User-Agent"]).toBe("Salvori/0.1 (ofertas de comida en Popayan; https://salvori.example)");

    await geocodificar("parque caldas");
    expect(fetchFalso).toHaveBeenCalledTimes(1); // segunda vez, de la caché
  });

  it("espera al menos 1 s entre peticiones", async () => {
    const { geocodificar } = await import("@/lib/geocodificar");
    responde([]);
    responde([]);
    const inicio = Date.now();
    await Promise.all([geocodificar("calle 1"), geocodificar("calle 2")]);
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(1000);
  });

  it("descarta resultados fuera de Popayán, errores y la opción desactivada", async () => {
    const { geocodificar } = await import("@/lib/geocodificar");
    responde([{ lat: "4.711", lon: "-74.072", display_name: "Bogotá" }]);
    expect(await geocodificar("calle 26")).toEqual({ error: "sin-resultado" });
    responde([]);
    expect(await geocodificar("no existe")).toEqual({ error: "sin-resultado" });
    fetchFalso.mockRejectedValueOnce(new Error("sin red"));
    expect(await geocodificar("cra 9")).toEqual({ error: "no-disponible" });

    vi.stubEnv("SALVORI_GEOCODIFICADOR", "desactivado");
    expect(await geocodificar("cra 10")).toEqual({ error: "no-disponible" });
    expect(fetchFalso).toHaveBeenCalledTimes(3);
  });
});
