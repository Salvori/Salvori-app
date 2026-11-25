"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  EVENTO_CONSENTIMIENTO,
  EVENTO_PREFERENCIAS,
  abrirPreferencias,
  guardarConsentimiento,
  idsMedicion,
  leerConsentimiento,
  medicionConfigurada,
  type Consentimiento,
} from "@/lib/consentimiento";
import { vaciarCola } from "@/lib/medicion";

type VentanaMedicion = Window & {
  dataLayer?: unknown[];
  _fbq?: unknown;
};

const DENEGADO = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

const CONCEDIDO = {
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
} as const;

/** Cola de gtag con Consent Mode v2: «denied» por defecto y «granted» al aceptar. */
function iniciarGa(id: string) {
  const w = window as VentanaMedicion;
  if (typeof w.gtag === "function") {
    w.gtag("consent", "update", CONCEDIDO);
    return;
  }
  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtag() {
    // gtag.js espera el objeto `arguments`, no un arreglo.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("consent", "default", { ...DENEGADO, wait_for_update: 500 });
  w.gtag("consent", "update", CONCEDIDO);
  w.gtag("js", new Date());
  w.gtag("config", id);
}

/** Cola estándar del píxel de Meta (equivale al fragmento oficial, sin el <script> inline). */
function iniciarPixel(id: string) {
  const w = window as VentanaMedicion;
  if (typeof w.fbq === "function") {
    w.fbq("consent", "grant");
    return;
  }
  type Fbq = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue: unknown[];
    push: unknown;
    loaded: boolean;
    version: string;
  };
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  w.fbq = fbq;
  w._fbq = fbq;
  fbq("consent", "grant");
  fbq("init", id);
  fbq("track", "PageView");
}

function revocar() {
  const w = window as VentanaMedicion;
  if (typeof w.gtag === "function") w.gtag("consent", "update", DENEGADO);
  if (typeof w.fbq === "function") w.fbq("consent", "revoke");
}

/**
 * GA4 + píxel de Meta solo con consentimiento, y el banner de cookies.
 * Sin NEXT_PUBLIC_GA_ID ni NEXT_PUBLIC_META_PIXEL_ID no pinta nada.
 */
export function Medicion() {
  const { ga, pixel } = idsMedicion();
  const configurada = Boolean(ga || pixel);
  const [eleccion, setEleccion] = useState<Consentimiento | null>(null);
  const [verBanner, setVerBanner] = useState(false);
  const pathname = usePathname();
  const primeraRuta = useRef(true);

  useEffect(() => {
    if (!configurada) return;
    const actual = leerConsentimiento();
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage solo existe en el navegador */
    setEleccion(actual);
    setVerBanner(actual === null);
    /* eslint-enable react-hooks/set-state-in-effect */
    const alCambiar = (e: Event) => setEleccion((e as CustomEvent<Consentimiento>).detail);
    const alAbrir = () => setVerBanner(true);
    window.addEventListener(EVENTO_CONSENTIMIENTO, alCambiar);
    window.addEventListener(EVENTO_PREFERENCIAS, alAbrir);
    return () => {
      window.removeEventListener(EVENTO_CONSENTIMIENTO, alCambiar);
      window.removeEventListener(EVENTO_PREFERENCIAS, alAbrir);
    };
  }, [configurada]);

  useEffect(() => {
    if (!configurada) return;
    if (eleccion === "aceptado") {
      if (ga) iniciarGa(ga);
      if (pixel) iniciarPixel(pixel);
      vaciarCola();
    } else if (eleccion === "esencial") {
      revocar();
    }
  }, [configurada, eleccion, ga, pixel]);

  // GA4 mide los cambios de ruta solo (medición mejorada); el píxel necesita su PageView.
  useEffect(() => {
    if (primeraRuta.current) {
      primeraRuta.current = false;
      return;
    }
    if (eleccion === "aceptado" && pixel && typeof window.fbq === "function") window.fbq("track", "PageView");
  }, [pathname, eleccion, pixel]);

  if (!configurada) return null;

  const elegir = (v: Consentimiento) => {
    guardarConsentimiento(v);
    setVerBanner(false);
  };

  return (
    <>
      {eleccion === "aceptado" && ga && (
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`} strategy="afterInteractive" />
      )}
      {eleccion === "aceptado" && pixel && (
        <Script src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
      )}
      {verBanner && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Preferencias de cookies"
          className="fixed inset-x-3 bottom-3 z-[1000] mx-auto max-w-xl rounded-2xl bg-card p-4 text-sm shadow-card ring-1 ring-border md:inset-x-auto md:right-4 md:bottom-4"
        >
          <p className="leading-snug">
            Usamos cookies de medición (Google Analytics y Meta) para saber qué ofertas funcionan y mejorar Salvori. Solo
            se activan si aceptas; las esenciales siempre funcionan.{" "}
            <Link href="/privacidad#cookies" className="font-semibold text-primary underline underline-offset-4">
              Más información
            </Link>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => elegir("esencial")}
              className="rounded-full border border-primary px-4 py-2.5 font-display font-bold text-primary"
            >
              Solo esenciales
            </button>
            <button
              type="button"
              onClick={() => elegir("aceptado")}
              className="rounded-full bg-primary px-4 py-2.5 font-display font-bold text-primary-foreground"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Enlace «Preferencias de cookies» (pie y /privacidad). Sin IDs de medición no aparece. */
export function PreferenciasCookies({ className }: { className?: string }) {
  if (!medicionConfigurada()) return null;
  return (
    <button type="button" onClick={abrirPreferencias} className={className ?? "underline underline-offset-4"}>
      Preferencias de cookies
    </button>
  );
}
