// testHash.mjs - Ver qué hash debería generarse
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const email = 'admin@todo.com';
const password = 'admin123';

console.log('\n🔐 HASH DEBUG:');
console.log(`Email: ${email}`);
console.log(`Contraseña: ${password}`);
console.log(`\nHash que debería generarse:`);
console.log(`admin123 + admin@todo.com = ${simpleHash(password + email.toLowerCase())}`);
console.log('\n👉 Busca este hash en Firestore para el usuario admin@todo.com\n');
