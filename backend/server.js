const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend (carpeta raíz del proyecto)
app.use(express.static(path.join(__dirname, '..')));

// Pool de conexiones MySQL
const pool = mysql.createPool(config.db);

// ── Auto-create tables if not exist ──
async function ensureTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pallets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pallet_id VARCHAR(50) NOT NULL,
            cantidad INT DEFAULT 1,
            producto VARCHAR(255) DEFAULT NULL,
            destino VARCHAR(100) NOT NULL,
            fecha DATE NOT NULL,
            turno VARCHAR(50) DEFAULT NULL,
            condicion VARCHAR(100) DEFAULT NULL,
            operador VARCHAR(100) DEFAULT NULL,
            pedido VARCHAR(100) DEFAULT NULL,
            observaciones VARCHAR(500) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_pallet_id (pallet_id),
            INDEX idx_fecha (fecha),
            INDEX idx_operador (operador),
            INDEX idx_turno (turno)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS errores_pallet (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pallet_id VARCHAR(50) NOT NULL,
            fecha DATE NOT NULL,
            defecto VARCHAR(255) NOT NULL,
            tipo VARCHAR(100) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_pallet_id (pallet_id),
            INDEX idx_fecha (fecha)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS pallet_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pallet_ref_id INT,
            pallet_id VARCHAR(50) NOT NULL,
            sku VARCHAR(100) NOT NULL,
            cantidad INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_pallet_id (pallet_id),
            INDEX idx_pallet_ref (pallet_ref_id)
        )
    `);

    // Add columns if they don't exist (safe migration for existing tables)
    const safeAddColumn = async (table, col, def) => {
        try {
            const [cols] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [col]);
            if (cols.length === 0) {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
                console.log(`  + Added column ${table}.${col}`);
            }
        } catch { /* table may not exist yet */ }
    };

    await safeAddColumn('pallets', 'operador', "VARCHAR(100) DEFAULT NULL AFTER condicion");
    await safeAddColumn('pallets', 'pedido', "VARCHAR(100) DEFAULT NULL AFTER operador");
    await safeAddColumn('pallets', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
}

// ── Helper: today as ISO string ──
function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Helper: normalize old M/D/YYYY dates for queries ──
function todayFormats() {
    const d = new Date();
    const iso = todayISO();
    const mobile = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    return { iso, mobile };
}

// =============================================
// ENDPOINTS - PALLETS
// =============================================

// GET /api/pallets - Todos los pallets (con filtros opcionales)
app.get('/api/pallets', async (req, res) => {
    try {
        const { fecha, turno, destino, operador, fecha_inicio, fecha_fin } = req.query;
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
        if (operador) {
            sql += ' AND (operador LIKE ? OR observaciones LIKE ?)';
            params.push(`%${operador}%`, `%${operador}%`);
        }

        sql += ' ORDER BY id DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        console.error('Error GET /api/pallets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/pallets/today - Pallets de hoy
app.get('/api/pallets/today', async (req, res) => {
    try {
        const { iso, mobile } = todayFormats();
        const [rows] = await pool.query(
            'SELECT * FROM pallets WHERE (fecha = ? OR fecha = ?) ORDER BY id DESC',
            [iso, mobile]
        );
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/pallets/by-user/:user - Pallets por usuario
app.get('/api/pallets/by-user/:user', async (req, res) => {
    try {
        const user = req.params.user;
        const [rows] = await pool.query(
            'SELECT * FROM pallets WHERE (operador LIKE ? OR observaciones LIKE ?) ORDER BY id DESC LIMIT 200',
            [`%${user}%`, `%${user}%`]
        );
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/pallets - Crear un pallet
app.post('/api/pallets', async (req, res) => {
    try {
        const { pallet_id, cantidad, producto, destino, fecha, turno, condicion, operador, pedido, observaciones } = req.body;

        if (!pallet_id || !destino) {
            return res.status(400).json({ success: false, error: 'Campos requeridos: pallet_id, destino' });
        }

        const finalFecha = fecha || todayISO();
        const finalTurno = turno || 'N/A';

        const [result] = await pool.query(
            'INSERT INTO pallets (pallet_id, cantidad, producto, destino, fecha, turno, condicion, operador, pedido, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [pallet_id, cantidad || 0, producto || null, destino, finalFecha, finalTurno, condicion || null, operador || null, pedido || null, observaciones || null]
        );

        res.json({ success: true, id: result.insertId, message: 'Pallet registrado' });
    } catch (error) {
        console.error('Error POST /api/pallets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/pallets/bulk - Insertar múltiples pallets
app.post('/api/pallets/bulk', async (req, res) => {
    try {
        const { pallets } = req.body;
        if (!pallets || !Array.isArray(pallets) || pallets.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requiere un array de pallets' });
        }

        const values = pallets.map(p => [
            p.pallet_id, p.cantidad || 0, p.producto || null,
            p.destino, p.fecha || todayISO(), p.turno || 'N/A',
            p.condicion || null, p.operador || null, p.pedido || null, p.observaciones || null
        ]);

        const [result] = await pool.query(
            'INSERT INTO pallets (pallet_id, cantidad, producto, destino, fecha, turno, condicion, operador, pedido, observaciones) VALUES ?',
            [values]
        );

        res.json({ success: true, inserted: result.affectedRows, message: `${result.affectedRows} pallets insertados` });
    } catch (error) {
        console.error('Error POST /api/pallets/bulk:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/pallets/:id
app.delete('/api/pallets/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM pallets WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Pallet no encontrado' });
        }
        res.json({ success: true, message: 'Pallet eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS - DASHBOARD
// =============================================

// GET /api/dashboard - Stats generales
app.get('/api/dashboard', async (req, res) => {
    try {
        const { iso, mobile } = todayFormats();
        const dateWhere = '(fecha = ? OR fecha = ?)';
        const dateParams = [iso, mobile];

        const [[todayRow]] = await pool.query(`SELECT COUNT(*) as total, COALESCE(SUM(cantidad),0) as unidades FROM pallets WHERE ${dateWhere}`, dateParams);
        const [[totalRow]] = await pool.query('SELECT COUNT(*) as total FROM pallets');
        const [[errorRow]] = await pool.query(`SELECT COUNT(*) as total FROM errores_pallet WHERE ${dateWhere}`, dateParams);

        const [byDestino] = await pool.query(`SELECT destino, COUNT(*) as total FROM pallets WHERE ${dateWhere} GROUP BY destino`, dateParams);
        const [byTurno] = await pool.query(`SELECT turno, COUNT(*) as total FROM pallets WHERE ${dateWhere} GROUP BY turno`, dateParams);
        const [byOperador] = await pool.query(`SELECT operador, COUNT(*) as total FROM pallets WHERE ${dateWhere} AND operador IS NOT NULL GROUP BY operador`, dateParams);
        const [last5] = await pool.query('SELECT * FROM pallets ORDER BY id DESC LIMIT 5');

        res.json({
            success: true,
            today: {
                pallets: todayRow.total,
                unidades: todayRow.unidades,
                errores: errorRow.total,
            },
            allTime: { pallets: totalRow.total },
            byDestino,
            byTurno,
            byOperador,
            recent: last5,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/resumen-destino
app.get('/api/dashboard/resumen-destino', async (req, res) => {
    try {
        const { fechas } = req.query;
        let sql, params = [];

        if (fechas) {
            const fechaList = fechas.split(',').map(f => f.trim());
            const placeholders = fechaList.map(() => '?').join(',');
            sql = `SELECT destino, COUNT(*) AS total_pallets, SUM(cantidad) AS total_unidades
                   FROM pallets WHERE fecha IN (${placeholders}) GROUP BY destino`;
            params = fechaList;
        } else {
            const { iso, mobile } = todayFormats();
            sql = 'SELECT destino, COUNT(*) AS total_pallets, SUM(cantidad) AS total_unidades FROM pallets WHERE (fecha = ? OR fecha = ?) GROUP BY destino';
            params = [iso, mobile];
        }

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/turno-destino
app.get('/api/dashboard/turno-destino', async (req, res) => {
    try {
        const { fechas } = req.query;
        let sql, params = [];

        if (fechas) {
            const fechaList = fechas.split(',').map(f => f.trim());
            const placeholders = fechaList.map(() => '?').join(',');
            sql = `SELECT turno, destino, COUNT(*) AS total_pallets FROM pallets WHERE fecha IN (${placeholders}) GROUP BY turno, destino`;
            params = fechaList;
        } else {
            const { iso, mobile } = todayFormats();
            sql = 'SELECT turno, destino, COUNT(*) AS total_pallets FROM pallets WHERE (fecha = ? OR fecha = ?) GROUP BY turno, destino';
            params = [iso, mobile];
        }

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/diarios
app.get('/api/dashboard/diarios', async (req, res) => {
    try {
        const { turno, dias } = req.query;
        const limitDays = parseInt(dias) || 7;

        let sql = 'SELECT fecha, turno, COUNT(*) AS total_pallets FROM pallets WHERE 1=1';
        const params = [];

        if (turno && turno !== 'Completo') {
            sql += ' AND turno LIKE ?';
            params.push(`%${turno}%`);
        }

        sql += ' GROUP BY fecha, turno ORDER BY fecha DESC LIMIT ?';
        params.push(limitDays * 2);

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/promedios
app.get('/api/dashboard/promedios', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT turno, COUNT(*) AS total_pallets,
                   COUNT(DISTINCT fecha) AS total_dias,
                   ROUND(COUNT(*) / GREATEST(COUNT(DISTINCT fecha), 1), 1) AS promedio
            FROM pallets GROUP BY turno
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/fechas
app.get('/api/dashboard/fechas', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT fecha FROM pallets ORDER BY fecha DESC');
        res.json({ success: true, data: rows.map(r => r.fecha) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/dashboard/hoy
app.get('/api/dashboard/hoy', async (req, res) => {
    try {
        const { iso, mobile } = todayFormats();
        const [pallets] = await pool.query('SELECT * FROM pallets WHERE (fecha = ? OR fecha = ?) ORDER BY id DESC', [iso, mobile]);
        const [errores] = await pool.query('SELECT * FROM errores_pallet WHERE (fecha = ? OR fecha = ?) ORDER BY id DESC', [iso, mobile]);
        res.json({
            success: true,
            fecha: new Date(),
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

app.get('/api/errores', async (req, res) => {
    try {
        const { fecha, tipo, hoy } = req.query;
        let sql = 'SELECT * FROM errores_pallet WHERE 1=1';
        const params = [];

        if (hoy === 'true') {
            const { iso, mobile } = todayFormats();
            sql += ' AND (fecha = ? OR fecha = ?)';
            params.push(iso, mobile);
        } else if (fecha) {
            sql += ' AND fecha = ?';
            params.push(fecha);
        }
        if (tipo) {
            sql += ' AND tipo LIKE ?';
            params.push(`%${tipo}%`);
        }

        sql += ' ORDER BY id DESC';
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/errores/top', async (req, res) => {
    try {
        const { hoy, tipo } = req.query;
        let sql = 'SELECT defecto, COUNT(*) as total, tipo FROM errores_pallet WHERE 1=1';
        const params = [];

        if (hoy === 'true') {
            const { iso, mobile } = todayFormats();
            sql += ' AND (fecha = ? OR fecha = ?)';
            params.push(iso, mobile);
        }
        if (tipo) {
            sql += ' AND tipo LIKE ?';
            params.push(`%${tipo}%`);
        }

        sql += ' GROUP BY defecto, tipo ORDER BY total DESC';
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/errores', async (req, res) => {
    try {
        const { pallet_id, fecha, defecto, tipo } = req.body;
        if (!pallet_id || !defecto) {
            return res.status(400).json({ success: false, error: 'Campos requeridos: pallet_id, defecto' });
        }
        const [result] = await pool.query(
            'INSERT INTO errores_pallet (pallet_id, fecha, defecto, tipo) VALUES (?, ?, ?, ?)',
            [pallet_id, fecha || todayISO(), defecto, tipo || null]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/errores/bulk', async (req, res) => {
    try {
        const { errores } = req.body;
        if (!errores || !Array.isArray(errores) || errores.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requiere un array de errores' });
        }
        const values = errores.map(e => [e.pallet_id, e.fecha || todayISO(), e.defecto, e.tipo || null]);
        const [result] = await pool.query('INSERT INTO errores_pallet (pallet_id, fecha, defecto, tipo) VALUES ?', [values]);
        res.json({ success: true, inserted: result.affectedRows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS - MOBILE APP
// =============================================

// GET /api/mobile/check/:palletId
app.get('/api/mobile/check/:palletId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, fecha, turno FROM pallets WHERE pallet_id = ? ORDER BY id DESC LIMIT 1',
            [req.params.palletId]
        );
        res.json({ exists: rows.length > 0, data: rows[0] || null });
    } catch (error) {
        res.status(500).json({ exists: false, error: error.message });
    }
});

// POST /api/mobile/register — SINGLE SOURCE OF TRUTH for pallet registration
app.post('/api/mobile/register', async (req, res) => {
    try {
        const { pallet_id, cantidad, producto, destino, fecha, turno, condicion, operador, pedido, items } = req.body;

        if (!pallet_id || !destino) {
            return res.status(400).json({ success: false, error: 'Campos requeridos: pallet_id, destino' });
        }

        const totalQty = (items && items.length > 0)
            ? items.reduce((sum, i) => sum + (i.cantidad || 1), 0)
            : (cantidad || 0);

        const skuSummary = (items && items.length > 0)
            ? items.map(i => `${i.sku}(${i.cantidad || 1})`).join(', ')
            : (producto || null);

        const finalFecha = fecha || todayISO();

        const [result] = await pool.query(
            'INSERT INTO pallets (pallet_id, cantidad, producto, destino, fecha, turno, condicion, operador, pedido, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [pallet_id, totalQty, skuSummary, destino, finalFecha, turno || 'N/A', condicion || null, operador || null, pedido || null, operador || null]
        );

        const palletRefId = result.insertId;

        if (items && items.length > 0) {
            const values = items.map(i => [palletRefId, pallet_id, i.sku, i.cantidad || 1]);
            await pool.query('INSERT INTO pallet_items (pallet_ref_id, pallet_id, sku, cantidad) VALUES ?', [values]);
        }

        res.json({
            success: true,
            id: palletRefId,
            total_qty: totalQty,
            message: 'Pallet registrado'
        });
    } catch (error) {
        console.error('Error POST /api/mobile/register:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/mobile/recent
app.get('/api/mobile/recent', async (req, res) => {
    try {
        const { operador, limit } = req.query;
        const lim = parseInt(limit) || 50;

        let sql = 'SELECT * FROM pallets WHERE 1=1';
        const params = [];

        if (operador) {
            sql += ' AND (operador LIKE ? OR observaciones LIKE ?)';
            params.push(`%${operador}%`, `%${operador}%`);
        }

        sql += ' ORDER BY id DESC LIMIT ?';
        params.push(lim);

        const [pallets] = await pool.query(sql, params);

        if (pallets.length > 0) {
            const ids = pallets.map(p => p.id);
            const [items] = await pool.query('SELECT * FROM pallet_items WHERE pallet_ref_id IN (?)', [ids]);
            const itemMap = {};
            for (const item of items) {
                if (!itemMap[item.pallet_ref_id]) itemMap[item.pallet_ref_id] = [];
                itemMap[item.pallet_ref_id].push(item);
            }
            for (const p of pallets) {
                p.items = itemMap[p.id] || [];
            }
        }

        res.json({ success: true, data: pallets, total: pallets.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/mobile/stats
app.get('/api/mobile/stats', async (req, res) => {
    try {
        const { operador } = req.query;
        const { iso, mobile } = todayFormats();

        let whereDate = '(fecha = ? OR fecha = ?)';
        let params = [iso, mobile];

        let whereOp = '';
        if (operador) {
            whereOp = ' AND (operador LIKE ? OR observaciones LIKE ?)';
            params.push(`%${operador}%`, `%${operador}%`);
        }

        const [todayCount] = await pool.query(
            `SELECT COUNT(*) as total FROM pallets WHERE ${whereDate}${whereOp}`, params
        );

        let lastParams = [];
        let lastWhere = '';
        if (operador) {
            lastWhere = ' WHERE (operador LIKE ? OR observaciones LIKE ?)';
            lastParams.push(`%${operador}%`, `%${operador}%`);
        }
        const [lastPallet] = await pool.query(
            `SELECT pallet_id, destino, fecha, turno FROM pallets${lastWhere} ORDER BY id DESC LIMIT 1`, lastParams
        );

        const destinoParams = [iso, mobile];
        if (operador) {
            destinoParams.push(`%${operador}%`, `%${operador}%`);
        }
        const [destinoCounts] = await pool.query(
            `SELECT destino, COUNT(*) as total FROM pallets WHERE ${whereDate}${whereOp} GROUP BY destino`,
            destinoParams
        );

        res.json({
            success: true,
            today: todayCount[0].total,
            last: lastPallet[0] || null,
            byDestino: destinoCounts
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// HEALTH CHECK
// =============================================
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        const [[palletCount]] = await pool.query('SELECT COUNT(*) as total FROM pallets');
        const [[errorCount]] = await pool.query('SELECT COUNT(*) as total FROM errores_pallet');
        res.json({
            success: true,
            status: 'OK',
            database: config.db.database,
            pallets: palletCount.total,
            errores: errorCount.total,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, status: 'ERROR', error: error.message });
    }
});

// =============================================
// INICIAR SERVIDOR
// =============================================
app.listen(config.port, async () => {
    console.log('');
    console.log('===========================================');
    console.log('  MI-TECH Paletizado - API REST (MySQL)');
    console.log(`  http://localhost:${config.port}`);
    console.log(`  Dashboard: http://localhost:${config.port}/index.html`);
    console.log('===========================================');
    console.log('');
    console.log(`  Base de datos: ${config.db.database}@${config.db.host}`);

    await ensureTables();
    console.log('  Tablas verificadas.');

    const [[pc]] = await pool.query('SELECT COUNT(*) as t FROM pallets');
    const [[ec]] = await pool.query('SELECT COUNT(*) as t FROM errores_pallet');
    console.log(`  MySQL listo: ${pc.t} pallets, ${ec.t} errores`);
    console.log('  Servidor listo.');
    console.log('');
});
