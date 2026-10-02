// Emails a los operadores. El envío lo hace ms-autoridades (único microservicio con
// Nodemailer/SMTP) por su endpoint interno POST /autoridades/notificaciones/email.
// Fire-and-forget: si falla, el alta o la baja ya quedaron hechas y solo se registra el error.

const MS_AUTORIDADES_URL = process.env.MS_AUTORIDADES_URL || 'http://localhost:3003';
const SOPORTE     = process.env.SOPORTE_EMAIL?.trim() || null;
const RESPONDER_A = process.env.SMTP_REPLY_TO?.trim() || null;

const fechaHoy = () => new Date().toLocaleDateString('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
});

const enviarEmail = (to, asunto, mensaje) => {
  fetch(`${MS_AUTORIDADES_URL}/autoridades/notificaciones/email`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ to, asunto, mensaje }),
  })
    .then(resp => { if (!resp.ok) throw new Error(`ms-autoridades respondió ${resp.status}`); })
    .catch(err => console.error(`Error enviando email a ${to}:`, err.message));
};

// Contacto: SOPORTE_EMAIL (o el administrador si no está configurado, nunca "escribí a undefined")
// y SMTP_REPLY_TO, que es a donde llega la respuesta si el operador contesta el correo
// (el encabezado Reply-To lo pone ms-autoridades al enviar)
const lineaContacto = () => {
  const destino = SOPORTE ? `a ${SOPORTE}` : 'al administrador del sistema';
  const base = `Si tenés dudas o problemas con tu cuenta, escribí ${destino}`;
  if (!RESPONDER_A) return `${base}.`;
  if (RESPONDER_A.toLowerCase() === SOPORTE?.toLowerCase()) return `${base} o respondé este correo.`;
  return `${base}. También podés responder este correo: tu respuesta llega a ${RESPONDER_A}.`;
};

const PIE =
  `${lineaContacto()}\n\n` +
  `Sistema de Gestión de Audiencias (SGPA)\n` +
  `Poder Judicial de la Provincia de Santa Fe`;

const distrito = (nombre) => nombre ?? 'No especificado';

// La contraseña nunca se envía por correo: la entrega el administrador
const notificarAlta = (usuario, nombreDistrito) => enviarEmail(
  usuario.email,
  'SGPA — Alta de tu cuenta de operador',
  `Hola ${usuario.nombre}:\n\n` +
  `Te damos la bienvenida al Sistema de Gestión de Audiencias (SGPA) ` +
  `del Poder Judicial de la Provincia de Santa Fe.\n\n` +
  `Tu cuenta de operador fue dada de alta con los siguientes datos:\n\n` +
  `· Usuario: ${usuario.username}\n` +
  `· Rol: Operador\n` +
  `· Distrito: ${distrito(nombreDistrito)}\n` +
  `· Fecha de alta: ${fechaHoy()}\n\n` +
  `Desde tu cuenta vas a poder programar y gestionar las audiencias y autoridades de tu distrito.\n\n` +
  `Por seguridad, la contraseña no se envía por correo: te la entrega el administrador del sistema.\n\n` +
  `Si no esperabas este correo, avisanos.\n\n` +
  PIE,
);

const notificarBaja = (usuario, motivo) => enviarEmail(
  usuario.email,
  'SGPA — Baja de tu cuenta de operador',
  `Hola ${usuario.nombre}:\n\n` +
  `Te informamos que tu cuenta de operador del SGPA (usuario: ${usuario.username}) ` +
  `fue dada de baja el ${fechaHoy()}.\n\n` +
  `Motivo: ${motivo?.trim() || 'No especificado'}\n\n` +
  `A partir de este momento no vas a poder iniciar sesión. Tus datos se conservan ` +
  `y la cuenta puede ser reactivada por el administrador.\n\n` +
  `Si creés que se trata de un error, avisanos.\n\n` +
  PIE,
);

const notificarReactivacion = (usuario, nombreDistrito) => enviarEmail(
  usuario.email,
  'SGPA — Reactivación de tu cuenta de operador',
  `Hola ${usuario.nombre}:\n\n` +
  `Te informamos que tu cuenta de operador del SGPA fue reactivada el ${fechaHoy()}.\n\n` +
  `Ya podés volver a iniciar sesión con tu usuario de siempre:\n\n` +
  `· Usuario: ${usuario.username}\n` +
  `· Rol: Operador\n` +
  `· Distrito: ${distrito(nombreDistrito)}\n\n` +
  `Tu contraseña es la misma que tenías antes de la baja. Si no la recordás, ` +
  `pedile una nueva al administrador del sistema.\n\n` +
  `Si no esperabas este correo, avisanos.\n\n` +
  PIE,
);

module.exports = { notificarAlta, notificarBaja, notificarReactivacion };
