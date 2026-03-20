const express = require('express');
const router = express.Router();
const EscaneadoraRegistro = require('../models/EscaneadoraRegistro');

// POST /api/escaneadoras — Crear registro
router.post('/', async (req, res) => {
  try {
    const { escaneadora, turno, fecha, linea, palletsEscaneados, horaInicio, horaFin, incidencias, observaciones } = req.body;

    if (!escaneadora || !turno || !fecha) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: escaneadora, turno, fecha' });
    }

    const doc = await EscaneadoraRegistro.create({
      escaneadora,
      turno,
      fecha,
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

// GET /api/escaneadoras — Listar registros (con filtros)
router.get('/', async (req, res) => {
  try {
    const { fecha, escaneadora, turno, limit, desde } = req.query;
    const filter = {};

    if (fecha) filter.fecha = fecha;
    if (escaneadora) filter.escaneadora = { $regex: escaneadora, $options: 'i' };
    if (turno) filter.turno = { $regex: turno, $options: 'i' };

    // Solo desde 2026-03-20 en adelante
    if (desde) {
      filter.createdAt = { $gte: new Date(desde) };
    }

    const registros = await EscaneadoraRegistro.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 200);

    res.json({ success: true, data: registros, total: registros.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/escaneadoras/dashboard — Datos agregados
router.get('/dashboard', async (req, res) => {
  try {
    const { fecha, escaneadora, turno } = req.query;
    const filter = {};

    // Filtro base: desde 20 marzo 2026
    filter.createdAt = { $gte: new Date('2026-03-20T00:00:00.000Z') };

    if (fecha) filter.fecha = fecha;
    if (escaneadora) filter.escaneadora = { $regex: escaneadora, $options: 'i' };
    if (turno) filter.turno = { $regex: turno, $options: 'i' };

    const registros = await EscaneadoraRegistro.find(filter).sort({ createdAt: -1 });

    // Hoy
    const now = new Date();
    const hoyStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const registrosHoy = registros.filter(r => r.fecha === hoyStr);

    // Por escaneadora
    const porEscaneadora = {};
    registros.forEach(r => {
      if (!porEscaneadora[r.escaneadora]) porEscaneadora[r.escaneadora] = { registros: 0, pallets: 0 };
      porEscaneadora[r.escaneadora].registros++;
      porEscaneadora[r.escaneadora].pallets += (r.palletsEscaneados || 0);
    });

    // Por turno
    const porTurno = {};
    registros.forEach(r => {
      const t = r.turno || 'Otro';
      if (!porTurno[t]) porTurno[t] = { registros: 0, pallets: 0 };
      porTurno[t].registros++;
      porTurno[t].pallets += (r.palletsEscaneados || 0);
    });

    // Por fecha (ultimos dias)
    const porFecha = {};
    registros.forEach(r => {
      if (!porFecha[r.fecha]) porFecha[r.fecha] = { registros: 0, pallets: 0 };
      porFecha[r.fecha].registros++;
      porFecha[r.fecha].pallets += (r.palletsEscaneados || 0);
    });

    // Escaneadoras unicas
    const escaneadoras = [...new Set(registros.map(r => r.escaneadora))].sort();
    // Fechas unicas
    const fechas = [...new Set(registros.map(r => r.fecha))].sort();

    res.json({
      success: true,
      totalRegistros: registros.length,
      registrosHoy: registrosHoy.length,
      fechaHoy: hoyStr,
      porEscaneadora: Object.entries(porEscaneadora).map(([nombre, d]) => ({ nombre, ...d })),
      porTurno: Object.entries(porTurno).map(([turno, d]) => ({ turno, ...d })),
      porFecha: Object.entries(porFecha).map(([fecha, d]) => ({ fecha, ...d })).sort((a, b) => {
        const da = new Date(a.fecha), db = new Date(b.fecha);
        return db - da;
      }).slice(0, 14),
      escaneadoras,
      fechas,
      ultimosRegistros: registros.slice(0, 50),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/escaneadoras/import — Importar datos desde CSV (JSON array)
router.post('/import', async (req, res) => {
  try {
    const { registros, columnMap } = req.body;

    if (!registros || !Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requiere un array de registros' });
    }

    // Mapping por defecto (puede ser overridden desde el frontend)
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
      if (typeof fieldPatterns === 'string') {
        return row[fieldPatterns] || '';
      }
      const keys = Object.keys(row);
      for (const pattern of fieldPatterns) {
        const key = keys.find(k => k.toLowerCase().trim() === pattern.toLowerCase().trim());
        if (key && row[key]) return row[key];
      }
      // Partial match
      for (const pattern of fieldPatterns) {
        const key = keys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
        if (key && row[key]) return row[key];
      }
      return '';
    }

    const docs = [];
    let skipped = 0;

    for (const row of registros) {
      const escaneadora = findValue(row, map.escaneadora);
      const turno = findValue(row, map.turno);
      const fecha = findValue(row, map.fecha);

      if (!escaneadora || !turno) {
        skipped++;
        continue;
      }

      // Filtrar por fecha >= 20 marzo 2026
      const parsedDate = new Date(fecha);
      if (!isNaN(parsedDate) && parsedDate < cutoffDate) {
        skipped++;
        continue;
      }

      // Guardar campos extra que no mapean a los fijos
      const mappedKeys = new Set();
      for (const patterns of Object.values(map)) {
        const arr = typeof patterns === 'string' ? [patterns] : patterns;
        for (const p of arr) {
          const keys = Object.keys(row);
          const found = keys.find(k => k.toLowerCase().includes(p.toLowerCase()));
          if (found) mappedKeys.add(found);
        }
      }
      const datosExtra = {};
      for (const [k, v] of Object.entries(row)) {
        if (!mappedKeys.has(k) && v) datosExtra[k] = v;
      }

      docs.push({
        escaneadora,
        turno,
        fecha: fecha || `${new Date().getMonth()+1}/${new Date().getDate()}/${new Date().getFullYear()}`,
        linea: findValue(row, map.linea),
        palletsEscaneados: parseInt(findValue(row, map.palletsEscaneados)) || 0,
        horaInicio: findValue(row, map.horaInicio),
        horaFin: findValue(row, map.horaFin),
        incidencias: findValue(row, map.incidencias),
        observaciones: findValue(row, map.observaciones),
        datosExtra,
        source: 'csv-import',
      });
    }

    let inserted = 0;
    if (docs.length > 0) {
      const result = await EscaneadoraRegistro.insertMany(docs);
      inserted = result.length;
    }

    res.json({
      success: true,
      imported: inserted,
      skipped,
      total: registros.length,
      message: `${inserted} registros importados, ${skipped} omitidos`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
