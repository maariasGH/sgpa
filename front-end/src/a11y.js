// Props para que una fila o tarjeta clickeable también se active con teclado
// (Tab para llegar, Enter o Espacio para abrir). Ignora las teclas que vienen
// de botones internos, que tienen su propia acción.
export const activable = (accion) => ({
  tabIndex: 0,
  className: "activable",
  onClick: accion,
  onKeyDown: (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      accion();
    }
  },
});

// Para contenedores de botones dentro de una fila activable: que el click
// en el botón no abra también el detalle de la fila
export const noPropagar = { onClick: (e) => e.stopPropagation() };
