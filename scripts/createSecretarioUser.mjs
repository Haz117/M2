// createSecretarioUser.mjs - Crear usuario secretario en Firestore
// Ejecuta: node createSecretarioUser.mjs [email] [password] [nombre]
// Ejemplo: node createSecretarioUser.mjs secretario@todo.com secretario123 "Juan Secretario"

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

async function createSecretarioUser() {
  // Parámetros por defecto o desde argumentos
  const args = process.argv.slice(2);
  const email = args[0] || 'secretario@todo.com';
  const password = args[1] || 'secretario123';
  const displayName = args[2] || 'Secretario';
  const role = 'secretario'; // Rol secretario - puede delegar tareas a directores
  
  console.log('📝 CREANDO USUARIO SECRETARIO:');
  console.log(`   Email: ${email}`);
  console.log(`   Contraseña: ${password}`);
  console.log(`   Nombre: ${displayName}`);
  console.log(`   Rol: ${role} (puede delegar tareas a directores)\n`);

  try {
    console.log('🔥 Creando usuario secretario en Firestore...\n');
    
    // Verificar si ya existe
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    // Crear hash con normalización: email minúscula + password
    const hashedPassword = simpleHash(password + email.toLowerCase());
    
    if (!querySnapshot.empty) {
      console.log(`⚠️  ${email} ya existe. Actualizando...`);
      const docRef = querySnapshot.docs[0].ref;
      await setDoc(docRef, {
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: displayName,
        role: role,
        active: true,
        updatedAt: new Date()
      }, { merge: true });
      console.log(`✅ ${email} actualizado como secretario\n`);
    } else {
      // Crear nuevo
      const newDocRef = await addDoc(usersRef, {
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: displayName,
        role: role,
        active: true,
        createdAt: new Date()
      });
      console.log(`✅ ${email} creado como secretario\n`);
      console.log(`ID del documento: ${newDocRef.id}\n`);
    }
    
    console.log('═══════════════════════════════════════════');
    console.log('📧 Email:', email);
    console.log('🔐 Contraseña:', password);
    console.log('👤 Nombre:', displayName);
    console.log('📋 Rol: SECRETARIO');
    console.log('═══════════════════════════════════════════');
    console.log('\n📌 PERMISOS DEL SECRETARIO:');
    console.log('   ✓ Puede ver todas las tareas');
    console.log('   ✓ Puede crear y delegar tareas a directores');
    console.log('   ✓ Puede editar tareas existentes');
    console.log('   ✗ NO puede administrar usuarios');
    console.log('   ✗ NO puede cambiar configuraciones del sistema\n');
    
    console.log('[✓] Usuario secretario listo para usar en la app\n');
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

createSecretarioUser();
