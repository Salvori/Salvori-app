import { describe, expect, it } from "vitest";
import { mensajePlan, resumenPlan, TEXTO_PLANES_FIJO, textoOfertasActivas, textoPlanes } from "@/lib/planes";

const DIA = 24 * 60 * 60 * 1000;
const ahora = Date.parse("2026-11-23T17:00:00Z"); // 12:00 en Popayán
const en = (dias: number) => new Date(ahora + dias * DIA).toISOString();
const plan = (estado: "prueba" | "activa" | "vencida" | "suspendida", dias: number) => ({ estado, vence_en: en(dias), bloquea_en: en(dias + 3) });

describe("resumenPlan", () => {
  it("prueba con días de sobra: sin aviso", () => {
    expect(resumenPlan(plan("prueba", 15), ahora)).toEqual({ linea: "Prueba gratis: te quedan 15 días", aviso: null, puedePublicar: true });
  });

  it("avisa cuando faltan 3 días o menos", () => {
    const r = resumenPlan(plan("prueba", 3), ahora);
    expect(r.aviso).toMatch(/Tu prueba termina el 26 de nov\. Para seguir publicando, paga la mensualidad/);
    expect(resumenPlan(plan("prueba", 1), ahora).linea).toBe("Prueba gratis: te queda 1 día");
    expect(resumenPlan(plan("activa", 2), ahora).aviso).toMatch(/Tu plan vence el 25 de nov/);
    expect(resumenPlan(plan("activa", 20), ahora)).toMatchObject({ linea: "Vigente hasta el 13 de dic", aviso: null });
  });

  it("vencida en gracia todavía publica; pasada la gracia, no", () => {
    expect(resumenPlan(plan("vencida", -1), ahora)).toMatchObject({ linea: "Venció el 22 de nov", puedePublicar: true });
    expect(resumenPlan(plan("vencida", -1), ahora).aviso).toMatch(/Puedes publicar hasta el 25 de nov/);
    expect(resumenPlan(plan("vencida", -4), ahora)).toMatchObject({ puedePublicar: false });
    expect(resumenPlan(plan("vencida", -4), ahora).aviso).toMatch(/Ya no puedes publicar/);
  });

  it("suspendida o sin plan no publica", () => {
    expect(resumenPlan(plan("suspendida", 10), ahora)).toMatchObject({ linea: "Cuenta suspendida", puedePublicar: false });
    expect(resumenPlan({ estado: null, vence_en: null, bloquea_en: null }, ahora).puedePublicar).toBe(false);
  });
});

describe("textos", () => {
  it("ofertas activas con y sin límite", () => {
    expect(textoOfertasActivas(3, 5)).toBe("3 de 5 ofertas activas");
    expect(textoOfertasActivas(1, null)).toBe("1 oferta activa · sin límite");
  });

  it("línea de la portada desde la base, o el texto fijo", () => {
    expect(
      textoPlanes([
        { precio_mensual: 0, dias_prueba: 15 },
        { precio_mensual: 50000, dias_prueba: null },
        { precio_mensual: 90000, dias_prueba: null },
      ]),
    ).toBe("15 días gratis. Después, desde $ 50.000 al mes.");
    expect(textoPlanes([])).toBe(TEXTO_PLANES_FIJO);
    expect(textoPlanes([{ precio_mensual: 0, dias_prueba: 15 }])).toBe(TEXTO_PLANES_FIJO);
  });

  it("solo traduce los errores del plan", () => {
    expect(mensajePlan({ message: "Llegaste al límite de tu plan Básico", hint: "plan_salvori" })).toBe("Llegaste al límite de tu plan Básico");
    expect(mensajePlan({ message: "otro error" })).toBeNull();
    expect(mensajePlan(null)).toBeNull();
  });
});
