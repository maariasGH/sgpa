// ── URLs de los microservicios ───────────────────────────────
const MS = {
  distritos:   process.env.MS_DISTRITOS_URL   || 'http://localhost:3001',
  salas:       process.env.MS_SALAS_URL       || 'http://localhost:3002',
  autoridades: process.env.MS_AUTORIDADES_URL || 'http://localhost:3003',
  usuarios:    process.env.MS_USUARIOS_URL    || 'http://localhost:3004',
  audiencias:  process.env.MS_AUDIENCIAS_URL  || 'http://localhost:3005',
  auditoria:   process.env.MS_AUDITORIA_URL   || 'http://localhost:3006',
};

// Primer segmento del path → microservicio, entidad de auditoría y clave primaria
const RECURSOS = {
  auth:        { base: MS.usuarios,    entidad: 'SESION',    pk: null },
  usuarios:    { base: MS.usuarios,    entidad: 'USUARIO',   pk: 'id_usuario' },
  distritos:   { base: MS.distritos,   entidad: 'DISTRITO',  pk: 'id_distrito' },
  salas:       { base: MS.salas,       entidad: 'SALA',      pk: 'id_sala' },
  autoridades: { base: MS.autoridades, entidad: 'AUTORIDAD', pk: 'id_autoridad' },
  audiencias:  { base: MS.audiencias,  entidad: 'AUDIENCIA', pk: 'id_audiencia' },
  logs:        { base: MS.auditoria,   entidad: 'LOG',       pk: 'id_log' },
};

// "/audiencias/5/estado" → { recurso: 'audiencias', base, entidad, pk }
const servicioPara = (path) => {
  const recurso = path.split('/')[1];
  return Object.prototype.hasOwnProperty.call(RECURSOS, recurso)
    ? { recurso, ...RECURSOS[recurso] }
    : null;
};

module.exports = { MS, RECURSOS, servicioPara };
