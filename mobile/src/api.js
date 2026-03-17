import { API_BASE, GOOGLE_SCRIPT_URL, nowTimestamp, todayStr } from './config';

// ── Timeout wrapper ──
function fetchWithTimeout(url, opts = {}, ms = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// ═══════════════════════════════════════
// DUPLICATE CHECK — fast, single query
// ═══════════════════════════════════════
export async function checkDuplicate(palletId) {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/mobile/check/${encodeURIComponent(palletId)}`);
    const j = await r.json();
    return j.exists ? j.data : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════
// REGISTER PALLET — dual write
// Escribe al Google Sheet (primario) y al backend MySQL (respaldo)
// ═══════════════════════════════════════
export async function registerPallet({ palletId, cantidad, condicion, destino, turno, operador, pedido, items }) {
  const timestamp = nowTimestamp();
  const fecha = todayStr();

  // Formato de turno que usa el Google Sheet: "Day (día)" / "Night (noche)"
  const turnoSheet = turno === 'Day' ? 'Day (día)' : 'Night (noche)';

  // ──────────────────────────────────────
  // 1. GOOGLE SHEETS — JSON POST, mode no-cors
  //    Campos EXACTOS que espera el Apps Script
  //    (mismo formato que el formulario web)
  // ──────────────────────────────────────
  try {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp:   timestamp,
        pallet:      palletId,
        qty:         String(cantidad),
        condicion:   condicion.join(', '),
        destino:     destino,
        turno:       turnoSheet,
        escaneadora: operador,
        pedido:      pedido || '',
      }),
    }).catch(() => {});
    // no-cors: no se puede leer la respuesta, pero el dato SÍ se escribe
  } catch {
    // fire-and-forget
  }

  // ──────────────────────────────────────
  // 2. EXPRESS API — MySQL backup con detalle de items
  // ──────────────────────────────────────
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/mobile/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pallet_id: palletId,
        cantidad,
        destino,
        fecha,
        turno: turnoSheet,
        condicion: condicion.join(', '),
        operador: operador,
        pedido: pedido || null,
        items: items.map(i => ({ sku: i.sku, cantidad: i.qty })),
      }),
    }, 8000);
    const j = await r.json();
    return { success: j.success, id: j.id, googleSent: true };
  } catch {
    // API caída pero Google Sheets ya se mandó
    return { success: true, id: null, googleSent: true, offline: true };
  }
}

// ═══════════════════════════════════════
// RECENT PALLETS
// ═══════════════════════════════════════
export async function fetchRecent(operador, limit = 50) {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (operador) params.append('operador', operador);
    const r = await fetchWithTimeout(`${API_BASE}/api/mobile/recent?${params}`);
    const j = await r.json();
    return j.success ? j.data : [];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════
// TODAY STATS (filtered by operator)
// ═══════════════════════════════════════
export async function fetchStats(operador) {
  try {
    const params = new URLSearchParams();
    if (operador) params.append('operador', operador);
    const r = await fetchWithTimeout(`${API_BASE}/api/mobile/stats?${params}`);
    const j = await r.json();
    return j.success ? j : { today: 0, last: null, byDestino: [] };
  } catch {
    return { today: 0, last: null, byDestino: [] };
  }
}

// ═══════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════
export async function checkHealth() {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/health`, {}, 3000);
    return r.ok;
  } catch {
    return false;
  }
}
