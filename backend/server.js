const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const https = require('https');
const path = require('path');
const config = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend (carpeta raíz del proyecto)
app.use(express.static(path.join(__dirname, '..')));

// Pool de conexiones MySQL
const pool = mysql.createPool(config.db);

// =============================================
// ENDPOINTS - PALLETS
// =============================================

// GET /api/pallets - Todos los pallets (con filtros opcionales)
app.get('/api/pallets', async (req, res) => {
    try {
        const { fecha, turno, destino, fecha_inicio, fecha_fin } = req.query;
        let sql = 'SELECT * FROM pallets WHERE 1=1';
        const params = [];

        if (fecha) {
            sql += ' AND fecha = ?';
            params.push(fecha);
        }
        if (fecha_inicio && fecha_fin) {
            sql += ' AND fecha BETWEEN ? AND ?';
            params.push(fecha_inicio, fecha_fin);
        }
        if (turno) {
            sql += ' AND turno LIKE ?';
            params.push(`%${turno}%`);
        }
        if (destino) {
            sql += ' AND destino LIKE ?';
            params.push(`%${destino}%`);
        }

        sql += ' ORDER BY fecha DESC, id DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        console.error('Error GET /api/pallets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/pallets - Crear un pallet
app.post('/api/pallets', async (req, res) => {
    try {
        const { pallet_id, cantidad, producto, destino, fecha, turno, condicion, observaciones } = req.body;

        if (!pallet_id || !destino || !fecha || !turno) {
            return res.status(400).json({ success: false, error: 'Campos requeridos: pallet_id, destino, fecha, turno' });
        }

        const [result] = await pool.query(
            'INSERT INTO pallets (pallet_id, cantidad, producto, destino, fecha, turno, condicion, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [pallet_id, cantidad || 0, producto || null, destino, fecha, turno, condicion || null, observaciones || null]
        );

        res.json({ success: true, id: result.insertId, message: 'Pallet creado' });
    } catch (error) {
        console.error('Error POST /api/pallets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/pallets/bulk - Insertar múltiples pallets (para carga masiva)
app.post('/api/pallets/bulk', async (req, res) => {
    try {
        const { pallets } = req.body;
        if (!pallets || !Array.isArray(pallets) || pallets.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requiere un array de pallets' });
        }

        const values = pallets.map(p => [
            p.pallet_id, p.cantidad || 0, p.producto || null,
            p.destino, p.fecha, p.turno, p.condicion || null, p.observaciones || null
        ]);

        const [result] = await pool.query(
            'INSERT INTO pallets (pallet_id, cantidad, producto, destino, fecha, turno, condicion, observaciones) VALUES ?',
            [values]
        );

        res.json({ success: true, inserted: result.affectedRows, message: `${result.affectedRows} pallets insertados` });
    } catch (error) {
        console.error('Error POST /api/pallets/bulk:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/pallets/:id - Eliminar un pallet
app.delete('/api/pallets/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM pallets WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Pallet no encontrado' });
        }
        res.json({ success: true, message: 'Pallet eliminado' });
    } catch (error) {
        console.error('Error DELETE /api/pallets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS - VISTAS DEL DASHBOARD
// =============================================

// GET /api/dashboard/resumen-destino - Para gráfico de anillo
app.get('/api/dashboard/resumen-destino', async (req, res) => {
    try {
        const { fechas } = req.query; // fechas separadas por coma: "3/1/2026,3/2/2026"
        let sql, params = [];

        if (fechas) {
            const fechaList = fechas.split(',').map(f => f.trim());
            const placeholders = fechaList.map(() => '?').join(',');
            sql = `SELECT
                CASE
                    WHEN destino REGEXP 'pedido' THEN 'TRG'
                    WHEN destino REGEXP '[0-9]' THEN 'Almacén'
                    WHEN LOWER(destino) = 'trg' THEN 'TRG'
                    WHEN LOWER(destino) LIKE '%hv%' THEN 'HV (High Value)'
                    ELSE CONCAT(UPPER(LEFT(destino, 1)), LOWER(SUBSTRING(destino, 2)))
                END AS destino_normalizado,
                COUNT(*) AS total_pallets,
                SUM(cantidad) AS total_unidades
            FROM pallets
            WHERE fecha IN (${placeholders})
            GROUP BY destino_normalizado`;
            params = fechaList;
        } else {
            sql = 'SELECT * FROM v_resumen_destino';
        }

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/turno-destino - Para gráfico de barras
app.get('/api/dashboard/turno-destino', async (req, res) => {
    try {
        const { fechas } = req.query;
        let sql, params = [];

        if (fechas) {
            const fechaList = fechas.split(',').map(f => f.trim());
            const placeholders = fechaList.map(() => '?').join(',');
            sql = `SELECT
                CASE
                    WHEN turno LIKE '%Noche%' OR LOWER(turno) LIKE '%night%' THEN 'Noche'
                    WHEN turno LIKE '%día%' OR turno LIKE '%Dia%' OR LOWER(turno) LIKE '%day%' THEN 'Día'
                    ELSE turno
                END AS turno_normalizado,
                CASE
                    WHEN destino REGEXP 'pedido' THEN 'TRG'
                    WHEN destino REGEXP '[0-9]' THEN 'Almacén'
                    WHEN LOWER(destino) = 'trg' THEN 'TRG'
                    WHEN LOWER(destino) LIKE '%hv%' THEN 'HV (High Value)'
                    ELSE CONCAT(UPPER(LEFT(destino, 1)), LOWER(SUBSTRING(destino, 2)))
                END AS destino_normalizado,
                COUNT(*) AS total_pallets
            FROM pallets
            WHERE fecha IN (${placeholders})
            GROUP BY turno_normalizado, destino_normalizado`;
            params = fechaList;
        } else {
            sql = 'SELECT * FROM v_turno_destino';
        }

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/diarios - Conteo diario (para gráfico de línea 7 días)
app.get('/api/dashboard/diarios', async (req, res) => {
    try {
        const { turno, dias } = req.query;
        const limitDays = parseInt(dias) || 7;

        let sql = `SELECT fecha,
            CASE
                WHEN turno LIKE '%Noche%' OR LOWER(turno) LIKE '%night%' THEN 'Noche'
                WHEN turno LIKE '%día%' OR turno LIKE '%Dia%' OR LOWER(turno) LIKE '%day%' THEN 'Día'
                ELSE turno
            END AS turno_normalizado,
            COUNT(*) AS total_pallets
        FROM pallets WHERE 1=1`;
        const params = [];

        if (turno && turno !== 'Completo') {
            sql += ' AND (turno LIKE ? OR LOWER(turno) LIKE ?)';
            if (turno === 'Noche') {
                params.push('%Noche%', '%night%');
            } else {
                params.push('%día%', '%day%');
            }
        }

        sql += ` GROUP BY fecha, turno_normalizado ORDER BY fecha DESC LIMIT ?`;
        params.push(limitDays * 2); // *2 por si hay 2 turnos por día

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/promedios - Promedios por turno
app.get('/api/dashboard/promedios', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                CASE
                    WHEN turno LIKE '%Noche%' OR LOWER(turno) LIKE '%night%' THEN 'Noche'
                    WHEN turno LIKE '%día%' OR turno LIKE '%Dia%' OR LOWER(turno) LIKE '%day%' THEN 'Día'
                    ELSE 'Otro'
                END AS turno_normalizado,
                COUNT(*) AS total_pallets,
                COUNT(DISTINCT fecha) AS total_dias,
                ROUND(COUNT(*) / COUNT(DISTINCT fecha), 1) AS promedio
            FROM pallets
            GROUP BY turno_normalizado
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/fechas - Todas las fechas disponibles (para calendario)
app.get('/api/dashboard/fechas', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT fecha FROM pallets ORDER BY fecha');
        res.json({ success: true, data: rows.map(r => r.fecha) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/hoy - Datos de hoy para las tarjetas
app.get('/api/dashboard/hoy', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [pallets] = await pool.query(
            'SELECT * FROM pallets WHERE fecha = ? ORDER BY id DESC', [today]
        );
        const [errores] = await pool.query(
            'SELECT * FROM errores_pallet WHERE fecha = ? ORDER BY id DESC', [today]
        );
        res.json({
            success: true,
            fecha: today,
            pallets: { data: pallets, total: pallets.length },
            errores: { data: errores, total: errores.length }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS - ERRORES
// =============================================

// GET /api/errores - Todos los errores
app.get('/api/errores', async (req, res) => {
    try {
        const { fecha, tipo, hoy } = req.query;
        let sql = 'SELECT * FROM errores_pallet WHERE 1=1';
        const params = [];

        if (hoy === 'true') {
            sql += ' AND fecha = CURDATE()';
        } else if (fecha) {
            sql += ' AND fecha = ?';
            params.push(fecha);
        }
        if (tipo) {
            sql += ' AND tipo LIKE ?';
            params.push(`%${tipo}%`);
        }

        sql += ' ORDER BY fecha DESC, id DESC';
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/errores/top - Top defectos (para gráfico de errores)
app.get('/api/errores/top', async (req, res) => {
    try {
        const { hoy, tipo } = req.query;
        let sql = 'SELECT defecto, COUNT(*) as total, tipo FROM errores_pallet WHERE 1=1';
        const params = [];

        if (hoy === 'true') {
            sql += ' AND fecha = CURDATE()';
        }
        if (tipo) {
            sql += ' AND LOWER(tipo) LIKE ?';
            params.push(`%${tipo.toLowerCase()}%`);
        }

        sql += ' GROUP BY defecto, tipo ORDER BY total DESC';
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/errores - Crear un error
app.post('/api/errores', async (req, res) => {
    try {
        const { pallet_id, fecha, defecto, tipo } = req.body;
        if (!pallet_id || !fecha || !defecto) {
            return res.status(400).json({ success: false, error: 'Campos requeridos: pallet_id, fecha, defecto' });
        }

        const [result] = await pool.query(
            'INSERT INTO errores_pallet (pallet_id, fecha, defecto, tipo) VALUES (?, ?, ?, ?)',
            [pallet_id, fecha, defecto, tipo || null]
        );

        res.json({ success: true, id: result.insertId, message: 'Error registrado' });
    } catch (error) {
        console.error('Error POST /api/errores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/errores/bulk - Insertar múltiples errores
app.post('/api/errores/bulk', async (req, res) => {
    try {
        const { errores } = req.body;
        if (!errores || !Array.isArray(errores) || errores.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requiere un array de errores' });
        }

        const values = errores.map(e => [e.pallet_id, e.fecha, e.defecto, e.tipo || null]);
        const [result] = await pool.query(
            'INSERT INTO errores_pallet (pallet_id, fecha, defecto, tipo) VALUES ?',
            [values]
        );

        res.json({ success: true, inserted: result.affectedRows, message: `${result.affectedRows} errores insertados` });
    } catch (error) {
        console.error('Error POST /api/errores/bulk:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// HEALTH CHECK
// =============================================
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1');
        const [palletCount] = await pool.query('SELECT COUNT(*) as total FROM pallets');
        const [errorCount] = await pool.query('SELECT COUNT(*) as total FROM errores_pallet');
        res.json({
            success: true,
            status: 'OK',
            database: 'paletizado_db',
            pallets: palletCount[0].total,
            errores: errorCount[0].total,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, status: 'ERROR', error: error.message });
    }
});

// =============================================
// SYNC AUTOMÁTICO: Google Sheets → MySQL
// =============================================
const SHEET_PALLETS = 'https://docs.google.com/spreadsheets/d/1Su-CGdOPU-etXKoVXAKYx6qKhN92RFBiH-gLeN_XElk/gviz/tq?tqx=out:json&gid=530597405';
const SHEET_ERRORES = 'https://docs.google.com/spreadsheets/d/1FjVHlUNzu0gqhBunDNXKD5GUpcKGviLrFdJJAZG5qhg/gviz/tq?tqx=out:json&sheet=Liberaci%C3%B3n%20de%20Pallet';
const SYNC_INTERVAL = 30; // segundos

function fetchSheet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const start = data.indexOf('(');
                    const end = data.lastIndexOf(')');
                    if (start === -1 || end === -1) throw new Error('JSONP inválido');
                    resolve(JSON.parse(data.substring(start + 1, end)));
                } catch (e) { reject(e); }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

function parseGoogleDate(cell) {
    if (!cell) return null;
    if (cell.f) {
        const parts = cell.f.split(' ')[0].split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
    }
    if (cell.v && typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
        const m = cell.v.match(/Date\((\d+),(\d+),(\d+)/);
        if (m) return `${m[1]}-${(parseInt(m[2])+1).toString().padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    }
    return null;
}

async function syncFromSheets() {
    const ts = new Date().toLocaleString('es-MX');
    try {
        // Sync pallets
        const pResp = await fetchSheet(SHEET_PALLETS);
        let pNew = 0;
        if (pResp && pResp.table && pResp.table.rows) {
            for (const r of pResp.table.rows) {
                const c = r.c;
                if (!c || !c[4] || c[4].v === null) continue;
                const pid = (c[1] && c[1].v != null) ? c[1].v.toString().trim() : null;
                const fecha = parseGoogleDate(c[5]);
                if (!pid || !fecha) continue;
                const [res] = await pool.query(
                    'INSERT IGNORE INTO pallets (pallet_id, cantidad, producto, destino, fecha, turno, condicion, observaciones) VALUES (?,?,?,?,?,?,?,?)',
                    [pid,
                     (c[2] && c[2].v != null) ? parseFloat(c[2].v.toString().replace(/,/g,'')) || 0 : 0,
                     (c[3] && c[3].v != null) ? c[3].v.toString().trim() : null,
                     (c[4] && c[4].v != null) ? c[4].v.toString().trim() : '',
                     fecha,
                     (c[6] && c[6].v != null) ? c[6].v.toString().trim() : 'N/A',
                     (c[7] && c[7].v != null) ? c[7].v.toString().trim() : null,
                     (c[8] && c[8].v != null) ? c[8].v.toString().trim() : null]
                );
                if (res.affectedRows > 0) pNew++;
            }
        }

        // Sync errores
        const eResp = await fetchSheet(SHEET_ERRORES);
        let eNew = 0;
        if (eResp && eResp.table && eResp.table.rows) {
            for (const r of eResp.table.rows) {
                const c = r.c;
                if (!c || !c[9] || c[9].v === null) continue;
                const def = c[9].v.toString().trim();
                if (def === '' || def === '-') continue;
                const fecha = parseGoogleDate(c[1]);
                if (!fecha) continue;
                const [res] = await pool.query(
                    'INSERT IGNORE INTO errores_pallet (pallet_id, fecha, defecto, tipo) VALUES (?,?,?,?)',
                    [(c[3] && c[3].v != null) ? c[3].v.toString().trim() : 'N/A',
                     fecha, def,
                     (c[11] && c[11].v != null) ? c[11].v.toString().trim() : null]
                );
                if (res.affectedRows > 0) eNew++;
            }
        }

        if (pNew > 0 || eNew > 0) {
            console.log(`  [SYNC ${ts}] +${pNew} pallets, +${eNew} errores nuevos`);
        }
    } catch (err) {
        console.error(`  [SYNC ${ts}] Error: ${err.message}`);
    }
}

// =============================================
// INICIAR SERVIDOR + SYNC AUTOMÁTICO
// =============================================
app.listen(config.port, async () => {
    console.log('');
    console.log('===========================================');
    console.log('  MI-TECH Paletizado - API REST');
    console.log(`  http://localhost:${config.port}`);
    console.log(`  Dashboard: http://localhost:${config.port}/index.html`);
    console.log('===========================================');
    console.log('');
    console.log(`  Sync Google Sheets -> MySQL cada ${SYNC_INTERVAL}s`);
    console.log('');

    // Primera sync al arrancar
    console.log('  Sincronizando datos iniciales...');
    await syncFromSheets();
    const [pc] = await pool.query('SELECT COUNT(*) as t FROM pallets');
    const [ec] = await pool.query('SELECT COUNT(*) as t FROM errores_pallet');
    console.log(`  MySQL listo: ${pc[0].t} pallets, ${ec[0].t} errores`);
    console.log('  Servidor listo. Sync automático activado.');
    console.log('');

    // Sync cada 30 segundos
    setInterval(syncFromSheets, SYNC_INTERVAL * 1000);
});
