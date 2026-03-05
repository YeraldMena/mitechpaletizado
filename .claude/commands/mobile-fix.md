# Diagnosticar y Corregir Problemas Mobile/Responsive

Agente que diagnostica y corrige problemas de visualizacion en dispositivos moviles del dashboard.

## Instrucciones

Lee `index.html` completo y ejecuta las siguientes verificaciones:

### 1. Verificar Breakpoints CSS
- [ ] Existen media queries para `max-width: 768px` (tablet/mobile)
- [ ] Existen media queries para `max-width: 480px` (mobile pequeno)
- [ ] Los breakpoints no se contradicen entre si

### 2. Verificar Patron Collapsible (secciones desplegables)
- [ ] Cada seccion con graficos tiene la estructura:
  ```html
  <div class="collapsible-section">
    <button class="collapsible-toggle" onclick="toggleCollapsible(this)">Titulo <i class="fas fa-chevron-down"></i></button>
    <div class="collapsible-body">...contenido...</div>
  </div>
  ```
- [ ] CSS: `.collapsible-toggle` tiene `display: none` en desktop y `display: flex` en mobile
- [ ] CSS: `.collapsible-body.collapsed` tiene `max-height: 0`, `opacity: 0`, `pointer-events: none`
- [ ] JS: `toggleCollapsible()` existe y alterna clase `collapsed` en body y boton
- [ ] En DOMContentLoaded: graficos alternan collapsed en mobile (idx % 2 === 1)

### 3. Verificar Card Views (tarjetas moviles)
- [ ] Las tablas de datos tienen una version card list alternativa:
  ```html
  <div class="ordenes-card-list" id="xxx-card-list">...</div>
  ```
- [ ] CSS: card list tiene `display: none` en desktop y `display: flex` en mobile
- [ ] CSS: tabla wrapper tiene `display: none !important` en mobile
- [ ] JS: la funcion render genera cards ademas de filas de tabla

### 4. Verificar Stat Cards Horizontales
- [ ] En mobile, `.stat-card` usa `flex-direction: row` con icono izquierda, texto derecha
- [ ] `.stat-change` se oculta en mobile (`display: none`)
- [ ] `.stat-icon` tiene tamano reducido (28px)

### 5. Verificar Chart.js en Mobile
- [ ] Los canvas de Chart.js tienen `responsive: true` en options
- [ ] Cada chart destruye la instancia anterior antes de crear nueva (`if (chart) chart.destroy()`)
- [ ] Los tamanos de fuente se reducen para mobile en las opciones del chart

### 6. Verificar Sidebar y Navegacion
- [ ] La sidebar se colapsa o se convierte en menu hamburguesa en mobile
- [ ] El contenido principal ocupa el ancho completo cuando sidebar esta colapsada
- [ ] Los botones de navegacion son suficientemente grandes para touch (min 44px)

### 7. Verificar Formulario en Mobile
- [ ] Los campos del formulario ocupan ancho completo en mobile
- [ ] Los checkboxes/radios son suficientemente grandes para touch
- [ ] El boton de envio es prominente y facil de tocar

## Si el usuario reporta un problema especifico

1. Identificar la seccion/vista afectada
2. Verificar CSS en esa seccion para los breakpoints 768px y 480px
3. Verificar si faltan patrones (collapsible, card view, horizontal stats)
4. Aplicar el patron correcto siguiendo los ejemplos existentes en el codigo
5. Probar que no rompe la vista desktop

## Formato de Reporte

```
==========================================
  MOBILE RESPONSIVE REPORT
==========================================
Breakpoints:      [PASS/FAIL]
Collapsibles:     [PASS/FAIL]
Card Views:       [PASS/FAIL]
Stat Cards:       [PASS/FAIL]
Chart.js:         [PASS/FAIL]
Navegacion:       [PASS/FAIL]
Formulario:       [PASS/FAIL]
RESULTADO:        [OK / X problemas]
==========================================
```

$ARGUMENTS
