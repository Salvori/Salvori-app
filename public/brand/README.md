# Logo y favicon de Salvori

Esta carpeta guarda la marca. **No se dibuja ni se genera**: Dicson copia los archivos originales del prototipo de Lovable.

| Archivo en el prototipo | Va en este repositorio |
|---|---|
| `src/assets/logo-principal.png` | `public/brand/logo-principal.png` |
| `public/favicon.svg` | `public/favicon.svg` |

Mientras no estén, la cabecera muestra «Salvori» en texto (`src/components/marca.tsx`). Cuando el logo esté aquí, ese componente pasa a usar `next/image` con `/brand/logo-principal.png`.
