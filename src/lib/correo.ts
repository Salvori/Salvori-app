import "server-only";
import nodemailer from "nodemailer";

export type Correo = { para: string; asunto: string; texto: string; html: string };
export type ResultadoCorreo = { enviado: true } | { enviado: false; motivo: "sin-configurar" | "destinatario-de-prueba" | "error" };

type Entorno = Record<string, string | undefined>;

/** SMTP desde el entorno (hoy el Gmail de Salvori; luego Resend sin tocar el código). */
export function configSmtp(env: Entorno = process.env) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = env;
  const puerto = Number(SMTP_PORT);
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM || !Number.isInteger(puerto) || puerto <= 0) return null;
  return { host: SMTP_HOST, port: puerto, secure: puerto === 465, auth: { user: SMTP_USER, pass: SMTP_PASS }, from: SMTP_FROM };
}

/** Nunca lanza: un correo que no sale no debe romper la acción que lo pidió. */
export async function enviarCorreo(correo: Correo, env: Entorno = process.env): Promise<ResultadoCorreo> {
  const smtp = configSmtp(env);
  if (!smtp) {
    console.warn(`[correo] Sin enviar «${correo.asunto}»: faltan SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS o SMTP_FROM.`);
    return { enviado: false, motivo: "sin-configurar" };
  }
  // Los usuarios de prueba (@salvori.test) no tienen buzón: evita rebotes en el SMTP real.
  if (/\.test$/i.test(correo.para)) {
    console.info(`[correo] Sin enviar «${correo.asunto}»: el destinatario es de prueba.`);
    return { enviado: false, motivo: "destinatario-de-prueba" };
  }
  try {
    const { from, ...transporte } = smtp;
    await nodemailer.createTransport(transporte).sendMail({
      from,
      to: correo.para,
      subject: correo.asunto,
      text: correo.texto,
      html: correo.html,
    });
    return { enviado: true };
  } catch (e) {
    console.error(`[correo] No se pudo enviar «${correo.asunto}»:`, e instanceof Error ? e.message : e);
    return { enviado: false, motivo: "error" };
  }
}
