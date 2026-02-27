// createAllDirectores.mjs - Crear todos los directores del municipio
// Ejecuta: node createAllDirectores.mjs

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

// Lista de directores por secretaría
export const directores = [
  // ===== SECRETARÍA GENERAL MUNICIPAL =====
  {
    email: 'amalia.escalante@municipio.com',
    password: 'DirA1b2c3',
    displayName: 'Lic. Amalia Escalante Cruz',
    cargo: 'Secretario Técnico',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7721620577'
  },
  {
    email: 'jose.angeles@municipio.com',
    password: 'DirB4d5e6',
    displayName: 'Mtro. Jose Martin Angeles Bautista',
    cargo: 'Director de Gobierno',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7717477211'
  },
  {
    email: 'brenda.martinez@municipio.com',
    password: 'DirC7f8g9',
    displayName: 'Ld. Brenda Martinez Azpeitia',
    cargo: 'Conciliador Municipal',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7714595609'
  },
  {
    email: 'ernesto.espinoza@municipio.com',
    password: 'DirD0h1j2',
    displayName: 'C. Ernesto Espinoza Organo',
    cargo: 'Director de Reglamentos, Comercio, Mercado y Espectáculos',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7717767957'
  },
  {
    email: 'gerardo.mendoza@municipio.com',
    password: 'DirE3k4l5',
    displayName: 'C. Gerardo Mendoza Romero',
    cargo: 'Secretario Técnico',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7715689954'
  },
  {
    email: 'dulce.rosas@municipio.com',
    password: 'DirF6m7n8',
    displayName: 'Ing. Dulce Annet Rosas Rojo',
    cargo: 'Titular de la Unidad Central de Correspondencia',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7721156073'
  },
  {
    email: 'marcos.aguirre@municipio.com',
    password: 'DirG9p0q1',
    displayName: 'Ld. Marcos Aguirre Reyes',
    cargo: 'Oficial del Registro del Estado Familiar',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7713240208'
  },
  {
    email: 'luis.olguin@municipio.com',
    password: 'DirH2r3s4',
    displayName: 'Luis Angel Olguin Nube',
    cargo: 'Director del Área Coordinadora de Archivo',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '4426262507'
  },
  {
    email: 'anahi.catalan@municipio.com',
    password: 'DirI5t6u7',
    displayName: 'Tsu. Anahi Catalan Legorreta',
    cargo: 'Dirección de Atención al Migrante',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7721663422'
  },
  {
    email: 'taurino.gonzalez@municipio.com',
    password: 'DirJ8v9w0',
    displayName: 'Lap. Taurino Gonzalez Cruz',
    cargo: 'Director de Recursos Materiales y Patrimonio',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7721322193'
  },
  {
    email: 'roberto.ruiz@municipio.com',
    password: 'DirK1x2y3',
    displayName: 'Roberto Ruiz Vega',
    cargo: 'Titular de la Junta de Reclutamiento',
    area: 'Secretaría General Municipal',
    secretarioEmail: 'secretaria.general@municipio.com',
    phone: '7713352607'
  },

  // ===== SECRETARÍA DE TESORERÍA MUNICIPAL =====
  {
    email: 'alejandro.diaz@municipio.com',
    password: 'DirL4z5a6',
    displayName: 'Lic. Alejandro Diaz Chavez',
    cargo: 'Director de Cuenta Pública',
    area: 'Secretaría de Tesorería Municipal',
    secretarioEmail: 'tesoreria@municipio.com',
    phone: '7721230985'
  },
  {
    email: 'miguel.tolentino@municipio.com',
    password: 'DirM7b8c9',
    displayName: 'Mtro. Miguel Angel Tolentino Hernandez',
    cargo: 'Director de Control y Seguimiento de Egresos',
    area: 'Secretaría de Tesorería Municipal',
    secretarioEmail: 'tesoreria@municipio.com',
    phone: '7712087940'
  },
  {
    email: 'juan.sanchez@municipio.com',
    password: 'DirN0d1e2',
    displayName: 'Lic. Juan Antonio Sanchez Contreras',
    cargo: 'Director de Catastro',
    area: 'Secretaría de Tesorería Municipal',
    secretarioEmail: 'tesoreria@municipio.com',
    phone: '7712178075'
  },
  {
    email: 'hector.perez@municipio.com',
    password: 'DirO3f4g5',
    displayName: 'Lic. Hector Perez Cano',
    cargo: 'Director de Ingresos y Estrategias de Recaudación',
    area: 'Secretaría de Tesorería Municipal',
    secretarioEmail: 'tesoreria@municipio.com',
    phone: '7716831721'
  },
  {
    email: 'juana.moctezuma@municipio.com',
    password: 'DirP6h7i8',
    displayName: 'Lic. Juana Karina Moctezuma Ramirez',
    cargo: 'Director de Administración',
    area: 'Secretaría de Tesorería Municipal',
    secretarioEmail: 'tesoreria@municipio.com',
    phone: '7737316457'
  },
  {
    email: 'isabel.munoz@municipio.com',
    password: 'DirQ9j0k1',
    displayName: 'Mtra. Isabel Muñoz Garcia',
    cargo: 'Director de Recursos Humanos y Nómina',
    area: 'Secretaría de Tesorería Municipal',
    secretarioEmail: 'tesoreria@municipio.com',
    phone: '7721239879'
  },

  // ===== SECRETARÍA DE OBRAS PÚBLICAS Y DESARROLLO URBANO =====
  {
    email: 'vanessa.martinez@municipio.com',
    password: 'DirR2l3m4',
    displayName: 'Lic. Vanessa Martinez Angel',
    cargo: 'Secretario Técnico',
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    secretarioEmail: 'obras.publicas@municipio.com',
    phone: '7226598256'
  },
  {
    email: 'gladys.zapote@municipio.com',
    password: 'DirS5n6o7',
    displayName: 'Mtra. Gladys Zapote Garcia',
    cargo: 'Director de Obras Públicas',
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    secretarioEmail: 'obras.publicas@municipio.com',
    phone: '7721177158'
  },
  {
    email: 'alfonso.alavez@municipio.com',
    password: 'DirT8p9q0',
    displayName: 'Alfonso Isidro Alavez',
    cargo: 'Director de Desarrollo Urbano y Ordenamiento Territorial',
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    secretarioEmail: 'obras.publicas@municipio.com',
    phone: '7713972945'
  },
  {
    email: 'rosalio.romero@municipio.com',
    password: 'DirU1r2s3',
    displayName: 'C. Rosalio Romero Cruz',
    cargo: 'Director de Servicios Públicos y Limpias',
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    secretarioEmail: 'obras.publicas@municipio.com',
    phone: '7721361390'
  },
  {
    email: 'julio.palma@municipio.com',
    password: 'DirV4t5u6',
    displayName: 'C. Julio Cesar Palma Rodriguez',
    cargo: 'Director de Servicios Municipales',
    area: 'Secretaría de Obras Públicas y Desarrollo Urbano',
    secretarioEmail: 'obras.publicas@municipio.com',
    phone: '7721633855'
  },

  // ===== SECRETARÍA DE PLANEACIÓN Y EVALUACIÓN =====
  {
    email: 'efrain.volteada@municipio.com',
    password: 'DirW7v8w9',
    displayName: 'Mtro. Efrain Volteada Peña',
    cargo: 'Director de Planeación y Evaluación',
    area: 'Secretaría de Planeación y Evaluación',
    secretarioEmail: 'planeacion@municipio.com',
    phone: '5521061242'
  },
  {
    email: 'luis.chavero@municipio.com',
    password: 'DirX0x1y2',
    displayName: 'Ing. Luis Alberto Chavero Chavez',
    cargo: 'Director de Tecnologías de la Información',
    area: 'Secretaría de Planeación y Evaluación',
    secretarioEmail: 'planeacion@municipio.com',
    phone: '7731023778'
  },
  {
    email: 'lucila.ocampo@municipio.com',
    password: 'DirY3z4a5',
    displayName: 'Ing. Lucila Ocampo Valle',
    cargo: 'Secretario de Desarrollo Económico y Turismo',
    area: 'Secretaría de Planeación y Evaluación',
    secretarioEmail: 'planeacion@municipio.com',
    phone: '7721227378'
  },
  {
    email: 'berenice.moreno@municipio.com',
    password: 'DirZ6b7c8',
    displayName: 'Berenice Moreno Romero',
    cargo: 'Director de Turismo',
    area: 'Secretaría de Planeación y Evaluación',
    secretarioEmail: 'planeacion@municipio.com',
    phone: '5647706945'
  },
  {
    email: 'claudia.ramirez@municipio.com',
    password: 'DirA9d0e1',
    displayName: 'Tsu. Claudia Ramirez Martinez',
    cargo: 'Director de Desarrollo Económico',
    area: 'Secretaría de Planeación y Evaluación',
    secretarioEmail: 'planeacion@municipio.com',
    phone: '7721265567'
  },
  {
    email: 'pablo.vaquero@municipio.com',
    password: 'DirB2f3g4',
    displayName: 'C. Pablo Vaquero Hernandez',
    cargo: 'Director de Desarrollo Agropecuario y Proyectos Productivos',
    area: 'Secretaría de Planeación y Evaluación',
    secretarioEmail: 'planeacion@municipio.com',
    phone: '7721090267'
  },

  // ===== SECRETARÍA DE BIENESTAR SOCIAL =====
  {
    email: 'hipolito.bartolo@municipio.com',
    password: 'DirC5h6i7',
    displayName: 'Lic. Hipolito Bartolo Marcos',
    cargo: 'Director de Cultura',
    area: 'Secretaría de Bienestar Social',
    secretarioEmail: 'bienestar.social@municipio.com',
    phone: '7721350475'
  },
  {
    email: 'christian.trejo@municipio.com',
    password: 'DirD8j9k0',
    displayName: 'Christian Moises Trejo Escamilla',
    cargo: 'Director del Deporte',
    area: 'Secretaría de Bienestar Social',
    secretarioEmail: 'bienestar.social@municipio.com',
    phone: '5564667664'
  },
  {
    email: 'rosa.labra@municipio.com',
    password: 'DirE1l2m3',
    displayName: 'Rosa Itzel Labra Samano',
    cargo: 'Director de Salud',
    area: 'Secretaría de Bienestar Social',
    secretarioEmail: 'bienestar.social@municipio.com',
    phone: '7721532941'
  },
  {
    email: 'jose.zapata@municipio.com',
    password: 'DirF4n5o6',
    displayName: 'Lic. Jose de Jesus Zapata Mendoza',
    cargo: 'Director de Educación',
    area: 'Secretaría de Bienestar Social',
    secretarioEmail: 'bienestar.social@municipio.com',
    phone: '7721379217'
  },
  {
    email: 'alicia.feregrino@municipio.com',
    password: 'DirG7p8q9',
    displayName: 'Alicia Michelle Feregrino Gomez',
    cargo: 'Director de Programas Sociales',
    area: 'Secretaría de Bienestar Social',
    secretarioEmail: 'bienestar.social@municipio.com',
    phone: '7721020923'
  },
  {
    email: 'michelle.chiapa@municipio.com',
    password: 'DirH0r1s2',
    displayName: 'C. Michelle Chiapa Zamora',
    cargo: 'Titular de la Instancia Municipal de la Juventud',
    area: 'Secretaría de Bienestar Social',
    secretarioEmail: 'bienestar.social@municipio.com',
    phone: '7721349458'
  },

  // ===== SECRETARÍA DE SEGURIDAD PÚBLICA =====
  {
    email: 'marcelino.capula@municipio.com',
    password: 'DirI3t4u5',
    displayName: 'C. Marcelino Capula Martinez',
    cargo: 'Director de Protección Civil y Bomberos',
    area: 'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil',
    secretarioEmail: 'seguridad.publica@municipio.com',
    phone: '7721333239'
  }
];

async function createDirector(director) {
  const { email, password, displayName, cargo, area, secretarioEmail, phone } = director;
  
  try {
    // Verificar si ya existe
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log(`⚠️  Director ya existe: ${displayName} (${email})`);
      return { success: false, reason: 'exists' };
    }
    
    // Hash de la contraseña (CORRECTO: password + email)
    const passwordHash = simpleHash(password + email.toLowerCase());
    
    // Crear usuario
    const userData = {
      email: email.toLowerCase(),
      password: passwordHash,
      displayName,
      role: 'director', // Nuevo rol
      cargo,
      area, // Área a la que pertenece
      department: area, // Para compatibilidad
      secretarioEmail, // Email de su secretario
      phone: phone || '',
      createdAt: new Date().toISOString(),
      active: true
    };
    
    await addDoc(usersRef, userData);
    console.log(`✅ Director creado: ${displayName}`);
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Password: ${password}`);
    console.log(`   📁 Área: ${area}`);
    console.log(`   💼 Cargo: ${cargo}`);
    console.log('');
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error creando director ${displayName}:`, error.message);
    return { success: false, reason: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🏛️  CREACIÓN DE DIRECTORES DEL MUNICIPIO');
  console.log('='.repeat(60));
  console.log('');
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const director of directores) {
    const result = await createDirector(director);
    if (result.success) created++;
    else if (result.reason === 'exists') skipped++;
    else errors++;
  }
  
  console.log('='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log(`   ✅ Creados: ${created}`);
  console.log(`   ⚠️  Ya existían: ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`   📝 Total procesados: ${directores.length}`);
  console.log('='.repeat(60));
  
  process.exit(0);
}

main().catch(console.error);
