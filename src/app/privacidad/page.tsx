import type { Metadata } from "next";
import { Cabecera } from "@/components/cabecera";

export const metadata: Metadata = { title: "Tratamiento de datos personales" };

// TEXTO PROVISIONAL: lo revisa Dicson antes de abrir a usuarios reales.
export default function Privacidad() {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-4">
        <p className="mb-4 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-mandarina-texto">
          Texto provisional en revisión
        </p>
        <h1 className="font-display text-3xl font-extrabold text-primary">Política de tratamiento de datos personales</h1>
        <div className="mt-6 space-y-5 leading-relaxed">
          <p>
            Salvori, con domicilio en Popayán (Cauca, Colombia), es responsable del tratamiento de los datos personales que
            recoge en esta aplicación, conforme a la Ley 1581 de 2012 y sus normas reglamentarias.
          </p>
          <section>
            <h2 className="font-display text-xl font-bold text-primary">Qué datos tratamos</h2>
            <p className="mt-2">
              Tu correo electrónico, el nombre que nos indiques, tus reservas (ofertas, cantidades, observaciones, estados y
              método de pago registrado por el negocio), tus calificaciones y, si la autorizas en tu navegador, tu
              ubicación aproximada para mostrarte ofertas cercanas. La ubicación no se guarda en nuestros servidores.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold text-primary">Para qué los usamos</h2>
            <p className="mt-2">
              Para permitirte entrar, gestionar tus reservas con los negocios, mostrarte tu ahorro, mejorar el servicio
              con estadísticas y comunicarnos contigo sobre tus reservas. Los negocios solo ven tu nombre, el código de
              recogida y tus observaciones; nunca tu correo ni tu teléfono.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold text-primary">Avisos de combos cerca</h2>
            <p className="mt-2">
              Si pides que te avisemos de combos cercanos, guardamos tu correo, el punto que elegiste (tu dirección, tu
              ubicación del momento o un punto en el mapa) y la distancia, solo para escribirte cuando un negocio publique
              un combo a esa distancia, como máximo una vez cada 6 horas. Te das de baja con el enlace de cualquier correo
              o desde tu perfil, y en ese momento borramos esos datos. Los negocios no ven esta información.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold text-primary">Tus derechos</h2>
            <p className="mt-2">
              Puedes conocer, actualizar, rectificar y pedir la supresión de tus datos, solicitar prueba de tu
              autorización, ser informado sobre su uso, revocar la autorización y presentar quejas ante la
              Superintendencia de Industria y Comercio.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold text-primary">Cómo ejercerlos</h2>
            <p className="mt-2">
              Escríbenos al correo de contacto de Salvori (se publicará aquí antes del lanzamiento). Respondemos dentro de
              los plazos de ley.
            </p>
          </section>
          <p className="text-sm text-muted-foreground">Versión 2026-11-04.</p>
        </div>
      </main>
    </div>
  );
}
