"use client";

import { useEffect } from "react";
import { marcarOrigen } from "./acciones";

export function MarcarOrigen({ slug }: { slug: string }) {
  useEffect(() => {
    marcarOrigen(slug).catch(() => {});
  }, [slug]);
  return null;
}
