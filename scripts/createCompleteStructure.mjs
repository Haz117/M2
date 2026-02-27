// createCompleteStructure.mjs - Crear estructura completa del municipio
// Ejecuta: node createCompleteStructure.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where, setDoc, doc } from 'firebase/firestore';

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

// ESTRUCTURA COMPLETA DEL MUNICIPIO
const structure = {
  // === SECRETARIOS ===
  secretarios: [
    {
      email: 'secretaria.general@municipio.com',
      password: 'SecGen2024',
      displayName: 'Prof. José Manuel Zúñiga Guerrero',
      area: 'Secretaría General Municipal',
      phone: '7721394600'
    },
    {
      email: 'tesoreria@municipio.com',
      password: 'Teso2024',
      displayName: 'Mtro. Rubén Martínez Sánchez',
      area: 'Secretaría de Tesorería Municipal',
      phone: '7711426018'
    },
    {
      email: 'obras.publicas@municipio.com',
      password: 'Obras2024',
      displayName: 'Lic. Iván Arturo Lugo Martín',
      area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
      phone: '7715665172'
    },
    {
      email: 'planeacion@municipio.com',
      password: 'Plan2024',
      displayName: 'Lic. Rigoberto Barrera Roldán',
      area: 'Secretaría de Planeación y Evaluación',
      phone: '7715685021'
    },
    {
      email: 'desarrollo.economico@municipio.com',
      password: 'DesEco2024',
      displayName: 'Ing. Lucila Ocampo Valle',
      area: 'Secretaría de Desarrollo Económico y Turismo',
      phone: '7721227378'
    },
    {
      email: 'bienestar.social@municipio.com',
      password: 'Bien2024',
      displayName: 'Lic. Diego Armando Corona Herrera',
      area: 'Secretaría de Bienestar Social',
      phone: '7721101987'
    },
    {
      email: 'seguridad.publica@municipio.com',
      password: 'Seg2024',
      displayName: 'C. Diadymir Morelos Esquivel',
      area: 'Secretaría de Seguridad Pública',
      phone: ''
    },
    {
      email: 'pueblos.indigenas@municipio.com',
      password: 'Pueblos2024',
      displayName: 'C. Lupita Anneth Patricio Reyes',
      area: 'Secretaría de Desarrollo para Pueblos y Comunidades Indígenas',
      phone: '7731212981'
    }
  ],

  // === DIRECTORES POR SECRETARÍA ===
  directores: [
    // SECRETARÍA GENERAL MUNICIPAL
    { email: 'amalia.escalante@municipio.com', password: 'Dir2024', displayName: 'Lic. Amalia Escalante Cruz', position: 'Secretario Técnico', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7721620577' },
    { email: 'jose.angeles@municipio.com', password: 'Dir2024', displayName: 'Mtro. José Martín Ángeles Bautista', position: 'Director de Gobierno', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7717477211' },
    { email: 'brenda.martinez@municipio.com', password: 'Dir2024', displayName: 'LD. Brenda Martínez Azpeitia', position: 'Conciliador Municipal', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7714595609' },
    { email: 'ernesto.espinoza@municipio.com', password: 'Dir2024', displayName: 'C. Ernesto Espinoza Órgano', position: 'Director de Reglamentos, Comercio, Mercado y Espectáculos', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7717767957' },
    { email: 'gerardo.mendoza@municipio.com', password: 'Dir2024', displayName: 'C. Gerardo Mendoza Romero', position: 'Secretario Técnico', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7715689954' },
    { email: 'dulce.rosas@municipio.com', password: 'Dir2024', displayName: 'Ing. Dulce Annet Rosas Rojo', position: 'Titular de la Unidad Central de Correspondencia', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7721156073' },
    { email: 'marcos.aguirre@municipio.com', password: 'Dir2024', displayName: 'LD. Marcos Aguirre Reyes', position: 'Oficial del Registro del Estado Familiar', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7713240208' },
    { email: 'luis.olguin@municipio.com', password: 'Dir2024', displayName: 'Luis Ángel Olguín Nube', position: 'Director del Área Coordinadora de Archivo', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '4426262507' },
    { email: 'anahi.catalan@municipio.com', password: 'Dir2024', displayName: 'TSU. Anahí Catalán Legorreta', position: 'Dirección de Atención al Migrante', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7721663422' },
    { email: 'taurino.gonzalez@municipio.com', password: 'Dir2024', displayName: 'LAP. Taurino González Cruz', position: 'Director de Recursos Materiales y Patrimonio', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7721322193' },
    { email: 'roberto.ruiz@municipio.com', password: 'Dir2024', displayName: 'Roberto Ruiz Vega', position: 'Titular de la Junta de Reclutamiento', area: 'Secretaría General Municipal', secretarioEmail: 'secretaria.general@municipio.com', phone: '7713352607' },

    // SECRETARÍA DE TESORERÍA MUNICIPAL
    { email: 'alejandro.diaz@municipio.com', password: 'Dir2024', displayName: 'LC. Alejandro Díaz Chávez', position: 'Director de Cuenta Pública', area: 'Secretaría de Tesorería Municipal', secretarioEmail: 'tesoreria@municipio.com', phone: '7721230985' },
    { email: 'miguel.tolentino@municipio.com', password: 'Dir2024', displayName: 'Mtro. Miguel Ángel Tolentino Hernández', position: 'Director de Control y Seguimiento de Egresos', area: 'Secretaría de Tesorería Municipal', secretarioEmail: 'tesoreria@municipio.com', phone: '7712067940' },
    { email: 'juan.sanchez@municipio.com', password: 'Dir2024', displayName: 'Lic. Juan Antonio Sánchez Contreras', position: 'Director de Catastro', area: 'Secretaría de Tesorería Municipal', secretarioEmail: 'tesoreria@municipio.com', phone: '7712178075' },
    { email: 'hector.perez@municipio.com', password: 'Dir2024', displayName: 'Lic. Héctor Pérez Cano', position: 'Director de Ingresos y Estrategias de Recaudación', area: 'Secretaría de Tesorería Municipal', secretarioEmail: 'tesoreria@municipio.com', phone: '7716831721' },
    { email: 'juana.moctezuma@municipio.com', password: 'Dir2024', displayName: 'Lic. Juana Karina Moctezuma Ramírez', position: 'Director de Administración', area: 'Secretaría de Tesorería Municipal', secretarioEmail: 'tesoreria@municipio.com', phone: '7737316457' },
    { email: 'isabel.munoz@municipio.com', password: 'Dir2024', displayName: 'Mtra. Isabel Muñoz García', position: 'Director de Recursos Humanos y Nómina', area: 'Secretaría de Tesorería Municipal', secretarioEmail: 'tesoreria@municipio.com', phone: '7721239879' },

    // SECRETARÍA DE OBRAS PÚBLICAS Y DESARROLLO URBANO
    { email: 'vanessa.martinez@municipio.com', password: 'Dir2024', displayName: 'Lic. Vanessa Martínez Ángel', position: 'Secretario Técnico', area: 'Secretaría de Obras Públicas y Desarrollo Urbano', secretarioEmail: 'obras.publicas@municipio.com', phone: '7226598256' },
    { email: 'gladys.zapote@municipio.com', password: 'Dir2024', displayName: 'Mtra. Gladys Zapote García', position: 'Director de Obras Públicas', area: 'Secretaría de Obras Públicas y Desarrollo Urbano', secretarioEmail: 'obras.publicas@municipio.com', phone: '7721177158' },
    { email: 'alfonso.alavez@municipio.com', password: 'Dir2024', displayName: 'Alfonso Isidro Alavez', position: 'Director de Desarrollo Urbano y Ordenamiento Territorial', area: 'Secretaría de Obras Públicas y Desarrollo Urbano', secretarioEmail: 'obras.publicas@municipio.com', phone: '7713972945' },
    { email: 'rosalio.romero@municipio.com', password: 'Dir2024', displayName: 'C. Rosalío Romero Cruz', position: 'Director de Servicios Públicos y Limpias', area: 'Secretaría de Obras Públicas y Desarrollo Urbano', secretarioEmail: 'obras.publicas@municipio.com', phone: '7721361390' },
    { email: 'julio.palma@municipio.com', password: 'Dir2024', displayName: 'C. Julio César Palma Rodríguez', position: 'Director de Servicios Municipales', area: 'Secretaría de Obras Públicas y Desarrollo Urbano', secretarioEmail: 'obras.publicas@municipio.com', phone: '7721633655' },

    // SECRETARÍA DE PLANEACIÓN Y EVALUACIÓN
    { email: 'efrain.volteada@municipio.com', password: 'Dir2024', displayName: 'Mtro. Efraín Volteada Peña', position: 'Director de Planeación y Evaluación', area: 'Secretaría de Planeación y Evaluación', secretarioEmail: 'planeacion@municipio.com', phone: '5521061242' },
    { email: 'luis.chavero@municipio.com', password: 'Dir2024', displayName: 'Ing. Luis Alberto Chavero Chávez', position: 'Director de Tecnologías de la Información', area: 'Secretaría de Planeación y Evaluación', secretarioEmail: 'planeacion@municipio.com', phone: '7731023778' },

    // SECRETARÍA DE DESARROLLO ECONÓMICO Y TURISMO
    { email: 'berenice.moreno@municipio.com', password: 'Dir2024', displayName: 'Berenice Moreno Romero', position: 'Director de Turismo', area: 'Secretaría de Desarrollo Económico y Turismo', secretarioEmail: 'desarrollo.economico@municipio.com', phone: '5647706945' },
    { email: 'claudia.ramirez@municipio.com', password: 'Dir2024', displayName: 'TSU. Claudia Ramírez Martínez', position: 'Director de Desarrollo Económico', area: 'Secretaría de Desarrollo Económico y Turismo', secretarioEmail: 'desarrollo.economico@municipio.com', phone: '7721265567' },
    { email: 'pablo.vaquero@municipio.com', password: 'Dir2024', displayName: 'C. Pablo Vaquero Hernández', position: 'Director de Desarrollo Agropecuario y Proyectos Productivos', area: 'Secretaría de Desarrollo Económico y Turismo', secretarioEmail: 'desarrollo.economico@municipio.com', phone: '7721090267' },

    // SECRETARÍA DE BIENESTAR SOCIAL
    { email: 'hipolito.bartolo@municipio.com', password: 'Dir2024', displayName: 'Lic. Hipólito Bartolo Marcos', position: 'Director de Cultura', area: 'Secretaría de Bienestar Social', secretarioEmail: 'bienestar.social@municipio.com', phone: '7721350475' },
    { email: 'christian.trejo@municipio.com', password: 'Dir2024', displayName: 'Christian Moisés Trejo Escamilla', position: 'Director del Deporte', area: 'Secretaría de Bienestar Social', secretarioEmail: 'bienestar.social@municipio.com', phone: '5564667664' },
    { email: 'rosa.labra@municipio.com', password: 'Dir2024', displayName: 'Rosa Itzel Labra Samano', position: 'Director de Salud', area: 'Secretaría de Bienestar Social', secretarioEmail: 'bienestar.social@municipio.com', phone: '7721532941' },
    { email: 'jesus.zapata@municipio.com', password: 'Dir2024', displayName: 'Lic. José de Jesús Zapata Mendoza', position: 'Director de Educación', area: 'Secretaría de Bienestar Social', secretarioEmail: 'bienestar.social@municipio.com', phone: '7721379217' },
    { email: 'alicia.feregrino@municipio.com', password: 'Dir2024', displayName: 'Alicia Michelle Feregrino Gómez', position: 'Director de Programas Sociales', area: 'Secretaría de Bienestar Social', secretarioEmail: 'bienestar.social@municipio.com', phone: '7721020923' },
    { email: 'michelle.chiapa@municipio.com', password: 'Dir2024', displayName: 'C. Michelle Chiapa Zamora', position: 'Titular de la Instancia Municipal de la Juventud', area: 'Secretaría de Bienestar Social', secretarioEmail: 'bienestar.social@municipio.com', phone: '7721349458' },

    // SECRETARÍA DE SEGURIDAD PÚBLICA
    { email: 'marcelino.capula@municipio.com', password: 'Dir2024', displayName: 'C. Marcelino Capula Martínez', position: 'Director de Protección Civil y Bomberos', area: 'Secretaría de Seguridad Pública', secretarioEmail: 'seguridad.publica@municipio.com', phone: '7721333239' }
  ],

  // === OTROS FUNCIONARIOS IMPORTANTES ===
  otros: [
    { email: 'contraloria@municipio.com', password: 'Cont2024', displayName: 'LD. Marianne Citlalli Chávez Guerrero', position: 'Contralor Municipal', area: 'Contraloría Municipal', role: 'secretario', phone: '7713311690' },
    { email: 'transparencia@municipio.com', password: 'Trans2024', displayName: 'Mtra. Janna Janetzi Padre Canales', position: 'Titular de la Unidad Municipal de Transparencia', area: 'Transparencia', role: 'director', phone: '7711105243' },
    { email: 'juridico@municipio.com', password: 'Juri2024', displayName: 'Mtro. Efraín Magüeyal Baxcajay', position: 'Director Jurídico', area: 'Dirección Jurídica', role: 'director', phone: '7714038028' },
    { email: 'mujeres@municipio.com', password: 'Muj2024', displayName: 'LD. Gisela Trejo Ledesma', position: 'Titular de la Instancia Municipal para el Desarrollo de las Mujeres', area: 'Instancia de la Mujer', role: 'director', phone: '7721095148' },
    { email: 'comunicacion@municipio.com', password: 'Com2024', displayName: 'Marco Antonio Aldana García', position: 'Director de Comunicación Social y Marketing Digital', area: 'Comunicación Social', role: 'director', phone: '7721152102' },
    { email: 'sipinna@municipio.com', password: 'Sip2024', displayName: 'C. Socorro Vargas Chávez', position: 'Titular de la Secretaría Ejecutiva de SIPINNA', area: 'SIPINNA', role: 'director', phone: '7721128833' },
    { email: 'asamblea@municipio.com', password: 'Asam2024', displayName: 'C. Cinthya Alamilla González', position: 'Oficial de la Asamblea Municipal', area: 'Asamblea Municipal', role: 'director', phone: '7721256353' }
  ]
};

async function createOrUpdateUser(userData, role) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', userData.email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  
  const hashedPassword = simpleHash(userData.password + userData.email.toLowerCase());
  
  const userDoc = {
    email: userData.email.toLowerCase(),
    password: hashedPassword,
    displayName: userData.displayName,
    role: role,
    area: userData.area,
    department: userData.area,
    position: userData.position || null,
    phone: userData.phone || null,
    secretarioEmail: userData.secretarioEmail || null,
    active: true,
    updatedAt: new Date()
  };
  
  if (!querySnapshot.empty) {
    const docRef = querySnapshot.docs[0].ref;
    await setDoc(docRef, userDoc, { merge: true });
    return { action: 'updated', email: userData.email };
  } else {
    userDoc.createdAt = new Date();
    await addDoc(usersRef, userDoc);
    return { action: 'created', email: userData.email };
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('     🏛️  CREANDO ESTRUCTURA COMPLETA DEL MUNICIPIO');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let created = 0;
  let updated = 0;

  // 1. Crear Secretarios
  console.log('📋 SECRETARIOS (8):\n');
  for (const sec of structure.secretarios) {
    try {
      const result = await createOrUpdateUser(sec, 'secretario');
      console.log(`   ${result.action === 'created' ? '✅' : '🔄'} ${sec.displayName}`);
      console.log(`      📧 ${sec.email} | 🔐 ${sec.password}`);
      console.log(`      📍 ${sec.area}\n`);
      result.action === 'created' ? created++ : updated++;
    } catch (error) {
      console.log(`   ❌ Error con ${sec.email}: ${error.message}\n`);
    }
  }

  // 2. Crear Directores
  console.log('\n📋 DIRECTORES (35):\n');
  for (const dir of structure.directores) {
    try {
      const result = await createOrUpdateUser(dir, 'director');
      console.log(`   ${result.action === 'created' ? '✅' : '🔄'} ${dir.displayName}`);
      console.log(`      📧 ${dir.email} | 🏢 ${dir.position}`);
      result.action === 'created' ? created++ : updated++;
    } catch (error) {
      console.log(`   ❌ Error con ${dir.email}: ${error.message}`);
    }
  }

  // 3. Crear otros funcionarios
  console.log('\n\n📋 OTROS FUNCIONARIOS (7):\n');
  for (const func of structure.otros) {
    try {
      const result = await createOrUpdateUser(func, func.role || 'director');
      console.log(`   ${result.action === 'created' ? '✅' : '🔄'} ${func.displayName}`);
      console.log(`      📧 ${func.email} | 🏢 ${func.position}`);
      result.action === 'created' ? created++ : updated++;
    } catch (error) {
      console.log(`   ❌ Error con ${func.email}: ${error.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`     ✅ Creados: ${created} | 🔄 Actualizados: ${updated}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Resumen de credenciales de Secretarios
  console.log('📌 CREDENCIALES DE SECRETARIOS:\n');
  console.log('┌─────────────────────────────────────────┬─────────────────────────────────────────┬──────────────┐');
  console.log('│ SECRETARÍA                              │ EMAIL                                   │ CONTRASEÑA   │');
  console.log('├─────────────────────────────────────────┼─────────────────────────────────────────┼──────────────┤');
  for (const sec of structure.secretarios) {
    const areaShort = sec.area.substring(0, 38).padEnd(38);
    const emailShort = sec.email.padEnd(38);
    console.log(`│ ${areaShort} │ ${emailShort} │ ${sec.password.padEnd(12)} │`);
  }
  console.log('└─────────────────────────────────────────┴─────────────────────────────────────────┴──────────────┘\n');

  process.exit(0);
}

main().catch(console.error);
