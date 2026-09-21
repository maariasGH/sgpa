const express      = require('express');
const fetch        = require('node-fetch');
const { Sala }     = require('../models');

const router = express.Router();

const MS_DISTRITOS_URL = process.env.MS_DISTRITOS_URL || 'http://localhost:3001';

// ── Función auxiliar: verificar que el distrito existe ────────
const verificarDistrito = async (id_distrito) => {
  const resp = await fetch(`${MS_DISTRITOS_URL}/distritos/${id_distrito}`);
  if (!resp.ok) return false;
  const data = await resp.json();
  return data.activo === true;
};

// ── GET /salas ────────────────────────────────────────────────
// Lista todas las salas. Acepta filtro ?id_distrito=1
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.id_distrito) {
      where.id_distrito = parseInt(req.query.id_distrito);
    }

    // El operador solo puede ver salas de su distrito
    const rol       = req.headers['x-usuario-rol'];
    const distrito  = req.headers['x-usuario-distrito'];
    if (rol === 'OPERADOR' && distrito) {
      where.id_distrito = parseInt(distrito);
    }

    const salas = await Sala.findAll({ where, order: [['nombre', 'ASC']] });
    res.json(salas);
  } catch (err) {
    console.error('Error al obtener salas:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /salas/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const sala = await Sala.findByPk(req.params.id);
    if (!sala) return res.status(404).json({ error: 'Sala no encontrada' });
    res.json(sala);
  } catch (err) {
    console.error('Error al obtener sala:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /salas ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { nombre, tipo, id_distrito } = req.body;

  if (!nombre || !tipo || !id_distrito) {
    return res.status(400).json({ error: 'nombre, tipo e id_distrito son requeridos' });
  }

  const tiposValidos = ['PENAL', 'CIVIL', 'GESELL', 'MULTIPROPOSITO'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${tiposValidos.join(', ')}` });
  }

  // El operador solo puede crear salas en su propio distrito
  const rol      = req.headers['x-usuario-rol'];
  const distrito = req.headers['x-usuario-distrito'];
  if (rol === 'OPERADOR' && parseInt(distrito) !== parseInt(id_distrito)) {
    return res.status(403).json({ error: 'Solo podés crear salas en tu propio distrito' });
  }

  try {
    // Verificar que el distrito existe y está activo
    const distritoValido = await verificarDistrito(id_distrito);
    if (!distritoValido) {
      return res.status(400).json({ error: 'El distrito indicado no existe o está inactivo' });
    }

    const nueva = await Sala.create({ nombre, tipo, id_distrito });
    res.status(201).json(nueva);
  } catch (err) {
    console.error('Error al crear sala:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PUT /salas/:id ────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const rol      = req.headers['x-usuario-rol'];
  const distrito = req.headers['x-usuario-distrito'];

  try {
    const sala = await Sala.findByPk(req.params.id);
    if (!sala) return res.status(404).json({ error: 'Sala no encontrada' });

    // El operador solo puede modificar salas de su distrito
    if (rol === 'OPERADOR' && parseInt(distrito) !== sala.id_distrito) {
      return res.status(403).json({ error: 'Solo podés modificar salas de tu propio distrito' });
    }

    const { nombre, tipo, activa } = req.body;
    await sala.update({ nombre, tipo, activa });
    res.json(sala);
  } catch (err) {
    console.error('Error al actualizar sala:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;