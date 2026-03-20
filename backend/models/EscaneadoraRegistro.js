const mongoose = require('mongoose');

const escaneadoraRegistroSchema = new mongoose.Schema({
  // Campos fijos para queries rápidas
  escaneadora: { type: String, required: true, index: true },
  turno: { type: String, required: true },
  fecha: { type: String, required: true, index: true },
  linea: { type: String, default: '' },
  palletsEscaneados: { type: Number, default: 0 },
  horaInicio: { type: String, default: '' },
  horaFin: { type: String, default: '' },
  incidencias: { type: String, default: '' },
  observaciones: { type: String, default: '' },
  // Campo flexible para columnas extra del CSV que no mapeen a campos fijos
  datosExtra: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: { type: String, enum: ['web', 'csv-import', 'mobile'], default: 'web' },
}, {
  timestamps: true,
  strict: false // permite campos dinámicos del CSV
});

escaneadoraRegistroSchema.index({ fecha: 1, turno: 1 });
escaneadoraRegistroSchema.index({ escaneadora: 1, fecha: 1 });
escaneadoraRegistroSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EscaneadoraRegistro', escaneadoraRegistroSchema);
