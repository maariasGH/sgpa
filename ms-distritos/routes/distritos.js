const express   = require('express');
const { Distrito } = require('../models');

const router = express.Router();

// ── GET /distritos ────────────────────────────────────────────
// Devuelve todos los distritos. Público (lo usa el frontend para los desplegables).
router.get('/', async (req, res) => {
  try {
    const distritos = await Distrito.findAll({
      order: [['nombre', 'ASC']],
    });
    res.json(distritos);
  } catch (err) {
    console.error('Error al obtener distritos:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /distritos/:id ────────────────────────────────────────
// Devuelve un distrito por ID. Lo usan otros microservicios para validar.
router.get('/:id', async (req, res) => {
  try {
    const distrito = await Distrito.findByPk(req.params.id);

    if (!distrito) {
      return res.status(404).json({ error: 'Distrito no encontrado' });
    }

    res.json(distrito);
  } catch (err) {
    console.error('Error al obtener distrito:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /distritos ───────────────────────────────────────────
// Crea un nuevo distrito. Solo Administrador (validado en el gateway).
router.post('/', async (req, res) => {
  const {nombre} = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'nombre es requerido' });
  }

  // Solo el administrador puede crear distritos
  const rol = req.headers['x-usuario-rol'];
  if (rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo el Administrador puede crear distritos' });
  }

  try {
    const nuevo = await Distrito.create({ nombre});
    res.status(201).json(nuevo);
  } catch (err) {
    console.error('Error al crear distrito:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PUT /distritos/:id ────────────────────────────────────────
// Actualiza un distrito. Solo Administrador.
router.put('/:id', async (req, res) => {
  const rol = req.headers['x-usuario-rol'];
  if (rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo el Administrador puede modificar distritos' });
  }

  try {
    const distrito = await Distrito.findByPk(req.params.id);

    if (!distrito) {
      return res.status(404).json({ error: 'Distrito no encontrado' });
    }

    const { nombre, activo } = req.body;
    await distrito.update({ nombre, activo });
    res.json(distrito);
  } catch (err) {
    console.error('Error al actualizar distrito:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;