const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'mitech-jwt-secret-2026';

// ── DB Connection (reuse across invocations) ──
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

// ── Models ──
const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'escaneadora'], required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.methods.comparePassword = async function(p) { return bcrypt.compare(p, this.passwordHash); };
userSchema.set('toJSON', { transform: (d, r) => { delete r.passwordHash; return r; } });

const escRegSchema = new mongoose.Schema({
  palletId: { type: String, required: true, index: true },
  cantidad: { type: Number, default: 0 },
  condicion: { type: String, default: '' },
  destino: { type: String, required: true },
  turno: { type: String, required: true },
  escaneadora: { type: String, required: true, index: true },
  fecha: { type: String, required: true, index: true },
  pedido: { type: String, default: '' },
  incidencias: { type: String, default: '' },
  observaciones: { type: String, default: '' },
  capturadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

escRegSchema.index({ fecha: 1, turno: 1 });
escRegSchema.index({ escaneadora: 1, fecha: 1 });
escRegSchema.index({ createdAt: -1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const EscReg = mongoose.models.EscaneadoraRegistro || mongoose.model('EscaneadoraRegistro', escRegSchema);

// ── Middleware ──
async function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Token requerido' });
  try {
    const decoded = jwt.verify(h.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.isActive) return res.status(401).json({ success: false, error: 'Usuario invalido' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ success: false, error: 'Token invalido' }); }
}

function roleGuard(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'No autenticado' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'Sin permisos' });
    next();
  };
}

// Connect DB on every request
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (err) { res.status(500).json({ success: false, error: 'DB error: ' + err.message }); }
});

// ═══════════ AUTH ═══════════
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) return res.status(400).json({ success: false, error: 'Usuario y contrasena requeridos' });
    const user = await User.findOne({ usuario: usuario.toLowerCase().trim() });
    if (!user || !user.isActive) return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token, user: { id: user._id, nombre: user.nombre, usuario: user.usuario, role: user.role } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/auth/nfc', async (req, res) => {
  try {
    const { serialNumber } = req.body;
    if (!serialNumber) return res.status(400).json({ success: false, error: 'Numero de serie NFC requerido' });
    const db = mongoose.connection.db;
    const card = await db.collection('nfc_cards').findOne({ serialNumber: serialNumber.toUpperCase().trim(), isActive: true });
    if (!card) return res.status(401).json({ success: false, error: 'Tarjeta NFC no autorizada' });
    let user = card.userId ? await User.findById(card.userId) : null;
    if (!user) user = await User.findOne({ role: card.role, isActive: true });
    if (!user) return res.status(401).json({ success: false, error: 'No hay usuario asociado a esta tarjeta' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    await db.collection('nfc_cards').updateOne({ _id: card._id }, { $set: { lastUsed: new Date() }, $inc: { useCount: 1 } });
    res.json({ success: true, token, user: { id: user._id, nombre: user.nombre, usuario: user.usuario, role: user.role }, nfc: { serial: card.serialNumber, role: card.role } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ success: true, user: { id: req.user._id, nombre: req.user.nombre, usuario: req.user.usuario, role: req.user.role } });
});

// ═══════════ ESCANEADORAS ═══════════
app.post('/api/escaneadoras', auth, roleGuard('admin', 'escaneadora'), async (req, res) => {
  try {
    const { palletId, cantidad, condicion, destino, turno, escaneadora, fecha, pedido, incidencias, observaciones } = req.body;
    if (!palletId || !destino || !turno || !escaneadora || !fecha) return res.status(400).json({ success: false, error: 'Campos requeridos: palletId, destino, turno, escaneadora, fecha' });
    const doc = await EscReg.create({ palletId: palletId.trim(), cantidad: parseInt(cantidad) || 0, condicion: condicion || '', destino, turno, escaneadora, fecha, pedido: pedido || '', incidencias: incidencias || '', observaciones: observaciones || '', capturadoPor: req.user._id });
    res.json({ success: true, id: doc._id, message: 'Registro guardado' });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/escaneadoras', auth, roleGuard('admin', 'escaneadora'), async (req, res) => {
  try {
    const { fecha, escaneadora, turno, limit } = req.query;
    const filter = {};
    if (fecha) filter.fecha = fecha;
    if (escaneadora) filter.escaneadora = { $regex: escaneadora, $options: 'i' };
    if (turno) filter.turno = { $regex: turno, $options: 'i' };
    const registros = await EscReg.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit) || 200);
    res.json({ success: true, data: registros, total: registros.length });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/escaneadoras/:id', auth, roleGuard('admin', 'escaneadora'), async (req, res) => {
  try {
    const doc = await EscReg.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: doc });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ═══════════ DASHBOARD (admin only) ═══════════
function normalizeTurno(t) {
  if (!t) return 'Otro';
  const l = t.toLowerCase();
  if (l.includes('noche') || l.includes('night')) return 'Noche';
  if (l.includes('día') || l.includes('dia') || l.includes('day')) return 'Día';
  return t;
}

app.get('/api/dashboard/resumen', auth, roleGuard('admin'), async (req, res) => {
  try {
    const { fecha, fecha_inicio, fecha_fin, escaneadora, turno } = req.query;
    const filter = {};
    if (fecha) filter.fecha = fecha;
    if (escaneadora) filter.escaneadora = { $regex: escaneadora, $options: 'i' };
    if (turno) filter.turno = { $regex: turno, $options: 'i' };

    let registros = await EscReg.find(filter).sort({ createdAt: -1 });

    if (!fecha && fecha_inicio && fecha_fin) {
      const start = new Date(fecha_inicio), end = new Date(fecha_fin);
      end.setHours(23, 59, 59, 999);
      registros = registros.filter(r => {
        const p = r.fecha.split('/');
        if (p.length !== 3) return true;
        const d = new Date(parseInt(p[2]), parseInt(p[0]) - 1, parseInt(p[1]));
        return d >= start && d <= end;
      });
    }

    const now = new Date();
    const hoyStr = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
    const registrosHoy = registros.filter(r => r.fecha === hoyStr);

    const porEscaneadora = {}, porTurno = {}, porDestino = {}, porCondicion = {};
    let totalUnidades = 0;

    registros.forEach(r => {
      const e = r.escaneadora, t = normalizeTurno(r.turno), d = r.destino || 'Otro', c = r.condicion || 'Sin condicion';
      if (!porEscaneadora[e]) porEscaneadora[e] = { registros: 0, unidades: 0 };
      porEscaneadora[e].registros++; porEscaneadora[e].unidades += (r.cantidad || 0);
      if (!porTurno[t]) porTurno[t] = { registros: 0, unidades: 0 };
      porTurno[t].registros++; porTurno[t].unidades += (r.cantidad || 0);
      if (!porDestino[d]) porDestino[d] = { registros: 0, unidades: 0 };
      porDestino[d].registros++; porDestino[d].unidades += (r.cantidad || 0);
      if (!porCondicion[c]) porCondicion[c] = 0;
      porCondicion[c]++;
      totalUnidades += (r.cantidad || 0);
    });

    res.json({
      success: true,
      totalRegistros: registros.length,
      registrosHoy: registrosHoy.length,
      totalUnidades,
      fechaHoy: hoyStr,
      porEscaneadora: Object.entries(porEscaneadora).map(([nombre, d]) => ({ nombre, ...d })),
      porTurno: Object.entries(porTurno).map(([turno, d]) => ({ turno, ...d })),
      porDestino: Object.entries(porDestino).map(([destino, d]) => ({ destino, ...d })),
      porCondicion: Object.entries(porCondicion).map(([condicion, total]) => ({ condicion, total })),
      escaneadoras: [...new Set(registros.map(r => r.escaneadora))].sort(),
      fechas: [...new Set(registros.map(r => r.fecha))].sort(),
    });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/dashboard/registros', auth, roleGuard('admin'), async (req, res) => {
  try {
    const { fecha, fecha_inicio, fecha_fin, escaneadora, turno, busqueda, limit, skip } = req.query;
    const filter = {};
    if (fecha) filter.fecha = fecha;
    if (escaneadora) filter.escaneadora = { $regex: escaneadora, $options: 'i' };
    if (turno) filter.turno = { $regex: turno, $options: 'i' };
    if (busqueda) {
      filter.$or = [
        { palletId: { $regex: busqueda, $options: 'i' } },
        { escaneadora: { $regex: busqueda, $options: 'i' } },
        { destino: { $regex: busqueda, $options: 'i' } },
        { pedido: { $regex: busqueda, $options: 'i' } },
        { observaciones: { $regex: busqueda, $options: 'i' } },
      ];
    }
    let query = EscReg.find(filter).sort({ createdAt: -1 });
    if (skip) query = query.skip(parseInt(skip));
    query = query.limit(parseInt(limit) || 100);
    let registros = await query.populate('capturadoPor', 'nombre');

    if (!fecha && fecha_inicio && fecha_fin) {
      const start = new Date(fecha_inicio), end = new Date(fecha_fin);
      end.setHours(23, 59, 59, 999);
      registros = registros.filter(r => {
        const p = r.fecha.split('/');
        if (p.length !== 3) return true;
        const d = new Date(parseInt(p[2]), parseInt(p[0]) - 1, parseInt(p[1]));
        return d >= start && d <= end;
      });
    }

    const total = await EscReg.countDocuments(filter);
    res.json({ success: true, data: registros, total, filteredCount: registros.length });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/dashboard/tendencias', auth, roleGuard('admin'), async (req, res) => {
  try {
    const numDias = parseInt(req.query.dias) || 14;
    const registros = await EscReg.find().sort({ createdAt: -1 });
    const dailyMap = {};
    registros.forEach(r => {
      const turno = normalizeTurno(r.turno);
      const key = `${r.fecha}|${turno}`;
      if (!dailyMap[key]) dailyMap[key] = { registros: 0, unidades: 0 };
      dailyMap[key].registros++;
      dailyMap[key].unidades += (r.cantidad || 0);
    });
    const diarios = Object.entries(dailyMap).map(([key, data]) => {
      const [fecha, turno] = key.split('|');
      return { fecha, turno, ...data };
    }).sort((a, b) => {
      const pa = a.fecha.split('/'), pb = b.fecha.split('/');
      return new Date(parseInt(pb[2]), parseInt(pb[0])-1, parseInt(pb[1])) - new Date(parseInt(pa[2]), parseInt(pa[0])-1, parseInt(pa[1]));
    }).slice(0, numDias * 2);

    const turnoStats = {}, turnoDates = {};
    registros.forEach(r => {
      const t = normalizeTurno(r.turno);
      if (!turnoStats[t]) { turnoStats[t] = 0; turnoDates[t] = new Set(); }
      turnoStats[t]++;
      turnoDates[t].add(r.fecha);
    });
    const promedios = Object.entries(turnoStats).map(([turno, total]) => ({
      turno, totalRegistros: total, totalDias: turnoDates[turno].size,
      promedio: turnoDates[turno].size > 0 ? (total / turnoDates[turno].size).toFixed(1) : 0,
    }));

    res.json({ success: true, diarios, promedios });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/dashboard/catalogos', auth, roleGuard('admin'), async (req, res) => {
  try {
    const escaneadoras = await EscReg.distinct('escaneadora');
    const destinos = await EscReg.distinct('destino');
    const turnos = await EscReg.distinct('turno');
    const fechas = await EscReg.distinct('fecha');
    res.json({ success: true, escaneadoras: escaneadoras.sort(), destinos: destinos.sort(), turnos: turnos.sort(), fechas: fechas.sort() });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ═══════════ HEALTH ═══════════
app.get('/api/health', async (req, res) => {
  try {
    const registros = await EscReg.countDocuments();
    const usuarios = await User.countDocuments();
    res.json({ success: true, status: 'OK', database: 'MongoDB Atlas', registros, usuarios, timestamp: new Date().toISOString() });
  } catch (error) { res.status(500).json({ success: false, status: 'ERROR', error: error.message }); }
});

module.exports = app;
