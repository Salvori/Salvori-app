# Guion de la demo (staging)

Muestra el ciclo completo: el negocio publica un combo, el cliente lo reserva, el negocio recibe el aviso y confirma, el cliente ve su código y el negocio entrega con ese código.

## Antes de empezar (5 minutos)
1. Desde `salvori-app/`, deja el catálogo limpio con el negocio demo sin ofertas:
   ```bash
   npm run demo:negocio
   ```
   Crea «Panadería La Esquina (demo)» en el Parque Caldas, con `negocio.prueba@salvori.test` como dueño.
2. Ten a mano las contraseñas de los usuarios de prueba (`Credenciales.md` → Salvori → Usuarios de prueba).
3. Abre el **preview** del PR en dos pantallas:
   - **Celular del negocio:** `/entrar` → «Entrar con contraseña (demo)» → `negocio.prueba@salvori.test`.
   - **Celular del cliente:** `/entrar` → «Entrar con contraseña (demo)» → `comprador.prueba@salvori.test`.
   - El preview pide iniciar sesión en Vercel (cuenta `fetex-3107`): inicia sesión en ambos celulares. Si el panel del deployment muestra **Share**, ese enlace temporal sirve para abrirlo sin cuenta.
4. En el celular del negocio, entra a **Mi negocio** y toca **«Activar aviso sonoro de reservas»** (el navegador necesita un toque para permitir sonido). Acepta las notificaciones si las pide.

## Guion
1. **Negocio publica** (Mi negocio → Publicar):
   1. Toma una foto real del producto.
   2. Elige «Promoción o combo», escribe el título y qué recibe exactamente, el precio habitual y el precio Salvori (se ve el % de descuento) y los cupos.
   3. Deja la ventana de recogida (de ahora a 2 horas), revisa la vista previa y toca **Publicar oferta**.
2. **Cliente encuentra y reserva:** en la portada aparece la oferta con foto, descuento, «Quedan N», distancia y horario. Reservar → elige la cantidad → **Reservar**. Ve «Esperando confirmación del negocio».
3. **Negocio recibe el aviso:** suena, vibra y aparece «¡Nueva reserva!» arriba de la bandeja. Toca **Confirmar**.
4. **Cliente ve su código** en segundos, sin recargar: «Confirmada: ya puedes ir» y el código de 6 caracteres.
5. **Entrega en el local:** el negocio toca **Entregar**, escribe el código del cliente, elige cómo pagó (efectivo, Nequi, transferencia o tarjeta) y **Confirmar entrega**. Si el código está mal, la app lo avisa.
6. **Cierre:** el cliente ve «Entregada · Ahorraste $…» y el negocio ve sus ventas del día.

## Si algo falla
- **La oferta no aparece en la portada:** revisa que la hora de fin no haya pasado y que estés en el negocio demo, no en uno «(prueba)», cuyas ofertas no salen al público.
- **No suena el aviso:** toca «Activar aviso sonoro». La bandeja igual se actualiza sola en segundos.
- **Repetir la demo:** `npm run demo:negocio` borra las ofertas y reservas del negocio demo y lo deja limpio.
