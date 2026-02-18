// updateAllPasswords.mjs - Actualiza en Firestore las contraseñas (hash) para usuarios listados
// Fuente: directores_contrasenas.csv, createCompleteStructure.mjs y utils/encryptCredentials.js
// Ejecuta: node updateAllPasswords.mjs

import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const encryptUtils = require('./utils/encryptCredentials.js');

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

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const result = [];
  const header = lines.shift();
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 2) {
      const email = parts[0].trim();
      const password = parts[1].trim();
      result.push({ email, password });
    }
  }
  return result;
}

function parseCreateStructure(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /email:\s*'([^']+)'\s*,\s*password:\s*'([^']+)'/g;
  const matches = [];
  let m;
  while ((m = regex.exec(content)) !== null) {
    matches.push({ email: m[1], password: m[2] });
  }
  return matches;
}

async function updatePassword(email, password) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    console.warn(`⚠️ Usuario no encontrado en Firestore: ${email}`);
    return { email, updated: false };
  }
  const docRef = snapshot.docs[0].ref;
  const hashed = simpleHash(password + email.toLowerCase());
  await updateDoc(docRef, { password: hashed, updatedAt: new Date() });
  console.log(`✅ Actualizado: ${email} -> hash ${hashed}`);
  return { email, updated: true, hash: hashed };
}

async function main() {
  const repoRoot = path.resolve('.');
  // 1) Leer CSV de directores
  const csvPath = path.join(repoRoot, 'directores_contrasenas.csv');
  const fromCsv = fs.existsSync(csvPath) ? parseCSV(csvPath) : [];

  // 2) Parsear createCompleteStructure
  const createPath = path.join(repoRoot, 'createCompleteStructure.mjs');
  const fromCreate = fs.existsSync(createPath) ? parseCreateStructure(createPath) : [];

  // 3) Credenciales internas (utils)
  const roles = ['admin', 'jefeJuridica', 'jefeObras', 'operativo'];
  const fromUtils = [];
  for (const r of roles) {
    try {
      const creds = encryptUtils.getCredentials(r);
      if (creds && creds.email && creds.password) fromUtils.push({ email: creds.email, password: creds.password });
    } catch (err) {
      // ignore
    }
  }

  // Consolidar (el CSV tiene prioridad sobre createCompleteStructure)
  const map = new Map();
  for (const it of fromCreate) {
    map.set(it.email.toLowerCase(), it.password);
  }
  for (const it of fromCsv) {
    map.set(it.email.toLowerCase(), it.password);
  }
  for (const it of fromUtils) {
    map.set(it.email.toLowerCase(), it.password);
  }

  const entries = Array.from(map.entries()).map(([email, password]) => ({ email, password }));

  console.log(`Usuarios a procesar: ${entries.length}`);

  let updated = 0;
  let missing = 0;
  for (const e of entries) {
    try {
      const res = await updatePassword(e.email, e.password);
      if (res.updated) updated++; else missing++;
    } catch (err) {
      console.error(`Error actualizando ${e.email}:`, err.message || err);
    }
  }

  console.log('\nResumen:');
  console.log(`  ✅ Actualizados: ${updated}`);
  console.log(`  ⚠️ No encontrados: ${missing}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
