// updateSinglePassword.mjs - Actualiza la contraseña (hash) para un email específico
// Ejecuta: node updateSinglePassword.mjs

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

// Hash simple - IGUAL al de otros scripts
const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// --- CONFIGURA AQUÍ ---
const targetEmail = 'sipinna@municipio.com';
const newPassword = 'sipina24-27';
// ----------------------

async function updatePasswordForEmail(email, password) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    console.error('No se encontró ningún usuario con ese email.');
    process.exit(1);
  }
  const docRef = snapshot.docs[0].ref;
  const hashed = simpleHash(password + email.toLowerCase());
  await updateDoc(docRef, { password: hashed, updatedAt: new Date() });
  console.log('✅ Contraseña actualizada.');
  console.log(`Email: ${email}`);
  console.log(`Nueva contraseña en claro: ${password}`);
  console.log(`Hash guardado en Firestore: ${hashed}`);
}

updatePasswordForEmail(targetEmail, newPassword).catch(err => { console.error(err); process.exit(1); });
