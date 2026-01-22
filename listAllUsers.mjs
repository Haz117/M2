// listUsers.mjs - Listar todos los usuarios disponibles
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

async function listAllUsers() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           USUARIOS DISPONIBLES EN FIREBASE            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const usersRef = collection(db, 'users');
  const querySnapshot = await getDocs(usersRef);
  
  const admin = [];
  const operativos = [];
  
  querySnapshot.forEach(doc => {
    const user = doc.data();
    const userInfo = {
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      department: user.department || 'N/A'
    };
    
    if (user.role === 'admin') {
      admin.push(userInfo);
    } else {
      operativos.push(userInfo);
    }
  });
  
  // Mostrar Admin
  console.log('👑 ADMINISTRADOR:\n');
  admin.forEach(user => {
    console.log(`   Nombre: ${user.displayName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: admin123`);
    console.log('   Rol: Admin (acceso total)\n');
  });
  
  // Mostrar Operativos
  console.log('👥 OPERATIVOS:\n');
  operativos.forEach((user, i) => {
    console.log(`${i + 1}. ${user.displayName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: 123456`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   Departamento: ${user.department}\n`);
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Total de usuarios: ' + querySnapshot.size);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  process.exit(0);
}

listAllUsers();
