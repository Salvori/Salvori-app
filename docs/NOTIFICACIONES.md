# Notificaciones (lanzamiento, 23 nov 2026)

| Quién | Cuándo | Canal | Código |
| --- | --- | --- | --- |
| Negocio | Reserva nueva | Tono y aviso del navegador en `/negocio` (panel abierto) | `src/app/negocio/avisos.tsx` |
| Negocio | Reserva nueva o cancelada | Correo a cada usuario miembro del negocio | `src/lib/avisos-negocio.ts`, `src/lib/correo-negocio.ts` |
| Negocio | Reserva nueva | WhatsApp que envía el propio comprador con el botón | `/mis-reservas`, `mensajePedidoWhatsApp` en `src/lib/texto.ts` |
| Negocio | Reserva nueva | WhatsApp automático (apagado) | `src/lib/whatsapp.ts`, ver `docs/WHATSAPP.md` |
| Comprador | Confirmada o rechazada | Correo | `src/lib/avisos-comprador.ts` |
| Interesado | Oferta publicada cerca | Correo (máx. uno cada 6 h, tope por publicación) | `src/lib/avisos-interesados.ts`, `src/lib/interesados.ts` |

Todos los correos salen por el mismo módulo SMTP (`src/lib/correo.ts`, variables `SMTP_*`). Si faltan, no se envía nada y queda un aviso en el registro; la reserva o la publicación nunca fallan por eso. Los destinatarios `*.test` (usuarios de prueba) se omiten.

## Interesados («Avísame cuando haya combos cerca»)

- Formulario en la portada (`#avisame`) y en `/perfil`: correo, autorización de datos (Ley 1581), ubicación (dirección guardada, ubicación del navegador o punto en el mapa, siempre dentro de Popayán) y radio de 1, 2 o 5 km.
- Tabla `interesados` (migración `20261123000200_notificaciones.sql`). RLS: inserta cualquiera (con `autoriza_datos`); lee y borra solo el admin o el dueño (`user_id`). Un registro por correo y uno por usuario.
- Baja: cada correo trae `…/baja?t=<token_baja>` (también en la cabecera `List-Unsubscribe`). La página pide un clic y llama a `dar_de_baja_interesado(token)`. Desde `/perfil` el usuario con sesión también la borra.
- `/admin` muestra cuántos interesados hay.

### Cuándo se envía

1. **Al publicar** desde `/negocio/publicar` o `/admin/publicar`: la Server Action llama a `avisarInteresados([id])` con `after()`.
2. **Ofertas programadas** (las crea `pg_cron` con `publicar_programadas()` cada 5 min): la ruta `GET|POST /api/cron/interesados` busca ofertas activas de las últimas 12 horas que no estén en `ofertas_avisadas` y las avisa.

Reglas: solo ofertas activas, vigentes y públicas (ni `es_prueba` ni negocios inactivos); solo interesados dentro de su radio y sin correo en las últimas 6 horas; los más cercanos primero; como máximo `INTERESADOS_TOPE_POR_OFERTA` correos por oferta (por defecto 50). `ofertas_avisadas` evita que la Server Action y el cron avisen dos veces la misma oferta; `ultimo_envio` se reserva antes de enviar, así dos procesos no escriben a la misma persona. Si el SMTP falla en un envío, se le devuelve el turno.

Cuenta del proveedor: Resend gratis permite unos 100 correos al día en total (reservas incluidas). Con el tope de 50 por oferta, dos o tres publicaciones pueden agotarlo. Bajar `INTERESADOS_TOPE_POR_OFERTA` si hace falta.

### Programar la ruta del cron

La ruta exige `Authorization: Bearer <CRON_SECRET>`. Sin `CRON_SECRET` responde 503 y no hace nada.

- **Vercel Pro:** agregar a `vercel.json` `{"crons":[{"path":"/api/cron/interesados","schedule":"*/10 * * * *"}]}`. Vercel envía el encabezado solo si `CRON_SECRET` está en las variables del proyecto. **En el plan Hobby los cron solo pueden ser diarios** y un horario más frecuente hace fallar el despliegue: por eso no está en el repositorio.
- **Hobby (recomendado hoy):** un cron externo gratuito (p. ej. cron-job.org) cada 10 minutos a `https://<dominio>/api/cron/interesados`, método GET, con el encabezado `Authorization: Bearer <CRON_SECRET>`.
- **Desde Supabase** (`pg_net`): guardar el secreto en Vault y programarlo con `pg_cron`; hacerlo a mano en el SQL Editor, nunca en una migración:

```sql
select vault.create_secret('<CRON_SECRET>', 'cron_secret');
select cron.schedule('salvori-avisar-interesados', '*/10 * * * *', $$
  select net.http_get(
    url := 'https://<dominio>/api/cron/interesados',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))
  );
$$);
```

Prueba manual (PowerShell):

```powershell
curl.exe -H "Authorization: Bearer $env:CRON_SECRET" https://<dominio>/api/cron/interesados
```

Responde `{"ofertas":N,"enviados":M}`.

## Variables nuevas

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `CRON_SECRET` | Vercel (servidor) | Protege `/api/cron/interesados`. Cadena larga aleatoria. |
| `INTERESADOS_TOPE_POR_OFERTA` | Vercel (opcional) | Máximo de correos a interesados por publicación. Por defecto 50. |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_PLANTILLA`, `WHATSAPP_IDIOMA` | Vercel (opcional) | WhatsApp automático; ver `docs/WHATSAPP.md`. |

Las `SMTP_*` ya existían. Con Resend: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASS=<API key de Resend>`, `SMTP_FROM=Salvori <avisos@salvori.co>` (dominio verificado en Resend).
