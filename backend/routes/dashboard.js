const express = require('express');
const router = express.Router();
const Pallet = require('../models/Pallet');

// Helper: normalizar turno
function normalizeTurno(t) {
  if (!t) return 'Otro';
  const lower = t.toLowerCase();
  if (lower.includes('noche') || lower.includes('night')) return 'Noche';
  if (lower.includes('día') || lower.includes('dia') || lower.includes('day')) return 'Día';
  return t;
}

// Helper: normalizar destino
function normalizeDestino(d) {
  if (!d) return 'Otro';
  if (/pedido/i.test(d)) return 'TRG';
  if (/^\d+$/.test(d) || /almac/i.test(d)) return 'Almacén';
  if (/trg/i.test(d)) return 'TRG';
  if (/hv/i.test(d)) return 'HV (High Value)';
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
}

// GET /api/dashboard — Datos completos para el dashboard
router.get('/', async (req, res) => {
  try {
    const { fechas } = req.query; // "3/1/2026,3/2/2026"
    let filter = {};

    if (fechas) {
      const fechaList = fechas.split(',').map(f => f.trim());
      filter.fecha = { $in: fechaList };
    }

    const pallets = await Pallet.find(filter).sort({ createdAt: -1 });

    // Resumen por destino (para gráfico de anillo)
    const destinoMap = {};
    const turnoDestinoMap = { 'Día': {}, 'Noche': {} };
    const dailyMap = {};
    let dayPallets = 0, nightPallets = 0;
    const dayDates = new Set(), nightDates = new Set();

    pallets.forEach(p => {
      const dest = normalizeDestino(p.destino);
      const turno = normalizeTurno(p.turno);

      // Resumen destino
      if (!destinoMap[dest]) destinoMap[dest] = { total_pallets: 0, total_unidades: 0 };
      destinoMap[dest].total_pallets++;
      destinoMap[dest].total_unidades += (p.cantidad || 0);

      // Turno × destino
      if (turnoDestinoMap[turno]) {
        if (!turnoDestinoMap[turno][dest]) turnoDestinoMap[turno][dest] = 0;
        turnoDestinoMap[turno][dest]++;
      }

      // Conteo diario
      const key = `${p.fecha}|${turno}`;
      dailyMap[key] = (dailyMap[key] || 0) + 1;

      // Promedios
      if (turno === 'Día') { dayPallets++; dayDates.add(p.fecha); }
      if (turno === 'Noche') { nightPallets++; nightDates.add(p.fecha); }
    });

    // Formatear resumen destino
    const resumenDestino = Object.entries(destinoMap).map(([dest, data]) => ({
      destino_normalizado: dest,
      ...data
    }));

    // Formatear turno × destino
    const turnoDestino = [];
    for (const [turno, destinos] of Object.entries(turnoDestinoMap)) {
      for (const [dest, count] of Object.entries(destinos)) {
        turnoDestino.push({ turno_normalizado: turno, destino_normalizado: dest, total_pallets: count });
      }
    }

    // Formatear diarios
    const diarios = Object.entries(dailyMap).map(([key, count]) => {
      const [fecha, turno] = key.split('|');
      return { fecha, turno_normalizado: turno, total_pallets: count };
    }).sort((a, b) => {
      // Sort by date descending
      const da = new Date(a.fecha), db = new Date(b.fecha);
      return db - da;
    }).slice(0, 14);

    // Fechas disponibles
    const fechasDisponibles = [...new Set(pallets.map(p => p.fecha))].sort();

    // Promedios
    const promedios = [
      {
        turno_normalizado: 'Día',
        total_pallets: dayPallets,
        total_dias: dayDates.size,
        promedio: dayDates.size > 0 ? (dayPallets / dayDates.size).toFixed(1) : 0
      },
      {
        turno_normalizado: 'Noche',
        total_pallets: nightPallets,
        total_dias: nightDates.size,
        promedio: nightDates.size > 0 ? (nightPallets / nightDates.size).toFixed(1) : 0
      }
    ];

    res.json({
      success: true,
      total: pallets.length,
      resumenDestino,
      turnoDestino,
      diarios,
      promedios,
      fechas: fechasDisponibles,
    });
  } catch (error) {
    console.error('[GET /api/dashboard] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/fechas
router.get('/fechas', async (req, res) => {
  try {
    const fechas = await Pallet.distinct('fecha');
    res.json({ success: true, data: fechas.sort() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/hoy
router.get('/hoy', async (req, res) => {
  try {
    const now = new Date();
    const todayStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

    const pallets = await Pallet.find({ fecha: todayStr }).sort({ createdAt: -1 });

    res.json({
      success: true,
      fecha: todayStr,
      pallets: { data: pallets, total: pallets.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
