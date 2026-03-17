import { API_BASE, nowTimestamp, todayStr } from './config';

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
// REGISTER PALLET — MySQL API (single write)
// ═══════════════════════════════════════
export async function registerPallet({ palletId, cantidad, condicion, destino, turno, operador, pedido, items }) {
  const fecha = todayStr();

  // Formato de turno: "Day (día)" / "Night (noche)"
  const turnoSheet = turno === 'Day' ? 'Day (día)' : 'Night (noche)';

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
    return { success: j.success, id: j.id };
  } catch {
    return { success: false, id: null, offline: true };
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
