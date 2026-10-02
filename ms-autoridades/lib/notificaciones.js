// Emails a las autoridades por su alta, baja y reactivación en el sistema.
// Fire-and-forget: si falla, el alta o la baja ya quedaron hechas y solo se registra el error.

const { enviarCorreo } = require('./mailer');

const SOPORTE     = process.env.SOPORTE_EMAIL?.trim() || null;
const RESPONDER_A = process.env.SMTP_REPLY_TO?.trim() || null;

const fechaHoy = () => new Date().toLocaleDateString('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
});

const enviarEmail = (to, asunto, mensaje) => {
  enviarCorreo({ to, subject: asunto, text: mensaje })
    .catch(err => console.error(`Error enviando email a ${to}:`, err.message));
};

// Contacto: SOPORTE_EMAIL (o el administrador si no está configurado, nunca "escriba a undefined")
// y SMTP_REPLY_TO, que es a donde llega la respuesta si el destinatario contesta el correo
const lineaContacto = () => {
  const destino = SOPORTE ? `a ${SOPORTE}` : 'al administrador del sistema';
  if (!RESPONDER_A) return `Ante cualquier consulta, escriba ${destino}.`;
  if (RESPONDER_A.toLowerCase() === SOPORTE?.toLowerCase()) {
    return `Ante cualquier consulta, escriba ${destino} o responda este correo.`;
  }
  return `Ante cualquier consulta, escriba ${destino}. ` +
    `También puede responder este correo: su respuesta llegará a ${RESPONDER_A}.`;
};

// Pie común a todos los emails a autoridades (también los de audiencias)
const PIE =
  `${lineaContacto()}\n\n` +
  `Sistema de Gestión de Audiencias (SGPA)\n` +
  `Poder Judicial de la Provincia de Santa Fe`;

const CARGOS = { JUEZ: 'Juez/a', FISCAL: 'Fiscal' };
const cargo    = (c) => CARGOS[c] ?? c;
const distrito = (nombre) => nombre ?? 'No especificado';

const notificarAlta = (autoridad, nombreDistrito) => enviarEmail(
  autoridad.email,
  'SGPA — Registro como autoridad',
  `Estimado/a ${autoridad.nombre} ${autoridad.apellido}:\n\n` +
  `Le informamos que fue registrado/a en el Sistema de Gestión de Audiencias (SGPA) ` +
  `del Poder Judicial de la Provincia de Santa Fe con los siguientes datos:\n\n` +
  `· Cargo: ${cargo(autoridad.cargo)}\n` +
  `· Distrito: ${distrito(nombreDistrito)}\n` +
  `· Fecha de registro: ${fechaHoy()}\n\n` +
  `A partir de ahora va a recibir en este correo las notificaciones de las audiencias ` +
  `que se le asignen, así como de sus modificaciones, cancelaciones y suspensiones.\n\n` +
  `Si no esperaba este correo, avísenos.\n\n` +
  PIE,
);

const notificarBaja = (autoridad, motivo) => enviarEmail(
  autoridad.email,
  'SGPA — Baja como autoridad',
  `Estimado/a ${autoridad.nombre} ${autoridad.apellido}:\n\n` +
  `Le informamos que fue dado/a de baja como autoridad (${cargo(autoridad.cargo)}) ` +
  `en el SGPA el ${fechaHoy()}.\n\n` +
  `Motivo: ${motivo?.trim() || 'No especificado'}\n\n` +
  `A partir de este momento no se le asignarán nuevas audiencias ni recibirá notificaciones. ` +
  `Sus datos se conservan y puede ser reactivado/a.\n\n` +
  `Si cree que se trata de un error, avísenos.\n\n` +
  PIE,
);

const notificarReactivacion = (autoridad, nombreDistrito) => enviarEmail(
  autoridad.email,
  'SGPA — Reactivación como autoridad',
  `Estimado/a ${autoridad.nombre} ${autoridad.apellido}:\n\n` +
  `Le informamos que fue reactivado/a como autoridad en el SGPA el ${fechaHoy()}.\n\n` +
  `· Cargo: ${cargo(autoridad.cargo)}\n` +
  `· Distrito: ${distrito(nombreDistrito)}\n\n` +
  `Desde ahora se le pueden volver a asignar audiencias y va a recibir sus notificaciones en este correo.\n\n` +
  `Si no esperaba este correo, avísenos.\n\n` +
  PIE,
);

module.exports = { notificarAlta, notificarBaja, notificarReactivacion, PIE };
