// createDespachoUsers.mjs - Crear usuarios del Despacho de la Presidencia
// Ejecuta: node createDespachoUsers.mjs

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

// Usuarios del Despacho de la Presidencia - Febrero 2026
const usuariosDespacho = [
  // PRESIDENTE
  {
    email: 'presidente@municipio.com',
    password: 'Pres2026',
    displayName: 'C. José Emanuel Hernández Pascual',
    cargo: 'Presidente Municipal',
    area: 'Despacho de la Presidencia',
    phone: '5545906299',
    role: 'admin'
  },
  // ASISTENTE DEL PRESIDENTE
  {
    email: 'frida.barrera@municipio.com',
    password: 'DesA1b2c3',
    displayName: 'Lic. Frida Renata Barrera Lugo',
    cargo: 'Asistente del Presidente',
    area: 'Asistente del Presidente',
    phone: '7721546253',
    role: 'director'
  },
  // SECRETARIO PARTICULAR Y RELACIONES PÚBLICAS
  {
    email: 'leidy.morgado@municipio.com',
    password: 'DesB4d5e6',
    displayName: 'Lic. Leidy Morgado Ortega',
    cargo: 'Secretario Particular y Relaciones Públicas',
    area: 'Secretaría Particular y Relaciones Públicas',
    phone: '7721247815',
    role: 'director'
  },
  // SECRETARIOS TÉCNICOS
  {
    email: 'marco.cabanas@municipio.com',
    password: 'DesC7f8g9',
    displayName: 'Marco Cabañas Reyes',
    cargo: 'Secretario Técnico',
    area: 'Despacho de la Presidencia',
    phone: '',
    role: 'director'
  },
  {
    email: 'jaime.rosales@municipio.com',
    password: 'DesD0h1j2',
    displayName: 'Jaime Aldrin Rosales Azuara',
    cargo: 'Secretario Técnico',
    area: 'Despacho de la Presidencia',
    phone: '',
    role: 'director'
  },
  // DIRECTOR DE LOGÍSTICA Y EVENTOS
  {
    email: 'adrian.hernandez@municipio.com',
    password: 'DesE3k4l5',
    displayName: 'C. Adrian Emmanuel Hernández Cano',
    cargo: 'Director de Logística y Eventos',
    area: 'Dirección de Logística y Eventos',
    phone: '',
    role: 'director'
  },
  // DIRECTOR DE AUDIENCIAS (Miguel Ángel Herrada Molina)
  {
    email: 'miguel.herrada@municipio.com',
    password: 'DesF6m7n8',
    displayName: 'Miguel Ángel Herrada Molina',
    cargo: 'Director de Audiencias',
    area: 'Dirección de Audiencias',
    phone: '',
    role: 'director'
  },
  // CONTRALOR MUNICIPAL
  {
    email: 'marianne.chavez@municipio.com',
    password: 'DesG9p0q1',
    displayName: 'LD. Marianne Citlalli Chávez Guerrero',
    cargo: 'Contralor Municipal',
    area: 'Contraloría Municipal',
    phone: '7713311690',
    role: 'director'
  },
  // DIRECTOR DE LA UNIDAD DE INVESTIGACIÓN
  {
    email: 'reyna.vazquez@municipio.com',
    password: 'DesH2r3s4',
    displayName: 'LD. Reyna Aradith Vázquez Sánchez',
    cargo: 'Director de la Unidad de Investigación',
    area: 'Dirección de la Unidad de Investigación',
    phone: '7721348623',
    role: 'director'
  },
  // TRANSPARENCIA
  {
    email: 'janna.padre@municipio.com',
    password: 'DesI5t6u7',
    displayName: 'Mtra. Janna Janetzi Padre Canales',
    cargo: 'Titular de la Unidad Municipal de Transparencia',
    area: 'Unidad Municipal de Transparencia y Acceso a la Información',
    phone: '7711105243',
    role: 'director'
  },
  // DIRECTOR JURÍDICO
  {
    email: 'efrain.magueyal@municipio.com',
    password: 'DesJ8v9w0',
    displayName: 'Mtro. Efraín Magueyal Baxcajay',
    cargo: 'Director Jurídico',
    area: 'Dirección Jurídica',
    phone: '7714038028',
    role: 'director'
  },
  // INSTANCIA MUNICIPAL PARA EL DESARROLLO DE LAS MUJERES
  {
    email: 'gisela.trejo@municipio.com',
    password: 'DesK1x2y3',
    displayName: 'LD. Gisela Trejo Ledesma',
    cargo: 'Titular de la Instancia Municipal para el Desarrollo de las Mujeres',
    area: 'Instancia Municipal para el Desarrollo de las Mujeres',
    phone: '7721095148',
    role: 'director'
  },
  // COMUNICACIÓN SOCIAL
  {
    email: 'marco.aldana@municipio.com',
    password: 'DesL4z5a6',
    displayName: 'Marco Antonio Aldana García',
    cargo: 'Director de Comunicación Social y Marketing Digital',
    area: 'Dirección de Comunicación Social y Marketing Digital',
    phone: '7721152102',
    role: 'director'
  },
  // SIPINNA
  {
    email: 'socorro.vargas@municipio.com',
    password: 'DesM7b8c9',
    displayName: 'C. Socorro Vargas Chávez',
    cargo: 'Titular de la Secretaría Ejecutiva de SIPINNA',
    area: 'Secretaría Ejecutiva de SIPINNA',
    phone: '7721128833',
    role: 'director'
  },
  // OFICIAL DE LA ASAMBLEA MUNICIPAL
  {
    email: 'cinthya.alamilla@municipio.com',
    password: 'DesN0d1e2',
    displayName: 'C. Cinthya Alamilla González',
    cargo: 'Oficial de la Asamblea Municipal',
    area: 'Asamblea Municipal',
    phone: '7721256353',
    role: 'director'
  }
];

async function createUser(usuario) {
  const { email, password, displayName, cargo, area, phone, role } = usuario;
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    const hashedPassword = simpleHash(password + email.toLowerCase());
    
    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName: displayName,
      role: role,
      cargo: cargo,
      area: area,
      phone: phone || '',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (!querySnapshot.empty) {
      console.log(`⚠️  ${email} ya existe. Saltando...`);
      return { success: true, skipped: true, email, displayName };
    } else {
      const newDocRef = await addDoc(usersRef, userData);
      console.log(`✅ ${displayName} creado (ID: ${newDocRef.id})`);
      return { success: true, skipped: false, email, displayName };
    }
  } catch (error) {
    console.error(`❌ Error con ${email}:`, error.message);
    return { success: false, email, error: error.message };
  }
}

async function createAllDespachoUsers() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CREANDO USUARIOS DEL DESPACHO DE LA PRESIDENCIA          ║');
  console.log('║                    FEBRERO 2026                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Total de usuarios a procesar: ${usuariosDespacho.length}\n`);
  console.log('─'.repeat(60) + '\n');
  
  const results = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const usuario of usuariosDespacho) {
    console.log(`\n📌 Procesando: ${usuario.displayName}`);
    console.log(`   📧 Email: ${usuario.email}`);
    console.log(`   🏢 Área: ${usuario.area}`);
    console.log(`   💼 Cargo: ${usuario.cargo}`);
    
    const result = await createUser(usuario);
    results.push(result);
    
    if (result.success && !result.skipped) created++;
    else if (result.success && result.skipped) skipped++;
    else failed++;
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 RESUMEN:\n');
  console.log(`   ✅ Creados: ${created}`);
  console.log(`   ⏭️  Saltados (ya existían): ${skipped}`);
  console.log(`   ❌ Fallidos: ${failed}`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n📋 CREDENCIALES DE USUARIOS NUEVOS:\n');
  console.log('Email | Contraseña | Nombre');
  console.log('-'.repeat(80));
  
  for (const usuario of usuariosDespacho) {
    console.log(`${usuario.email} | ${usuario.password} | ${usuario.displayName}`);
  }
  
  console.log('\n✅ Proceso completado');
  process.exit(0);
}

createAllDespachoUsers();
