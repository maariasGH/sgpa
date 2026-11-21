const { fetchT } = require('../lib/http');
const { registrarSeguro } = require('../lib/colaAuditoria');

// Interceptor AOP de auditoría.
// Antes de reenviar una escritura toma un snapshot del registro ("antes"); cuando el
// microservicio responde 2xx persiste la acción en una cola antes de responder al cliente.
// Los microservicios no saben que están siendo auditados.

const ESCRITURA = ['POST', 'PUT', 'PATCH', 'DELETE'];
const CAMPOS_SENSIBLES = new Set(['password', 'password_hash', 'token']);

// Quita contraseñas y tokens de cualquier objeto antes de guardarlo en el log
const sanitizar = (valor) => {
  if (Array.isArray(valor)) return valor.map(sanitizar);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([clave]) => !CAMPOS_SENSIBLES.has(clave.toLowerCase()))
        .map(([clave, v]) => [clave, sanitizar(v)])
    );
  }
  return valor;
};

const headersUsuario = (usuario) => ({
  'x-usuario-id':       String(usuario.id_usuario),
  'x-usuario-rol':      usuario.rol,
  'x-usuario-distrito': usuario.id_distrito ? String(usuario.id_distrito) : '',
});

// Estado del registro antes del cambio (null si no se puede obtener)
const snapshot = async (req, id) => {
  try {
    const { base, recurso } = req.servicio;
    const resp = await fetchT(`${base}/${recurso}/${id}`, {
      headers: {
        ...headersUsuario(req.usuario),
        'x-internal-key': process.env.INTERNAL_API_KEY,
      },
    });
    if (!resp.ok) return null;
    const body = await resp.json();
    return body.data ?? body;
  } catch {
    return null;
  }
};

const tipoAccion = (req, partes, loginFallido = false) => {
  if (req.servicio.recurso === 'auth') {
    if (partes[1] === 'login') return loginFallido ? 'LOGIN_FALLIDO' : 'LOGIN';
    if (partes[1] === 'cambiar-password') return 'MODIFICACION';
    return 'LOGOUT';
  }
  if (req.method === 'POST')   return 'ALTA';
  // DELETE de un sub-recurso (ej: /audiencias/5/video) modifica la entidad, no la da de baja
  if ((req.method === 'DELETE' && partes.length <= 2) || partes[2] === 'baja') return 'BAJA';
  return 'MODIFICACION';
};

// Operaciones masivas: el microservicio devuelve { cambios: [{ <pk>, antes, despues }] }
// y se registra un log por cada registro modificado
const registrarCambios = (req, partes, cambios) => {
  const { pk } = req.servicio;
  return Promise.all(cambios.map(c =>
    registrar(req, { partes, id: c[pk] ?? null, antes: c.antes ?? null, datos: c.despues ?? null })
  ));
};

const registrar = async (req, { partes, id, antes, datos, loginFallido = false }) => {
  const { entidad, pk, recurso } = req.servicio;
  const despues = datos?.data ?? datos;

  const id_usuario = recurso === 'auth' && partes[1] === 'login'
    ? datos?.usuario?.id_usuario ?? null
    : req.usuario?.id_usuario;
  if (!Number.isInteger(id_usuario) && !(loginFallido && id_usuario === null)) return;

  const id_entidad = id ?? (pk && Number.isInteger(despues?.[pk]) ? despues[pk] : null);

  await registrarSeguro({
    id_usuario,
    tipo_accion: tipoAccion(req, partes, loginFallido),
    entidad,
    id_entidad,
    detalle: sanitizar({ antes, despues }),
    request: sanitizar({
      method: req.method,
      path:   req.originalUrl,
      body:   req.body ?? null,
    }),
    ip_origen: req.ip,
  });
};

const auditar = async (req, res, next) => {
  if (!ESCRITURA.includes(req.method)) return next();

  // "/audiencias/5/estado" → ['audiencias', '5', 'estado']
  const partes = req.path.split('/').filter(Boolean);

  // De /auth se auditan login, logout y cambio inicial de contraseña (refresh no).
  if (req.servicio.recurso === 'auth' && !['login', 'logout', 'cambiar-password'].includes(partes[1])) return next();

  const id    = /^\d+$/.test(partes[1] || '') ? Number(partes[1]) : null;
  const antes = id && req.method !== 'POST' && req.usuario ? await snapshot(req, id) : null;

  // Intercepta la respuesta del proxy
  const jsonOriginal = res.json.bind(res);
  res.json = (datos) => {
    const loginFallido = req.servicio.recurso === 'auth' &&
      partes[1] === 'login' &&
      res.statusCode >= 400;
    if ((res.statusCode >= 200 && res.statusCode < 300) || loginFallido) {
      const registro = Array.isArray(datos?.cambios)
        ? registrarCambios(req, partes, datos.cambios)
        : registrar(req, { partes, id, antes, datos, loginFallido });
      registro
        .catch(err => console.error('Error persistiendo auditoría:', err.message))
        .finally(() => jsonOriginal(datos));
      return res;
    }
    return jsonOriginal(datos);
  };

  next();
};

module.exports = auditar;
module.exports.sanitizar = sanitizar;
module.exports.headersUsuario = headersUsuario;
