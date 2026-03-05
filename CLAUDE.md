# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MI-TECH Paletizado is an industrial pallet tracking dashboard. It displays real-time data synced from Google Sheets into a local MySQL database, with a Node.js/Express backend API and a single-page frontend.

## Architecture

### Frontend (index.html — single monolithic file, ~2700 lines)
- Pure HTML/CSS/JS — no build step, no framework
- Dark-themed dashboard with sidebar navigation and 5 views: Dashboard, Palets, Órdenes, Formulario, Configuración
- Uses Chart.js for charts (donut, bar, line), Flatpickr for date picker, Font Awesome for icons
- Data comes from two sources:
  - **Google Sheets** (via JSONP `gviz/tq` endpoint) — fetched directly in the browser for the main data tables
  - **Backend API** (`/api/...`) — used by dashboard charts and aggregated views
- `dashboard Paletizado.html` is an older/legacy version of the dashboard (not served by default)

### Backend (backend/)
- **server.js**: Express server on port 3009 (configured in config.js). Serves static files from project root. Contains:
  - REST API endpoints under `/api/pallets`, `/api/errores`, `/api/dashboard/*`, `/api/health`
  - Built-in Google Sheets → MySQL sync that runs every 30 seconds
- **sync-sheets.js**: Standalone sync script (can run independently with `node sync-sheets.js` or `--auto` for continuous mode)
- **config.js**: MySQL connection config (host, user, password, database) and server port

### Data Flow
Google Sheets → (JSONP fetch / sync-sheets) → MySQL `paletizado_db` → Express API → Frontend charts & tables

### Database (MySQL — `paletizado_db`)
Two main tables:
- `pallets` — columns: id, pallet_id, cantidad, producto, destino, fecha, turno, condicion, observaciones
- `errores_pallet` — columns: id, pallet_id, fecha, defecto, tipo
- Uses `INSERT IGNORE` to avoid duplicates during sync
- Has views: `v_resumen_destino`, `v_turno_destino` (used by dashboard endpoints as fallback)

### Google Sheets Sources
- Pallets sheet: spreadsheet ID `1Su-CGdOPU-etXKoVXAKYx6qKhN92RFBiH-gLeN_XElk`, gid `530597405`
- Errores sheet: spreadsheet ID `1FjVHlUNzu0gqhBunDNXKD5GUpcKGviLrFdJJAZG5qhg`, sheet `Liberación de Pallet`

## Commands

```bash
# Install backend dependencies
cd backend && npm install

# Start server (API + auto-sync + serves frontend at http://localhost:3009)
cd backend && node server.js

# Or use the Windows batch launcher (starts MySQL service, opens browser, runs server)
./START-SERVER.bat

# Run standalone sync once
cd backend && node sync-sheets.js

# Run standalone sync in continuous mode
cd backend && node sync-sheets.js --auto
```

## Custom Skills (Slash Commands)

Disponibles en `.claude/commands/`:

| Comando | Uso |
|---------|-----|
| `/add-endpoint` | Agregar un nuevo endpoint REST al backend |
| `/add-tab` | Agregar una nueva pestaña/vista al dashboard |
| `/add-chart` | Agregar un gráfico Chart.js al dashboard |
| `/fix-tabla` | Diagnosticar y corregir problemas en tablas de datos |
| `/sync-debug` | Diagnosticar problemas de sincronización Sheets-MySQL |
| `/refactor-section` | Refactorizar una sección del index.html |
| `/verify-forms` | Verificar que los formularios funcionen correctamente (estructura, validaciones, envío, flujo completo) |
| `/pre-push` | Tester completo antes de subir a GitHub: estructura, git, HTML, backend, consistencia |

## Key Conventions

- The project language is Spanish (UI labels, variable names, comments, commit messages)
- Commit messages use conventional-style prefixes in Spanish context: `feat:`, `fix:`, `refactor:`
- All frontend code lives in a single `index.html` file — CSS in `<style>`, JS in `<script>` at the bottom
- The backend has no test suite, no linter, no TypeScript — it's plain Node.js with mysql2 + express + cors
- The `Staticfile` with `root: .` suggests historical Cloud Foundry deployment
- MySQL service name is `MySQL84` (used by START-SERVER.bat)
- Server port: 3009 (configured in backend/config.js)
