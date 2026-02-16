// updateSecretariosAreas.mjs - Actualizar áreas de secretarios con nombres exactos
// Ejecuta: node updateSecretariosAreas.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM",
  authDomain: "infra-sublime-464215-m5.firebaseapp.com",
  projectId: "infra-sublime-464215-m5",
  storageBucket: "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: "205062729291",
  appId: "1:205062729291:web:da314180f361bf2a3367ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mapeo de secretarios con sus áreas EXACTAS (nombres de config/areas.js)
const secretariosAreas = [
  {
    email: 'secretaria.general@municipio.com',
    area: 'Secretaría General Municipal',
    direcciones: [
      'Dirección de Gobierno',
      'Dirección de Reglamentos, Comercio, Mercado y Espectáculos',
      'Dirección de Recursos Materiales y Patrimonio',
      'Dirección de Atención al Migrante',
    ]
  },
  {
    email: 'tesoreria@municipio.com',
    area: 'Secretaría de Tesorería Municipal',
    direcciones: [
      'Dirección de Cuenta Pública',
      'Dirección de Control y Seguimiento de Egresos',
      'Dirección de Catastro',
      'Dirección de Ingresos y Estrategias de Recaudación',
      'Dirección de Administración',
      'Dirección de Recursos Humanos y Nómina',
    ]
  },
  {
    email: 'obras.publicas@municipio.com',
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    direcciones: [
      'Dirección de Obras Públicas',
      'Dirección de Desarrollo Urbano y Ordenamiento Territorial',
      'Dirección de Servicios Públicos y Limpias',
      'Dirección de Servicios Municipales',
    ]
  },
  {
    email: 'planeacion@municipio.com',
    area: 'Secretaría de Planeación y Evaluación',
    direcciones: [
      'Dirección Técnica de Planeación y Evaluación',
      'Dirección de Tecnologías de la Información',
      'Dirección de Turismo',
      'Dirección de Desarrollo Económico',
      'Dirección de Desarrollo Agropecuario y Proyectos Productivos',
    ]
  },
  {
    email: 'bienestar.social@municipio.com',
    area: 'Secretaría de Bienestar Social',
    direcciones: [
      'Dirección de Cultura',
      'Dirección del Deporte',
      'Dirección de Salud',
      'Dirección de Educación',
      'Dirección de Programas Sociales',
    ]
  },
  {
    email: 'seguridad.publica@municipio.com',
    area: 'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil',
    direcciones: [
      'Dirección de Protección Civil y Bomberos',
      'Dirección de Prevención del Delito',
      'Dirección Administrativa (Seguridad Pública)',
      'Dirección Preventiva de Tránsito Municipal y Auxilio Vial',
    ]
  },
  {
    email: 'pueblos.indigenas@municipio.com',
    area: 'Secretaría de Desarrollo de Pueblos y Comunidades Indígenas',
    direcciones: []
  }
];

async function updateSecretario(secretarioData) {
  const { email, area, direcciones } = secretarioData;
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`⚠️  ${email} no encontrado`);
      return false;
    }
    
    const docRef = querySnapshot.docs[0].ref;
    
    // Actualizar con las áreas exactas
    await updateDoc(docRef, {
      area: area,
      direcciones: direcciones,
      areasPermitidas: [area, ...direcciones], // Lista completa de áreas permitidas
      updatedAt: new Date()
    });
    
    console.log(`✅ ${email} actualizado`);
    console.log(`   📁 Área principal: ${area}`);
    console.log(`   📋 Direcciones: ${direcciones.length}`);
    direcciones.forEach(d => console.log(`      - ${d}`));
    
    return true;
  } catch (error) {
    console.error(`❌ Error con ${email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ACTUALIZANDO ÁREAS DE SECRETARIOS CON NOMBRES EXACTOS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  let exitosos = 0;
  let fallidos = 0;
  
  for (const secretario of secretariosAreas) {
    console.log(`\n🔄 Procesando: ${secretario.email}`);
    const resultado = await updateSecretario(secretario);
    if (resultado) exitosos++;
    else fallidos++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 RESUMEN: ${exitosos} actualizados, ${fallidos} fallidos`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  process.exit(0);
}

main();
