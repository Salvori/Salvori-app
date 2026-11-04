# Inicio de sesión (Supabase Auth)

El comprador entra con **enlace mágico** por correo: escribe su correo en `/entrar`, acepta la autorización de tratamiento de datos y recibe un enlace. No hay contraseñas.

## Cómo funciona
1. `/entrar` (Server Action `enviarEnlace`) llama a `signInWithOtp` con `emailRedirectTo = <origen>/auth/callback?next=<ruta>`. El origen es el de la petición, así que sirve igual en local, en cada preview y en producción.
2. La plantilla del correo arma el enlace con `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`. Por eso funciona aunque el enlace se abra en otro dispositivo (no depende del flujo PKCE).
3. `/auth/callback` verifica el `token_hash` (o un `code` PKCE, si llega), guarda la autorización de datos en los metadatos del usuario si aún no la tenía y redirige a `next`. Por ejemplo, vuelve a la oferta que el comprador quería reservar.
4. La autorización queda en `user_metadata.autorizacion_datos = { aceptada, fecha, version }`.

## Configuración en Supabase (por proyecto: staging y prod)
Está como código en `supabase/config.toml` (`[auth]` y plantillas en `supabase/templates/`). Hay dos maneras de aplicarla:

**A. Con la CLI** (desde `salvori-app/`, revisando el resumen antes de confirmar):

```bash
npx supabase config push --project-ref ekdpnsrigbpdnbwioozv
```

**B. A mano en el panel** de Supabase → Authentication:
- **URL Configuration:** Site URL `http://localhost:3000` (staging) o el dominio `.co` (prod). En Redirect URLs agrega:
  - `http://localhost:3000/**`
  - `https://salvori-app-dev-fetex.vercel.app/**`
  - `https://salvori-app-*-dev-fetex.vercel.app/**`
  - `https://salvori-*-dev-fetex.vercel.app/**`
  - En prod, además, `https://<dominio>.co/**`.
- **Emails → Templates:** en *Magic Link* y en *Confirm signup*, pega el HTML de `supabase/templates/magic_link.html` y `confirmation.html`. Asuntos: «Tu enlace para entrar a Salvori» y «Confirma tu correo en Salvori».
- **Sign In / Providers → Email:** activo, y desactiva *Confirm email* para que el primer enlace sirva como registro.

## Resend como SMTP (lo hace Dicson)
Sin SMTP propio, Supabase solo manda unos pocos correos por hora y únicamente a los miembros del equipo de la organización. Para usuarios reales:

1. En **Resend**: crea la cuenta, agrega el dominio de Salvori (Domains → Add) y copia los registros DNS (SPF, DKIM y, si lo pide, MX de retorno) en el proveedor del dominio. Espera a que salga *Verified*.
2. En Resend → **API Keys**, crea una clave con permiso *Sending access* solo para ese dominio. Guárdala en `Credenciales.md`.
3. En Supabase → **Authentication → Emails → SMTP Settings** (en staging y en prod), activa *Custom SMTP*:
   - Host `smtp.resend.com` · Puerto `465` · Usuario `resend` · Contraseña: la API key de Resend.
   - Remitente: `Salvori <hola@<dominio>.co>`.
4. En **Authentication → Rate Limits**, sube *Emails sent per hour* (por ejemplo, a 100) cuando el SMTP propio esté activo.
5. Prueba: pide un enlace desde `/entrar` con un correo que no sea del equipo.

Mientras no haya dominio, el enlace solo llega a los correos del equipo de la organización de Supabase.

## Pruebas
- E2E (`tests/e2e/flujo-comprador.spec.ts`): inicia sesión con el usuario de prueba por contraseña (sin correo) e inyecta las cookies de sesión. Así no depende del correo.
- Para probar a mano en staging: `npm run demo:crear` publica una oferta visible por 8 horas (`npm run demo:borrar` la quita).
