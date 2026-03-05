# Agregar Panel de Datos al Dashboard Principal

Agente que agrega un panel de datos resumidos (KPIs + graficos + tabla compacta) al Dashboard principal, siguiendo el patron establecido por `dash-ordenes-panel`.

## Instrucciones

### Patron Establecido

El dashboard principal usa paneles con esta estructura:

```html
<div id="dash-NOMBRE-panel" class="panel" style="margin-top: 1.5rem;">
  <h3 style="margin-bottom: 1rem;">Titulo del Panel</h3>

  <!-- Mini KPIs -->
  <div class="dash-ordenes-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
    <div class="mini-kpi">
      <span class="mini-kpi-value" id="dash-NOMBRE-kpi1">0</span>
      <span class="mini-kpi-label">Label 1</span>
    </div>
    <!-- mas KPIs... -->
  </div>

  <!-- Graficos (1-2 canvas) -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
    <div><canvas id="dash-NOMBRE-chart1"></canvas></div>
    <div><canvas id="dash-NOMBRE-chart2"></canvas></div>
  </div>

  <!-- Tabla compacta (5 columnas max) -->
  <div style="max-height: 250px; overflow-y: auto;">
    <table class="compact-dash-table">
      <thead><tr>...</tr></thead>
      <tbody id="dash-NOMBRE-tbody"></tbody>
    </table>
  </div>
</div>
```

### Pasos para Agregar un Nuevo Panel

1. **Leer index.html** completo para entender la estructura actual
2. **Ubicar el punto de insercion** en el HTML del `view-dashboard` (generalmente antes de "Ultimos Registros")
3. **Agregar HTML** del panel siguiendo el patron de arriba
4. **Agregar CSS** para mini-kpis y tabla compacta (si no existe ya):
   ```css
   .mini-kpi { text-align: center; background: var(--bg-secondary); padding: 0.5rem; border-radius: 0.5rem; }
   .mini-kpi-value { display: block; font-size: 1.3rem; font-weight: 700; color: var(--accent-primary); }
   .mini-kpi-label { font-size: 0.7rem; color: var(--text-secondary); }
   .compact-dash-table { width: 100%; font-size: 0.75rem; border-collapse: collapse; }
   .compact-dash-table th, .compact-dash-table td { padding: 0.3rem 0.5rem; border-bottom: 1px solid var(--border-color); }
   ```
5. **Agregar JS** con funcion `renderDashNOMBREPanel()`:
   - Filtrar datos de `allSheetData` segun criterio
   - Calcular KPIs y actualizar elementos DOM
   - Crear/actualizar Chart.js (SIEMPRE destruir instancia anterior: `if (chart) chart.destroy()`)
   - Llenar tabla compacta con top N filas
   - Ocultar panel si no hay datos (`panel.style.display = 'none'`)
6. **Llamar la funcion** desde `processSheetData` callback para que se actualice con datos nuevos
7. **Responsive**: En mobile (768px), los graficos van a 1 columna (`grid-template-columns: 1fr`), usar collapsible si tiene graficos

### Variables Chart.js Globales

Declarar la variable del chart en el scope global del script:
```javascript
let dashNOMBREChart1 = null;
let dashNOMBREChart2 = null;
```

### Checklist Final

- [ ] Panel visible solo cuando hay datos relevantes
- [ ] KPIs calculados correctamente
- [ ] Charts se destruyen antes de recrear
- [ ] Tabla limitada a max 10-15 filas
- [ ] Responsive: graficos 1 columna en mobile
- [ ] Funcion llamada desde processSheetData
- [ ] No rompe otros paneles del dashboard

$ARGUMENTS
