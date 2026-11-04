# 05 · Stack, entornos y despliegue (v3: Vercel + Supabase)

> Copia para el repositorio (público). La versión completa, con el detalle de entrevistas y cuentas, vive en el hub del equipo.

**Decisión (3 nov 2026, Dicson):** el MVP se reinicia fuera de Lovable. El código vive en un repositorio propio de Salvori, se despliega en **Vercel** y usa **Supabase** como backend. Se conserva la estructura de prompts por fase (`prompts/`); cada prompt lo ejecuta una sesión de Claude Code dentro del repositorio.

**Qué se conserva del trabajo en Lovable:** el modelo de datos v2 y las 4 migraciones SQL del prompt 00-A, ya probadas con 31 pruebas (`referencia-lovable/migraciones/`). El proyecto de Lovable queda **congelado como referencia**: no se envían más prompts ni se toca.

**Por qué el cambio:** la cuenta y el código pasan a ser de Salvori (antes eran de un tercero), no hay créditos por cada cambio, el bucket de fotos puede ser público y el despliegue tiene previsualizaciones y pruebas automáticas.

---

## Stack

| Capa | Tecnología | Para qué |
|---|---|---|
| Framework | **Next.js** (última estable, App Router) + TypeScript | Es el framework nativo de Vercel: SSR, Server Actions, rutas y `next/image` |
| UI | Tailwind CSS 4 + shadcn/ui | Componentes accesibles; se conserva la identidad (Bosque, Mandarina, Crema, Carbón; Manrope y Source Sans 3) |
| Formularios | react-hook-form + zod | Validación igual en cliente y servidor |
| Mapa | Leaflet + react-leaflet + OpenStreetMap | Sin clave ni costo |
| Backend | **Supabase**: Postgres, Auth, Storage, RLS, `pg_cron` | Datos, login con enlace mágico, fotos y tareas programadas (no recogidas, ofertas programadas) |
| Cliente Supabase | `@supabase/ssr` + `@supabase/supabase-js` | Sesión por cookies en Server Components y middleware |
| Migraciones | **Supabase CLI** (`supabase/migrations/`, `supabase db push`) | Esquema versionado en git; se portan las 4 de Lovable |
| Hosting | **Vercel** | Producción en `main`, un *preview* por cada pull request, dominio `.co` con SSL automático |
| Repositorio y CI | **GitHub** (privado) + **GitHub Actions** | Lint, tipos, pruebas y E2E en cada pull request |
| Correo | **Resend** como SMTP de Supabase Auth | El SMTP por defecto de Supabase es solo para pruebas (pocos correos por hora); sin esto, el enlace mágico no llega a usuarios reales |
| Pruebas | **Vitest** (unitarias y de base de datos) + **Playwright** (flujo completo en el navegador) | Los 10 casos de la tarea S3-B, con los tres roles |
| Errores | **Sentry** (plan gratis) | Ver fallos reales en el piloto |
| Analítica | GA4 + píxel de Meta (`@next/third-parties`) + Vercel Analytics | Tarea S4 y pauta en redes |
| Imágenes | `browser-image-compression` antes de subir + `next/image` | Fotos tomadas con el celular, livianas |

Fuera por ahora: pasarela de pago, notificaciones push y app nativa (como el MVP). La app se puede «instalar» desde el navegador con un manifest (PWA básica) sin costo extra.

## Entornos

| Entorno | Rama | Supabase | URL |
|---|---|---|---|
| Local | cualquiera | proyecto **salvori-staging** (o Supabase local con Docker, opcional) | `localhost:3000` |
| Preview | cada pull request | **salvori-staging** | `*.vercel.app` que crea Vercel |
| Producción | `main` | **salvori-prod** (se crea antes del P7; decisión del 3 nov) | dominio `.co` (aún sin comprar) o `*.vercel.app` mientras tanto |

El plan gratis de Supabase permite 2 proyectos activos. Ojo: un proyecto gratis se pausa tras 7 días sin uso; durante el piloto conviene el plan Pro de Supabase (≈ US$25/mes) o al menos revisar que no se pause.

Las claves van como variables de entorno en Vercel y en `.env.local` (fuera de git). La `service_role` de Supabase y las claves de Resend y Sentry **nunca** van al cliente ni al repositorio, y su copia de respaldo se guarda fuera del repositorio.

## Flujo de trabajo con prompts
1. Cada prompt de `prompts/` (P0 a P7) se ejecuta en **una sesión nueva de Claude Code** abierta en `Proyectos/SALVORI/salvori-app/`.
2. La sesión trabaja en una rama, abre un pull request y Vercel crea un *preview*.
3. GitHub Actions corre lint, tipos y pruebas. Dicson revisa el preview y hace merge a `main` (producción).
4. Cada cierre se anota en `03-registro-de-documentacion.md` (prompt, PR, commit).

## Cuentas y pasos de Dicson (antes del P0)
Crear todo con un correo de Salvori (no personal ni de terceros) y guardar los accesos fuera del repositorio.

- [ ] Correo de Salvori (por ejemplo `hola@` en el dominio, o un Gmail del proyecto mientras tanto).
- [ ] **GitHub:** organización o cuenta de Salvori; repositorio privado `salvori-app` vacío.
- [ ] **Vercel:** cuenta (Hobby sirve para empezar; Pro si se usa con fines comerciales) conectada a GitHub.
- [ ] **Supabase:** organización Salvori con dos proyectos: `salvori-staging` y `salvori-prod` (región `us-east-1` o `sa-east-1`, São Paulo, la más cercana).
- [ ] **Dominio `.co`:** comprarlo y apuntar el DNS a Vercel.
- [ ] **Resend:** cuenta y verificación del dominio (registros DNS) para enviar los enlaces de inicio de sesión.
- [ ] **Sentry:** cuenta gratis y proyecto Next.js.
- [ ] **GA4 y píxel de Meta:** IDs a mano para el P7.
- [ ] En este equipo: Node 20 o superior (ya está: v24), `git`, GitHub CLI (`gh`, ya instalado), Supabase CLI y Vercel CLI (los instala la sesión del P0 con `npx`). Docker Desktop solo si se quiere Supabase local.

## Costos estimados del piloto (nov)
| Servicio | Plan | Costo |
|---|---|---|
| Vercel | Hobby → Pro si hay uso comercial | US$0 → US$20/mes |
| Supabase | Free (2 proyectos) → Pro para prod | US$0 → US$25/mes |
| Resend | Free (3.000 correos/mes) | US$0 |
| Sentry | Developer (gratis) | US$0 |
| Dominio `.co` | Anual | ≈ COP 80–150 mil/año |

Verificar los precios vigentes al contratar. El rubro de desarrollo del concurso cubre la cotización; estos servicios deben salir del rubro de plataforma o herramientas.
