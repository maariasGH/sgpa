import { useCallback, useEffect, useRef, useState } from "react";

// Ejecuta `cargar` (async) cada vez que cambian `deps` y expone { datos, error, cargando, recargar }.
// Ignora respuestas viejas si las dependencias cambiaron mientras tanto.
// `deps` debe ser serializable (valores primitivos u objetos simples de filtros).
export function useCarga(cargar, deps, inicial = null) {
  const [estado, setEstado] = useState({ datos: inicial, error: null, cargando: true });
  const [version, setVersion] = useState(0);
  const cargarRef = useRef(cargar);
  const clave = JSON.stringify(deps);

  // Siempre usar la última función recibida (se declara antes que el efecto de carga)
  useEffect(() => { cargarRef.current = cargar; });

  useEffect(() => {
    let vigente = true;
    Promise.resolve()
      .then(() => {
        if (vigente) setEstado(e => ({ ...e, cargando: true }));
        return cargarRef.current();
      })
      .then(datos => { if (vigente) setEstado({ datos, error: null, cargando: false }); })
      .catch(error => { if (vigente) setEstado(e => ({ ...e, error, cargando: false })); });
    return () => { vigente = false; };
  }, [clave, version]);

  const recargar = useCallback(() => setVersion(v => v + 1), []);

  return { ...estado, recargar };
}
