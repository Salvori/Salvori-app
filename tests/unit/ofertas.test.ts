import { describe, expect, it } from "vitest";
import { mensajeAmigable } from "@/lib/errores";
import {
  CENTRO_POPAYAN,
  descuento,
  distanciaKm,
  formatDistancia,
  ordenarCercanas,
  textoVentana,
} from "@/lib/ofertas";

describe("ofertas", () => {
  it("calcula distancias cortas en Popayán", () => {
    const km = distanciaKm(CENTRO_POPAYAN, { lat: 2.4448, lng: -76.6015 });
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(0.7);
  });

  it("formatea la distancia en metros o km", () => {
    expect(formatDistancia(0.43)).toBe("450 m");
    expect(formatDistancia(2.34)).toBe("2,3 km");
  });

  it("redondea el descuento", () => {
    expect(descuento(12000, 18000)).toBe(33);
  });

  it("muestra la ventana en hora de Colombia", () => {
    expect(textoVentana("2026-11-06T22:00:00Z", "2026-11-07T00:00:00Z")).toBe("Recoge de 17:00 a 19:00");
  });

  it("ordena por distancia y luego por la ventana que cierra antes", () => {
    const r = ordenarCercanas([
      { id: "c", km: 2, recogida_hasta: "2026-11-06T20:00:00Z" },
      { id: "b", km: 1, recogida_hasta: "2026-11-06T22:00:00Z" },
      { id: "a", km: 1, recogida_hasta: "2026-11-06T21:00:00Z" },
    ]);
    expect(r.map((o) => o.id)).toEqual(["a", "b", "c"]);
  });
});

describe("mensajeAmigable", () => {
  it("traduce los errores de las funciones", () => {
    expect(mensajeAmigable({ message: "No hay suficientes cupos disponibles." })).toMatch(/cupos/);
    expect(mensajeAmigable({ message: "La oferta está fuera del horario de recogida." })).toMatch(/horario/);
    expect(mensajeAmigable({ message: "otra cosa", code: "42501" })).toMatch(/permiso/);
    expect(mensajeAmigable(null)).toMatch(/Intenta de nuevo/);
  });
});
