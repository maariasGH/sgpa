const fetch = require('node-fetch');
const { MS } = require('../servicios');

// Interceptor AOP de auditoría.
// Antes de reenviar una escritura toma un snapshot del registro ("antes"); cuando el
// microservicio responde 2xx registra la acción en ms-auditoria (fire-and-forget).
// Los microservicios no saben que están siendo auditados.

const ESCRITURA = ['POST', 'PUT', 'PATCH', 'DELETE'];
const CAMPOS_SENSIBLES = new Set(['password', 'password_hash', 'token']);

// Quita contraseñas y tokens de cualquier objeto antes de guardarlo en el log
const sanitizar = (valor) => {
  if (Array.isArray(valor)) return valor.map(sanitizar);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([clave]) => !CAMPOS_SENSIBLES.has(clave))
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
    const resp = await fetch(`${base}/${recurso}/${id}`, { headers: headersUsuario(req.usuario) });
    if (!resp.ok) return null;
    const body = await resp.json();
    return body.data ?? body;
  } catch {
    return null;
  }
};

const tipoAccion = (req, partes) => {
  if (req.servicio.recurso === 'auth') return partes[1] === 'login' ? 'LOGIN' : 'LOGOUT';
  if (req.method === 'POST')   return 'ALTA';
  if (req.method === 'DELETE' || partes[2] === 'baja') return 'BAJA';
  return 'MODIFICACION';
};

const registrar = async (req, { partes, id, antes, datos }) => {
  const { entidad, pk, recurso } = req.servicio;
  const despues = datos?.data ?? datos;

  const id_usuario = recurso === 'auth' && partes[1] === 'login'
    ? datos?.usuario?.id_usuario
    : req.usuario?.id_usuario;
  if (!Number.isInteger(id_usuario)) return;

  const id_entidad = id ?? (pk && Number.isInteger(despues?.[pk]) ? despues[pk] : null);

  await fetch(`${MS.auditoria}/logs`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_usuario,
      tipo_accion: tipoAccion(req, partes),
      entidad,
      id_entidad,
      detalle: sanitizar({ antes, despues }),
      request: sanitizar({
        method: req.method,
        path:   req.originalUrl,
        body:   req.body ?? null,
      }),
      ip_origen: req.ip,
    }),
  });
};

const auditar = async (req, res, next) => {
  if (!ESCRITURA.includes(req.method)) return next();

  // "/audiencias/5/estado" → ['audiencias', '5', 'estado']
  const partes = req.path.split('/').filter(Boolean);

  // De /auth solo se auditan login y logout (refresh no es una acción del usuario)
  if (req.servicio.recurso === 'auth' && !['login', 'logout'].includes(partes[1])) return next();

  const id    = /^\d+$/.test(partes[1] || '') ? Number(partes[1]) : null;
  const antes = id && req.method !== 'POST' && req.usuario ? await snapshot(req, id) : null;

  // Intercepta la respuesta del proxy
  const jsonOriginal = res.json.bind(res);
  res.json = (datos) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      registrar(req, { partes, id, antes, datos }).catch(err =>
        console.error('Error registrando auditoría:', err.message)
      );
    }
    return jsonOriginal(datos);
  };

  next();
};

module.exports = auditar;
module.exports.sanitizar = sanitizar;
module.exports.headersUsuario = headersUsuario;
