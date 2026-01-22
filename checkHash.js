// checkHash.js - Verifica hash de contraseñas
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

console.log('\n=== HASHES DE USUARIOS DE PRUEBA ===\n');

// USUARIOS DE PRUEBA
const users = [
  { email: 'admin@todo.com', password: 'admin123', displayName: 'Administrador', role: 'admin', department: null },
  { email: 'operativo.juridica@todo.com', password: 'oper123', displayName: 'Juan Pérez', role: 'operativo', department: 'juridica' }
];

users.forEach(user => {
  const hash = simpleHash(user.password + user.email);
  console.log(`👤 ${user.displayName} (${user.role})`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: ${user.password}`);
  console.log(`   Hash: ${hash}`);
  console.log('');
});

console.log('=== DATOS PARA FIRESTORE ===\n');
users.forEach((user, i) => {
  const hash = simpleHash(user.password + user.email);
  console.log(`Documento ${i + 1}:`);
  console.log(JSON.stringify({
    email: user.email,
    password: hash,
    displayName: user.displayName,
    role: user.role,
    department: user.department,
    active: true
  }, null, 2));
  console.log('');
});
