import { useEffect, useState } from "react";

// Devuelve `valor` recién cuando dejó de cambiar durante `ms` milisegundos.
// Evita una request por cada tecla en los buscadores.
export function useDebounce(valor, ms = 300) {
  const [demorado, setDemorado] = useState(valor);

  useEffect(() => {
    const t = setTimeout(() => setDemorado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);

  return demorado;
}
