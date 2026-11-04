# Backend de Salvori (Supabase)

Esquema en `supabase/migrations/`. Las cuatro primeras migraciones vienen del prototipo de Lovable (28 oct, probadas con 31 pruebas) y se portaron sin cambios. La quinta (`storage_y_tareas`) agrega el bucket y las tareas programadas. Nunca se edita una migración ya aplicada: cada cambio va en una nueva (`supabase migration new …`) y después se regeneran los tipos (`npm run db:types`).

| Entorno | Proyecto | Cómo se aplica |
|---|---|---|
| Staging | `salvori-staging` (`ekdpnsrigbpdnbwioozv`) | `supabase db push --remote` (lo puede hacer una sesión de Claude) |
| Producción | `salvori-prod` (se crea antes del P7) | Solo Dicson |

## Tablas

| Tabla | Para qué | Quién escribe |
|---|---|---|
| `user_roles` | Roles `comprador`, `negocio`, `admin` (enum `app_role`) | Trigger al registrarse (comprador) y admin por SQL |
| `negocios` | Perfil, ubicación, horario (`jsonb`), `es_prueba` | Admin |
| `negocio_miembros` | Qué usuario opera qué negocio | Admin |
| `ofertas` | Carril `comercial` o `lote`, contenido, foto, precios, cupos, ventana, estado | Miembros del negocio y admin; cupos solo por las funciones |
| `oferta_programacion` | Plantilla + días ISO (1 = lunes) + hora local; `ultima_publicacion` | Miembros del negocio y admin |
| `reservas` | Precios copiados al reservar, código, estado, fechas de cada paso | **Solo** `solicitar_reserva` y `cambiar_estado_reserva` |
| `calificaciones` | Calidad, aseo, atención (1–5), comentario ≤ 280 | Comprador con reserva entregada, una vez |
| `eventos` | Medición: `view_item`, `reserva_*`, `no_recogida` | Funciones |

Los datos con `es_prueba = true` nunca salen en el catálogo público.

## Funciones

| Función | Quién la llama | Qué hace |
|---|---|---|
| `solicitar_reserva(oferta_id, cantidad, observaciones, origen)` | Comprador | Bloquea la oferta, valida estado, ventana y cupos; descuenta cupos una sola vez y registra el evento |
| `cambiar_estado_reserva(reserva_id, nuevo_estado, datos)` | Negocio, admin; comprador solo para cancelar | Valida la transición. Confirmar genera el código; rechazar exige `motivo_rechazo`; entregar exige `codigo` y `metodo_pago`; rechazar y cancelar devuelven cupos |
| `reservas_negocio(negocio_id)` | Miembro del negocio, admin | Bandeja del negocio: nombre del comprador, código y observaciones, **sin** correo ni teléfono |
| `ahorro_comprador(uid)` | El propio comprador, admin | Suma (habitual − final) × cantidad de las reservas **entregadas** |
| `calificaciones_negocio(negocio_id)` | Cualquiera | Calificaciones públicas de un negocio activo |
| `registrar_vista(oferta_id, origen)` | Cualquiera | Evento `view_item` |
| `has_role(uid, rol)`, `es_miembro_negocio(negocio)` | Políticas RLS | Verificación de rol y membresía (`security definer`) |
| `puede_escribir_foto(nombre)` | Políticas de Storage | Ruta `<negocio_id>/<archivo>.(jpg\|jpeg\|png\|webp\|avif)` de un negocio propio |
| `cerrar_vencidas()` | pg_cron | Ver abajo |
| `publicar_programadas()` | pg_cron | Ver abajo |

Triggers: `salvori_asignar_comprador` (al crear un usuario en `auth.users`), `proteger_inventario_oferta` (nadie mueve cupos a mano), `validar_programacion` y `validar_calificacion`.

## Políticas (RLS)

RLS está activo en todas las tablas: 15 políticas en `public` y 4 en `storage.objects`.

| Tabla | Comprador | Negocio | Admin |
|---|---|---|---|
| negocios | lee activos (no prueba) | lee el suyo | todo |
| ofertas | lee activas o agotadas vigentes | lee, crea y edita las suyas | todo |
| oferta_programacion | — | todo sobre las suyas | todo |
| reservas | lee las suyas | por `reservas_negocio` | lee todas |
| calificaciones | crea para su entrega; lee las suyas | por `calificaciones_negocio` | lee todas |
| eventos | — | lee los de su negocio | todo |
| user_roles | lee los suyos | lee los suyos | lee todos |

Storage: bucket **público** `ofertas` (5 MB; jpeg, png, webp y avif). Lectura pública; escritura solo de miembros del negocio dueño de la carpeta.

## Tareas programadas (pg_cron)

Se ven en el panel de Supabase → **Integrations → Cron**.

| Tarea | Frecuencia | Qué hace |
|---|---|---|
| `salvori-cerrar-vencidas` | cada 15 min | Reservas `confirmada` o `lista` cuya ventana terminó → `no_recogida` (con evento; el cupo no vuelve). Ofertas `activa` o `agotada` vencidas → `cerrada` |
| `salvori-publicar-programadas` | cada 5 min | Para cada programación activa cuyo día ISO y hora (America/Bogota) ya llegaron hoy, copia la plantilla como oferta `activa` con la misma hora local de recogida en la fecha de hoy. Una vez por día (`ultima_publicacion`) |

## Datos de prueba (solo staging)

- `supabase/seed.sql`: los 6 negocios del prototipo con una oferta comercial cada uno, ventana de hoy y `es_prueba = true`. Se reaplica con `supabase db push --remote --include-seed` o pegándolo en el editor SQL.
- Usuarios de prueba: `npm run usuarios:prueba` crea `comprador.prueba@salvori.test`, `negocio.prueba@salvori.test` (miembro de La Fonda Payanesa) y `admin.prueba@salvori.test`. Las contraseñas salen de `PRUEBA_PASSWORD_*` en `.env.local`, nunca del repositorio.

## Primer admin (lo corre Dicson)

1. Inicia sesión una vez en la app (o crea tu usuario en Supabase → Authentication → Users) con tu correo de Salvori.
2. En Supabase → **SQL Editor** de `salvori-staging`, corre (cambiando el correo):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'TU-CORREO@dominio.com'
on conflict do nothing;

-- Comprobar
select u.email, r.role from public.user_roles r join auth.users u on u.id = r.user_id where r.role = 'admin';
```

3. Para vincular a alguien como operador de un negocio:

```sql
insert into public.user_roles (user_id, role)
select id, 'negocio' from auth.users where email = 'CORREO-DEL-NEGOCIO@dominio.com'
on conflict do nothing;

insert into public.negocio_miembros (negocio_id, user_id)
select n.id, u.id from public.negocios n, auth.users u
where n.slug = 'slug-del-negocio' and u.email = 'CORREO-DEL-NEGOCIO@dominio.com'
on conflict do nothing;
```

## Pruebas

`npm run test:db` corre `tests/db` contra staging con sesiones reales de los 3 roles. Cada prueba crea sus usuarios y datos y los borra al final. Cubre: el último cupo con dos reservas a la vez, rechazo y cancelación que devuelven cupo, código solo al confirmar, entrega con código y método de pago, ahorro solo de entregadas, aislamiento entre negocios y entre compradores, calificación única después de la entrega y la tarea de no recogidas.

Necesita `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` de staging (en `.env.local` o en el entorno). En CI van como secretos del repositorio: `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY` y `STAGING_SUPABASE_SERVICE_ROLE_KEY`. Las pruebas se niegan a correr si la URL no es la de staging.
