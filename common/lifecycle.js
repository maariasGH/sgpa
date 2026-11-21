const instalarCicloDeVida = (server, {
  nombre,
  cerrarRecursos = async () => {},
  tiempoCierreMs = 10_000,
}) => {
  let cerrando = false;

  const cerrar = (motivo, error) => {
    if (error) {
      console.error(`Error fatal en ${nombre} (${motivo}):`, error.stack || error);
      process.exitCode = 1;
    }
    if (cerrando) return;
    cerrando = true;

    if (!error) console.log(`Cierre ordenado de ${nombre} por ${motivo}`);
    const forzarCierre = setTimeout(() => {
      console.error(`Se agotó el tiempo de cierre de ${nombre}`);
      process.exit(1);
    }, tiempoCierreMs);
    forzarCierre.unref();

    server.close(async err => {
      if (err) {
        console.error(`Error cerrando ${nombre}:`, err.message);
        process.exitCode = 1;
      }
      try {
        await cerrarRecursos();
      } catch (cierreError) {
        console.error(`Error liberando recursos de ${nombre}:`, cierreError.message);
        process.exitCode = 1;
      }
      clearTimeout(forzarCierre);
      process.exit(process.exitCode || 0);
    });
  };

  process.on('SIGTERM', () => cerrar('SIGTERM'));
  process.on('SIGINT', () => cerrar('SIGINT'));
  process.on('unhandledRejection', reason => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    cerrar('unhandledRejection', error);
  });
  process.on('uncaughtException', error => cerrar('uncaughtException', error));
};

module.exports = instalarCicloDeVida;
