// deleteTestTasks.mjs - Eliminar las tareas de prueba que creé
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

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

const tasksToDelete = [
  'Revisar documentación legal',
  'Presentar informe mensual',
  'Actualizar base de datos',
  'Archivar documentos antiguos',
  'Llamar a proveedor urgente'
];

async function deleteTasks() {
  console.log('\n🗑️  Eliminando tareas de prueba...\n');
  
  let deleted = 0;
  
  for (const taskTitle of tasksToDelete) {
    try {
      const q = query(collection(db, 'tasks'), where('title', '==', taskTitle));
      const querySnapshot = await getDocs(q);
      
      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(doc(db, 'tasks', docSnap.id));
        console.log(`✅ Eliminada: "${taskTitle}"`);
        deleted++;
      }
    } catch (error) {
      console.error(`❌ Error eliminando "${taskTitle}":`, error.message);
    }
  }
  
  console.log(`\n✨ Total eliminadas: ${deleted} tareas\n`);
  process.exit(0);
}

deleteTasks();
