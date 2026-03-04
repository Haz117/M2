import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const firebaseConfig = {
  apiKey: 'AIzaSyAMz5fIac8k28fMYXA4s_s0Qzz9d9d8LWQ',
  authDomain: 'infra-sublime-464215-m5.firebaseapp.com',
  projectId: 'infra-sublime-464215-m5',
  storageBucket: 'infra-sublime-464215-m5.firebasestorage.app',
  messagingSenderId: '949204561598',
  appId: '1:949204561598:web:9a02d1d1a9d8f8a8a8a8a8'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Contraseñas por default según rol
const passwordsDefault = {
  admin: 'Admin2024',
  secretario: 'Sec2024',
  director: 'Dir2024'
};

async function generarExcel() {
  console.log('📊 Obteniendo usuarios de Firebase...');
  
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const admins = users.filter(u => u.role === 'admin');
  const secretarios = users.filter(u => u.role === 'secretario').sort((a,b) => (a.area || '').localeCompare(b.area || ''));
  const directores = users.filter(u => u.role === 'director');
  const otros = users.filter(u => !['admin','secretario','director'].includes(u.role));
  
  // Crear datos para Excel
  const data = [];
  
  // Encabezado
  data.push(['DIRECTORIO DE USUARIOS - SISTEMA DE GESTIÓN MUNICIPAL']);
  data.push(['Generado el: ' + new Date().toLocaleDateString('es-MX')]);
  data.push([]);
  
  // === ADMINISTRADORES ===
  data.push(['═══════════════════ ADMINISTRADORES ═══════════════════']);
  data.push(['NOMBRE', 'EMAIL', 'CONTRASEÑA', 'PUESTO/ÁREA', 'TELÉFONO']);
  
  admins.forEach(u => {
    data.push([
      u.displayName || '-',
      u.email,
      u.email === 'admin@todo.com' ? 'admin123' : passwordsDefault.admin,
      u.position || u.area || '-',
      u.phone || '-'
    ]);
  });
  
  data.push([]);
  
  // === SECRETARIOS Y SUS DIRECTORES ===
  data.push(['═══════════════════ SECRETARIOS Y DIRECTORES ═══════════════════']);
  
  secretarios.forEach(sec => {
    data.push([]);
    data.push(['▼ ' + (sec.area || 'Sin área')]);
    data.push(['NOMBRE', 'EMAIL', 'CONTRASEÑA', 'PUESTO/ÁREA', 'TELÉFONO']);
    
    // Secretario
    data.push([
      '★ ' + (sec.displayName || '-'),
      sec.email,
      passwordsDefault.secretario,
      'SECRETARIO',
      sec.phone || '-'
    ]);
    
    // Directores de esta secretaría
    const dirs = sec.direcciones || [];
    const directoresAsignados = directores.filter(d => dirs.includes(d.area));
    
    directoresAsignados.forEach(dir => {
      data.push([
        '   • ' + (dir.displayName || '-'),
        dir.email,
        passwordsDefault.director,
        dir.area || dir.position || '-',
        dir.phone || '-'
      ]);
    });
  });
  
  data.push([]);
  
  // === DIRECTORES INDEPENDIENTES ===
  const independientes = directores.filter(d => {
    return !secretarios.some(s => (s.direcciones || []).includes(d.area));
  });
  
  if (independientes.length > 0) {
    data.push(['═══════════════════ DIRECTORES INDEPENDIENTES ═══════════════════']);
    data.push(['NOMBRE', 'EMAIL', 'CONTRASEÑA', 'PUESTO/ÁREA', 'TELÉFONO']);
    
    independientes.forEach(dir => {
      data.push([
        dir.displayName || '-',
        dir.email,
        passwordsDefault.director,
        dir.area || dir.position || '-',
        dir.phone || '-'
      ]);
    });
  }
  
  data.push([]);
  
  // === OTROS USUARIOS ===
  if (otros.length > 0) {
    data.push(['═══════════════════ OTROS USUARIOS ═══════════════════']);
    data.push(['NOMBRE', 'EMAIL', 'CONTRASEÑA', 'ROL', 'ÁREA']);
    
    otros.forEach(u => {
      data.push([
        u.displayName || '-',
        u.email,
        passwordsDefault[u.role] || 'Password123',
        u.role || '-',
        u.area || u.department || '-'
      ]);
    });
  }
  
  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Ajustar anchos de columna
  ws['!cols'] = [
    { wch: 40 }, // Nombre
    { wch: 35 }, // Email
    { wch: 15 }, // Contraseña
    { wch: 50 }, // Puesto
    { wch: 15 }, // Teléfono
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
  
  // Guardar archivo
  const filename = 'DIRECTORIO_USUARIOS_MUNICIPIO.xlsx';
  XLSX.writeFile(wb, filename);
  
  console.log('');
  console.log('✅ Excel generado exitosamente!');
  console.log('📁 Archivo: ' + filename);
  console.log('');
  console.log('📊 Resumen:');
  console.log('   • Admins: ' + admins.length);
  console.log('   • Secretarios: ' + secretarios.length);
  console.log('   • Directores: ' + directores.length);
  console.log('   • Independientes: ' + independientes.length);
  console.log('   • Otros: ' + otros.length);
  console.log('   • TOTAL: ' + users.length + ' usuarios');
  
  process.exit(0);
}

generarExcel().catch(e => { console.error('Error:', e); process.exit(1); });
