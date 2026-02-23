// config/areas.js
// Configuración centralizada de todas las Secretarías y Direcciones del municipio
// Actualizado: Febrero 2026

export const SECRETARIAS = [
  'Secretaría General Municipal',
  'Secretaría de Tesorería Municipal',
  'Secretaría de Obras Públicas y Desarrollo Urbano',
  'Secretaría de Planeación y Evaluación',
  'Secretaría de Bienestar Social',
  'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil',
  'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas',
  'Secretaría de Desarrollo Económico y Turismo',
];

// Mapeo de Secretarías a sus Direcciones
export const SECRETARIAS_DIRECCIONES = {
  'Secretaría General Municipal': [
    'Dirección de Gobierno',
    'Conciliación Municipal',
    'Dirección de Reglamentos, Comercio, Mercado y Espectáculos',
    'Unidad Central de Correspondencia',
    'Oficial del Registro del Estado Familiar',
    'Dirección del Área Coordinadora de Archivo',
    'Dirección de Atención al Migrante',
    'Dirección de Recursos Materiales y Patrimonio',
    'Junta de Reclutamiento',
  ],
  'Secretaría de Tesorería Municipal': [
    'Dirección de Cuenta Pública',
    'Dirección de Control y Seguimiento de Egresos',
    'Dirección de Catastro',
    'Dirección de Ingresos y Estrategias de Recaudación',
    'Dirección de Administración',
    'Dirección de Recursos Humanos y Nómina',
  ],
  'Secretaría de Obras Públicas y Desarrollo Urbano': [
    'Dirección de Obras Públicas',
    'Dirección de Desarrollo Urbano y Ordenamiento Territorial',
    'Dirección de Servicios Públicos y Limpias',
    'Dirección de Servicios Municipales',
  ],
  'Secretaría de Planeación y Evaluación': [
    'Dirección de Planeación y Evaluación',
    'Dirección de Tecnologías de la Información',
  ],
  'Secretaría de Bienestar Social': [
    'Dirección de Cultura',
    'Dirección del Deporte',
    'Dirección de Salud',
    'Dirección de Educación',
    'Dirección de Programas Sociales',
    'Instancia Municipal de la Juventud',
  ],
  'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil': [
    'Dirección de Protección Civil y Bomberos',
  ],
  'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas': [],
  'Secretaría de Desarrollo Económico y Turismo': [
    'Dirección de Turismo',
    'Dirección de Desarrollo Económico',
    'Dirección de Desarrollo Agropecuario y Proyectos Productivos',
  ],
};

// Función para obtener las direcciones de una secretaría
export const getDireccionesBySecretaria = (secretaria) => {
  return SECRETARIAS_DIRECCIONES[secretaria] || [];
};

// Función para obtener la secretaría de una dirección
export const getSecretariaByDireccion = (direccion) => {
  for (const [secretaria, direcciones] of Object.entries(SECRETARIAS_DIRECCIONES)) {
    if (direcciones.includes(direccion)) {
      return secretaria;
    }
  }
  return null;
};

export const DIRECCIONES = [
  // Secretaría General Municipal
  'Dirección de Gobierno',
  'Conciliación Municipal',
  'Dirección de Reglamentos, Comercio, Mercado y Espectáculos',
  'Unidad Central de Correspondencia',
  'Oficial del Registro del Estado Familiar',
  'Dirección del Área Coordinadora de Archivo',
  'Dirección de Atención al Migrante',
  'Dirección de Recursos Materiales y Patrimonio',
  'Junta de Reclutamiento',
  
  // Secretaría de Tesorería Municipal
  'Dirección de Cuenta Pública',
  'Dirección de Control y Seguimiento de Egresos',
  'Dirección de Catastro',
  'Dirección de Ingresos y Estrategias de Recaudación',
  'Dirección de Administración',
  'Dirección de Recursos Humanos y Nómina',
  
  // Secretaría de Obras Públicas y Desarrollo Urbano
  'Dirección de Obras Públicas',
  'Dirección de Desarrollo Urbano y Ordenamiento Territorial',
  'Dirección de Servicios Públicos y Limpias',
  'Dirección de Servicios Municipales',
  
  // Secretaría de Planeación y Evaluación
  'Dirección de Planeación y Evaluación',
  'Dirección de Tecnologías de la Información',
  
  // Secretaría de Desarrollo Económico y Turismo
  'Dirección de Turismo',
  'Dirección de Desarrollo Económico',
  'Dirección de Desarrollo Agropecuario y Proyectos Productivos',
  
  // Secretaría de Bienestar Social
  'Dirección de Cultura',
  'Dirección del Deporte',
  'Dirección de Salud',
  'Dirección de Educación',
  'Dirección de Programas Sociales',
  'Instancia Municipal de la Juventud',
  
  // Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil
  'Dirección de Protección Civil y Bomberos',
];

// Otras áreas/organismos (Despacho de la Presidencia y Asamblea)
export const OTRAS_AREAS = [
  'Despacho de la Presidencia',
  'Asistente del Presidente',
  'Secretaría Particular y Relaciones Públicas',
  'Dirección de Logística y Eventos',
  'Dirección de Audiencias',
  'Contraloría Municipal',
  'Dirección de la Unidad de Investigación',
  'Unidad Municipal de Transparencia y Acceso a la Información',
  'Dirección Jurídica',
  'Instancia Municipal para el Desarrollo de las Mujeres',
  'Dirección de Comunicación Social y Marketing Digital',
  'Secretaría Ejecutiva de SIPINNA',
  'Asamblea Municipal',
];

// Todas las áreas ordenadas alfabéticamente
export const TODAS_LAS_AREAS = [...SECRETARIAS, ...DIRECCIONES, ...OTRAS_AREAS].sort();

// Mapeo simplificado para mantener compatibilidad con código existente
export const AREAS = TODAS_LAS_AREAS;

// Función para obtener el tipo de área
export const getAreaType = (area) => {
  if (SECRETARIAS.includes(area)) {
    return 'secretaria';
  }
  if (DIRECCIONES.includes(area)) {
    return 'direccion';
  }
  return 'unknown';
};

// Función para obtener áreas filtradas por tipo
export const getAreasByType = (type) => {
  if (type === 'secretaria') return SECRETARIAS;
  if (type === 'direccion') return DIRECCIONES;
  return TODAS_LAS_AREAS;
};
