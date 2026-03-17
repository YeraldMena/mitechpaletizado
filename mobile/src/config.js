// ═══════════════════════════════════════════════════
// MI-TECH Paletizado Mobile — Configuration
// ═══════════════════════════════════════════════════

// ── Backend API ──
// CAMBIAR a la IP real del servidor en la red local
export const API_BASE = 'http://192.168.1.100:3009';

// Google Apps Script (escritura primaria — igual que formulario web)
export const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbydPLwlIU8R6aDZlKKYg8waA2WhcfV2ftqFdy0m3bIoIM3b_SfyuNN0bdm7cSKq09q4dw/exec';

// ═══════════════════════════════════════════════════
// OPERADORES
// Para agregar/quitar/cambiar operadores, editar esta lista.
// turno: 'day' = turno día, 'night' = turno noche
// ═══════════════════════════════════════════════════
export const OPERATORS = [
  // ── Turno día (3 operadores) ──
  { id: 'brayan',       name: 'Brayan',       turno: 'day' },
  { id: 'luis_antonio',  name: 'Luis Antonio', turno: 'day' },
  { id: 'leonardo',     name: 'Leonardo',      turno: 'day' },

  // ── Turno noche (1 operador) ──
  { id: 'cristian',     name: 'Cristian',      turno: 'night' },
];

// ── Condition codes — quality grades ──
export const CONDITIONS = [
  { code: 'GRA', label: 'GRA', color: '#22C55E', group: 'grade' },
  { code: 'GRB', label: 'GRB', color: '#16A34A', group: 'grade' },
  { code: 'GRC', label: 'GRC', color: '#15803D', group: 'grade' },
  { code: 'ICB', label: 'ICB', color: '#F59E0B', group: 'ic' },
  { code: 'ICC', label: 'ICC', color: '#D97706', group: 'ic' },
  { code: 'ICD', label: 'ICD', color: '#B45309', group: 'ic' },
  { code: 'ICX', label: 'ICX', color: '#EF4444', group: 'ic' },
  { code: 'BOX', label: 'BOX', color: '#3B82F6', group: 'other' },
  { code: 'DNP', label: 'DNP', color: '#8B5CF6', group: 'damage' },
  { code: 'DMT', label: 'DMT', color: '#EC4899', group: 'damage' },
  { code: 'DMA', label: 'DMA', color: '#F43F5E', group: 'damage' },
];

// ── Destinations ──
export const DESTINATIONS = [
  { value: 'TRG',             label: 'TRG',             icon: 'arrow-forward-circle' },
  { value: 'HV Televisiones', label: 'HV TV',           icon: 'tv' },
  { value: 'Almacen',         label: 'Almacén',         icon: 'cube' },
  { value: 'HV',              label: 'HV',              icon: 'diamond' },
];

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
