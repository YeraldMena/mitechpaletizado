# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MI-TECH Paletizado is an industrial pallet tracking dashboard. All data is stored in a local MySQL database, with a Node.js/Express backend API and a single-page frontend.

## Architecture

### Frontend (index.html — single monolithic file)
- Pure HTML/CSS/JS — no build step, no framework
- Dark-themed dashboard with sidebar navigation and 5 views: Dashboard, Palets, Órdenes, Formulario, Configuración
- Uses Chart.js for charts (donut, bar, line), Flatpickr for date picker, Font Awesome for icons
- All data comes from **Backend API** (`/api/...`) via fetch calls
- `dashboard Paletizado.html` is an older/legacy version of the dashboard (not served by default)

### Backend (backend/)
- **server.js**: Express server on port 3009 (configured in config.js). Serves static files from project root. Contains:
  - REST API endpoints under `/api/pallets`, `/api/errores`, `/api/dashboard/*`, `/api/mobile/*`, `/api/health`
  - Auto-creates tables on startup (`ensureTables()`)
- **config.js**: MySQL connection config (host, user, password, database) and server port

### Mobile App (mobile/)
- React Native / Expo (SDK 54) — barcode scanner for pallet registration
- Writes directly to MySQL API (`/api/mobile/register`)
- Config in `mobile/src/config.js`, API layer in `mobile/src/api.js`

### Data Flow
Frontend / Mobile App → Express API → MySQL `paletizado_db`

### Database (MySQL — `paletizado_db`)
Three tables:
- `pallets` — columns: id, pallet_id, cantidad, producto, destino, fecha, turno, condicion, operador, pedido, observaciones, created_at, updated_at
- `errores_pallet` — columns: id, pallet_id, fecha, defecto, tipo, created_at
- `pallet_items` — columns: id, pallet_ref_id, pallet_id, sku, cantidad, created_at
- Has views: `v_resumen_destino`, `v_turno_destino`
- Schema file: `schema.sql` (for MySQL Workbench)

### Key API Endpoints
- `GET /api/pallets` — all pallets with optional filters (fecha, turno, destino, operador)
- `POST /api/pallets` — create a pallet
- `GET /api/pallets/today` — today's pallets
- `GET /api/pallets/by-user/:user` — pallets by operator
- `GET /api/dashboard` — comprehensive stats
- `GET /api/errores` — all errors
- `POST /api/mobile/register` — register pallet from mobile app (with items)
- `GET /api/health` — health check

## Commands

```bash
# Install backend dependencies
cd backend && npm install

# Start server (API + serves frontend at http://localhost:3009)
cd backend && node server.js

# Or use the Windows batch launcher (starts MySQL service, opens browser, runs server)
./START-SERVER.bat

# Initialize database (or use schema.sql in MySQL Workbench)
# Tables are auto-created on server startup
```

## Custom Skills (Slash Commands)

Disponibles en `.claude/commands/`:

| Comando | Uso |
|---------|-----|
| `/add-endpoint` | Agregar un nuevo endpoint REST al backend |
| `/add-tab` | Agregar una nueva pestaña/vista al dashboard |
| `/add-chart` | Agregar un gráfico Chart.js al dashboard |
| `/fix-tabla` | Diagnosticar y corregir problemas en tablas de datos |
| `/refactor-section` | Refactorizar una sección del index.html |
| `/verify-forms` | Verificar que los formularios funcionen correctamente (estructura, validaciones, envío, flujo completo) |
| `/pre-push` | Agente de deploy: verificar, commit, push y pull de forma segura |
| `/changelog` | Generar/actualizar registro enumerado de commits con nombres descriptivos |
| `/add-mood-theme` | Agregar un nuevo tema visual (mood) con toggle en Configuración |
| `/form-field` | Agregar, modificar o eliminar campos del formulario de inventario |

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

## Key Conventions

- The project language is Spanish (UI labels, variable names, comments, commit messages)
- Commit messages use conventional-style prefixes in Spanish context: `feat:`, `fix:`, `refactor:`
- All frontend code lives in a single `index.html` file — CSS in `<style>`, JS in `<script>` at the bottom
- The backend has no test suite, no linter, no TypeScript — it's plain Node.js with mysql2 + express + cors
- The `Staticfile` with `root: .` suggests historical Cloud Foundry deployment
- MySQL service name is `MySQL84` (used by START-SERVER.bat)
- Server port: 3009 (configured in backend/config.js)
