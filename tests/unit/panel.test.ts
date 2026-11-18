import { describe, expect, it } from "vitest";
import { horaCorta, horaDentroDeVentana, minutosBogota, textoDias } from "@/lib/programacion";
import { enlaceWhatsApp, horarioATexto, slugify, telefonoWhatsApp, textoAHorario } from "@/lib/texto";

describe("programación de ofertas", () => {
  it("escribe los días en orden", () => {
    expect(textoDias([5, 1, 3])).toBe("lun, mié y vie");
    expect(textoDias([6])).toBe("sáb");
    expect(textoDias([1, 2, 3, 4, 5, 6, 7])).toBe("todos los días");
  });

  it("lee la hora en Colombia", () => {
    expect(minutosBogota("2026-11-16T16:30:00Z")).toBe(11 * 60 + 30);
    expect(horaCorta("11:00:00")).toBe("11:00");
  });

  it("exige publicar antes de que termine la recogida", () => {
    // Plantilla con recogida de 11:00 a 14:00 (hora de Colombia).
    const desde = "2026-11-16T16:00:00Z";
    const hasta = "2026-11-16T19:00:00Z";
    expect(horaDentroDeVentana("10:30", desde, hasta)).toBe(true);
    expect(horaDentroDeVentana("13:59", desde, hasta)).toBe(true);
    expect(horaDentroDeVentana("14:00", desde, hasta)).toBe(false);
  });
});

describe("negocios", () => {
  it("arma el slug sin tildes ni símbolos", () => {
    expect(slugify("Panadería El Morro")).toBe("panaderia-el-morro");
    expect(slugify("  Café & Ñapa #2 ")).toBe("cafe-napa-2");
    expect(slugify("¡¡!!")).toBe("");
  });

  it("convierte el horario entre texto y objeto", () => {
    const horario = textoAHorario("lun-sab: 07:00-19:00\ndom: 08:00-13:00\nlínea suelta");
    expect(horario).toEqual({ "lun-sab": "07:00-19:00", dom: "08:00-13:00" });
    expect(horarioATexto(horario)).toBe("lun-sab: 07:00-19:00\ndom: 08:00-13:00");
    expect(horarioATexto(null)).toBe("");
  });

  it("normaliza el WhatsApp colombiano", () => {
    expect(telefonoWhatsApp("300 123 4567")).toBe("573001234567");
    expect(telefonoWhatsApp("+57 300-123-4567")).toBe("573001234567");
    expect(telefonoWhatsApp("12345")).toBeNull();
    expect(telefonoWhatsApp(null)).toBeNull();
  });

  it("arma el enlace de WhatsApp con el texto codificado", () => {
    expect(enlaceWhatsApp("3001234567", "Hola, tienes una reserva: 2 × Combo")).toBe(
      "https://wa.me/573001234567?text=Hola%2C%20tienes%20una%20reserva%3A%202%20%C3%97%20Combo",
    );
    expect(enlaceWhatsApp("", "Hola")).toBeNull();
  });
});
