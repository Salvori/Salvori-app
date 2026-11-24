import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("server-only", () => ({}));

import { LogoNegocio } from "@/components/logo-negocio";
import { esquemaOferta, etiquetaFormato, preciosLlevaPaga } from "@/lib/esquema-oferta";
import { faltanCoordenadas, inicialNegocio, rutaLogo, textoDisponibles, textoDescuento, urlFoto } from "@/lib/ofertas";
import { origenValido, slugDeRuta } from "@/lib/origen";

const base = {
  negocioId: "5a1a0000-0000-4000-8000-000000000001",
  slug: "la-fonda",
  foto: "5a1a0000-0000-4000-8000-000000000001/a.webp",
  titulo: "Pandebonos",
  contenido: "Pandebonos medianos horneados hoy",
  categoria: "panaderia_pasteleria",
  cupos: "5",
  desde: "11:30",
  hasta: "14:00",
};

describe("formato «Lleva N, paga M»", () => {
  it("calcula los precios del paquete desde el precio por unidad", () => {
    expect(preciosLlevaPaga(3000, 3, 2)).toEqual({ precioHabitual: 9000, precioFinal: 6000 });
    const d = esquemaOferta.parse({ ...base, formato: "lleva_paga", precioUnitario: "3000", lleva: "3", paga: "2", precioHabitual: "", precioFinal: "" });
    expect(d).toMatchObject({ formato: "lleva_paga", precioHabitual: 9000, precioFinal: 6000, lleva: 3, paga: 2 });
    expect(textoDescuento(d.precioFinal, d.precioHabitual)).toBe(textoDescuento(6000, 9000));
    expect(textoDescuento(d.precioFinal, d.precioHabitual)).toMatch(/^−33/);
  });

  it("exige lleva > paga ≥ 1, lleva ≤ 20 y precio por unidad", () => {
    const lp = { ...base, formato: "lleva_paga", precioUnitario: "3000" };
    expect(esquemaOferta.safeParse({ ...lp, lleva: "2", paga: "2" }).error?.issues[0]?.message).toMatch(/menor que «lleva»/);
    expect(esquemaOferta.safeParse({ ...lp, lleva: "3", paga: "0" }).success).toBe(false);
    expect(esquemaOferta.safeParse({ ...lp, lleva: "21", paga: "2" }).success).toBe(false);
    expect(esquemaOferta.safeParse({ ...lp, precioUnitario: "", lleva: "3", paga: "2" }).error?.issues[0]?.message).toBe("Revisa el precio por unidad.");
  });

  it("en combo ignora lleva/paga y sigue pidiendo precio final < habitual", () => {
    const d = esquemaOferta.parse({ ...base, precioHabitual: "9000", precioFinal: "6000", lleva: "3", paga: "2" });
    expect(d).toMatchObject({ formato: "combo", lleva: null, paga: null, tamano: null });
    expect(esquemaOferta.safeParse({ ...base, precioHabitual: "9000", precioFinal: "9000" }).success).toBe(false);
  });

  it("muestra la insignia «Lleva 3, paga 2» y cuenta paquetes", () => {
    expect(etiquetaFormato("lleva_paga", 3, 2)).toBe("Lleva 3, paga 2");
    expect(etiquetaFormato("lleva_paga", null, null)).toBe("Combo");
    expect(textoDisponibles(3, "lleva_paga")).toBe("3 paquetes disponibles");
    expect(textoDisponibles(1, "lleva_paga")).toBe("1 paquete disponible");
  });
});

describe("tamaño y unidades disponibles", () => {
  it("guarda el tamaño recortado y lo limita a 40 caracteres", () => {
    expect(esquemaOferta.parse({ ...base, precioHabitual: "9000", precioFinal: "6000", tamano: "  500 g " }).tamano).toBe("500 g");
    expect(esquemaOferta.safeParse({ ...base, precioHabitual: "9000", precioFinal: "6000", tamano: "x".repeat(41) }).success).toBe(false);
  });

  it("habla de unidades disponibles, nunca de cupos", () => {
    expect(textoDisponibles(3)).toBe("3 unidades disponibles");
    expect(textoDisponibles(1, "combo")).toBe("1 unidad disponible");
    expect(textoDisponibles(0)).toBe("Agotada");
  });
});

describe("marca del negocio", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("arma la ruta del logo y conserva la versión en la URL pública", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    const ruta = rutaLogo("5a1a0000-0000-4000-8000-000000000001", 123);
    expect(ruta).toBe("negocios/5a1a0000-0000-4000-8000-000000000001/logo.webp?v=123");
    expect(urlFoto(ruta)).toBe("https://x.supabase.co/storage/v1/object/public/ofertas/negocios/5a1a0000-0000-4000-8000-000000000001/logo.webp?v=123");
  });

  it("sin logo muestra la inicial; con logo, la imagen", () => {
    expect(inicialNegocio("  ¡panadería El Morro")).toBe("P");
    const { unmount } = render(<LogoNegocio nombre="Café Caldas" logo={null} />);
    expect(screen.getByTestId("avatar-negocio").textContent).toBe("C");
    unmount();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    render(<LogoNegocio nombre="Café Caldas" logo="negocios/abc/logo.webp?v=1" />);
    expect(screen.getByAltText("Logo de Café Caldas").getAttribute("src")).toContain("/logo.webp?v=1");
  });

  it("detecta coordenadas sin ajustar", () => {
    expect(faltanCoordenadas({ lat: 2.4419, lng: -76.6063 })).toBe(true);
    expect(faltanCoordenadas({ lat: 0, lng: 0 })).toBe(true);
    expect(faltanCoordenadas({ lat: 2.4425, lng: -76.6065 })).toBe(false);
  });
});

describe("origen negocio:<slug>", () => {
  it("lee el slug solo en /n/<slug>", () => {
    expect(slugDeRuta("/n/panaderia-el-morro")).toBe("panaderia-el-morro");
    expect(slugDeRuta("/n/panaderia-el-morro/")).toBe("panaderia-el-morro");
    expect(slugDeRuta("/n/Malo_Slug")).toBeNull();
    expect(slugDeRuta("/negocio")).toBeNull();
    expect(slugDeRuta("/n/a/b")).toBeNull();
  });

  it("solo acepta cookies con un slug válido", () => {
    expect(origenValido("negocio:la-fonda")).toBe("negocio:la-fonda");
    expect(origenValido("negocio:<script>")).toBe("directo");
    expect(origenValido(undefined)).toBe("directo");
  });
});
