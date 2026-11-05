# Guion de la demo

Hay dos demos. Para mostrar el flujo de punta a punta sin depender de nada, usa la **demo de frontend (`/demo`)**.

## A. Demo de frontend (`/demo`), la recomendada
Pantallas con datos de muestra guardados en el navegador. No usa la base de datos, no pide iniciar sesión y funciona igual en el preview y en producción.

**Dirección:** `<dominio>/demo`. En producción: https://salvori-app-dev-fetex.vercel.app/demo (no pide cuenta de Vercel).

**Cómo mostrarla:**
- **En un solo celular o computador:** la franja verde de arriba tiene «Ver como negocio» / «Ver como cliente» para cambiar de lado.
- **Lado a lado:** dos pestañas del mismo navegador (por ejemplo en un computador). Lo que reserva el cliente le llega al negocio en la otra pestaña.
- Los datos viven en ese navegador: dos celulares distintos **no** se sincronizan entre sí. Eso llega con la base de datos.
- Antes de empezar, toca **«Reiniciar»** en la franja verde: deja los datos de muestra con horarios desde la hora actual.

### Guion
1. **Inicio del cliente** (`/demo`): «Lo bueno se aprovecha.», el botón **«Reservar un combo»**, los 3 pasos (elige, reserva, recoge) y los combos cercanos con categoría, descuento, «Cierra en…», «Solo quedan N» y **«Reservar combo»**. Arriba está **«Tengo un negocio»**.
2. **Ficha del combo:** qué incluye, dónde recoger, cantidad y **«Reservar · $…»**.
3. **Confirma tu reserva:** franja de recogida, cómo paga al recoger (efectivo o Nequi; no paga nada ahora), nota opcional, total y ahorro → **«Confirmar reserva»**.
4. **Pedido en espera:** «Esperando confirmación del negocio», con su seguimiento.
5. **Cambia a «Ver como negocio»:** aparece **«🔔 ¡Nueva reserva!»** (suena y vibra si el navegador lo permite). En **«Lo que te falta por hacer»** toca **«Confirmar»**.
6. **Vuelve a «Ver como cliente» → Mis pedidos:** «Confirmado: ya puedes ir» y el **código de 6 caracteres**.
7. **Negocio → «Entregar pedido»:** escribe el código. Si está mal, lo avisa → **«Lo entregué ✓»**.
8. **Cliente:** «Entregado · Ahorraste $…» y el pedido pasa al **Historial** de «Mis pedidos».
9. **Negocio → «Subir un combo nuevo»:** foto opcional, tipo, nombre, qué incluye, cantidad, precio Salvori y valor real (descuento en vivo), horario y vista previa → **«Publicar combo»**. Aparece al instante en el inicio del cliente.
10. **Negocio → «Mis combos»:** sube o baja cupos y pausa lo que ya no tiene. **«Pedidos»:** pestañas Por confirmar, Por entregar, Entregados y Cancelados.

## B. Demo con base de datos (staging)
El flujo real con Supabase: `/negocio` y las reservas de verdad entre dos celulares. Necesita el preview (login de Vercel) y los usuarios de prueba.

1. `npm run demo:negocio` deja limpio el negocio «Panadería La Esquina (demo)».
2. En cada celular: `/entrar` → «Entrar con contraseña (demo)». El negocio usa `negocio.prueba@salvori.test` y el cliente `comprador.prueba@salvori.test` (contraseñas en `Credenciales.md`).
3. El negocio publica (Mi negocio → Publicar), el cliente reserva y el negocio confirma y entrega con el código.
