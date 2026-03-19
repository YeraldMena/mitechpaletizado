// ═══════════════════════════════════════════════════════════════
// Google Apps Script — Escritura a "formulario de escaneadores"
//
// NUEVO SPREADSHEET OFICIAL:
//   https://docs.google.com/spreadsheets/d/1nAouHO7k2s7kSzrz2IX3GF_Y0Ba0ZDhx_JZsaR3rK44/edit
//
// INSTRUCCIONES DE DEPLOY:
// 1. Abrir el Google Sheet nuevo (link arriba)
// 2. Ir a Extensiones → Apps Script
// 3. Pegar este código completo (reemplazar todo)
// 4. Click en "Deploy" → "New deployment"
// 5. Tipo: "Web app"
// 6. Ejecutar como: "Yo" (tu cuenta)
// 7. Quién tiene acceso: "Cualquier persona"
// 8. Click en "Deploy" y copiar la URL
// 9. Pegar la URL en:
//    - index.html → APPS_SCRIPT_URL
//    - mobile/src/config.js → GOOGLE_SCRIPT_URL y GOOGLE_SCRIPT_BACKUP_URL
//
// COLUMNAS ESPERADAS EN "formulario de escaneadores" (fila 1 = encabezados):
// A: Timestamp | B: Pallet | C: Qty | D: Condición
// E: Destino   | F: Fecha  | G: Turno | H: Escaneadora | I: Pedido
// ═══════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.openById('1nAouHO7k2s7kSzrz2IX3GF_Y0Ba0ZDhx_JZsaR3rK44');
    var sheet = ss.getSheetByName('formulario de escaneadores');

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', message: 'Hoja "formulario de escaneadores" no encontrada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Agregar fila con los datos del escaneo
    sheet.appendRow([
      data.timestamp    || '',
      data.pallet       || '',
      data.qty          || '',
      data.condicion    || '',
      data.destino      || '',
      data.fecha        || data.timestamp ? data.timestamp.split(' ')[0] : '',
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
  // Soporte para escritura via GET (usado por el formulario web index.html)
  try {
    var ss = SpreadsheetApp.openById('1nAouHO7k2s7kSzrz2IX3GF_Y0Ba0ZDhx_JZsaR3rK44');
    var sheet = ss.getSheetByName('formulario de escaneadores');

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', message: 'Hoja no encontrada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Si tiene parámetros, es un registro nuevo
    if (e && e.parameter && e.parameter.pallet) {
      var p = e.parameter;
      var timestamp = p.timestamp || '';
      var fecha = timestamp ? timestamp.split(' ')[0] : '';

      sheet.appendRow([
        timestamp,
        p.pallet       || '',
        p.qty          || '',
        p.condicion    || '',
        p.destino      || '',
        fecha,
        p.turno        || '',
        p.escaneadora  || '',
        p.pedido       || ''
      ]);

      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1).setNumberFormat('@');

      return ContentService
        .createTextOutput(JSON.stringify({ result: 'ok', row: lastRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'active', service: 'MI-TECH Paletizado - Nuevo Sheet' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
