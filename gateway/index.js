const express      = require('express');
const fetch        = require('node-fetch');
const verificarToken = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ── URLs de los microservicios ────────────────────────────────
const MS = {
  distritos:   process.env.MS_DISTRITOS_URL   || 'http://localhost:3001',
  salas:       process.env.MS_SALAS_URL       || 'http://localhost:3002',
  autoridades: process.env.MS_AUTORIDADES_URL || 'http://localhost:3003',
  usuarios:    process.env.MS_USUARIOS_URL    || 'http://localhost:3004',
  audiencias:  process.env.MS_AUDIENCIAS_URL  || 'http://localhost:3005',
  auditoria:   process.env.MS_AUDITORIA_URL   || 'http://localhost:3006',
};

// ── Middleware de autenticación (se aplica a todas las rutas) ─
app.use(verificarToken);

// ── Función genérica para reenviar requests a un microservicio ─
const proxy = async (req, res, baseUrl) => {
  try {
    const url = `${baseUrl}${req.path}`;

    const options = {
      method:  req.method,
      headers: {
        'Content-Type': 'application/json',
        // Pasa los datos del usuario autenticado al microservicio
        ...(req.usuario && {
          'x-usuario-id':       String(req.usuario.id_usuario),
          'x-usuario-rol':      req.usuario.rol,
          'x-usuario-distrito': req.usuario.id_distrito
            ? String(req.usuario.id_distrito)
            : '',
        }),
      },
    };

    // Adjunta el body si hay uno (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.body = JSON.stringify(req.body);
    }

    const respuesta = await fetch(url, options);
    const datos     = await respuesta.json();

    // Registrar la acción en auditoría si fue una escritura exitosa
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && respuesta.ok && req.usuario) {
      registrarAuditoria(req, respuesta.status, datos).catch(err =>
        console.error('Error registrando auditoría:', err.message)
      );
    }

    return res.status(respuesta.status).json(datos);

  } catch (err) {
    console.error(`Error en proxy hacia ${baseUrl}:`, err.message);
    return res.status(503).json({ error: 'Microservicio no disponible' });
  }
};

// ── Función de auditoría (fire and forget) ────────────────────
const registrarAuditoria = async (req, statusCode, respuesta) => {
  await fetch(`${MS.auditoria}/logs`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_usuario:  req.usuario.id_usuario,
      tipo_accion: req.method === 'POST'   ? 'ALTA'
                 : req.method === 'DELETE' ? 'BAJA'
                 : 'MODIFICACION',
      entidad:    req.path.split('/')[1]?.toUpperCase() || 'DESCONOCIDO',
      id_entidad: respuesta?.id || null,
      detalle:    { body: req.body, respuesta },
      request: {
        method:  req.method,
        path:    req.path,
        body:    req.body,
      },
      ip_origen: req.ip,
    }),
  });
};

// ── Rutas ─────────────────────────────────────────────────────

// Auth → ms-usuarios
app.all('/auth/{*path}', (req, res) => proxy(req, res, MS.usuarios));

// Distritos → ms-distritos
app.all('/distritos/{*path}', (req, res) => proxy(req, res, MS.distritos));
app.all('/distritos', (req, res) => proxy(req, res, MS.distritos));

// Salas → ms-salas
app.all('/salas/{*path}', (req, res) => proxy(req, res, MS.salas));
app.all('/salas', (req, res) => proxy(req, res, MS.salas));

// Autoridades → ms-autoridades
app.all('/autoridades/{*path}', (req, res) => proxy(req, res, MS.autoridades));
app.all('/autoridades', (req, res) => proxy(req, res, MS.autoridades));

// Usuarios → ms-usuarios
app.all('/usuarios/{*path}', (req, res) => proxy(req, res, MS.usuarios));
app.all('/usuarios', (req, res) => proxy(req, res, MS.usuarios));

// Audiencias → ms-audiencias
app.all('/audiencias/{*path}', (req, res) => proxy(req, res, MS.audiencias));
app.all('/audiencias', (req, res) => proxy(req, res, MS.audiencias));

// Auditoría → ms-auditoria
app.all('/logs/{*path}', (req, res) => proxy(req, res, MS.auditoria));
app.all('/logs', (req, res) => proxy(req, res, MS.auditoria));

// ── Health checks ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway', puerto: PORT });
});

app.get('/health/all', async (req, res) => {
  const resultados = {};
  for (const [nombre, url] of Object.entries(MS)) {
    try {
      const resp = await fetch(`${url}/health`);
      resultados[nombre] = await resp.json();
    } catch (err) {
      resultados[nombre] = { status: 'error', message: err.message };
    }
  }
  res.json(resultados);
});

// ── Arranque ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Gateway corriendo en puerto ${PORT}`);
  console.log(`   Microservicios configurados:`);
  for (const [nombre, url] of Object.entries(MS)) {
    console.log(`   · ${nombre.padEnd(12)} → ${url}`);
  }
});