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

// POST /api/auth/nfc — Login con tarjeta NFC
router.post('/nfc', async (req, res) => {
  try {
    const { serialNumber } = req.body;
    if (!serialNumber) {
      return res.status(400).json({ success: false, error: 'Numero de serie NFC requerido' });
    }

    const db = require('mongoose').connection.db;
    const card = await db.collection('nfc_cards').findOne({
      serialNumber: serialNumber.toUpperCase().trim(),
      isActive: true,
    });

    if (!card) {
      return res.status(401).json({ success: false, error: 'Tarjeta NFC no autorizada' });
    }

    // Find or create a user linked to this NFC card
    let user;
    if (card.userId) {
      user = await User.findById(card.userId);
    }
    if (!user) {
      // Use the first admin user for admin cards, or match by role
      user = await User.findOne({ role: card.role, isActive: true });
    }
    if (!user) {
      return res.status(401).json({ success: false, error: 'No hay usuario asociado a esta tarjeta' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });

    // Log NFC access
    await db.collection('nfc_cards').updateOne(
      { _id: card._id },
      { $set: { lastUsed: new Date() }, $inc: { useCount: 1 } }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        usuario: user.usuario,
        role: user.role,
      },
      nfc: { serial: card.serialNumber, role: card.role }
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
