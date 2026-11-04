# Salvori — Conocimiento del proyecto

> Desde el 3 nov 2026 este archivo es la fuente del `CLAUDE.md` del repositorio `salvori-app`: el prompt P0 lo copia ahí. La versión anterior quedó cargada como Project Knowledge en Lovable, que está congelado.

## Qué es
Salvori es una app web en Popayán, Colombia, para comprar comida con descuento y recogerla cerca. Los negocios (panaderías, pastelerías, cafés, almuerzos, comida rápida) publican dos tipos de oferta:
- **comercial:** combo o promoción, sobre todo en días u horas flojas;
- **lote:** producto ya hecho que no se vendió.

El comprador reserva desde el celular, el negocio la confirma y el comprador recoge en el local con un código. Lema: «Lo bueno se aprovecha.»

Meta del MVP (6 nov 2026): 3 negocios reales publicando, reservas confirmadas y entregadas, y cifras por negocio.

## Lo que aprendimos de 12 compradores y 5 negocios
- El comprador quiere saber **exactamente qué recibe** (nada de «bolsa sorpresa»), con **foto real**, precio y horario.
- Decide por **cercanía** y **confianza** (reseñas, aseo, foto real) antes que por el descuento.
- Solo se desplaza si el negocio **confirmó** la reserva y ve los cupos («quedan 3»).
- El **ahorro en pesos** es la motivación principal. El impacto ambiental acompaña, pero no va primero.
- Un precio demasiado bajo genera desconfianza: mostrar siempre el precio habitual y el contenido.
- Los negocios quieren publicar en segundos, como un estado de WhatsApp: foto, cantidad, precio y horario.

## Idioma y tono
- Todo en español de Colombia (`lang="es-CO"`), incluidas las páginas 404 y de error y las validaciones.
- COP sin decimales (`$ 12.000`), horas en 24 h.
- Hablar de **ofertas** y **ahorro**. Nunca «sobras», «comida que se está dañando» ni «bolsa sorpresa». Verbos: reservar, recoger, ahorrar.
- Mobile first.

## Identidad visual (no cambiarla)
- Colores: Bosque `#174C3C` (primario), Mandarina `#F57A35` (acento y descuentos), Crema `#F8F5EA` (fondo), Carbón `#242824` (texto). Como tokens de Tailwind (`primary`, `accent`, `background`, `foreground`).
- Tipografía: Manrope (títulos, 600–800) y Source Sans 3 (texto, 400–600) con `next/font/google`.
- Logo `public/brand/logo-principal.png` y favicon `public/favicon.svg`, copiados del prototipo de Lovable. No redibujarlos.
- Tarjetas `rounded-2xl`, botones `rounded-full`, sombra suave verde. Fotos de comida reales y cálidas.

## Stack
- Next.js (App Router, `src/app/`), React, TypeScript estricto, Tailwind 4, shadcn/ui. Desplegado en Vercel.
- Supabase: Postgres, Auth (enlace mágico por correo, SMTP de Resend), Storage (bucket público `ofertas`), RLS y `pg_cron`. Cliente con `@supabase/ssr` (cookies) y middleware que refresca la sesión.
- Migraciones en `supabase/migrations/` con Supabase CLI. Tipos generados con `supabase gen types` en `src/lib/database.types.ts`.
- Escrituras sensibles (reservar, cambiar estado) solo por las funciones RPC `solicitar_reserva` y `cambiar_estado_reserva`, llamadas desde Server Actions.
- react-hook-form + zod. Leaflet + OpenStreetMap. `browser-image-compression` antes de subir fotos.
- Pruebas: Vitest (`tests/unit`, `tests/db`) y Playwright (`tests/e2e`). CI en GitHub Actions.
- Sentry para errores; GA4 + píxel de Meta con `@next/third-parties`.
- Zona horaria del negocio: `America/Bogota`. Guardar en UTC y mostrar en hora de Colombia.
- Nada de datos de ejemplo en producción: los de prueba llevan `es_prueba = true`.

## Roles
- **comprador:** ve ofertas, reserva, sigue el estado, cancela antes de la confirmación, ve su ahorro y califica.
- **negocio:** publica y programa ofertas de SU negocio, acepta o rechaza reservas, las marca lista, entregada o no recogida, y ve sus cifras.
- **admin:** equipo Salvori. Crea negocios, publica a nombre de cualquier negocio, gestiona todas las reservas y ve las métricas.

Roles en la tabla `user_roles` (enum `app_role`), verificados con `has_role(auth.uid(), rol)` (`security definer`) en las políticas RLS. Nunca validar roles solo en el frontend.

## Modelo de datos
- **negocios:** id, nombre, slug único, categoria, descripcion, direccion, lat, lng, horario, telefono_whatsapp, foto_portada, activo.
- **negocio_miembros:** negocio_id, user_id.
- **ofertas:** id, negocio_id, tipo (comercial | lote), titulo, contenido (obligatorio), categoria, foto_url (obligatoria), precio_habitual, precio_final (< habitual), cupos_total, cupos_disponibles, recogida_desde, recogida_hasta, tiempo_preparacion_min (comercial), elaborado_en (obligatorio en lote), estado (borrador | activa | agotada | cerrada), publicada_por.
- **oferta_programacion:** plantilla de oferta, dias_semana, hora_publicacion, activa.
- **reservas:** id, oferta_id, comprador_id, cantidad, precio_unitario, precio_habitual_unitario, codigo (6 caracteres), estado, motivo_rechazo, observaciones, metodo_pago, origen, y las fechas solicitada_en, confirmada_en, lista_en y entregada_en.
- **calificaciones:** reserva_id único, negocio_id, comprador_id, calidad, aseo y atencion (1–5), comentario de máximo 280 caracteres. Solo si la reserva está entregada.
- **eventos:** tipo, negocio_id, oferta_id, origen, creado_en.
- Categorías, en este orden: desayuno, almuerzo, panaderia_pasteleria, cafe, comida_rapida, saludable, postres, bebidas, otro.

## Estados de la reserva
`solicitada → confirmada | rechazada | cancelada`; `confirmada → lista → entregada`; `confirmada | lista → no_recogida`.
- solicitada: el comprador reserva. Descuenta el cupo una sola vez, en la función transaccional `solicitar_reserva`.
- confirmada: el negocio acepta. Se genera el código; recién ahí el comprador va.
- rechazada: el negocio no puede atenderla (motivo obligatorio). Devuelve el cupo.
- cancelada: el comprador cancela mientras está solicitada. Devuelve el cupo.
- lista: el pedido está preparado (opcional).
- entregada: el negocio valida el código y registra el método de pago (efectivo, nequi, transferencia o tarjeta).
- no_recogida: terminó la ventana sin entrega. No devuelve el cupo.

Las transiciones se validan en la base de datos según el rol. El comprador ve el estado en tiempo real.

## Pantallas
- `/`: ofertas activas por cercanía (lista y mapa). Ubicación del navegador o elegida a mano; si no hay, el centro de Popayán. Filtros por categoría, franja (mañana, almuerzo, tarde, noche), carril y radio. Tarjeta: foto, título, negocio, precio final, precio habitual tachado, % de descuento, «quedan N», ventana, distancia y calificación del negocio.
- `/oferta/[id]`: ficha completa (contenido exacto, foto, precios, cupos, ventana, tiempo de preparación o «elaborado hoy a las 7:00», dirección, horario y calificaciones). Botón Reservar con cantidad y observaciones.
- `/mis-reservas`: estado de cada reserva, código grande cuando está confirmada, cancelar si sigue solicitada y calificar si fue entregada.
- `/perfil`: **ahorro acumulado en $** en grande y número de compras.
- `/n/[slug]`: página del negocio con sus ofertas y calificación; registra `origen = negocio:<slug>`.
- `/negocio`: panel del negocio. Publicar en 3 pasos (foto → cantidad y precio → horario), programar por día, bandeja de reservas (aceptar, rechazar, lista, entregada, no recogida) y cifras.
- `/admin`: negocios, publicar a nombre de un negocio, todas las reservas con botón de WhatsApp para avisar al negocio, y métricas.
- `/entrar`: inicio de sesión con enlace mágico.

## Pago y cobro
El MVP no cobra en línea. El comprador paga en el local al recoger y el negocio registra el método. Salvori no cobra comisión en la app durante el piloto; solo registra ventas e ingresos por negocio.

## Medición
- GA4 y píxel de Meta en `src/app/layout.tsx`, con IDs desde variables de entorno (`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`).
- Eventos: view_item, reserva_solicitada, reserva_confirmada, reserva_entregada, no_recogida, reserva_cancelada, con negocio_slug, oferta_id y origen.
- Por negocio: vistas, reservas, entregas, no recogidas, ingresos y calificación promedio.
- Conservar `utm_*` y el origen `/n/<slug>` hasta la reserva.

## Fuera del MVP (no construir)
Domicilio, consumo en mesa, supermercado y aseo, combos entre negocios, puntos y logros, planes y eventos, apps nativas y pasarela de pago.

## Seguridad y datos personales
- RLS en todas las tablas; probar con los tres roles.
- El negocio ve solo el nombre del comprador, el código y las observaciones; nunca su correo ni su teléfono.
- Autorización de tratamiento de datos (Ley 1581 de 2012) al registrarse.
- Sin claves en el código ni en git. `.env.local` está en `.gitignore`; las variables viven en Vercel. La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor (pruebas y tareas de admin), nunca con el prefijo `NEXT_PUBLIC_`.

## Cómo trabajar aquí
- Responder y escribir la interfaz en español. Mensajes de commit en español.
- Cada prompt de fase (`docs/prompts/P*.md` en el hub) se hace en una rama `fase/pN-…` y termina en un pull request con: qué cambió, cómo probarlo en el preview y la checklist del prompt.
- Antes de abrir el PR: `npm run lint`, `npm run typecheck`, `npm test`; si hay pantallas nuevas, `npm run test:e2e`.
- Todo cambio de esquema va en una migración nueva (`supabase migration new …`); nunca editar una migración ya aplicada. Regenerar los tipos después.
- No hacer merge a `main` ni `supabase db push` contra **producción**: eso lo hace Dicson. Contra staging sí.
- No borrar datos reales. No exponer datos personales del comprador al negocio.
