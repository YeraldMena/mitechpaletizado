const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mitech-jwt-secret-2026';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
    }

    const user = await User.findOne({ usuario: usuario.toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        role: user.role,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      nombre: req.user.nombre,
      usuario: req.user.usuario,
      role: req.user.role,
    }
  });
});

module.exports = router;
