# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MI-TECH Paletizado is an industrial pallet tracking dashboard. It displays real-time data synced from Google Sheets into a local MySQL database, with a Node.js/Express backend API and a single-page frontend.

## Architecture

### Frontend (index.html — single monolithic file, ~3500 lines)
- Pure HTML/CSS/JS — no build step, no framework
- Dark-themed dashboard with sidebar navigation and 5 views: Dashboard, Palets, Órdenes, Formulario, Configuración
- Fully responsive: mobile breakpoints at 768px and 480px with collapsible sections, card views replacing tables, horizontal stat cards
- Uses Chart.js v4 for charts (doughnut, bar horizontal, line), Flatpickr for date picker, Font Awesome for icons
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
| `/pre-push` | Agente de deploy: verificar, commit, push y pull de forma segura |
| `/mobile-fix` | Diagnosticar y corregir problemas de responsive/mobile en el dashboard |
| `/add-dashboard-panel` | Agregar un panel de datos resumidos al Dashboard principal |

## MANDATORY: Git Operations Protocol

**SIEMPRE usar `/pre-push` antes de cualquier operación git que suba o baje cambios.** Esto incluye:
- `git push` → usar `/pre-push subir`
- `git pull` → usar `/pre-push bajar`
- `git commit` + push → usar `/pre-push`

**NUNCA hacer push/pull directo sin pasar por el agente.** El agente verifica:
1. Que los archivos del proyecto estén en la raíz (no en .claude/)
2. Que no haya archivos "deleted" en git status
3. Que index.html, backend/ y config estén íntegros
4. Que no se suban archivos sensibles o node_modules

## Responsive/Mobile Patterns

The dashboard uses these established patterns for mobile support:

- **Collapsible sections**: `.collapsible-toggle` (hidden on desktop, flex on mobile) + `.collapsible-body.collapsed` (max-height:0, opacity:0). Toggle via `toggleCollapsible(btn)`. Graphs auto-collapse on load for mobile.
- **Card views**: Tables replaced by `.ordenes-card-list` on mobile (`display:none` on desktop, `flex` on mobile). Cards use `.orden-card` with grid layout.
- **Horizontal stat cards**: On mobile, `.stat-card` switches to `flex-direction: row` with icon left, text right, `.stat-change` hidden.
- **Chart.js lifecycle**: Always destroy previous instance before creating a new one (`if (chart) chart.destroy()`).
- **Dashboard panels**: Pattern from `dash-ordenes-panel` — mini KPIs grid + Chart.js canvases + compact table, rendered from `processSheetData` callback.

## Key Conventions

- The project language is Spanish (UI labels, variable names, comments, commit messages)
- Commit messages use conventional-style prefixes in Spanish context: `feat:`, `fix:`, `refactor:`
- All frontend code lives in a single `index.html` file — CSS in `<style>`, JS in `<script>` at the bottom
- The backend has no test suite, no linter, no TypeScript — it's plain Node.js with mysql2 + express + cors
- The `Staticfile` with `root: .` suggests historical Cloud Foundry deployment
- MySQL service name is `MySQL84` (used by START-SERVER.bat)
- Server port: 3009 (configured in backend/config.js)
