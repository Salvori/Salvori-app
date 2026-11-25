import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLAVE_CONSENTIMIENTO,
  EVENTO_CONSENTIMIENTO,
  guardarConsentimiento,
  idsMedicion,
  leerConsentimiento,
  medicionConfigurada,
} from "@/lib/consentimiento";
import { _colaPendiente, medir, medirUnaVez, parametrosEvento, vaciarCola } from "@/lib/medicion";

const GA = "G-PRUEBA123";
const PIXEL = "123456789012345";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_GA_ID", GA);
  vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", PIXEL);
  window.gtag = vi.fn();
  window.fbq = vi.fn();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  delete window.gtag;
  delete window.fbq;
});

describe("consentimiento", () => {
  it("sin elección guardada no hay consentimiento", () => {
    expect(leerConsentimiento()).toBeNull();
  });

  it("guarda la elección y avisa a la ventana", () => {
    const oyente = vi.fn();
    window.addEventListener(EVENTO_CONSENTIMIENTO, oyente);
    guardarConsentimiento("aceptado");
    expect(localStorage.getItem(CLAVE_CONSENTIMIENTO)).toBe("aceptado");
    expect(leerConsentimiento()).toBe("aceptado");
    expect(oyente).toHaveBeenCalledOnce();
    guardarConsentimiento("esencial");
    expect(leerConsentimiento()).toBe("esencial");
    window.removeEventListener(EVENTO_CONSENTIMIENTO, oyente);
  });

  it("ignora valores desconocidos y tolera un localStorage bloqueado", () => {
    localStorage.setItem(CLAVE_CONSENTIMIENTO, "quizas");
    expect(leerConsentimiento()).toBeNull();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(leerConsentimiento()).toBeNull();
    expect(() => guardarConsentimiento("aceptado")).not.toThrow();
  });

  it("sin IDs (o con IDs inválidos) la medición no está configurada", () => {
    expect(medicionConfigurada()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");
    expect(medicionConfigurada()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "UA-123");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "abc");
    expect(idsMedicion()).toEqual({ ga: null, pixel: null });
  });
});

describe("medir", () => {
  const datos = { negocio_slug: "la-segunda", oferta_id: "of-1", origen: "negocio:la-segunda", valor: 12000 };

  it("no envía nada sin consentimiento", () => {
    expect(medir("view_item", datos)).toBe(false);
    guardarConsentimiento("esencial");
    expect(medir("view_item", datos)).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("no envía nada sin IDs aunque haya consentimiento", () => {
    guardarConsentimiento("aceptado");
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");
    expect(medir("view_item", datos)).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("con consentimiento envía a GA4 y al píxel (estándar + personalizado)", () => {
    guardarConsentimiento("aceptado");
    expect(medir("reserva_entregada", { ...datos, cantidad: 2, valor: 24000 })).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "reserva_entregada",
      expect.objectContaining({ negocio_slug: "la-segunda", oferta_id: "of-1", value: 24000, currency: "COP" }),
    );
    expect(window.fbq).toHaveBeenCalledWith("track", "Purchase", expect.objectContaining({ value: 24000, currency: "COP" }));
    expect(window.fbq).toHaveBeenCalledWith("trackCustom", "reserva_entregada", expect.objectContaining({ oferta_id: "of-1" }));
  });

  it("view_item lleva items de GA4 y ViewContent en el píxel", () => {
    guardarConsentimiento("aceptado");
    medir("view_item", { ...datos, titulo: "Combo desayuno", categoria: "desayuno" });
    const [, , params] = vi.mocked(window.gtag!).mock.calls[0] as [string, string, { items: Array<Record<string, unknown>> }];
    expect(params.items[0]).toMatchObject({ item_id: "of-1", item_name: "Combo desayuno", item_brand: "la-segunda", price: 12000 });
    expect(window.fbq).toHaveBeenCalledWith("track", "ViewContent", expect.objectContaining({ content_ids: ["of-1"] }));
  });

  it("los eventos sin equivalente estándar solo van como trackCustom", () => {
    guardarConsentimiento("aceptado");
    medir("no_recogida", datos);
    expect(vi.mocked(window.fbq!).mock.calls.map((c) => c[0])).toEqual(["trackCustom"]);
  });

  it("si los scripts aún no cargan, el evento espera y sale al vaciar la cola", () => {
    guardarConsentimiento("aceptado");
    delete window.gtag;
    delete window.fbq;
    expect(medir("reserva_solicitada", datos)).toBe(true);
    expect(_colaPendiente()).toBe(1);
    window.gtag = vi.fn();
    window.fbq = vi.fn();
    vaciarCola();
    expect(_colaPendiente()).toBe(0);
    expect(window.gtag).toHaveBeenCalledWith("event", "reserva_solicitada", expect.any(Object));
    expect(window.fbq).toHaveBeenCalledWith("track", "Lead", expect.any(Object));
  });

  it("medirUnaVez no duplica el evento en la misma pestaña", () => {
    guardarConsentimiento("aceptado");
    expect(medirUnaVez("solicitada:r1", "reserva_solicitada", datos)).toBe(true);
    expect(medirUnaVez("solicitada:r1", "reserva_solicitada", datos)).toBe(false);
    expect(vi.mocked(window.gtag!).mock.calls).toHaveLength(1);
  });
});

describe("parametrosEvento", () => {
  it("solo deja pasar la lista blanca y descarta correos o teléfonos", () => {
    const p = parametrosEvento({
      negocio_slug: "waffcake",
      origen: "ana@correo.com",
      categoria: "3001234567",
      valor: 8500.4,
      ...({ correo: "ana@correo.com", nombre: "Ana" } as object),
    });
    expect(p).toEqual({ negocio_slug: "waffcake", value: 8500, currency: "COP" });
  });

  it("conserva un UUID de oferta aunque tenga muchos dígitos seguidos", () => {
    const id = "12345678-1234-4234-8234-123456789012";
    expect(parametrosEvento({ oferta_id: id }).oferta_id).toBe(id);
  });
});
