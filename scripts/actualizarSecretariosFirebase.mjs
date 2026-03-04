// scripts/actualizarSecretariosFirebase.mjs
// Script SEGURO para actualizar los datos de secretarios en Firebase con las direcciones correctas
// Ejecutar con: node scripts/actualizarSecretariosFirebase.mjs
// Para modo preview (sin cambios): node scripts/actualizarSecretariosFirebase.mjs --preview

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as readline from 'readline';

// Parsear argumentos
const args = process.argv.slice(2);
const isPreviewMode = args.includes('--preview') || args.includes('-p');
const isForceMode = args.includes('--force') || args.includes('-f');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDdU7E4UCpKfjdpnKSt5E8h57GjLIX4wFs",
  authDomain: "m3-presidencia.firebaseapp.com",
  projectId: "m3-presidencia",
  storageBucket: "m3-presidencia.firebasestorage.app",
  messagingSenderId: "447026543058",
  appId: "1:447026543058:web:0f7e00318c1b4fb4a168d4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mapeo oficial de Secretarías a Direcciones (igual que config/areas.js)
const SECRETARIAS_DIRECCIONES = {
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

// Función para encontrar las direcciones de un secretario basado en su área
function getDireccionesParaSecretario(areaSecretario) {
  if (!areaSecretario) return [];
  
  // Coincidencia exacta
  if (SECRETARIAS_DIRECCIONES[areaSecretario]) {
    return SECRETARIAS_DIRECCIONES[areaSecretario];
  }
  
  // Coincidencia parcial (normalizada)
  const areaNormalizada = areaSecretario.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  for (const [secretaria, direcciones] of Object.entries(SECRETARIAS_DIRECCIONES)) {
    const secretariaNormalizada = secretaria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (areaNormalizada.includes('desarrollo economico') && secretariaNormalizada.includes('desarrollo economico')) {
      return direcciones;
    }
    if (areaNormalizada.includes('obras publicas') && secretariaNormalizada.includes('obras publicas')) {
      return direcciones;
    }
    if (areaNormalizada.includes('bienestar') && secretariaNormalizada.includes('bienestar')) {
      return direcciones;
    }
    if (areaNormalizada.includes('general') && secretariaNormalizada.includes('general')) {
      return direcciones;
    }
    if (areaNormalizada.includes('tesoreria') && secretariaNormalizada.includes('tesoreria')) {
      return direcciones;
    }
    if (areaNormalizada.includes('planeacion') && secretariaNormalizada.includes('planeacion')) {
      return direcciones;
    }
    if (areaNormalizada.includes('seguridad') && secretariaNormalizada.includes('seguridad')) {
      return direcciones;
    }
    if (areaNormalizada.includes('pueblos') && secretariaNormalizada.includes('pueblos')) {
      return direcciones;
    }
  }
  
  return [];
}

// Función para comparar arrays
function arraysIguales(a1, a2) {
  if (!a1 || !a2) return false;
  if (a1.length !== a2.length) return false;
  const sorted1 = [...a1].sort();
  const sorted2 = [...a2].sort();
  return sorted1.every((v, i) => v === sorted2[i]);
}

// Función para pedir confirmación
async function confirmar(mensaje) {
  if (isForceMode) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(`${mensaje} (s/n): `, respuesta => {
      rl.close();
      resolve(respuesta.toLowerCase() === 's' || respuesta.toLowerCase() === 'si');
    });
  });
}

async function actualizarSecretarios() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = `scripts/logs/secretarios-update-${timestamp}.json`;
  
  console.log('='.repeat(70));
  console.log('🔄 SCRIPT DE ACTUALIZACIÓN DE SECRETARIOS EN FIREBASE');
  console.log('='.repeat(70));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`📁 Modo: ${isPreviewMode ? 'PREVIEW (sin cambios)' : 'ACTUALIZACIÓN'}`);
  console.log('');
  
  try {
    // Crear carpeta de logs si no existe
    if (!fs.existsSync('scripts/logs')) {
      fs.mkdirSync('scripts/logs', { recursive: true });
    }
    
    // Obtener todos los secretarios
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'secretario'));
    const snapshot = await getDocs(q);
    
    console.log(`📋 Encontrados ${snapshot.size} secretarios en Firebase\n`);
    
    // Preparar datos para log
    const logData = {
      fecha: new Date().toISOString(),
      modo: isPreviewMode ? 'preview' : 'actualizacion',
      totalSecretarios: snapshot.size,
      cambios: [],
      errores: [],
      sinCambios: [],
      sinMapeo: []
    };
    
    let necesitanActualizacion = [];
    let yaActualizados = [];
    let sinMapeo = [];
    
    // Fase 1: Análisis
    console.log('📊 FASE 1: ANÁLISIS DE DATOS');
    console.log('-'.repeat(50));
    
    for (const docSnap of snapshot.docs) {
      const userData = docSnap.data();
      const userId = docSnap.id;
      const email = userData.email;
      const nombre = userData.displayName || email;
      const areaActual = userData.area || '';
      const direccionesActuales = userData.direcciones || [];
      
      const direccionesCorrectas = getDireccionesParaSecretario(areaActual);
      
      if (direccionesCorrectas.length === 0) {
        sinMapeo.push({
          id: userId,
          nombre,
          email,
          area: areaActual
        });
        console.log(`⚠️ ${nombre}`);
        console.log(`   Área: ${areaActual}`);
        console.log(`   ⚠️ No hay mapeo de direcciones para esta secretaría\n`);
        continue;
      }
      
      const necesitaCambio = !arraysIguales(direccionesActuales, direccionesCorrectas);
      
      if (necesitaCambio) {
        necesitanActualizacion.push({
          id: userId,
          nombre,
          email,
          area: areaActual,
          direccionesActuales,
          direccionesCorrectas,
          docRef: doc(db, 'users', userId)
        });
        console.log(`🔄 ${nombre}`);
        console.log(`   Área: ${areaActual}`);
        console.log(`   Direcciones actuales: ${direccionesActuales.length > 0 ? direccionesActuales.join(', ') : '(vacío)'}`);
        console.log(`   Direcciones correctas: ${direccionesCorrectas.join(', ')}\n`);
      } else {
        yaActualizados.push({
          id: userId,
          nombre,
          email,
          area: areaActual
        });
        console.log(`✅ ${nombre} - Ya tiene direcciones correctas\n`);
      }
    }
    
    // Resumen de análisis
    console.log('='.repeat(50));
    console.log('📊 RESUMEN DE ANÁLISIS:');
    console.log(`   ✅ Ya actualizados: ${yaActualizados.length}`);
    console.log(`   🔄 Necesitan actualización: ${necesitanActualizacion.length}`);
    console.log(`   ⚠️ Sin mapeo de direcciones: ${sinMapeo.length}`);
    console.log('='.repeat(50));
    
    // Guardar datos en log
    logData.sinCambios = yaActualizados;
    logData.sinMapeo = sinMapeo;
    
    if (necesitanActualizacion.length === 0) {
      console.log('\n✅ No hay secretarios que necesiten actualización.\n');
      logData.resultado = 'sin_cambios_necesarios';
      fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
      console.log(`📝 Log guardado en: ${logFile}`);
      process.exit(0);
    }
    
    if (isPreviewMode) {
      console.log('\n📋 MODO PREVIEW - No se realizarán cambios.');
      console.log('   Para aplicar cambios, ejecuta sin --preview\n');
      logData.resultado = 'preview_solamente';
      fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
      console.log(`📝 Log guardado en: ${logFile}`);
      process.exit(0);
    }
    
    // Fase 2: Confirmación
    console.log('\n📝 FASE 2: CONFIRMACIÓN');
    console.log('-'.repeat(50));
    console.log('Se actualizarán los siguientes secretarios:');
    necesitanActualizacion.forEach((sec, i) => {
      console.log(`   ${i + 1}. ${sec.nombre} (${sec.email})`);
    });
    
    const confirmado = await confirmar('\n¿Deseas continuar con la actualización?');
    
    if (!confirmado) {
      console.log('\n❌ Operación cancelada por el usuario.\n');
      logData.resultado = 'cancelado_por_usuario';
      fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
      process.exit(0);
    }
    
    // Fase 3: Backup
    console.log('\n💾 FASE 3: BACKUP DE DATOS');
    console.log('-'.repeat(50));
    
    const backupData = necesitanActualizacion.map(sec => ({
      id: sec.id,
      nombre: sec.nombre,
      email: sec.email,
      area: sec.area,
      direcciones_antes: sec.direccionesActuales,
      direcciones_despues: sec.direccionesCorrectas
    }));
    
    const backupFile = `scripts/logs/backup-secretarios-${timestamp}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup guardado en: ${backupFile}\n`);
    
    // Fase 4: Actualización
    console.log('🔄 FASE 4: ACTUALIZACIÓN EN FIREBASE');
    console.log('-'.repeat(50));
    
    let actualizados = 0;
    let errores = 0;
    
    for (const sec of necesitanActualizacion) {
      try {
        console.log(`   Actualizando ${sec.nombre}...`);
        
        await updateDoc(sec.docRef, {
          direcciones: sec.direccionesCorrectas,
          areasPermitidas: sec.direccionesCorrectas,
          allowedAreas: sec.direccionesCorrectas,
          updatedAt: new Date().toISOString(),
          updatedBy: 'script-actualizacion-direcciones'
        });
        
        console.log(`   ✅ ${sec.nombre} actualizado con ${sec.direccionesCorrectas.length} direcciones`);
        logData.cambios.push({
          id: sec.id,
          nombre: sec.nombre,
          antes: sec.direccionesActuales,
          despues: sec.direccionesCorrectas,
          timestamp: new Date().toISOString()
        });
        actualizados++;
        
      } catch (error) {
        console.log(`   ❌ Error actualizando ${sec.nombre}: ${error.message}`);
        logData.errores.push({
          id: sec.id,
          nombre: sec.nombre,
          error: error.message
        });
        errores++;
      }
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN FINAL:');
    console.log('='.repeat(70));
    console.log(`   Total secretarios: ${snapshot.size}`);
    console.log(`   ✅ Actualizados exitosamente: ${actualizados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   ⏭️ Sin cambios necesarios: ${yaActualizados.length}`);
    console.log(`   ⚠️ Sin mapeo: ${sinMapeo.length}`);
    console.log('='.repeat(70));
    
    logData.resultado = errores > 0 ? 'completado_con_errores' : 'completado_exitosamente';
    logData.resumen = { actualizados, errores, sinCambios: yaActualizados.length, sinMapeo: sinMapeo.length };
    
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    console.log(`\n📝 Log completo guardado en: ${logFile}`);
    console.log(`💾 Backup guardado en: ${backupFile}\n`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
  
  process.exit(0);
}

// Mensaje de ayuda
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Script de Actualización de Secretarios en Firebase

USO:
  node scripts/actualizarSecretariosFirebase.mjs [opciones]

OPCIONES:
  --preview, -p    Solo muestra los cambios sin aplicarlos
  --force, -f      No pide confirmación antes de actualizar
  --help, -h       Muestra esta ayuda

EJEMPLOS:
  node scripts/actualizarSecretariosFirebase.mjs --preview
  node scripts/actualizarSecretariosFirebase.mjs --force
  node scripts/actualizarSecretariosFirebase.mjs

NOTAS:
  - Se genera un backup antes de cualquier cambio
  - Los logs se guardan en scripts/logs/
  - El mapeo de direcciones viene de config/areas.js
`);
  process.exit(0);
}

// Ejecutar
actualizarSecretarios();
