// Script temporal para verificar la configuración de áreas
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// Importar config de áreas directamente (sin pasar por React Native)
const areasModule = await import('../config/areas.js');
const { SECRETARIAS, SECRETARIAS_DIRECCIONES, DIRECCIONES, OTRAS_AREAS, TODAS_LAS_AREAS, getSecretariaByDireccion, AREA_ALIASES } = areasModule;

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM",
  authDomain: "infra-sublime-464215-m5.firebaseapp.com",
  projectId: "infra-sublime-464215-m5",
  storageBucket: "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: "205062729291",
  appId: "1:205062729291:web:da314180f361bf2a3367ce",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

console.log('=== VERIFICACION DE AREAS ===\n');

// 1. Verificar que TODAS las secretarias del array esten en el mapeo
console.log('1. SECRETARIAS en array vs en mapeo SECRETARIAS_DIRECCIONES:');
const secretariasEnMapeo = Object.keys(SECRETARIAS_DIRECCIONES);
let s1ok = true;
SECRETARIAS.forEach(s => {
  if (!secretariasEnMapeo.includes(s)) {
    console.log('   FALTA EN MAPEO:', s);
    s1ok = false;
  }
});
secretariasEnMapeo.forEach(s => {
  if (!SECRETARIAS.includes(s)) {
    console.log('   FALTA EN ARRAY:', s);
    s1ok = false;
  }
});
if (s1ok) {
  console.log('   OK: SECRETARIAS array y mapeo coinciden (' + SECRETARIAS.length + ' secretarias)');
}

// 2. Verificar que TODAS las direcciones del mapeo esten en el array DIRECCIONES
console.log('\n2. DIRECCIONES del mapeo vs array DIRECCIONES:');
let allDirsMapeo = [];
Object.entries(SECRETARIAS_DIRECCIONES).forEach(([sec, dirs]) => {
  dirs.forEach(dir => allDirsMapeo.push({dir, sec}));
});

let s2ok = true;
allDirsMapeo.forEach(({dir, sec}) => {
  if (!DIRECCIONES.includes(dir)) {
    console.log('   EN MAPEO PERO NO EN ARRAY:', dir, '(de', sec + ')');
    s2ok = false;
  }
});

DIRECCIONES.forEach(dir => {
  const found = allDirsMapeo.find(d => d.dir === dir);
  if (!found) {
    console.log('   EN ARRAY PERO NO EN MAPEO:', dir);
    s2ok = false;
  }
});

if (s2ok) {
  console.log('   OK: DIRECCIONES array y mapeo coinciden (' + DIRECCIONES.length + ' direcciones)');
} else {
  console.log('   Mapeo tiene', allDirsMapeo.length, 'dirs, array tiene', DIRECCIONES.length);
}

// 3. Verificar duplicados
console.log('\n3. Verificando DUPLICADOS:');
const allAreas = [...SECRETARIAS, ...DIRECCIONES, ...OTRAS_AREAS];
const seen = {};
allAreas.forEach(a => { seen[a] = (seen[a] || 0) + 1; });
let dupsFound = false;
Object.entries(seen).forEach(([area, count]) => {
  if (count > 1) {
    console.log('   DUPLICADO (' + count + 'x):', area);
    dupsFound = true;
  }
});
if (!dupsFound) console.log('   OK: Sin duplicados');

// 4. Verificar areas cruzadas
console.log('\n4. Verificando cruces entre OTRAS_AREAS y DIRECCIONES:');
let crossFound = false;
OTRAS_AREAS.forEach(a => {
  if (DIRECCIONES.includes(a)) {
    console.log('   CRUCE:', a, 'esta en OTRAS_AREAS y DIRECCIONES');
    crossFound = true;
  }
  if (SECRETARIAS.includes(a)) {
    console.log('   CRUCE:', a, 'esta en OTRAS_AREAS y SECRETARIAS');
    crossFound = true;
  }
});
if (!crossFound) console.log('   OK: Sin cruces entre categorias');

// 5. Resumen por secretaria
console.log('\n5. RESUMEN POR SECRETARIA:');
Object.entries(SECRETARIAS_DIRECCIONES).forEach(([sec, dirs]) => {
  console.log('   [' + dirs.length + ' dirs] ' + sec);
  dirs.forEach(dir => {
    console.log('      -> ' + dir);
  });
});

console.log('\n6. OTRAS AREAS (sin secretaria padre):');
OTRAS_AREAS.forEach(a => console.log('   * ' + a));

console.log('\n7. TOTALES:');
console.log('   Secretarias:', SECRETARIAS.length);
console.log('   Direcciones:', DIRECCIONES.length);
console.log('   Otras areas:', OTRAS_AREAS.length);
console.log('   TODAS_LAS_AREAS:', TODAS_LAS_AREAS.length);
console.log('   Esperado:', SECRETARIAS.length + DIRECCIONES.length + OTRAS_AREAS.length);

// 8. Verificar getSecretariaByDireccion para cada direccion
console.log('\n8. Verificando getSecretariaByDireccion para CADA direccion:');
let lookupOk = true;
DIRECCIONES.forEach(dir => {
  const sec = getSecretariaByDireccion(dir);
  if (!sec) {
    console.log('   NO ENCONTRO SECRETARIA PARA:', dir);
    lookupOk = false;
  }
});
if (lookupOk) console.log('   OK: Todas las direcciones resuelven a una secretaria');

// 9. Verificar contra Firestore
console.log('\n9. VERIFICANDO CONTRA FIRESTORE (usuarios activos):');
try {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('active', '==', true));
  const snapshot = await getDocs(q);
  
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log('   Total usuarios activos:', users.length);
  
  const directors = users.filter(u => u.role === 'director');
  const secretarios = users.filter(u => u.role === 'secretario');
  
  console.log('   Directores:', directors.length);
  console.log('   Secretarios:', secretarios.length);
  
  console.log('\n   DIRECTORES Y SUS AREAS:');
  directors.forEach(d => {
    const area = d.area || d.department || '(sin area)';
    const matchesDireccion = DIRECCIONES.some(dir => dir === area || dir.includes(area) || area.includes(dir));
    const matchesOtras = OTRAS_AREAS.some(oa => oa === area || oa.includes(area) || area.includes(oa));
    const sec = getSecretariaByDireccion(area);
    const status = matchesDireccion ? 'OK (en DIRECCIONES)' : matchesOtras ? 'OK (en OTRAS_AREAS)' : 'NO ENCONTRADA EN CONFIG';
    console.log('      ' + (d.displayName || d.email) + ' | area: "' + area + '" | ' + status + (sec ? ' -> ' + sec : ''));
  });
  
  console.log('\n   SECRETARIOS Y SUS AREAS:');
  secretarios.forEach(s => {
    const area = s.area || s.department || '(sin area)';
    const matchesSecretaria = SECRETARIAS.some(sec => sec === area || sec.includes(area) || area.includes(sec));
    const dirs = s.direcciones || [];
    const status = matchesSecretaria ? 'OK' : 'NO ENCONTRADA EN CONFIG';
    console.log('      ' + (s.displayName || s.email) + ' | area: "' + area + '" | ' + status);
    if (dirs.length > 0) {
      console.log('         direcciones:', dirs.join(', '));
    }
  });
  
  // 10. Verificar que cada director tiene un secretario padre
  console.log('\n10. VERIFICANDO CADENA DIRECTOR -> SECRETARIA -> SECRETARIO:');
  directors.forEach(d => {
    const area = d.area || d.department || '';
    const sec = getSecretariaByDireccion(area);
    if (!sec) {
      console.log('      [WARN] ' + (d.displayName || d.email) + ' (area: "' + area + '") -> Sin secretaria padre');
    } else {
      const secUser = secretarios.find(s => {
        const sArea = s.area || '';
        return sArea === sec;
      }) || secretarios.find(s => {
        const sArea = s.area || '';
        return sArea.includes(sec.split(' ').pop()) || sec.includes(sArea.split(' ').pop());
      });
      if (secUser) {
        console.log('      OK: ' + (d.displayName || d.email) + ' -> ' + sec + ' -> ' + (secUser.displayName || secUser.email));
      } else {
        console.log('      [WARN] ' + (d.displayName || d.email) + ' -> ' + sec + ' -> SIN SECRETARIO ASIGNADO');
      }
    }
  });
  
  process.exit(0);
} catch (error) {
  console.error('Error conectando a Firestore:', error.message);
  process.exit(1);
}
