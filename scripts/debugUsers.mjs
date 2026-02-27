// listAllUsers.mjs - Ver todos los usuarios en Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function listUsers() {
  try {
    console.log('\n📋 Usuarios en Firestore:\n');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    if (snapshot.empty) {
      console.log('No hay usuarios registrados\n');
      process.exit(0);
    }
    
    snapshot.forEach((doc) => {
      const user = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  📧 Email: ${user.email}`);
      console.log(`  👤 Nombre: ${user.displayName || 'N/A'}`);
      console.log(`  👑 Rol: ${user.role || 'N/A'}`);
      console.log(`  ✅ Activo: ${user.active}`);
      console.log(`  🔐 Hash: ${user.password}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listUsers();
