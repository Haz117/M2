// fixAdmin.mjs - Restaurar contraseña del admin
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

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

async function fixAdmin() {
  console.log('\n🔧 Restaurando admin...\n');
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', 'admin@todo.com'));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    console.log('❌ Admin no encontrado');
    process.exit(1);
  }
  
  const adminDoc = querySnapshot.docs[0];
  const adminHash = simpleHash('admin123' + 'admin@todo.com');
  
  await updateDoc(doc(db, 'users', adminDoc.id), {
    password: adminHash,
    role: 'admin',
    active: true
  });
  
  console.log('✅ Admin actualizado correctamente');
  console.log('   Email: admin@todo.com');
  console.log('   Password: admin123');
  console.log('   Hash: ' + adminHash);
  console.log('\n✨ Ahora puedes iniciar sesión con admin@todo.com / admin123\n');
  
  process.exit(0);
}

fixAdmin();
