// updateUserToSecretario.mjs - Actualizar usuario a rol secretario
// Ejecuta: node updateUserToSecretario.mjs [email] [area]
// Ejemplo: node updateUserToSecretario.mjs diego@todo.com "Secretaría General Municipal"

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

async function updateUserToSecretario() {
  const args = process.argv.slice(2);
  const email = args[0] || 'diego@todo.com';
  const area = args[1] || 'Secretaría General Municipal';
  
  console.log('\n📝 ACTUALIZANDO USUARIO A SECRETARIO:');
  console.log(`   Email: ${email}`);
  console.log(`   Área: ${area}\n`);

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`❌ Usuario ${email} no encontrado`);
      process.exit(1);
    }
    
    const docRef = querySnapshot.docs[0].ref;
    const userData = querySnapshot.docs[0].data();
    
    console.log('📋 Datos actuales:');
    console.log(`   Nombre: ${userData.displayName}`);
    console.log(`   Rol: ${userData.role || 'sin rol'}`);
    console.log(`   Área: ${userData.area || 'sin área'}\n`);
    
    await updateDoc(docRef, {
      role: 'secretario',
      area: area,
      department: area,
      updatedAt: new Date()
    });
    
    console.log('✅ Usuario actualizado correctamente\n');
    console.log('═══════════════════════════════════════════');
    console.log('📧 Email:', email);
    console.log('👤 Nombre:', userData.displayName);
    console.log('📋 Nuevo Rol: SECRETARIO');
    console.log('📍 Área:', area);
    console.log('═══════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

updateUserToSecretario();
