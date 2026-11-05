"use client";

// Demo de frontend: datos de muestra guardados en el navegador (localStorage).
// No toca Supabase. Lo que reserva el cliente le llega al negocio en el mismo
// navegador (incluso en otra pestaña, por el evento «storage»).
import { useSyncExternalStore } from "react";

export type Categoria = "panaderia" | "almuerzos" | "cafe" | "postres" | "comida_rapida";

export const CATEGORIAS: Record<Categoria, { texto: string; emoji: string }> = {
  panaderia: { texto: "Panadería", emoji: "🥐" },
  almuerzos: { texto: "Almuerzos", emoji: "🍛" },
  cafe: { texto: "Café", emoji: "☕" },
  postres: { texto: "Postres", emoji: "🍰" },
  comida_rapida: { texto: "Comida rápida", emoji: "🥟" },
};

export type Negocio = { id: string; nombre: string; direccion: string; minutos: number; calificacion: number; resenas: number };

export type Combo = {
  id: string;
  negocioId: string;
  titulo: string;
  contenido: string;
  categoria: Categoria;
  emoji: string;
  foto?: string; // data URL de la foto subida en la demo
  precioHabitual: number;
  precioFinal: number;
  cuposTotal: number;
  cuposDisponibles: number;
  desde: string; // ISO
  hasta: string; // ISO
  activo: boolean;
};

export type EstadoPedido = "por_confirmar" | "confirmado" | "entregado" | "rechazado" | "cancelado";
export type Pago = "efectivo" | "nequi";

export type Pedido = {
  id: string;
  numero: string;
  comboId: string;
  negocioId: string;
  cliente: string;
  esMio: boolean;
  cantidad: number;
  precioUnitario: number;
  precioHabitual: number;
  franja: string;
  pago: Pago;
  observaciones: string;
  estado: EstadoPedido;
  codigo?: string;
  motivo?: string;
  creadoEn: string;
  confirmadoEn?: string;
  entregadoEn?: string;
};

export type EstadoDemo = { version: 1; negocios: Negocio[]; combos: Combo[]; pedidos: Pedido[]; siguiente: number };

export const MI_NEGOCIO = "esquina";
export const NOMBRE_CLIENTE = "Camila R.";
const CLAVE = "salvori-demo-v1";

const min = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const franjaDesde = (a: number, b: number) => `${hora(min(a))}–${hora(min(b))}`;

function semilla(): EstadoDemo {
  const negocios: Negocio[] = [
    { id: MI_NEGOCIO, nombre: "Panadería La Esquina", direccion: "Cra. 6 #4-32, Barrio Bolívar", minutos: 4, calificacion: 4.8, resenas: 32 },
    { id: "fonda", nombre: "La Fonda Payanesa", direccion: "Calle 5 #7-15, Centro", minutos: 7, calificacion: 4.6, resenas: 58 },
    { id: "rosa", nombre: "Empanadas Doña Rosa", direccion: "Calle 4 #9-20, San Camilo", minutos: 9, calificacion: 4.9, resenas: 41 },
    { id: "caldas", nombre: "Café Caldas", direccion: "Parque Caldas, local 3", minutos: 3, calificacion: 4.7, resenas: 25 },
  ];
  const c = (x: Omit<Combo, "cuposDisponibles" | "activo" | "desde"> & { desde?: string; quedan?: number }): Combo => ({
    ...x,
    desde: x.desde ?? min(-30),
    cuposDisponibles: x.quedan ?? x.cuposTotal,
    activo: true,
  });
  const combos: Combo[] = [
    c({ id: "pan-bono", negocioId: MI_NEGOCIO, titulo: "Combo 6 panes de bono", contenido: "6 panes de bono medianos horneados hoy en la mañana.", categoria: "panaderia", emoji: "🥐", precioHabitual: 9000, precioFinal: 5500, cuposTotal: 8, quedan: 6, hasta: min(150) }),
    c({ id: "cafe-croissant", negocioId: MI_NEGOCIO, titulo: "Café + croissant de mantequilla", contenido: "Un café americano o tinto grande y un croissant de mantequilla recién horneado.", categoria: "cafe", emoji: "☕", precioHabitual: 10000, precioFinal: 6000, cuposTotal: 5, hasta: min(95) }),
    c({ id: "almuerzo", negocioId: "fonda", titulo: "Almuerzo del día con sopa", contenido: "Sopa del día, seco (arroz, proteína, principio y ensalada) y jugo natural.", categoria: "almuerzos", emoji: "🍛", precioHabitual: 18000, precioFinal: 12000, cuposTotal: 6, quedan: 4, hasta: min(80) }),
    c({ id: "empanadas", negocioId: "rosa", titulo: "10 empanadas de pipián", contenido: "10 empanadas de pipián con ají de maní para llevar.", categoria: "comida_rapida", emoji: "🥟", precioHabitual: 15000, precioFinal: 10000, cuposTotal: 4, quedan: 3, hasta: min(200) }),
    c({ id: "torta", negocioId: "caldas", titulo: "Café + torta de la casa", contenido: "Un capuchino o americano y una porción de torta de chocolate de la casa.", categoria: "postres", emoji: "🍰", precioHabitual: 12500, precioFinal: 8000, cuposTotal: 3, quedan: 2, hasta: min(55) }),
  ];
  const pedidos: Pedido[] = [
    // Historial del cliente
    { id: "p-ayer", numero: "A41", comboId: "torta", negocioId: "caldas", cliente: NOMBRE_CLIENTE, esMio: true, cantidad: 1, precioUnitario: 8000, precioHabitual: 12500, franja: "17:00–18:00", pago: "nequi", observaciones: "", estado: "entregado", codigo: "K7M2QD", creadoEn: min(-26 * 60), confirmadoEn: min(-26 * 60 + 4), entregadoEn: min(-25 * 60) },
    // Pedidos de hoy del negocio
    { id: "p-andres", numero: "A46", comboId: "pan-bono", negocioId: MI_NEGOCIO, cliente: "Andrés G.", esMio: false, cantidad: 1, precioUnitario: 5500, precioHabitual: 9000, franja: franjaDesde(-10, 50), pago: "efectivo", observaciones: "Llego en 20 minutos", estado: "confirmado", codigo: "R4T9XB", creadoEn: min(-40), confirmadoEn: min(-36) },
    { id: "p-maria", numero: "A45", comboId: "pan-bono", negocioId: MI_NEGOCIO, cliente: "María L.", esMio: false, cantidad: 1, precioUnitario: 5500, precioHabitual: 9000, franja: franjaDesde(-10, 50), pago: "nequi", observaciones: "", estado: "entregado", codigo: "H2PZ8N", creadoEn: min(-90), confirmadoEn: min(-85), entregadoEn: min(-60) },
  ];
  return { version: 1, negocios, combos, pedidos, siguiente: 47 };
}

// ---- almacén ----
let cache: EstadoDemo | null = null;
const oyentes = new Set<() => void>();

function leer(): EstadoDemo {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
    if (v?.version === 1) return (cache = v);
  } catch {}
  cache = semilla();
  guardar(cache);
  return cache;
}

function guardar(e: EstadoDemo) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e));
  } catch {}
}

function cambiar(fn: (e: EstadoDemo) => EstadoDemo) {
  cache = fn(structuredClone(leer()));
  guardar(cache);
  oyentes.forEach((o) => o());
}

function suscribir(o: () => void) {
  oyentes.add(o);
  const alCambiarOtraPestana = (ev: StorageEvent) => {
    if (ev.key === CLAVE) {
      cache = null;
      o();
    }
  };
  window.addEventListener("storage", alCambiarOtraPestana);
  return () => {
    oyentes.delete(o);
    window.removeEventListener("storage", alCambiarOtraPestana);
  };
}

const VACIO: EstadoDemo = { version: 1, negocios: [], combos: [], pedidos: [], siguiente: 0 };

/** Estado de la demo (en el servidor devuelve un estado vacío; se llena al hidratar). */
export function useDemo(): EstadoDemo {
  return useSyncExternalStore(suscribir, leer, () => VACIO);
}

// ---- acciones ----
const codigo = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

export const demo = {
  reiniciar() {
    cambiar(() => semilla());
  },
  reservar(datos: { comboId: string; cantidad: number; franja: string; pago: Pago; observaciones: string }): string {
    let id = "";
    cambiar((e) => {
      const combo = e.combos.find((x) => x.id === datos.comboId);
      if (!combo || combo.cuposDisponibles < datos.cantidad) throw new Error("Ya no quedan cupos suficientes.");
      combo.cuposDisponibles -= datos.cantidad;
      id = `p-${Date.now()}`;
      e.pedidos.unshift({
        id,
        numero: `A${e.siguiente}`,
        comboId: combo.id,
        negocioId: combo.negocioId,
        cliente: NOMBRE_CLIENTE,
        esMio: true,
        cantidad: datos.cantidad,
        precioUnitario: combo.precioFinal,
        precioHabitual: combo.precioHabitual,
        franja: datos.franja,
        pago: datos.pago,
        observaciones: datos.observaciones,
        estado: "por_confirmar",
        creadoEn: new Date().toISOString(),
      });
      e.siguiente += 1;
      return e;
    });
    return id;
  },
  cancelar(pedidoId: string) {
    cambiar((e) => {
      const p = e.pedidos.find((x) => x.id === pedidoId);
      if (p?.estado === "por_confirmar") {
        p.estado = "cancelado";
        const combo = e.combos.find((x) => x.id === p.comboId);
        if (combo) combo.cuposDisponibles += p.cantidad;
      }
      return e;
    });
  },
  confirmar(pedidoId: string) {
    cambiar((e) => {
      const p = e.pedidos.find((x) => x.id === pedidoId);
      if (p?.estado === "por_confirmar") {
        p.estado = "confirmado";
        p.codigo = codigo();
        p.confirmadoEn = new Date().toISOString();
      }
      return e;
    });
  },
  rechazar(pedidoId: string, motivo: string) {
    cambiar((e) => {
      const p = e.pedidos.find((x) => x.id === pedidoId);
      if (p?.estado === "por_confirmar") {
        p.estado = "rechazado";
        p.motivo = motivo;
        const combo = e.combos.find((x) => x.id === p.comboId);
        if (combo) combo.cuposDisponibles += p.cantidad;
      }
      return e;
    });
  },
  /** Devuelve false si el código no coincide. */
  entregar(pedidoId: string, cod: string): boolean {
    const p = leer().pedidos.find((x) => x.id === pedidoId);
    if (!p || p.estado !== "confirmado" || p.codigo !== cod.trim().toUpperCase()) return false;
    cambiar((e) => {
      const x = e.pedidos.find((y) => y.id === pedidoId)!;
      x.estado = "entregado";
      x.entregadoEn = new Date().toISOString();
      return e;
    });
    return true;
  },
  publicar(c: Omit<Combo, "id" | "negocioId" | "cuposDisponibles" | "activo">): string {
    const id = `c-${Date.now()}`;
    cambiar((e) => {
      e.combos.unshift({ ...c, id, negocioId: MI_NEGOCIO, cuposDisponibles: c.cuposTotal, activo: true });
      return e;
    });
    return id;
  },
  ajustarCupos(comboId: string, delta: number) {
    cambiar((e) => {
      const c = e.combos.find((x) => x.id === comboId);
      if (c) {
        const vendidos = c.cuposTotal - c.cuposDisponibles;
        c.cuposDisponibles = Math.max(0, c.cuposDisponibles + delta);
        c.cuposTotal = c.cuposDisponibles + vendidos;
      }
      return e;
    });
  },
  alternarActivo(comboId: string) {
    cambiar((e) => {
      const c = e.combos.find((x) => x.id === comboId);
      if (c) c.activo = !c.activo;
      return e;
    });
  },
};

// ---- ayudas de presentación ----
export function vigente(c: Combo): boolean {
  return c.activo && new Date(c.hasta).getTime() > Date.now();
}

export function cierraEn(hasta: string): string {
  const m = Math.round((new Date(hasta).getTime() - Date.now()) / 60_000);
  if (m <= 0) return "Cerrado";
  if (m < 60) return `Cierra en ${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `Cierra en ${h} h${r ? ` ${r} min` : ""}`;
}

export function hora(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

/** Dos franjas de recogida dentro de la ventana del combo. */
export function franjas(c: Combo): string[] {
  const ahora = Math.max(Date.now(), new Date(c.desde).getTime());
  const fin = new Date(c.hasta).getTime();
  const mitad = ahora + (fin - ahora) / 2;
  const f = (a: number, b: number) => `${hora(new Date(a).toISOString())}–${hora(new Date(b).toISOString())}`;
  return fin - ahora > 40 * 60_000 ? [f(ahora, mitad), f(mitad, fin)] : [f(ahora, fin)];
}
