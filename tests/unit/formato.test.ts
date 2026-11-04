import { describe, expect, it } from "vitest";
import { formatCOP, formatHora } from "@/lib/formato";

describe("formatCOP", () => {
  it("muestra pesos sin decimales y con punto de miles", () => {
    expect(formatCOP(12000)).toBe("$ 12.000");
  });
});

describe("formatHora", () => {
  it("muestra la hora de Colombia en 24 h", () => {
    // 22:30 UTC = 17:30 en Bogotá (UTC−5).
    expect(formatHora("2026-11-06T22:30:00Z")).toBe("17:30");
  });
});
