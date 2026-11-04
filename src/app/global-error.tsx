"use client";

// Último recurso si falla el layout raíz: debe traer su propio <html>.
export default function ErrorGlobal({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es-CO">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F8F5EA", color: "#242824" }}>
        <main style={{ maxWidth: 560, margin: "20vh auto", padding: "0 20px" }}>
          <h1 style={{ color: "#174C3C" }}>Algo salió mal</h1>
          <p>Tuvimos un problema al cargar Salvori. Intenta de nuevo en unos segundos.</p>
          <button type="button" onClick={reset}>
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
