import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAo91_TbA7c7f1EAOdcvuTZ3NR06yD32RM",
  authDomain: "infra-sublime-464215-m5.firebaseapp.com",
  projectId: "infra-sublime-464215-m5",
  storageBucket: "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: "1002337843316",
  appId: "1:1002337843316:web:c37f8dc78b5e800c11fc82",
  measurementId: "G-94TPE46QKX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixTaskStatuses() {
  console.log('🔍 Verificando status de tareas...\n');
  
  const tasksRef = collection(db, 'tasks');
  const snapshot = await getDocs(tasksRef);
  
  for (const taskDoc of snapshot.docs) {
    const task = taskDoc.data();
    console.log(`Tarea: "${task.title}"`);
    console.log(`  - ID: ${taskDoc.id}`);
    console.log(`  - Status actual: "${task.status}"`);
    console.log(`  - Asignado a: ${task.assignedTo || 'Sin asignar'}`);
    
    // Si no tiene status o tiene un status inválido, asignar 'pendiente'
    if (!task.status || !['pendiente', 'en_proceso', 'en_revision', 'cerrada'].includes(task.status)) {
      console.log(`  ⚠️  Status inválido o vacío. Actualizando a "pendiente"...`);
      await updateDoc(doc(db, 'tasks', taskDoc.id), { status: 'pendiente' });
      console.log(`  ✅ Status actualizado a "pendiente"\n`);
    } else {
      console.log(`  ✅ Status válido\n`);
    }
  }
  
  console.log('✅ Verificación completada');
  process.exit(0);
}

fixTaskStatuses().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
