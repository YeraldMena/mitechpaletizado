import { API_BASE, GOOGLE_SCRIPT_URL, GOOGLE_SCRIPT_BACKUP_URL, nowTimestamp, todayStr } from './config';

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
// POST a Google Sheet via Apps Script
// Sin mode: 'no-cors' (React Native no lo necesita)
// Con await y logs reales de error
// ═══════════════════════════════════════
async function postToGoogleSheet(url, payload, label) {
  try {
    console.log(`[SHEETS][${label}] Enviando POST →`, url);
    console.log(`[SHEETS][${label}] Payload:`, JSON.stringify(payload));

    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 15000);

    // Apps Script redirige (302) y devuelve HTML o JSON
    const text = await r.text();
    console.log(`[SHEETS][${label}] Status: ${r.status}`);
    console.log(`[SHEETS][${label}] Respuesta:`, text.substring(0, 500));

    return { ok: r.status >= 200 && r.status < 400, status: r.status, body: text };
  } catch (err) {
    console.error(`[SHEETS][${label}] ❌ ERROR:`, err.message || err);
    return { ok: false, status: 0, body: null, error: err.message || String(err) };
  }
}

// ═══════════════════════════════════════
// REGISTER PALLET — DUAL WRITE real
// 1. Google Sheet principal (REPORTES INGENIERO)
// 2. Google Sheet respaldo
// 3. Express API / MySQL
// ═══════════════════════════════════════
export async function registerPallet({ palletId, cantidad, condicion, destino, turno, operador, pedido, items }) {
  const timestamp = nowTimestamp();
  const fecha = todayStr();

  // Formato de turno que usa el Google Sheet: "Day (día)" / "Night (noche)"
  const turnoSheet = turno === 'Day' ? 'Day (día)' : 'Night (noche)';

  // Payload EXACTO que espera el Apps Script
  // (mismo formato que el formulario web en index.html)
  const sheetPayload = {
    timestamp:   timestamp,
    pallet:      palletId,
    qty:         String(cantidad),
    condicion:   condicion.join(', '),
    destino:     destino,
    turno:       turnoSheet,
    escaneadora: operador,
    pedido:      pedido || '',
  };

  // ──────────────────────────────────────
  // 1 & 2. DUAL WRITE — ambos Google Sheets en paralelo
  // ──────────────────────────────────────
  const [sheetResult, backupResult] = await Promise.allSettled([
    postToGoogleSheet(GOOGLE_SCRIPT_URL, sheetPayload, 'PRINCIPAL'),
    postToGoogleSheet(GOOGLE_SCRIPT_BACKUP_URL, sheetPayload, 'RESPALDO'),
  ]);

  const sheetOk = sheetResult.status === 'fulfilled' && sheetResult.value.ok;
  const backupOk = backupResult.status === 'fulfilled' && backupResult.value.ok;

  console.log(`[REGISTER] Sheet principal: ${sheetOk ? '✅' : '❌'}`);
  console.log(`[REGISTER] Sheet respaldo: ${backupOk ? '✅' : '❌'}`);

  if (!sheetOk) {
    const err = sheetResult.status === 'fulfilled' ? sheetResult.value : sheetResult.reason;
    console.error('[REGISTER] ❌ Fallo Sheet principal:', JSON.stringify(err));
  }
  if (!backupOk) {
    const err = backupResult.status === 'fulfilled' ? backupResult.value : backupResult.reason;
    console.error('[REGISTER] ❌ Fallo Sheet respaldo:', JSON.stringify(err));
  }

  // ──────────────────────────────────────
  // 3. EXPRESS API — MySQL con detalle de items
  // ──────────────────────────────────────
  let apiResult = { success: false, id: null };
  try {
    console.log(`[API] Enviando POST → ${API_BASE}/api/mobile/register`);
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
    console.log(`[API] Respuesta:`, JSON.stringify(j));
    apiResult = { success: j.success, id: j.id };
  } catch (err) {
    console.error(`[API] ❌ ERROR:`, err.message || err);
  }

  // Si al menos uno de los Sheets escribió, se considera éxito
  const anySheetOk = sheetOk || backupOk;

  if (!anySheetOk && !apiResult.success) {
    // Fallo total — lanzar error para que PalletFormScreen muestre alerta
    throw new Error(
      'No se pudo guardar en ningún destino. ' +
      'Verifica tu conexión a internet y vuelve a intentar.'
    );
  }

  return {
    success: true,
    id: apiResult.id,
    googleSent: sheetOk,
    backupSent: backupOk,
    apiSent: apiResult.success,
    offline: !apiResult.success,
  };
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
