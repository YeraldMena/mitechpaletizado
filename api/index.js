const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ── Mongoose connection (reuse across invocations) ──
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI no definida');

  await mongoose.connect(MONGODB_URI);
  isConnected = true;
}

// ── Pallet Model ──
const palletSchema = new mongoose.Schema({
  palletId: { type: String, required: true, index: true },
  cantidad: { type: Number, default: 0 },
  condicion: { type: String, default: '' },
  destino: { type: String, required: true },
  turno: { type: String, required: true },
  escaneadora: { type: String, default: '' },
  pedido: { type: String, default: '' },
  fecha: { type: String, required: true },
  producto: { type: String, default: '' },
  observaciones: { type: String, default: '' },
  source: { type: String, enum: ['migrated-anterior', 'migrated-formulario', 'web', 'mobile'], default: 'web' },
}, { timestamps: true });

palletSchema.index({ fecha: 1, turno: 1 });
palletSchema.index({ escaneadora: 1 });
palletSchema.index({ createdAt: -1 });

const Pallet = mongoose.models.Pallet || mongoose.model('Pallet', palletSchema);

// ── Helper functions ──
function normalizeTurno(t) {
  if (!t) return 'Otro';
  const lower = t.toLowerCase();
  if (lower.includes('noche') || lower.includes('night')) return 'Noche';
  if (lower.includes('día') || lower.includes('dia') || lower.includes('day')) return 'Día';
  return t;
}

function normalizeDestino(d) {
  if (!d) return 'Otro';
  if (/pedido/i.test(d)) return 'TRG';
  if (/^\d+$/.test(d) || /almac/i.test(d)) return 'Almacén';
  if (/trg/i.test(d)) return 'TRG';
  if (/hv/i.test(d)) return 'HV (High Value)';
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
}

// ── Middleware: connect DB before every request ──
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'DB connection failed: ' + err.message });
  }
});

// ══════════════════════════════════════════
// ROUTES — Pallets
// ══════════════════════════════════════════

app.post('/api/pallets', async (req, res) => {
  try {
    const { pallet_id, palletId, cantidad, qty, condicion, destino, turno, escaneadora, pedido, fecha, producto, observaciones, source } = req.body;
    const id = palletId || pallet_id;
    if (!id || !destino || !turno) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: palletId, destino, turno' });
    }
    const now = new Date();
    const defaultFecha = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const pallet = await Pallet.create({
      palletId: id,
      cantidad: parseInt(cantidad || qty) || 0,
      condicion: condicion || '',
      destino,
      turno,
      escaneadora: escaneadora || '',
      pedido: pedido || '',
      fecha: fecha || defaultFecha,
      producto: producto || '',
      observaciones: observaciones || '',
      source: source || 'web',
    });
    res.json({ success: true, id: pallet._id, palletId: id, message: 'Pallet registrado en MongoDB' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/pallets', async (req, res) => {
  try {
    const { fecha, turno, destino, limit } = req.query;
    const filter = {};
    if (fecha) filter.fecha = fecha;
    if (turno) filter.turno = { $regex: turno, $options: 'i' };
    if (destino) filter.destino = { $regex: destino, $options: 'i' };
    const pallets = await Pallet.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit) || 0);
    res.json({ success: true, data: pallets, total: pallets.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/pallets/today', async (req, res) => {
  try {
    const now = new Date();
    const todayStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const todayISO = now.toISOString().split('T')[0];
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayPadded = `${mm}/${dd}/${now.getFullYear()}`;
    const pallets = await Pallet.find({
      fecha: { $in: [todayStr, todayISO, todayPadded] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: pallets, total: pallets.length, fecha: todayStr });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/pallets/by-user/:user', async (req, res) => {
  try {
    const pallets = await Pallet.find({
      escaneadora: { $regex: req.params.user, $options: 'i' }
    }).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: pallets, total: pallets.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/pallets/:id', async (req, res) => {
  try {
    const result = await Pallet.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, message: 'Pallet eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════
// ROUTES — Dashboard
// ══════════════════════════════════════════

app.get('/api/dashboard', async (req, res) => {
  try {
    const { fechas } = req.query;
    let filter = {};
    if (fechas) {
      const fechaList = fechas.split(',').map(f => f.trim());
      filter.fecha = { $in: fechaList };
    }
    const pallets = await Pallet.find(filter).sort({ createdAt: -1 });

    const destinoMap = {};
    const turnoDestinoMap = { 'Día': {}, 'Noche': {} };
    const dailyMap = {};
    let dayPallets = 0, nightPallets = 0;
    const dayDates = new Set(), nightDates = new Set();

    pallets.forEach(p => {
      const dest = normalizeDestino(p.destino);
      const turno = normalizeTurno(p.turno);
      if (!destinoMap[dest]) destinoMap[dest] = { total_pallets: 0, total_unidades: 0 };
      destinoMap[dest].total_pallets++;
      destinoMap[dest].total_unidades += (p.cantidad || 0);
      if (turnoDestinoMap[turno]) {
        if (!turnoDestinoMap[turno][dest]) turnoDestinoMap[turno][dest] = 0;
        turnoDestinoMap[turno][dest]++;
      }
      const key = `${p.fecha}|${turno}`;
      dailyMap[key] = (dailyMap[key] || 0) + 1;
      if (turno === 'Día') { dayPallets++; dayDates.add(p.fecha); }
      if (turno === 'Noche') { nightPallets++; nightDates.add(p.fecha); }
    });

    const resumenDestino = Object.entries(destinoMap).map(([dest, data]) => ({
      destino_normalizado: dest, ...data
    }));
    const turnoDestino = [];
    for (const [turno, destinos] of Object.entries(turnoDestinoMap)) {
      for (const [dest, count] of Object.entries(destinos)) {
        turnoDestino.push({ turno_normalizado: turno, destino_normalizado: dest, total_pallets: count });
      }
    }
    const diarios = Object.entries(dailyMap).map(([key, count]) => {
      const [fecha, turno] = key.split('|');
      return { fecha, turno_normalizado: turno, total_pallets: count };
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 14);

    const fechasDisponibles = [...new Set(pallets.map(p => p.fecha))].sort();
    const promedios = [
      { turno_normalizado: 'Día', total_pallets: dayPallets, total_dias: dayDates.size, promedio: dayDates.size > 0 ? (dayPallets / dayDates.size).toFixed(1) : 0 },
      { turno_normalizado: 'Noche', total_pallets: nightPallets, total_dias: nightDates.size, promedio: nightDates.size > 0 ? (nightPallets / nightDates.size).toFixed(1) : 0 }
    ];

    res.json({ success: true, total: pallets.length, resumenDestino, turnoDestino, diarios, promedios, fechas: fechasDisponibles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/fechas', async (req, res) => {
  try {
    const fechas = await Pallet.distinct('fecha');
    res.json({ success: true, data: fechas.sort() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard/hoy', async (req, res) => {
  try {
    const now = new Date();
    const todayStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const pallets = await Pallet.find({ fecha: todayStr }).sort({ createdAt: -1 });
    res.json({ success: true, fecha: todayStr, pallets: { data: pallets, total: pallets.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════
// ROUTES — Mobile
// ══════════════════════════════════════════

app.get('/api/mobile/check/:palletId', async (req, res) => {
  try {
    const pallet = await Pallet.findOne({ palletId: req.params.palletId }).sort({ createdAt: -1 });
    res.json({ exists: !!pallet, data: pallet || null });
  } catch (error) {
    res.status(500).json({ exists: false, error: error.message });
  }
});

app.post('/api/mobile/register', async (req, res) => {
  try {
    const { pallet_id, cantidad, destino, fecha, turno, condicion, operador, pedido, items } = req.body;
    if (!pallet_id || !destino || !fecha || !turno) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: pallet_id, destino, fecha, turno' });
    }
    const totalQty = (items && items.length > 0)
      ? items.reduce((sum, i) => sum + (i.cantidad || 1), 0)
      : (cantidad || 0);
    const skuSummary = (items && items.length > 0)
      ? items.map(i => `${i.sku}(${i.cantidad || 1})`).join(', ')
      : '';
    const pallet = await Pallet.create({
      palletId: pallet_id,
      cantidad: totalQty,
      producto: skuSummary,
      destino,
      fecha,
      turno,
      condicion: condicion || '',
      escaneadora: operador || '',
      pedido: pedido || '',
      observaciones: pedido ? `${operador || ''} | Pedido: ${pedido}` : (operador || ''),
      source: 'mobile',
    });
    res.json({ success: true, id: pallet._id, total_qty: totalQty, items_count: items ? items.length : 0, message: 'Pallet registrado desde app movil' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/mobile/recent', async (req, res) => {
  try {
    const { operador, limit } = req.query;
    const filter = {};
    if (operador) {
      filter.$or = [
        { escaneadora: { $regex: operador, $options: 'i' } },
        { observaciones: { $regex: operador, $options: 'i' } }
      ];
    }
    const pallets = await Pallet.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit) || 50);
    res.json({ success: true, data: pallets, total: pallets.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/mobile/stats', async (req, res) => {
  try {
    const { operador } = req.query;
    const now = new Date();
    const todayStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const filter = { fecha: todayStr };
    if (operador) {
      filter.$or = [
        { escaneadora: { $regex: operador, $options: 'i' } },
        { observaciones: { $regex: operador, $options: 'i' } }
      ];
    }
    const todayCount = await Pallet.countDocuments(filter);
    const lastFilter = operador
      ? { $or: [{ escaneadora: { $regex: operador, $options: 'i' } }, { observaciones: { $regex: operador, $options: 'i' } }] }
      : {};
    const lastPallet = await Pallet.findOne(lastFilter).sort({ createdAt: -1 });
    const destinoCounts = await Pallet.aggregate([
      { $match: filter },
      { $group: { _id: '$destino', total: { $sum: 1 } } }
    ]);
    res.json({
      success: true,
      today: todayCount,
      last: lastPallet ? { pallet_id: lastPallet.palletId, destino: lastPallet.destino, fecha: lastPallet.fecha, turno: lastPallet.turno } : null,
      byDestino: destinoCounts.map(d => ({ destino: d._id, total: d.total }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════
// ROUTES — Escaneadoras
// ══════════════════════════════════════════

const escaneadoraRegistroSchema = new mongoose.Schema({
  escaneadora: { type: String, required: true, index: true },
  turno: { type: String, required: true },
  fecha: { type: String, required: true, index: true },
  linea: { type: String, default: '' },
  palletsEscaneados: { type: Number, default: 0 },
  horaInicio: { type: String, default: '' },
  horaFin: { type: String, default: '' },
  incidencias: { type: String, default: '' },
  observaciones: { type: String, default: '' },
  datosExtra: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: { type: String, enum: ['web', 'csv-import', 'mobile'], default: 'web' },
}, { timestamps: true, strict: false });

escaneadoraRegistroSchema.index({ fecha: 1, turno: 1 });
escaneadoraRegistroSchema.index({ escaneadora: 1, fecha: 1 });
escaneadoraRegistroSchema.index({ createdAt: -1 });

const EscaneadoraRegistro = mongoose.models.EscaneadoraRegistro || mongoose.model('EscaneadoraRegistro', escaneadoraRegistroSchema);

app.post('/api/escaneadoras', async (req, res) => {
  try {
    const { escaneadora, turno, fecha, linea, palletsEscaneados, horaInicio, horaFin, incidencias, observaciones } = req.body;
    if (!escaneadora || !turno || !fecha) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: escaneadora, turno, fecha' });
    }
    const doc = await EscaneadoraRegistro.create({
      escaneadora, turno, fecha,
      linea: linea || '',
      palletsEscaneados: parseInt(palletsEscaneados) || 0,
      horaInicio: horaInicio || '',
      horaFin: horaFin || '',
      incidencias: incidencias || '',
      observaciones: observaciones || '',
      source: 'web',
    });
    res.json({ success: true, id: doc._id, message: 'Registro de escaneadora guardado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/escaneadoras', async (req, res) => {
  try {
    const { fecha, escaneadora, turno, limit, desde } = req.query;
    const filter = {};
    if (fecha) filter.fecha = fecha;
    if (escaneadora) filter.escaneadora = { $regex: escaneadora, $options: 'i' };
    if (turno) filter.turno = { $regex: turno, $options: 'i' };
    if (desde) filter.createdAt = { $gte: new Date(desde) };
    const registros = await EscaneadoraRegistro.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit) || 200);
    res.json({ success: true, data: registros, total: registros.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/escaneadoras/dashboard', async (req, res) => {
  try {
    const { fecha, escaneadora, turno } = req.query;
    const filter = {};
    filter.createdAt = { $gte: new Date('2026-03-20T00:00:00.000Z') };
    if (fecha) filter.fecha = fecha;
    if (escaneadora) filter.escaneadora = { $regex: escaneadora, $options: 'i' };
    if (turno) filter.turno = { $regex: turno, $options: 'i' };
    const registros = await EscaneadoraRegistro.find(filter).sort({ createdAt: -1 });
    const now = new Date();
    const hoyStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const registrosHoy = registros.filter(r => r.fecha === hoyStr);
    const porEscaneadora = {};
    registros.forEach(r => {
      if (!porEscaneadora[r.escaneadora]) porEscaneadora[r.escaneadora] = { registros: 0, pallets: 0 };
      porEscaneadora[r.escaneadora].registros++;
      porEscaneadora[r.escaneadora].pallets += (r.palletsEscaneados || 0);
    });
    const porTurno = {};
    registros.forEach(r => {
      const t = r.turno || 'Otro';
      if (!porTurno[t]) porTurno[t] = { registros: 0, pallets: 0 };
      porTurno[t].registros++;
      porTurno[t].pallets += (r.palletsEscaneados || 0);
    });
    const porFecha = {};
    registros.forEach(r => {
      if (!porFecha[r.fecha]) porFecha[r.fecha] = { registros: 0, pallets: 0 };
      porFecha[r.fecha].registros++;
      porFecha[r.fecha].pallets += (r.palletsEscaneados || 0);
    });
    const escaneadoras = [...new Set(registros.map(r => r.escaneadora))].sort();
    const fechas = [...new Set(registros.map(r => r.fecha))].sort();
    res.json({
      success: true,
      totalRegistros: registros.length,
      registrosHoy: registrosHoy.length,
      fechaHoy: hoyStr,
      porEscaneadora: Object.entries(porEscaneadora).map(([nombre, d]) => ({ nombre, ...d })),
      porTurno: Object.entries(porTurno).map(([turno, d]) => ({ turno, ...d })),
      porFecha: Object.entries(porFecha).map(([fecha, d]) => ({ fecha, ...d })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 14),
      escaneadoras,
      fechas,
      ultimosRegistros: registros.slice(0, 50),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/escaneadoras/import', async (req, res) => {
  try {
    const { registros, columnMap } = req.body;
    if (!registros || !Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requiere un array de registros' });
    }
    const defaultMap = {
      escaneadora: ['escaneadora', 'scanner', 'operador', 'operadora', 'nombre'],
      turno: ['turno', 'shift'],
      fecha: ['fecha', 'date', 'marca temporal', 'timestamp'],
      linea: ['linea', 'línea', 'line', 'area', 'área'],
      palletsEscaneados: ['pallets', 'pallets_escaneados', 'cantidad', 'qty', 'total'],
      horaInicio: ['hora_inicio', 'horainicio', 'start', 'inicio'],
      horaFin: ['hora_fin', 'horafin', 'end', 'fin'],
      incidencias: ['incidencias', 'incidencia', 'incidents'],
      observaciones: ['observaciones', 'observacion', 'notas', 'notes', 'comentarios'],
    };
    const map = columnMap || defaultMap;
    const cutoffDate = new Date('2026-03-20');
    function findValue(row, fieldPatterns) {
      if (typeof fieldPatterns === 'string') return row[fieldPatterns] || '';
      const keys = Object.keys(row);
      for (const p of fieldPatterns) {
        const key = keys.find(k => k.toLowerCase().trim() === p.toLowerCase().trim());
        if (key && row[key]) return row[key];
      }
      for (const p of fieldPatterns) {
        const key = keys.find(k => k.toLowerCase().includes(p.toLowerCase()));
        if (key && row[key]) return row[key];
      }
      return '';
    }
    const docs = [];
    let skipped = 0;
    for (const row of registros) {
      const esc = findValue(row, map.escaneadora);
      const tur = findValue(row, map.turno);
      const fec = findValue(row, map.fecha);
      if (!esc || !tur) { skipped++; continue; }
      const parsedDate = new Date(fec);
      if (!isNaN(parsedDate) && parsedDate < cutoffDate) { skipped++; continue; }
      docs.push({
        escaneadora: esc, turno: tur,
        fecha: fec ? fec.split(' ')[0] : `${new Date().getMonth()+1}/${new Date().getDate()}/${new Date().getFullYear()}`,
        linea: findValue(row, map.linea),
        palletsEscaneados: parseInt(findValue(row, map.palletsEscaneados)) || 0,
        horaInicio: findValue(row, map.horaInicio),
        horaFin: findValue(row, map.horaFin),
        incidencias: findValue(row, map.incidencias),
        observaciones: findValue(row, map.observaciones),
        source: 'csv-import',
      });
    }
    let inserted = 0;
    if (docs.length > 0) {
      const result = await EscaneadoraRegistro.insertMany(docs);
      inserted = result.length;
    }
    res.json({ success: true, imported: inserted, skipped, total: registros.length, message: `${inserted} registros importados, ${skipped} omitidos` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════
// ROUTES — JSONP compatibility (sheet-proxy, sheet-write)
// ══════════════════════════════════════════

app.get('/api/sheet-proxy', async (req, res) => {
  try {
    const callback = req.query.callback;
    const pallets = await Pallet.find().sort({ createdAt: 1 });
    const cols = [
      { id: 'A', label: 'Marca temporal', type: 'datetime' },
      { id: 'B', label: 'Número de pallet', type: 'string' },
      { id: 'C', label: 'Cantidad', type: 'number' },
      { id: 'D', label: 'CONDICION', type: 'string' },
      { id: 'E', label: 'Destino', type: 'string' },
      { id: 'F', label: 'Fecha', type: 'string' },
      { id: 'G', label: 'Turno', type: 'string' },
      { id: 'H', label: 'Escaneadora', type: 'string' },
      { id: 'I', label: 'Pedido', type: 'string' }
    ];
    const rows = pallets.map(p => {
      const d = p.createdAt || new Date();
      const tsFormatted = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
      return {
        c: [
          { v: `Date(${d.getFullYear()},${d.getMonth()},${d.getDate()},${d.getHours()},${d.getMinutes()},${d.getSeconds()})`, f: tsFormatted },
          { v: p.palletId, f: p.palletId },
          { v: p.cantidad, f: String(p.cantidad) },
          { v: p.condicion || '', f: p.condicion || '' },
          { v: p.destino, f: p.destino },
          { v: p.fecha, f: p.fecha },
          { v: p.turno, f: p.turno },
          { v: p.escaneadora || '', f: p.escaneadora || '' },
          { v: p.pedido || '', f: p.pedido || '' }
        ]
      };
    });
    const data = { version: '0.6', status: 'ok', table: { cols, rows } };
    const json = JSON.stringify(data);
    if (callback) {
      res.type('application/javascript').send(`${callback}(${json});`);
    } else {
      res.json(data);
    }
  } catch (error) {
    const errJson = JSON.stringify({ status: 'error', errors: [{ message: error.message }] });
    const callback = req.query.callback;
    if (callback) {
      res.type('application/javascript').send(`${callback}(${errJson});`);
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

app.get('/api/sheet-write', async (req, res) => {
  try {
    const { pallet, qty, condicion, destino, turno, escaneadora, pedido, timestamp, callback } = req.query;
    if (!pallet) {
      const errResp = JSON.stringify({ result: 'error', message: 'Falta palletId' });
      return callback
        ? res.type('application/javascript').send(`${callback}(${errResp});`)
        : res.status(400).json({ result: 'error', message: 'Falta palletId' });
    }
    const now = new Date();
    const fecha = timestamp ? timestamp.split(' ')[0] : `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
    const doc = await Pallet.create({
      palletId: pallet,
      cantidad: parseInt(qty) || 0,
      condicion: condicion || '',
      destino: destino || '',
      turno: turno || '',
      escaneadora: escaneadora || '',
      pedido: pedido || '',
      fecha,
      source: 'web',
    });
    const resp = JSON.stringify({ result: 'ok', row: doc._id, sheet: 'MongoDB' });
    if (callback) {
      res.type('application/javascript').send(`${callback}(${resp});`);
    } else {
      res.json({ result: 'ok', id: doc._id });
    }
  } catch (error) {
    const errResp = JSON.stringify({ result: 'error', message: error.message });
    const callback = req.query.callback;
    if (callback) {
      res.type('application/javascript').send(`${callback}(${errResp});`);
    } else {
      res.status(500).json({ result: 'error', message: error.message });
    }
  }
});

// ══════════════════════════════════════════
// ROUTES — Health
// ══════════════════════════════════════════

app.get('/api/health', async (req, res) => {
  try {
    const total = await Pallet.countDocuments();
    res.json({
      success: true,
      status: 'OK',
      database: 'MongoDB Atlas (mitech)',
      pallets: total,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, status: 'ERROR', error: error.message });
  }
});

// Export for Vercel serverless
module.exports = app;
