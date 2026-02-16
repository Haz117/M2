// createAllSecretarios.mjs - Crear todos los secretarios del municipio
// Ejecuta: node createAllSecretarios.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where, setDoc } from 'firebase/firestore';

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

// Hash simple - DEBE SER IGUAL AL DE authFirestore.js
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Lista de secretarios a crear
const secretarios = [
  {
    email: 'secretaria.general@municipio.com',
    password: 'SecGen2024',
    displayName: 'Prof. José Manuel Zúñiga Guerrero',
    area: 'Secretaría General Municipal',
    department: 'Secretaría General',
    phone: '7721394600',
    direcciones: [
      'Secretario Técnico',
      'Director de Gobierno',
      'Conciliador Municipal',
      'Director de Reglamentos, Comercio, Mercado y Espectáculos',
      'Titular de la Unidad Central de Correspondencia',
      'Oficial del Registro del Estado Familiar',
      'Director del Área Coordinadora de Archivo',
      'Dirección de Atención al Migrante',
      'Director de Recursos Materiales y Patrimonio',
      'Titular de la Junta de Reclutamiento'
    ]
  },
  {
    email: 'tesoreria@municipio.com',
    password: 'Teso2024',
    displayName: 'Mtro. Rubén Martínez Sánchez',
    area: 'Secretaría de Tesorería Municipal',
    department: 'Tesorería',
    phone: '7711426018',
    direcciones: [
      'Director de Cuenta Pública',
      'Director de Control y Seguimiento de Egresos',
      'Director de Catastro',
      'Director de Ingresos y Estrategias de Recaudación',
      'Director de Administración',
      'Director de Recursos Humanos y Nómina'
    ]
  },
  {
    email: 'obras.publicas@municipio.com',
    password: 'Obras2024',
    displayName: 'C. Iván Arturo Lugo Martín',
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    department: 'Obras Públicas',
    phone: '7715665172',
    direcciones: [
      'Secretario Técnico',
      'Director de Obras Públicas',
      'Director de Desarrollo Urbano y Ordenamiento Territorial',
      'Director de Servicios Públicos y Limpias',
      'Director de Servicios Municipales'
    ]
  },
  {
    email: 'planeacion@municipio.com',
    password: 'Plan2024',
    displayName: 'Lic. Rigoberto Barrera Roldán',
    area: 'Secretaría de Planeación y Evaluación',
    department: 'Planeación',
    phone: '7715685021',
    direcciones: [
      'Director de Planeación y Evaluación',
      'Director de Tecnologías de la Información',
      'Secretario de Desarrollo Económico y Turismo',
      'Director de Turismo',
      'Director de Desarrollo Económico',
      'Director de Desarrollo Agropecuario y Proyectos Productivos'
    ]
  },
  {
    email: 'bienestar.social@municipio.com',
    password: 'Bienestar2024',
    displayName: 'Lic. Diego Armando Corona Herrera',
    area: 'Secretaría de Bienestar Social',
    department: 'Bienestar Social',
    phone: '7721101987',
    direcciones: [
      'Director de Cultura',
      'Director del Deporte',
      'Director de Salud',
      'Director de Educación',
      'Director de Programas Sociales',
      'Titular de la Instancia Municipal de la Juventud'
    ]
  },
  {
    email: 'seguridad.publica@municipio.com',
    password: 'Seguridad2024',
    displayName: 'C. Diadymir Morelos Esquivel',
    area: 'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil',
    department: 'Seguridad Pública',
    phone: '',
    direcciones: [
      'Director de Protección Civil y Bomberos'
    ]
  },
  {
    email: 'pueblos.indigenas@municipio.com',
    password: 'Pueblos2024',
    displayName: 'C. Lupita Anneth Patricio Reyes',
    area: 'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas',
    department: 'Pueblos Indígenas',
    phone: '7731212981',
    direcciones: []
  }
];

async function createSecretario(secretario) {
  const { email, password, displayName, area, department, phone, direcciones } = secretario;
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    const hashedPassword = simpleHash(password + email.toLowerCase());
    
    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName: displayName,
      role: 'secretario',
      area: area,
      department: department,
      phone: phone,
      direcciones: direcciones,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (!querySnapshot.empty) {
      console.log(`⚠️  ${email} ya existe. Actualizando...`);
      const docRef = querySnapshot.docs[0].ref;
      await setDoc(docRef, userData, { merge: true });
      console.log(`✅ ${displayName} actualizado`);
    } else {
      const newDocRef = await addDoc(usersRef, userData);
      console.log(`✅ ${displayName} creado (ID: ${newDocRef.id})`);
    }
    
    return { success: true, email, displayName };
  } catch (error) {
    console.error(`❌ Error con ${email}:`, error.message);
    return { success: false, email, error: error.message };
  }
}

async function createAllSecretarios() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CREANDO USUARIOS SECRETARIOS DEL MUNICIPIO               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Total de secretarios a crear: ${secretarios.length}\n`);
  console.log('─'.repeat(60) + '\n');
  
  const results = [];
  
  for (const secretario of secretarios) {
    console.log(`\n📌 Procesando: ${secretario.displayName}`);
    console.log(`   📧 Email: ${secretario.email}`);
    console.log(`   🏢 Área: ${secretario.area}`);
    console.log(`   📁 Direcciones a cargo: ${secretario.direcciones.length}`);
    
    const result = await createSecretario(secretario);
    results.push(result);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 RESUMEN DE CREACIÓN:\n');
  
  const exitosos = results.filter(r => r.success);
  const fallidos = results.filter(r => !r.success);
  
  console.log(`✅ Creados/Actualizados: ${exitosos.length}`);
  console.log(`❌ Fallidos: ${fallidos.length}`);
  
  if (fallidos.length > 0) {
    console.log('\n⚠️ Usuarios con errores:');
    fallidos.forEach(f => console.log(`   - ${f.email}: ${f.error}`));
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n📝 CREDENCIALES DE ACCESO:\n');
  
  secretarios.forEach((s, i) => {
    console.log(`${i + 1}. ${s.displayName}`);
    console.log(`   📧 Email: ${s.email}`);
    console.log(`   🔐 Contraseña: ${s.password}`);
    console.log(`   🏢 Área: ${s.area}`);
    console.log('');
  });
  
  console.log('═'.repeat(60));
  console.log('\n✨ Proceso completado!\n');
  console.log('💡 El ADMIN (admin@todo.com) puede ver todas las actividades');
  console.log('   de estos secretarios desde el Dashboard.\n');
  
  process.exit(0);
}

createAllSecretarios();
