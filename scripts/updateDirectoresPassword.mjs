// updateDirectoresPassword.mjs - Corrige las contraseñas de directores
// Ejecuta: node updateDirectoresPassword.mjs

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

// Hash simple - IGUAL al de authFirestore.js
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

async function updateDirectorPasswords() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     ACTUALIZANDO CONTRASEÑAS DE DIRECTORES              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'director'));
  const snapshot = await getDocs(q);

  console.log(`📋 Directores encontrados: ${snapshot.docs.length}\n`);

  let updated = 0;
  let errors = 0;

  // Importar la lista de directores desde createAllDirectores.mjs (ES Modules)
  const { directores } = await import('./createAllDirectores.mjs');
  // Si la importación falla, mostrar error y terminar
  if (!directores) {
    console.error('No se pudo importar la lista de directores.');
    process.exit(1);
  }

  for (const doc of snapshot.docs) {
    const userData = doc.data();
    const email = userData.email;
    // Buscar el director correspondiente por email
    const director = directores.find(d => d.email.toLowerCase() === email.toLowerCase());
    let password;
    if (director && director.password) {
      password = director.password;
    } else {
      // Si no se encuentra, usar una contraseña generada
      password = 'Dir' + Math.random().toString(36).slice(-8);
    }
    try {
      // Hash correcto: password + email
      const correctHash = simpleHash(password + email.toLowerCase());
      await updateDoc(doc.ref, {
        password: correctHash
      });
      console.log(`✅ ${userData.displayName}`);
      console.log(`   📧 ${email}`);
      console.log(`   Nueva contraseña: ${password}`);
      updated++;
    } catch (error) {
      console.error(`❌ Error con ${email}:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 RESUMEN:');
  console.log(`   ✅ Actualizados: ${updated}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log('\n💡 Contraseña para todos los directores: Dir2024');

  process.exit(0);
}

updateDirectorPasswords().catch(console.error);
