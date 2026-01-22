// createAdminUser.js - Crear usuarios de prueba en Firestore
// Ejecuta: node createAdminUser.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where, doc, setDoc } from 'firebase/firestore';

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

const users = [
  {
    email: 'admin@todo.com',
    password: 'admin123',
    displayName: 'Administrador',
    role: 'admin',
    department: null
  },
  {
    email: 'operativo.juridica@todo.com',
    password: 'oper123',
    displayName: 'Juan Pérez',
    role: 'operativo',
    department: 'juridica'
  }
];

async function createUsers() {
  console.log('\n🔥 Creando usuarios en Firestore...\n');
  
  for (const user of users) {
    try {
      // Verificar si ya existe
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      const hash = simpleHash(user.password + user.email);
      
      if (!querySnapshot.empty) {
        console.log(`⚠️  ${user.email} ya existe. Actualizando...`);
        const docRef = querySnapshot.docs[0].ref;
        await setDoc(docRef, {
          email: user.email,
          password: hash,
          displayName: user.displayName,
          role: user.role,
          department: user.department,
          active: true,
          updatedAt: new Date()
        }, { merge: true });
        console.log(`✅ ${user.email} actualizado`);
      } else {
        // Crear nuevo
        await addDoc(usersRef, {
          email: user.email,
          password: hash,
          displayName: user.displayName,
          role: user.role,
          department: user.department,
          active: true,
          createdAt: new Date()
        });
        console.log(`✅ ${user.email} creado`);
      }
      
      console.log(`   Password: ${user.password}`);
      console.log(`   Hash: ${hash}\n`);
      
    } catch (error) {
      console.error(`❌ Error con ${user.email}:`, error.message);
    }
  }
  
  console.log('✨ Proceso completado\n');
  process.exit(0);
}

createUsers();
