# Medición: GA4, píxel de Meta y Vercel

Salvori mide con cuatro herramientas:

| Herramienta | Cookies | Cuándo carga |
| --- | --- | --- |
| Google Analytics 4 | Sí | Solo si el usuario pulsa «Aceptar» en el aviso de cookies |
| Píxel de Meta | Sí | Solo si el usuario pulsa «Aceptar» |
| Vercel Analytics | No | Siempre (en Vercel) |
| Vercel Speed Insights | No | Siempre (en Vercel) |

Sin `NEXT_PUBLIC_GA_ID` ni `NEXT_PUBLIC_META_PIXEL_ID` no se carga GA ni el píxel y **no aparece el aviso de cookies**: el sitio queda igual que antes.

## Cómo funciona

- `src/components/medicion.tsx`: aviso de cookies (abajo, «Aceptar» y «Solo esenciales»), carga de GA4 y del píxel con `next/script` y el enlace «Preferencias de cookies» (pie de la portada y `/privacidad`).
- La elección se guarda en `localStorage` (`salvori-consentimiento`). Si el navegador lo bloquea, el aviso vuelve a salir y no se mide nada.
- **Consent Mode v2 de Google:** antes de cargar `gtag.js` se envía `consent default` con todo en `denied` y luego `consent update` en `granted`. Si el usuario cambia a «Solo esenciales», se envía `update` en `denied` y `fbq('consent', 'revoke')`.
- `src/lib/medicion.ts`: `medir(evento, datos)` y `medirUnaVez(clave, evento, datos)`. No hacen nada sin consentimiento o sin IDs. Solo envían `negocio_slug`, `oferta_id`, `origen`, `categoria`, `cantidad` y `value` + `currency: COP`; **nunca** correo, teléfono ni nombre.

### Eventos

| Evento (GA4 y `trackCustom`) | Dónde se dispara | Evento estándar del píxel |
| --- | --- | --- |
| `view_item` | Ficha `/oferta/[id]` (una vez por oferta y pestaña) | `ViewContent` |
| `reserva_solicitada` | `/mis-reservas` al llegar después de reservar | `Lead` |
| `reserva_confirmada` | Bandeja del negocio o del admin, al confirmar | — |
| `reserva_entregada` | Bandeja, al confirmar la entrega (con `value` en COP) | `Purchase` |
| `no_recogida` | Bandeja, al marcar «No la recogió» | — |
| `reserva_cancelada` | `/mis-reservas`, cuando el comprador cancela | — |

Los que pasan en Server Actions se miden en el cliente cuando la pantalla recibe el resultado correcto, una sola vez. Los de la bandeja salen del navegador de quien la gestiona (negocio o admin), con su propio consentimiento.

## 1. Crear la propiedad GA4 «Salvori web»

1. Entra a [analytics.google.com](https://analytics.google.com) con la cuenta de Google de Salvori → **Administrar** → **Crear** → **Propiedad**.
2. Nombre: **Salvori web**. Zona horaria: **Colombia (GMT-05:00)**. Moneda: **Peso colombiano (COP)**.
3. Datos de la empresa: sector «Comida y bebida», tamaño pequeño. Objetivos: «Generar clientes potenciales» y «Analizar el comportamiento».
4. **Flujo de datos** → **Web** → URL `https://salvori.co` y nombre «Salvori web». Ya creado el 24 nov 2026: propiedad «Salvori-G4» (`properties/565818710`), ID de medición `G-L7LY1340LG`.
5. Deja activa la **medición mejorada** (cuenta las páginas al navegar dentro de la app).
6. Copia el **ID de medición** (`G-XXXXXXXXXX`): es `NEXT_PUBLIC_GA_ID`.
7. Opcional y recomendado: **Administrar → Eventos → Marcar como evento clave** `reserva_solicitada` y `reserva_entregada` (aparecen cuando llegan por primera vez).
8. **Administrar → Definiciones personalizadas → Crear dimensión** (alcance «Evento») para `negocio_slug`, `oferta_id` y `origen`, así se pueden filtrar los informes por negocio.
9. **Administrar → Retención de datos**: 14 meses.

## 2. Crear el píxel de Meta

1. Entra a [business.facebook.com](https://business.facebook.com) con el portafolio comercial de Salvori → **Administrador de eventos** → **Conectar orígenes de datos** → **Web** → **Píxel de Meta**.
2. Nombre: «Salvori web». Cuando pida el método, elige **instalar el código manualmente** (el código ya está en la app; solo se necesita el ID).
3. Copia el **identificador del píxel** (solo números): es `NEXT_PUBLIC_META_PIXEL_ID`.
4. Verificar el dominio `salvori.co` en Meta (Configuración del negocio → Seguridad de la marca → Dominios), con un registro TXT en GoDaddy.
5. Para probar: **Administrador de eventos → Probar eventos**, abre el sitio, acepta cookies y navega a una oferta: debe llegar `PageView` y `ViewContent`.

## 3. Variables en Vercel

En Vercel → proyecto `salvori-app` → **Settings → Environment Variables**:

| Variable | Valor | Entornos |
| --- | --- | --- |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` de la propiedad «Salvori web» | Production (y Preview solo si se quiere probar ahí) |
| `NEXT_PUBLIC_META_PIXEL_ID` | identificador numérico del píxel | Production (ídem) |

- Son públicas (llegan al navegador): no son claves secretas, pero igual se anotan en `Credenciales.md` del vault y no en el repositorio.
- Al ser `NEXT_PUBLIC_`, se fijan en el build: después de agregarlas hay que **volver a desplegar**.
- Recomendado: no ponerlas en Preview para no mezclar las pruebas con los datos reales. Para probar en local, agrégalas a `.env.local`.

**Vercel Analytics y Speed Insights** no necesitan variables: se activan en el panel del proyecto, pestañas **Analytics** y **Speed Insights** → **Enable**. El código (`@vercel/analytics` y `@vercel/speed-insights`) ya está en `src/app/layout.tsx`.

## 4. Cómo probar

1. Con los IDs en `.env.local`, `npm run dev` y abre `http://localhost:3000`: aparece el aviso abajo.
2. «Solo esenciales»: en las herramientas del navegador (Red) no se pide `gtag/js` ni `fbevents.js`.
3. «Preferencias de cookies» en el pie → «Aceptar»: se cargan ambos. En GA4 → **Informes → Tiempo real** (o **DebugView** con la extensión Google Analytics Debugger) y en Meta → **Probar eventos**, abre una oferta y verifica `view_item` / `ViewContent`.
4. Reserva, confirma y entrega desde la bandeja del negocio: llegan `reserva_solicitada`, `reserva_confirmada` y `reserva_entregada` (con `value` en COP).
5. Sin las variables: no hay aviso ni enlace de preferencias.
