// ═══════════════════════════════════════════════════
// MI-TECH Paletizado Mobile — Configuration
// ═══════════════════════════════════════════════════

// ── Backend API ──
// CHANGE THIS to your server's local network IP
export const API_BASE = 'http://192.168.1.100:3009';

// Google Apps Script (primary write — same as web form)
export const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbydPLwlIU8R6aDZlKKYg8waA2WhcfV2ftqFdy0m3bIoIM3b_SfyuNN0bdm7cSKq09q4dw/exec';

// ── Operators ──
export const OPERATORS = [
  { id: 'brayan',       name: 'Brayan' },
  { id: 'luis_antonio',  name: 'Luis Antonio' },
  { id: 'leonardo',     name: 'Leonardo' },
  { id: 'cristian',     name: 'Cristian' },
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
