# WhatsApp automático al negocio (API de WhatsApp Cloud de Meta)

Estado al lanzamiento (23 nov 2026): **listo en el código y apagado**. Mientras no existan las tres variables, cada reserva nueva llega al negocio por el tono del panel, por correo y por el botón «Enviar mi pedido por WhatsApp» que pulsa el comprador.

Código: `src/lib/whatsapp.ts` (`enviarNuevaReservaWhatsApp`). Lo llama `avisarNegocio` (`src/lib/avisos-negocio.ts`) después de cada reserva nueva, con `after()`: si Meta falla, la reserva ya quedó hecha y el error queda en el registro de Vercel con el prefijo `[whatsapp]`.

## Variables (solo servidor, en Vercel; nunca en el repositorio)

| Variable | Qué es |
| --- | --- |
| `WHATSAPP_TOKEN` | Token permanente de un usuario del sistema de Meta Business con permiso `whatsapp_business_messaging`. |
| `WHATSAPP_PHONE_ID` | «Identificador del número de teléfono» de WhatsApp Manager (no es el número). |
| `WHATSAPP_PLANTILLA` | Nombre de la plantilla aprobada: `nueva_reserva`. |
| `WHATSAPP_IDIOMA` | Opcional. Código de idioma con el que se aprobó la plantilla. Por defecto `es`. |

Si falta cualquiera de las tres primeras, el módulo no hace nada (`motivo: "apagado"`). Las claves van a `Credenciales.md` del vault y a Vercel, no a `.env.example`.

## Pasos para activarlo

1. **Cuenta de Meta Business** de Salvori verificada (business.facebook.com → Configuración del negocio → Centro de seguridad → Verificación).
2. **App de Meta** (developers.facebook.com → Crear app → tipo «Negocio») y agregar el producto **WhatsApp**.
3. **Número de Salvori**: en WhatsApp → Configuración de la API, agregar un número que no esté usando la app de WhatsApp normal (o migrarlo). Verificarlo por SMS o llamada. Copiar el **identificador del número** → `WHATSAPP_PHONE_ID`.
4. **Token permanente**: Configuración del negocio → Usuarios del sistema → crear uno con rol de administrador → asignarle la app y la cuenta de WhatsApp → «Generar token» con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`, sin vencimiento → `WHATSAPP_TOKEN`.
5. **Método de pago** en la cuenta de WhatsApp (WhatsApp Manager → Facturación). Las plantillas de categoría *Utilidad* tienen costo por mensaje entregado en Colombia; revisar la tarifa vigente antes de activar.
6. **Plantilla**: WhatsApp Manager → Plantillas de mensajes → Crear. Datos abajo. Esperar la aprobación (minutos a 24 h).
7. **Probar**: en un preview de Vercel, poner las variables solo en *Preview*, poner en `telefono_whatsapp` de un negocio de prueba un celular propio, hacer una reserva y revisar que llegue. Revisar el registro si no llega.
8. **Producción**: copiar las variables al entorno *Production* de Vercel y volver a desplegar.

Cada negocio debe tener su celular en `/admin/negocios/[id]` (campo WhatsApp). Se acepta `3001234567` o con indicativo `573001234567`.

## Plantilla propuesta

- **Nombre:** `nueva_reserva`
- **Categoría:** Utilidad
- **Idioma:** Español (`es`); si se aprueba con otro código, ponerlo en `WHATSAPP_IDIOMA`.
- **Cuerpo** (5 variables, en este orden; así las envía `cuerpoNuevaReserva`):

```
Hola, {{1}}. Tienes una reserva nueva en Salvori:
{{2}}
A nombre de: {{3}}
{{4}}

Confírmala para que el cliente vaya: {{5}}
```

- **Ejemplos para la revisión de Meta:** `Panadería La Segunda` · `2 × Café con pandebono x2` · `Laura` · `Recoge de 17:00 a 19:00` · `https://salvori.co/negocio?n=la-segunda`
- **Pie (opcional):** `Salvori · Lo bueno se aprovecha.`

Del comprador solo va el nombre que puso en su perfil (nunca su correo ni su teléfono), igual que en la bandeja.

## Límites a tener en cuenta

- Una cuenta nueva empieza con un límite de conversaciones iniciadas por la empresa por día; sube con el uso y la calidad.
- Si el negocio bloquea o reporta los mensajes, baja la calificación del número. Avisar a cada negocio antes de activarlo.
- Las respuestas del negocio a ese número llegan a la cuenta de WhatsApp Cloud, no a un celular: decirle que responda o confirme desde el panel de Salvori.
