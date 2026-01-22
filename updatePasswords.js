// updatePasswords.js - Actualizar contraseñas de usuarios existentes
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLhkt1e0SLtQGYrDMLsjA3oG56pfslbeQ",
  authDomain: "to-do-e3d33.firebaseapp.com",
  projectId: "to-do-e3d33",
  storageBucket: "to-do-e3d33.firebasestorage.app",
  messagingSenderId: "72995403188",
  appId: "1:72995403188:web:0e5f8a2c8c0c0e5f8c0c0e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Hash simple (igual al de authFirestore.js)
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
  try {
    console.log('🔄 Actualizando contraseñas...\n');
    
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    // Actualizar todos los usuarios existentes con contraseña "123456"
    const updates = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const userData = docSnapshot.data();
      const email = userData.email.toLowerCase();
      const newPassword = '123456';
      const newHash = simpleHash(newPassword + email);
      
      console.log(`📝 Actualizando: ${email}`);
      console.log(`   Nuevo hash: ${newHash}`);
      
      updates.push(
        updateDoc(doc(db, 'users', docSnapshot.id), {
          password: newHash
        })
      );
    }
    
    await Promise.all(updates);
    console.log('\n✅ Contraseñas actualizadas!\n');
    
    // Crear usuarios faltantes
    console.log('➕ Creando usuarios adicionales...\n');
    
    const newUsers = [
      {
        email: 'admin@todo.com',
        password: '123456',
        displayName: 'Administrador',
        role: 'admin',
        active: true
      },
      {
        email: 'operativo.juridico@todo.com',
        password: '123456',
        displayName: 'Operativo Juridico',
        role: 'operativo',
        area: 'Juridico',
        department: 'Juridico',
        active: true
      }
    ];
    
    for (const user of newUsers) {
      // Verificar si ya existe
      const exists = querySnapshot.docs.some(doc => 
        doc.data().email === user.email
      );
      
      if (!exists) {
        const hash = simpleHash(user.password + user.email);
        await addDoc(usersRef, {
          ...user,
          password: hash,
          createdAt: new Date()
        });
        console.log(`✅ Creado: ${user.email} (${user.role})`);
      } else {
        console.log(`ℹ️  Ya existe: ${user.email}`);
      }
    }
    
    console.log('\n📋 RESUMEN - Todos los usuarios ahora tienen contraseña: 123456\n');
    
    // Listar todos los usuarios actualizados
    const updatedSnapshot = await getDocs(usersRef);
    updatedSnapshot.forEach(doc => {
      const user = doc.data();
      console.log(`✅ ${user.email} - Rol: ${user.role} - Hash: ${user.password}`);
    });
    
    console.log('\n🎉 ¡Listo! Ahora todos pueden iniciar sesión con contraseña: 123456');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateAllPasswords().then(() => {
  console.log('\n👋 Script finalizado');
  process.exit(0);
});
