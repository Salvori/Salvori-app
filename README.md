# Salvori — app web

MVP de Salvori: ofertas de comida con descuento para reservar y recoger cerca, en Popayán. Contexto completo y reglas en [`CLAUDE.md`](CLAUDE.md); arquitectura y modelo de datos en [`docs/`](docs/).

Stack: Next.js (App Router) + TypeScript + Tailwind 4 + shadcn/ui, Supabase (`@supabase/ssr`), Vercel, Vitest y Playwright.

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # y pegar las claves de salvori-staging
npm run dev                  # http://localhost:3000
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genera los tipos de rutas y corre `tsc --noEmit` |
| `npm test` | Vitest (`tests/unit`, `tests/db`) |
| `npm run test:e2e` | Playwright (`tests/e2e`); la primera vez: `npx playwright install chromium` |

## Entornos

| Entorno | Rama | Supabase |
|---|---|---|
| Local | cualquiera | `salvori-staging` |
| Preview (Vercel) | cada pull request | `salvori-staging` |
| Producción (Vercel) | `main` | `salvori-prod` (se crea antes del P7) |

Las claves viven en `.env.local` (fuera de git) y en las variables de entorno de Vercel. La `SUPABASE_SERVICE_ROLE_KEY` es solo de servidor.

## Supabase

La carpeta `supabase/` es de la Supabase CLI. Las migraciones van en `supabase/migrations/` (desde el P1) y nunca se edita una migración ya aplicada.
