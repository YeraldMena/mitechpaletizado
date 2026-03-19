// ═══════════════════════════════════════════════════════════════
// Google Apps Script — Escritura al Sheet de RESPALDO
//
// INSTRUCCIONES DE DEPLOY:
// 1. Abrir el Google Sheet de respaldo:
//    https://docs.google.com/spreadsheets/d/1eTZKzt00TGHzVHhcIpf6-_IGF6y4jwhc/edit
// 2. Ir a Extensiones → Apps Script
// 3. Pegar este código completo (reemplazar todo)
// 4. Click en "Deploy" → "New deployment"
// 5. Tipo: "Web app"
// 6. Ejecutar como: "Yo" (tu cuenta)
// 7. Quién tiene acceso: "Cualquier persona"
// 8. Click en "Deploy" y copiar la URL
// 9. Pegar la URL en mobile/src/config.js → GOOGLE_SCRIPT_BACKUP_URL
//
// COLUMNAS ESPERADAS EN EL SHEET (fila 1 = encabezados):
// A: Timestamp | B: Pallet | C: Qty | D: Condición
// E: Destino   | F: Turno  | G: Escaneadora | H: Pedido
// ═══════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Hoja1') || ss.getSheets()[0];

    // Agregar fila con los datos del escaneo
    sheet.appendRow([
      data.timestamp    || '',
      data.pallet       || '',
      data.qty          || '',
      data.condicion    || '',
      data.destino      || '',
      data.turno        || '',
      data.escaneadora  || '',
      data.pedido       || ''
    ]);

    // Forzar formato texto plano en timestamp para evitar conversión de fecha
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1).setNumberFormat('@');

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok', row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'active', service: 'MI-TECH Paletizado Backup Sheet' }))
    .setMimeType(ContentService.MimeType.JSON);
}
