-- ═══════════════════════════════════════════════════
-- MI-TECH Paletizado — Schema MySQL
-- Base de datos: paletizado_db
-- Ejecutar en MySQL Workbench o CLI
-- ═══════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS paletizado_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE paletizado_db;

-- ── Tabla principal: pallets ──
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tabla de errores/defectos ──
CREATE TABLE IF NOT EXISTS errores_pallet (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pallet_id VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    defecto VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pallet_id (pallet_id),
    INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tabla de items por pallet (detalle SKU) ──
CREATE TABLE IF NOT EXISTS pallet_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pallet_ref_id INT,
    pallet_id VARCHAR(50) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    cantidad INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pallet_id (pallet_id),
    INDEX idx_pallet_ref (pallet_ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Vistas útiles para el dashboard ──
CREATE OR REPLACE VIEW v_resumen_destino AS
SELECT destino,
       COUNT(*) AS total_pallets,
       COALESCE(SUM(cantidad), 0) AS total_unidades
FROM pallets
GROUP BY destino;

CREATE OR REPLACE VIEW v_turno_destino AS
SELECT turno, destino,
       COUNT(*) AS total_pallets
FROM pallets
GROUP BY turno, destino;
