# 01 · Arquitectura y modelo de datos del MVP de Salvori

> Copia para el repositorio (público). La versión completa, con el detalle de entrevistas y cuentas, vive en el hub del equipo.

Corte: 3 nov 2026 (modelo v2 con insights; arquitectura v3 con Vercel + Supabase). Fuente de la parte A: código del prototipo en Lovable (commit `7e52767`, 20 oct 2026).

El documento tiene dos partes:
- **A. Lo que existe hoy:** lo que dice el código, sin suposiciones.
- **B. Modelo objetivo del MVP:** la propuesta para el Hito 2 (vie 6 nov). Las decisiones abiertas están marcadas como tales.

---

## A. Lo que existe hoy (código real)

### Stack
| Capa | Tecnología (según `package.json`) |
|---|---|
| Framework | TanStack Start 1.168 + TanStack Router 1.170 (SSR con Nitro), React 19, TypeScript 5.8 |
| Estilos | Tailwind CSS 4 + componentes shadcn/ui (Radix) en `src/components/ui/` |
| Datos del cliente | TanStack Query (instalado, sin uso), `localStorage` |
| Formularios | react-hook-form + zod (instalados, sin uso) |
| Pruebas | Vitest + Testing Library (`src/test/app-routing.test.tsx`) |
| Build | Vite 8, bun |
| Backend / base de datos | **Ninguno.** `get_database_status` → `enabled: false` (no hay Lovable Cloud/Supabase) |
| Autenticación | **Ninguna** |
| Analítica | **Ninguna** (no hay GA4 ni píxel de Meta en `__root.tsx`) |
| Publicación | **No publicado** (`is_published: false`); solo existe la vista previa de Lovable |

### Archivos propios de Salvori
| Archivo | Qué hace |
|---|---|
| `src/routes/__root.tsx` | Metadatos (título «Salvori — Ofertas de comida cerca de ti»), fuentes Manrope y Source Sans 3, favicon. `lang="en"`; las páginas 404 y de error siguen en inglés |
| `src/routes/index.tsx` | Única página: hero «Lo bueno se aprovecha.», botón «Usar mi ubicación», filtro de radio 1/3/5 km y tarjetas de oferta con «Capturar oferta» |
| `src/lib/offers.ts` | Tipo `Offer`, **6 ofertas inventadas** alrededor del centro de Popayán, distancia con fórmula de Haversine, formato COP |
| `src/styles.css` | Paleta de marca: Bosque `#174C3C`, Mandarina `#F57A35`, Crema `#F8F5EA`, Carbón `#242824` |
| `src/assets/logo-principal.png`, `public/favicon.svg` | Logo y favicon descargados de la guía de identidad |

### Modelo de datos actual
Una sola entidad, escrita a mano en el código:

```ts
type Offer = {
  id: string; restaurant: string; title: string; category: string;
  price: number; originalPrice: number; until: string; // "HH:mm"
  lat: number; lng: number;
};
```

«Capturar oferta» solo guarda los `id` en `localStorage` (`salvori-saved`) **del mismo dispositivo**. No crea una reserva, no descuenta unidades y el negocio no se entera.

### Brechas frente al flujo de negocio
| Necesita el flujo | Estado |
|---|---|
| Negocios reales con perfil y ubicación | No: el nombre del negocio es texto dentro de la oferta |
| Oferta de excedente con cantidad y ventana de recogida | No hay cantidad ni ventana; solo «hasta HH:mm» |
| Reserva del comprador | No: «capturar» es un favorito local |
| Confirmación de recogida | No existe |
| Roles (comprador, negocio, admin) | No hay login |
| Medición por negocio | No hay eventos ni enlaces propios |

---

## B. Modelo objetivo del MVP (v2, ajustado con los insights del 28 oct)

Fuente de los ajustes: `insumos/04-insights-consolidados.md`, con 5 negocios, 12 compradores y 2 diarios. Cambios frente a la v1:
- La oferta tiene **dos carriles**: `comercial` (combo o promoción) y `lote` (producto ya hecho que no se vendió). Los 5 negocios quieren el comercial; solo 2 tienen lotes reales.
- **La reserva la confirma el negocio** antes de que el comprador se desplace. Estados nuevos: `solicitada → confirmada / rechazada → lista → entregada / no_recogida / cancelada`.
- **Ficha completa:** contenido exacto (sin «bolsa sorpresa»: 11/12 quieren saber qué reciben), foto real, tiempo de preparación o fecha de elaboración, y horario del negocio.
- **Ahorro en $** como dato principal del comprador. Los kg salvados solo se muestran si se pesan.
- **Calificación** después de la entrega: calidad, aseo y atención.
- **Medición:** se registran ingresos por negocio. El cobro de Salvori queda fuera del MVP.

### Arquitectura (v3, 3 nov 2026: Vercel + Supabase)
> La parte A describe el prototipo de Lovable, que queda congelado como referencia. Desde el 3 nov el MVP se construye en un repositorio propio (`Proyectos/SALVORI/salvori-app/`). Detalle de stack, entornos y cuentas: `05-stack-y-despliegue.md`.

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind 4 + shadcn/ui, pensado primero para celular, desplegado en **Vercel** (producción en `main`, un *preview* por pull request).
- **Backend:** **Supabase** propio de Salvori (`salvori-staging` y `salvori-prod`): Postgres, Auth con enlace mágico (correo por Resend como SMTP), Storage con bucket público `ofertas` y RLS. `pg_cron` marca las no recogidas y publica las ofertas programadas.
- **Esquema:** las 4 migraciones del prompt 00-A de Lovable (`referencia-lovable/migraciones/`) se portan a `supabase/migrations/`. Ya pasaron 31 pruebas.
- **Mapa:** Leaflet con OpenStreetMap (sin clave).
- **Avisos:** el negocio ve la reserva en su panel y el admin puede avisarle por WhatsApp con un botón `wa.me` (manual). El comprador recibe un correo al confirmarse su reserva (Resend).
- **Pruebas:** Vitest (funciones y RLS contra staging) y Playwright (flujo completo) en GitHub Actions.
- **Analítica y errores:** GA4 + píxel de Meta (`@next/third-parties`), Vercel Analytics y Sentry.
- **Dominio:** el `.co` de Salvori, conectado en Vercel. Hacer merge a `main` publica en producción: lo hace Dicson.

### Roles
| Rol | Quién | Puede |
|---|---|---|
| `comprador` | Cualquier persona registrada | Ver ofertas, reservar, seguir el estado, cancelar antes de la confirmación, ver su ahorro y calificar después de la entrega |
| `negocio` | Dueño o jefe de punto (4 de 5 negocios: el dueño) | Publicar y programar ofertas de **su** negocio, aceptar o rechazar reservas, marcarlas lista, entregada o no recogida, y ver sus cifras |
| `admin` | Equipo Salvori | Todo para **cualquier** negocio. Crea negocios, publica a nombre del negocio (algunos negocios necesitarán ayuda), gestiona reservas y ve las métricas |

Los roles van en `user_roles` y se verifican con `has_role(uid, rol)` (`security definer`) dentro de RLS.

### Entidades

```
negocio 1───* oferta 1───* reserva 1───0..1 calificacion
   │            │
   *            *  oferta_programacion (días de la semana)
negocio_miembro
```

**negocio**: id, nombre, slug (único, para `/n/<slug>`), categoria, descripcion, direccion, lat, lng, horario (texto o JSON por día), telefono_whatsapp, foto_portada, activo, creado_en. La calificación promedio se calcula desde `calificacion`.

**negocio_miembro**: negocio_id, user_id.

**oferta**
| Campo | Tipo | Nota |
|---|---|---|
| id, negocio_id | uuid | |
| tipo | enum `comercial` \| `lote` | Carril |
| titulo | text | |
| contenido | text | Qué recibe exactamente el comprador (obligatorio) |
| categoria | enum | desayuno, almuerzo, panaderia_pasteleria, cafe, comida_rapida, saludable, postres, bebidas, otro |
| foto_url | text | Foto real tomada por el negocio (obligatoria; Storage) |
| precio_habitual, precio_final | integer COP | `precio_final < precio_habitual`; el % de descuento se calcula |
| cupos_total, cupos_disponibles | integer | «Quedan N» |
| recogida_desde, recogida_hasta | timestamptz | Ventana de recogida |
| tiempo_preparacion_min | integer, nulo | Para `comercial` que se prepara al pedir |
| elaborado_en | timestamptz, nulo | Obligatorio si `tipo = lote` |
| estado | enum | `borrador`, `activa`, `agotada`, `cerrada` |
| publicada_por | uuid | Usuario negocio o admin |
| creado_en | timestamptz | |

**oferta_programacion** (ofertas recurrentes, como «martes de helados» o los combos de lunes a viernes): oferta_plantilla_id, dias_semana (int[]), hora_publicacion, activa. Crea la oferta del día a partir de una plantilla.

**reserva**
| Campo | Tipo | Nota |
|---|---|---|
| id, oferta_id, comprador_id | uuid | |
| cantidad | integer | |
| precio_unitario, precio_habitual_unitario | integer | Copiados al reservar, para calcular ahorro e ingresos aunque la oferta cambie |
| codigo | text (6) | Se muestra al quedar `confirmada` |
| estado | enum | Ver estados |
| motivo_rechazo, observaciones | text | Observaciones del comprador (por ejemplo «llego 10 min tarde») |
| metodo_pago | text, nulo | `efectivo`, `nequi`, `transferencia`, `tarjeta`; se registra al entregar |
| origen | text | `directo`, `negocio:<slug>`, `utm_*` |
| solicitada_en, confirmada_en, lista_en, entregada_en, actualizada_en | timestamptz | Para medir tiempos |

**calificacion**: reserva_id (único), negocio_id, comprador_id, calidad, aseo y atencion (1–5), comentario (máximo 280 caracteres), creado_en. Solo existe si la reserva está `entregada`.

**evento** (medición): tipo (`vista_oferta`, `vista_negocio`, `reserva_solicitada`, `reserva_entregada`, `no_recogida`, `cancelacion`), negocio_id, oferta_id, origen, creado_en.

Ahorro del comprador = Σ (precio_habitual_unitario − precio_unitario) × cantidad de sus reservas `entregada`. Es una vista o función, no un campo editable.

### Estados de la reserva

```
 solicitar (descuenta cupo)
        │
        ▼
  ┌───────────┐  negocio rechaza (devuelve cupo)   ┌───────────┐
  │ solicitada│ ─────────────────────────────────▶ │ rechazada │
  └───────────┘                                    └───────────┘
   │        │ comprador cancela (devuelve cupo)    ┌───────────┐
   │        └────────────────────────────────────▶ │ cancelada │
   │ negocio confirma (genera código)              └───────────┘
   ▼
  ┌───────────┐  negocio marca lista  ┌──────┐  valida código  ┌───────────┐
  │ confirmada│ ────────────────────▶ │ lista│ ──────────────▶ │ entregada │
  └───────────┘                       └──────┘                 └───────────┘
        │                                │
        └──── pasa recogida_hasta sin entrega ──▶ ┌─────────────┐
                                                  │ no_recogida │
                                                  └─────────────┘
```

| Transición | Quién | Efecto |
|---|---|---|
| → `solicitada` | Comprador | Descuenta el cupo una sola vez (función transaccional `solicitar_reserva`) |
| `solicitada` → `confirmada` | Negocio, admin | Genera el código; el comprador ya puede ir |
| `solicitada` → `rechazada` | Negocio, admin | Devuelve el cupo; motivo obligatorio |
| `solicitada` → `cancelada` | Comprador, admin | Devuelve el cupo. Después de `confirmada`, cancelar depende de la política de incidentes (pendiente) |
| `confirmada` → `lista` | Negocio, admin | Opcional para lotes, útil cuando se prepara al pedir |
| `confirmada`/`lista` → `entregada` | Negocio, admin, validando el código | Registra el método de pago; suma ahorro e ingresos |
| `confirmada`/`lista` → `no_recogida` | Negocio, admin o sistema al terminar la ventana | El cupo no vuelve (la ventana ya terminó); cuenta como no-show |

Si una `solicitada` no se confirma en 15 minutos, el panel la resalta. No se cancela sola; la regla queda por definir.

### Permisos (RLS) en resumen
| Tabla | comprador | negocio | admin |
|---|---|---|---|
| negocio | leer activos | leer y editar el suyo | todo |
| oferta, oferta_programacion | leer activas | todo sobre las de su negocio | todo |
| reserva | crear; leer las suyas; cancelar si está `solicitada` | leer las de su negocio; transiciones de negocio | todo |
| calificacion | crear para su reserva entregada; leer todas (públicas, sin datos personales) | leer las de su negocio | todo |
| evento | insertar vistas | leer las de su negocio (agregadas) | todo |
| user_roles | leer las suyas | leer las suyas | todo |

### Fuera del MVP
Domicilio, consumo en mesa, catálogo de supermercado y aseo, combos entre negocios, puntos y logros, planes y eventos, apps nativas y pasarela de pago propia.

### Decisiones abiertas del equipo
- [ ] **Carril:** solo rescate (lote), solo comercial o ambos. El modelo soporta ambos; la decisión cambia qué negocios se reclutan y cómo se comunica.
- [ ] **Cobro del piloto:** comisión baja, mensualidad (entre 30 y 50 mil) o prueba gratis. El MVP solo registra ventas por negocio.
- [ ] **Política de incidentes:** si se agota, si el cliente no llega o si el pedido no coincide, y quién atiende.
- [ ] **Pago:** al negocio al entregar (propuesta del MVP) o pago previo para lo que se prepara al momento (lo pidió uno de los negocios entrevistados).
- [ ] **Marca:** se mantienen «Salvori» y «Lo bueno se aprovecha.». La crítica al nombre y al verde vino de 1 de 12 compradores; se vuelve a medir en el piloto.
- [ ] **Cuenta:** el prototipo quedó en un workspace de Lovable de un tercero (congelado). Falta el dominio `.co`.
