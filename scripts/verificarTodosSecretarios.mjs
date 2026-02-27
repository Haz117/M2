// verificarTodosSecretarios.mjs - Verificar todas las secretarías y sus directores
// Ejecuta: node verificarTodosSecretarios.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function verificar() {
  console.log('='.repeat(100));
  console.log('VERIFICACIÓN COMPLETA DE SECRETARIOS Y DIRECTORES');
  console.log('='.repeat(100));

  const usersRef = collection(db, 'users');
  
  // 1. Obtener todos los secretarios
  const secretariosQ = query(usersRef, where('role', '==', 'secretario'));
  const secretariosSnap = await getDocs(secretariosQ);
  
  // 2. Obtener todos los directores
  const directoresQ = query(usersRef, where('role', '==', 'director'));
  const directoresSnap = await getDocs(directoresQ);
  
  const directores = [];
  directoresSnap.forEach(doc => {
    directores.push(doc.data());
  });
  
  console.log(`\n📊 Total Secretarios: ${secretariosSnap.size}`);
  console.log(`📊 Total Directores: ${directoresSnap.size}\n`);
  
  const problemas = [];
  
  // Analizar cada secretario
  for (const doc of secretariosSnap.docs) {
    const sec = doc.data();
    console.log('─'.repeat(100));
    console.log(`\n💼 SECRETARIO: ${sec.displayName}`);
    console.log(`   Email: ${sec.email}`);
    console.log(`   Área: ${sec.area}`);
    
    const direccionesSec = sec.direcciones || [];
    const areasPermitidas = sec.areasPermitidas || [];
    
    console.log(`   Direcciones configuradas: ${direccionesSec.length}`);
    
    // Buscar directores que deberían estar bajo este secretario
    const directoresDeEstaSecretaria = directores.filter(d => 
      direccionesSec.includes(d.area) || areasPermitidas.includes(d.area)
    );
    
    console.log(`   Directores encontrados: ${directoresDeEstaSecretaria.length}`);
    
    if (direccionesSec.length > 0) {
      console.log('\n   📋 Direcciones del secretario:');
      direccionesSec.forEach(dir => {
        const directorEncontrado = directores.find(d => d.area === dir);
        if (directorEncontrado) {
          console.log(`      ✅ "${dir}"`);
          console.log(`         → Director: ${directorEncontrado.displayName} (${directorEncontrado.email})`);
        } else {
          console.log(`      ⚠️  "${dir}" - SIN DIRECTOR ASIGNADO`);
          problemas.push({
            tipo: 'SIN_DIRECTOR',
            secretario: sec.displayName,
            direccion: dir
          });
        }
      });
    }
    
    // Verificar si hay directores con áreas que no coinciden
    const directoresSinCoincidencia = directoresDeEstaSecretaria.filter(d => 
      !direccionesSec.includes(d.area)
    );
    
    if (directoresSinCoincidencia.length > 0) {
      console.log('\n   ⚠️  Directores con áreas no listadas en direcciones:');
      directoresSinCoincidencia.forEach(d => {
        console.log(`      - ${d.displayName}: "${d.area}"`);
        problemas.push({
          tipo: 'AREA_NO_COINCIDE',
          secretario: sec.displayName,
          director: d.displayName,
          areaDirector: d.area
        });
      });
    }
  }
  
  // Verificar directores huérfanos (sin secretario)
  console.log('\n' + '─'.repeat(100));
  console.log('\n🔍 VERIFICANDO DIRECTORES HUÉRFANOS (sin secretario asignado):');
  
  const secretarios = [];
  secretariosSnap.forEach(doc => secretarios.push(doc.data()));
  
  const todasDirecciones = secretarios.flatMap(s => [...(s.direcciones || []), ...(s.areasPermitidas || [])]);
  
  const directoresHuerfanos = directores.filter(d => !todasDirecciones.includes(d.area));
  
  if (directoresHuerfanos.length > 0) {
    console.log(`   ⚠️  ${directoresHuerfanos.length} directores sin secretario:`);
    directoresHuerfanos.forEach(d => {
      console.log(`      - ${d.displayName} (${d.email})`);
      console.log(`        Área: "${d.area}"`);
      problemas.push({
        tipo: 'DIRECTOR_HUERFANO',
        director: d.displayName,
        email: d.email,
        area: d.area
      });
    });
  } else {
    console.log('   ✅ Todos los directores tienen secretario asignado');
  }
  
  // Resumen de problemas
  console.log('\n' + '='.repeat(100));
  console.log('RESUMEN DE PROBLEMAS');
  console.log('='.repeat(100));
  
  if (problemas.length === 0) {
    console.log('\n✅ No se encontraron problemas. Todas las configuraciones están correctas.');
  } else {
    console.log(`\n⚠️  Se encontraron ${problemas.length} problemas:\n`);
    
    const sinDirector = problemas.filter(p => p.tipo === 'SIN_DIRECTOR');
    const noCoincide = problemas.filter(p => p.tipo === 'AREA_NO_COINCIDE');
    const huerfanos = problemas.filter(p => p.tipo === 'DIRECTOR_HUERFANO');
    
    if (sinDirector.length > 0) {
      console.log(`   📛 Direcciones sin director: ${sinDirector.length}`);
    }
    if (noCoincide.length > 0) {
      console.log(`   📛 Áreas que no coinciden: ${noCoincide.length}`);
    }
    if (huerfanos.length > 0) {
      console.log(`   📛 Directores huérfanos: ${huerfanos.length}`);
    }
  }
  
  process.exit(0);
}

verificar().catch(console.error);
