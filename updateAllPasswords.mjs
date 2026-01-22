// updatePasswords.mjs - Actualizar contraseñas de usuarios existentes
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

async function updateAllPasswords() {
  console.log('\n🔥 Actualizando contraseñas de usuarios existentes...\n');
  
  const usersRef = collection(db, 'users');
  const querySnapshot = await getDocs(usersRef);
  
  const newPassword = '123456'; // Contraseña común para todos
  
  console.log(`📋 Total de usuarios encontrados: ${querySnapshot.size}\n`);
  
  for (const docSnapshot of querySnapshot.docs) {
    const userData = docSnapshot.data();
    const email = userData.email.toLowerCase();
    const newHash = simpleHash(newPassword + email);
    
    try {
      await updateDoc(doc(db, 'users', docSnapshot.id), {
        password: newHash,
        role: userData.role || 'operativo', // Mantener rol o poner operativo por defecto
        active: true
      });
      
      console.log(`✅ ${userData.displayName} (${email})`);
      console.log(`   Nueva contraseña: ${newPassword}`);
      console.log(`   Hash: ${newHash}`);
      console.log(`   Rol: ${userData.role || 'operativo'}\n`);
    } catch (error) {
      console.error(`❌ Error actualizando ${email}:`, error.message);
    }
  }
  
  console.log('✨ Actualización completada\n');
  console.log('Ahora todos los usuarios pueden iniciar sesión con la contraseña: 123456');
  
  process.exit(0);
}

updateAllPasswords();
