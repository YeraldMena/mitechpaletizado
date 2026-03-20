require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dns = require('dns');

// Force Google DNS for SRV resolution (fixes local DNS issues with MongoDB Atlas)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// ── Routes ──
const palletsRouter = require('./routes/pallets');
const dashboardRouter = require('./routes/dashboard');
const mobileRouter = require('./routes/mobile');
const escaneadorasRouter = require('./routes/escaneadoras');

app.use('/api/pallets', palletsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/mobile', mobileRouter);
app.use('/api/escaneadoras', escaneadorasRouter);

// ── Health check ──
app.get('/api/health', async (req, res) => {
  try {
    const Pallet = require('./models/Pallet');
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

// ── JSONP endpoint for dashboard compatibility ──
// The frontend was using JSONP to load data. This endpoint provides the same
// data from MongoDB in gviz-compatible format so processSheetData() works unchanged.
app.get('/api/sheet-proxy', async (req, res) => {
  try {
    const Pallet = require('./models/Pallet');
    const callback = req.query.callback;
    const pallets = await Pallet.find().sort({ createdAt: 1 });

    // Build gviz-compatible response
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
    console.error('[SHEET-PROXY] Error:', error.message);
    const errJson = JSON.stringify({ status: 'error', errors: [{ message: error.message }] });
    const callback = req.query.callback;
    if (callback) {
      res.type('application/javascript').send(`${callback}(${errJson});`);
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// ── JSONP write endpoint for form compatibility ──
// The form in index.html sends data via GET with JSONP callback
app.get('/api/sheet-write', async (req, res) => {
  try {
    const Pallet = require('./models/Pallet');
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

    console.log(`[SHEET-WRITE] Pallet registrado: ${pallet} → ${destino} (${turno})`);
    const resp = JSON.stringify({ result: 'ok', row: doc._id, sheet: 'MongoDB' });

    if (callback) {
      res.type('application/javascript').send(`${callback}(${resp});`);
    } else {
      res.json({ result: 'ok', id: doc._id });
    }
  } catch (error) {
    console.error('[SHEET-WRITE] Error:', error.message);
    const errResp = JSON.stringify({ result: 'error', message: error.message });
    const callback = req.query.callback;
    if (callback) {
      res.type('application/javascript').send(`${callback}(${errResp});`);
    } else {
      res.status(500).json({ result: 'error', message: error.message });
    }
  }
});

// ── Connect to MongoDB and start server ──
const PORT = process.env.PORT || 3009;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI no está definida. Crea un archivo backend/.env con MONGODB_URI=...');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    const Pallet = require('./models/Pallet');
    const total = await Pallet.countDocuments();

    console.log('');
    console.log('===========================================');
    console.log('  MI-TECH Paletizado - API REST + MongoDB');
    console.log(`  http://localhost:${PORT}`);
    console.log(`  Dashboard: http://localhost:${PORT}/index.html`);
    console.log('===========================================');
    console.log(`  MongoDB Atlas: conectado`);
    console.log(`  Base de datos: ${mongoose.connection.db.databaseName}`);
    console.log(`  Pallets en DB: ${total}`);
    console.log('===========================================');
    console.log('');

    app.listen(PORT, () => {
      console.log(`  Servidor listo en puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('ERROR conectando a MongoDB:', err.message);
    process.exit(1);
  });
