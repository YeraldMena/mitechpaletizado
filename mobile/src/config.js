// ═══════════════════════════════════════════════════
// MI-TECH Paletizado Mobile — Configuration
// ═══════════════════════════════════════════════════

// ── Backend API ──
// CAMBIAR a la IP real del servidor en la red local
export const API_BASE = 'http://192.168.1.100:3009';

// ═══════════════════════════════════════════════════
// ESCANEADORAS (operadores registrados)
// turno: 'Day' = día (6am-6pm), 'Night' = noche (6pm-6am)
// Para cambiar nombres o turno: editar esta lista
// ═══════════════════════════════════════════════════
export const OPERATORS = [
  { id: 'angelica',  name: 'Angélica Alemán', turno: 'Day' },
  { id: 'nathalie',  name: 'Nathalie López',  turno: 'Day' },
  { id: 'yusley',    name: 'Yusley Montes',   turno: 'Day' },
  { id: 'cecilia',   name: 'Cecilia Pérez',   turno: 'Night' },
];

// Buscar turno fijo de un operador por nombre
export function getOperatorTurno(name) {
  const op = OPERATORS.find((o) => o.name === name);
  return op ? op.turno : detectShift();
}

// ── Condition codes ──
export const CONDITIONS = [
  { code: 'GRA', label: 'GRA', color: '#22C55E' },
  { code: 'GRB', label: 'GRB', color: '#16A34A' },
  { code: 'GRC', label: 'GRC', color: '#15803D' },
  { code: 'ICB', label: 'ICB', color: '#F59E0B' },
  { code: 'ICC', label: 'ICC', color: '#D97706' },
  { code: 'ICD', label: 'ICD', color: '#B45309' },
  { code: 'ICX', label: 'ICX', color: '#EF4444' },
  { code: 'BOX', label: 'BOX', color: '#3B82F6' },
  { code: 'DNP', label: 'DNP', color: '#8B5CF6' },
  { code: 'DMT', label: 'DMT', color: '#EC4899' },
  { code: 'DMA', label: 'DMA', color: '#F43F5E' },
];

// Default: GRB es la condición más frecuente
export const DEFAULT_CONDITION = 'GRB';

// ── Destinations ──
export const DESTINATIONS = [
  { value: 'Almacén',          label: 'Almacén',   icon: 'cube' },
  { value: 'TRG',              label: 'TRG',       icon: 'arrow-forward-circle' },
  { value: 'HV (High Value)',  label: 'HV',        icon: 'diamond' },
  { value: 'BOX',              label: 'BOX',       icon: 'archive' },
];

// Default: Almacén es el destino más frecuente
export const DEFAULT_DESTINO = 'Almacén';

// ── Auto-detect shift ──
export function detectShift() {
  const h = new Date().getHours();
  return (h >= 6 && h < 18) ? 'Day' : 'Night';
}

// ── Date helpers ──
export function todayStr() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function nowTimestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ── Barcode types to scan ──
export const BARCODE_TYPES = [
  'code128', 'code39', 'ean13', 'ean8', 'qr',
  'codabar', 'itf14', 'upc_a', 'upc_e',
];
