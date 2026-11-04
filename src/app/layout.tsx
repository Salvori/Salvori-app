import type { Metadata, Viewport } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const titulo = "Salvori — Ofertas de comida cerca de ti";
const descripcion =
  "Reserva ofertas de panaderías, cafés y restaurantes cerca de ti en Popayán y recógelas en el local.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: titulo, template: "%s · Salvori" },
  description: descripcion,
  applicationName: "Salvori",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: titulo,
    description: descripcion,
    type: "website",
    locale: "es_CO",
    siteName: "Salvori",
  },
  twitter: { card: "summary_large_image", title: titulo, description: descripcion },
};

export const viewport: Viewport = {
  themeColor: "#174C3C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className={`${manrope.variable} ${sourceSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
