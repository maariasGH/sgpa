import { useEffect, useRef } from "react";

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Comportamiento accesible de un diálogo (modal o drawer):
// - Escape lo cierra
// - al abrir enfoca el primer campo (o el diálogo) y Tab no se escapa del diálogo
// - al cerrar devuelve el foco al elemento que lo abrió
export function useDialogo(onCerrar) {
  const ref = useRef(null);
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => { onCerrarRef.current = onCerrar; });

  useEffect(() => {
    const dialogo = ref.current;
    const anterior = document.activeElement;
    const enfocables = () => [...dialogo.querySelectorAll(ENFOCABLES)];

    // Prioriza un campo de formulario; si no hay, el diálogo mismo
    const campo = dialogo.querySelector("input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
    (campo ?? dialogo).focus();

    const alTeclear = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCerrarRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = enfocables();
      if (!lista.length) { e.preventDefault(); return; }
      const primero = lista[0], ultimo = lista[lista.length - 1];
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === dialogo)) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault(); primero.focus();
      }
    };

    dialogo.addEventListener("keydown", alTeclear);
    return () => {
      dialogo.removeEventListener("keydown", alTeclear);
      anterior?.focus?.();
    };
  }, []);

  return ref;
}
