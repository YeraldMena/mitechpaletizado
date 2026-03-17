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
    return null; // If API unreachable, allow registration (offline-tolerant)
  }
}

// ═══════════════════════════════════════
// REGISTER PALLET — dual write
// ═══════════════════════════════════════
export async function registerPallet({ palletId, items, condicion, destino, turno, operador, pedido }) {
  const timestamp = nowTimestamp();
  const fecha = todayStr();
  const totalQty = items.reduce((s, i) => s + (i.qty || 1), 0);

  // 1. Google Apps Script — fire-and-forget (primary store)
  try {
    const form = new URLSearchParams();
    form.append('timestamp', timestamp);
    form.append('pallet_id', palletId);
    form.append('cantidad', String(totalQty));
    form.append('condicion', condicion.join(', '));
    form.append('destino', destino);
    form.append('fecha', fecha);
    form.append('turno', turno);
    form.append('escaneadora', operador);
    form.append('pedido', pedido || '');

    // If multi-SKU, append summary
    if (items.length > 0) {
      const skuStr = items.map(i => `${i.sku}:${i.qty}`).join(' | ');
      form.append('contenido', skuStr);
    }

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    }).catch(() => {}); // No-cors, fire-and-forget
  } catch {
    // Expected: CORS may block response but data is written
  }

  // 2. Express API — structured write with items
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/mobile/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pallet_id: palletId,
        cantidad: totalQty,
        destino,
        fecha,
        turno,
        condicion: condicion.join(', '),
        operador,
        pedido: pedido || null,
        items: items.map(i => ({ sku: i.sku, cantidad: i.qty || 1 })),
      }),
    }, 8000);
    const j = await r.json();
    return { success: j.success, id: j.id };
  } catch {
    // API might be down but Google Sheets write already happened
    return { success: true, id: null, offline: true };
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
// TODAY STATS
// ═══════════════════════════════════════
export async function fetchStats() {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/mobile/stats`);
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
