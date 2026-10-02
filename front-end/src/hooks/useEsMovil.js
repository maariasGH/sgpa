import { useEffect, useState } from "react";

// Ancho a partir del cual se considera pantalla de teléfono (coincide con index.css)
export const BREAKPOINT_MOVIL = 640;

// true si el viewport es más angosto que `ancho` px. Se actualiza al rotar o redimensionar.
export function useEsMovil(ancho = BREAKPOINT_MOVIL) {
  const consulta = `(max-width: ${ancho}px)`;
  const [esMovil, setEsMovil] = useState(() => window.matchMedia(consulta).matches);

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const actualizar = () => setEsMovil(mq.matches);
    actualizar();
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, [consulta]);

  return esMovil;
}
