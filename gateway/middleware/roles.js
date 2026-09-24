// Control de acceso por rol. Se ejecuta después de auth.js (req.usuario ya cargado).
// Paths relativos a /api. La primera regla que coincide decide.

const ADMIN = ['ADMINISTRADOR'];
const TODOS = ['ADMINISTRADOR', 'OPERADOR'];
const ESCRITURA = ['POST', 'PUT', 'PATCH', 'DELETE'];

const REGLAS = [
  // Uso interno entre microservicios: nunca se expone al cliente
  { metodos: '*',       ruta: /^\/autoridades\/notificaciones/, bloquear: 404 },
  // Auditoría: solo lectura, solo Administrador. El POST lo hace el propio gateway.
  { metodos: ['GET'],   ruta: /^\/logs(\/|$)/,       roles: ADMIN },
  { metodos: '*',       ruta: /^\/logs(\/|$)/,       bloquear: 405 },
  // Gestión de usuarios operadores
  { metodos: '*',       ruta: /^\/usuarios(\/|$)/,   roles: ADMIN },
  // Alta / modificación de distritos
  { metodos: ESCRITURA, ruta: /^\/distritos(\/|$)/,  roles: ADMIN },
];

const coincide = (regla, req) =>
  (regla.metodos === '*' || regla.metodos.includes(req.method)) && regla.ruta.test(req.path);

const verificarRol = (req, res, next) => {
  const regla = REGLAS.find(r => coincide(r, req));

  if (regla?.bloquear === 404) return res.status(404).json({ error: 'Ruta no encontrada', code: 'NO_ENCONTRADO' });
  if (regla?.bloquear === 405) return res.status(405).json({ error: 'Operación no permitida', code: 'NO_PERMITIDO' });

  // Rutas públicas: auth.js no cargó usuario y no hay nada más que validar
  if (!req.usuario) return next();

  const permitidos = regla?.roles ?? TODOS;
  if (!permitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'No tenés permisos para esta operación', code: 'SIN_PERMISO' });
  }
  next();
};

module.exports = verificarRol;
