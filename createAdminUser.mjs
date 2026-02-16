// createAdminUser.mjs - Crear usuario admin en Firestore
// Ejecuta: node createAdminUser.mjs

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

async function createAdminUser() {
  const email = 'admin@todo.com';
  const password = 'admin123';
  const displayName = 'Administrador';
  const role = 'admin';
  
  console.log('📝 DATOS A CREAR/ACTUALIZAR:');
  console.log(`   Email: ${email}`);
  console.log(`   Contraseña: ${password}`);

  try {
    console.log('\n🔥 Creando usuario admin en Firestore...\n');
    
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
      console.log(`✅ ${email} actualizado\n`);
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
      console.log(`✅ ${email} creado\n`);
      console.log(`ID del documento: ${newDocRef.id}\n`);
    }
    
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Contraseña: ${password}`);
    console.log(`👤 Nombre: ${displayName}`);
    console.log(`👑 Rol: ${role}\n`);
    
    console.log('[✓] Usuario listo para usar en la app\n');
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

createAdminUser();
