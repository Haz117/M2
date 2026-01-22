// listUsers.js
// Script para listar todos los usuarios con sus credenciales
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDLhkt1e0SLtQGYrDMLsjA3oG56pfslbeQ",
  authDomain: "to-do-e3d33.firebaseapp.com",
  projectId: "to-do-e3d33",
  storageBucket: "to-do-e3d33.firebasestorage.app",
  messagingSenderId: "72995403188",
  appId: "1:72995403188:web:0e5f8a2c8c0c0e5f8c0c0e"
};

// Hash simple (debe ser igual al de authFirestore.js)
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Función para intentar descifrar la contraseña (probando contraseñas comunes)
const tryCommonPasswords = (email, storedHash) => {
  const commonPasswords = [
    '123456', 'admin123', 'password', '12345678', 'qwerty',
    'abc123', '111111', '123123', 'admin', 'letmein'
  ];
  
  for (const pwd of commonPasswords) {
    const hash = simpleHash(pwd + email.toLowerCase());
    if (hash === storedHash) {
      return pwd;
    }
  }
  return null;
};

async function listAllUsers() {
  try {
    console.log('🔄 Conectando a Firebase...\n');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('📋 Listando todos los usuarios:\n');
    console.log('='.repeat(80));
    
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    if (querySnapshot.empty) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }
    
    console.log(`Total de usuarios: ${querySnapshot.size}\n`);
    
    let userCount = 1;
    querySnapshot.forEach((doc) => {
      const user = doc.data();
      const triedPassword = tryCommonPasswords(user.email, user.password);
      
      console.log(`👤 Usuario ${userCount}:`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nombre: ${user.displayName || 'Sin nombre'}`);
      console.log(`   Rol: ${user.role || 'Sin rol'}`);
      console.log(`   Área/Depto: ${user.area || user.department || 'No asignado'}`);
      console.log(`   Activo: ${user.active ? '✅ Sí' : '❌ No'}`);
      console.log(`   Hash Password: ${user.password}`);
      
      if (triedPassword) {
        console.log(`   🔓 Contraseña encontrada: ${triedPassword}`);
      } else {
        console.log(`   🔒 Contraseña: (No se pudo determinar - prueba contraseñas comunes)`);
      }
      
      console.log(`   Creado: ${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'Desconocido'}`);
      console.log('-'.repeat(80));
      userCount++;
    });
    
    console.log('\n✅ Listado completado\n');
    
    // Mostrar resumen por roles
    const roleCount = {};
    querySnapshot.forEach((doc) => {
      const role = doc.data().role || 'sin_rol';
      roleCount[role] = (roleCount[role] || 0) + 1;
    });
    
    console.log('📊 Resumen por roles:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} usuario(s)`);
    });
    
    console.log('\n💡 Sugerencias para login:');
    console.log('   • Si no puedes iniciar sesión, verifica el hash en la consola del navegador');
    console.log('   • Los usuarios deben usar email en minúsculas');
    console.log('   • Contraseñas comunes que se probaron: 123456, admin123, password, etc.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar
listAllUsers().then(() => {
  console.log('\n👋 Script finalizado');
  process.exit(0);
});
