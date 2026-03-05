# Pre-Push Tester — Verificar antes de subir a GitHub

Agente tester que verifica la integridad completa del proyecto antes de hacer commit y push. Asegura que nada se corrompa al subir cambios.

## Instrucciones

Ejecuta TODAS las verificaciones en orden. Si alguna falla, NO procedas al push — reporta el problema y propón la corrección.

### 1. Estructura de Archivos

Verificar que estos archivos existen EN LA RAÍZ del proyecto (NO dentro de .claude/):
- [ ] `index.html` — frontend principal
- [ ] `backend/server.js` — servidor Express
- [ ] `backend/config.js` — configuración MySQL y puerto
- [ ] `backend/package.json` — dependencias del backend
- [ ] `backend/package-lock.json` — lockfile de dependencias
- [ ] `backend/sync-sheets.js` — script de sincronización standalone
- [ ] `START-SERVER.bat` — launcher Windows
- [ ] `.gitignore` — debe contener `node_modules/`
- [ ] `Staticfile` — archivo de Cloud Foundry
- [ ] `dashboard Paletizado.html` — dashboard legacy
- [ ] `README.md`

Si algún archivo está dentro de `.claude/` en vez de la raíz, MOVERLO de vuelta antes de continuar.

### 2. Git Status Limpio

- [ ] Ejecutar `git status` y verificar que NO hay archivos eliminados ("deleted")
- [ ] Verificar que `node_modules/` NO está siendo trackeado (debe estar en .gitignore)
- [ ] Verificar que NO hay archivos sensibles staged (`.env`, credenciales extra, etc.)
- [ ] Verificar que la rama actual es `main`

### 3. Validación del HTML (index.html)

- [ ] El archivo NO está vacío y tiene más de 2000 líneas
- [ ] Empieza con `<!DOCTYPE html>` y termina con `</html>`
- [ ] Contiene las 5 vistas: `view-dashboard`, `view-palets`, `view-ordenes`, `view-formulario`, `view-configuracion`
- [ ] La función `switchView` existe y maneja las 5 vistas
- [ ] Los CDN externos están presentes (Chart.js, Flatpickr, Font Awesome, Google Fonts)
- [ ] Las URLs de Google Sheets están presentes (spreadsheet IDs: `1Su-CGdOPU-etXKoVXAKYx6qKhN92RFBiH-gLeN_XElk` y `1FjVHlUNzu0gqhBunDNXKD5GUpcKGviLrFdJJAZG5qhg`)
- [ ] La URL de Apps Script (`APPS_SCRIPT_URL`) está definida
- [ ] No hay tags HTML rotos (verificar que cada `<div` tiene su `</div>`, cada `<script>` tiene `</script>`)
- [ ] No hay errores de sintaxis JavaScript evidentes (funciones sin cerrar, llaves desbalanceadas)

### 4. Validación del Backend

- [ ] `backend/server.js` contiene `app.listen(config.port`
- [ ] `backend/server.js` contiene `express.static(path.join(__dirname, '..'))`  — debe apuntar a `..` (raíz), NO a otro path
- [ ] `backend/config.js` exporta `db` y `port`
- [ ] `backend/package.json` tiene las 3 dependencias: `express`, `mysql2`, `cors`
- [ ] Las URLs de Google Sheets en `server.js` coinciden con las de `index.html` (mismos spreadsheet IDs)

### 5. Validación de Consistencia

- [ ] Los valores de turno del formulario son compatibles con la normalización del backend
- [ ] Los destinos del formulario son compatibles con la normalización del backend
- [ ] `START-SERVER.bat` apunta a `http://localhost:3009` (puerto correcto según config.js)
- [ ] El `.gitignore` incluye `node_modules/`

### 6. Verificar Cambios Pendientes

- [ ] Ejecutar `git diff` y `git diff --staged` para ver todos los cambios
- [ ] Verificar que los cambios tienen sentido (no hay código borrado por accidente, no hay archivos corruptos)
- [ ] Verificar que NO se están subiendo archivos binarios grandes innecesarios
- [ ] Verificar que `backend/node_modules/` NO está en el diff

### 7. Reporte Final

Genera un reporte con este formato:

```
==========================================
  PRE-PUSH TEST REPORT
==========================================

Estructura de archivos:  [PASS/FAIL]
Git status:              [PASS/FAIL]
HTML válido:             [PASS/FAIL]
Backend válido:          [PASS/FAIL]
Consistencia:            [PASS/FAIL]
Cambios revisados:       [PASS/FAIL]

RESULTADO: [LISTO PARA PUSH / BLOQUEADO]
==========================================
```

Si TODAS las verificaciones son PASS:
- Preguntar al usuario si quiere que haga el commit y push
- Sugerir un mensaje de commit basado en los cambios detectados

Si alguna es FAIL:
- Listar los problemas encontrados
- Proponer correcciones específicas
- Preguntar si quiere que las aplique

$ARGUMENTS
