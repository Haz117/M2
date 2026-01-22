// createTestTasks.mjs - Crear tareas de prueba
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

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

const tasks = [
  {
    title: 'Revisar documentación legal',
    description: 'Revisar y aprobar los nuevos contratos',
    status: 'pendiente',
    priority: 'alta',
    area: 'juridica',
    department: 'juridica',
    assignedTo: 'julian@gmail.com',
    createdBy: 'admin',
    createdByName: 'Administrador',
    dueAt: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // En 3 días
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    title: 'Presentar informe mensual',
    description: 'Completar y enviar el informe del mes',
    status: 'pendiente',
    priority: 'media',
    area: 'juridica',
    department: 'juridica',
    assignedTo: 'lopez@gmail.com',
    createdBy: 'admin',
    createdByName: 'Administrador',
    dueAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // Vencida hace 2 días
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    title: 'Actualizar base de datos',
    description: 'Actualizar registros del sistema',
    status: 'en_progreso',
    priority: 'media',
    area: 'operaciones',
    department: 'operaciones',
    assignedTo: 'julian@gmail.com',
    createdBy: 'admin',
    createdByName: 'Administrador',
    dueAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // En 7 días
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    title: 'Archivar documentos antiguos',
    description: 'Organizar y archivar documentación del año pasado',
    status: 'cerrada',
    priority: 'baja',
    area: 'juridica',
    department: 'juridica',
    assignedTo: 'operativo.juridica@todo.com',
    createdBy: 'admin',
    createdByName: 'Administrador',
    dueAt: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)), // Vencida hace 10 días (pero completada)
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    title: 'Llamar a proveedor urgente',
    description: 'Contactar con el proveedor para renovar contrato',
    status: 'pendiente',
    priority: 'alta',
    area: 'juridica',
    department: 'juridica',
    assignedTo: 'lopez@gmail.com',
    createdBy: 'admin',
    createdByName: 'Administrador',
    dueAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // Vencida ayer
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

async function createTasks() {
  console.log('\n🔥 Creando tareas de prueba...\n');
  
  for (const task of tasks) {
    try {
      const docRef = await addDoc(collection(db, 'tasks'), task);
      console.log(`✅ "${task.title}"`);
      console.log(`   Asignada a: ${task.assignedTo}`);
      console.log(`   Estado: ${task.status}`);
      console.log(`   Prioridad: ${task.priority}`);
      console.log(`   ID: ${docRef.id}\n`);
    } catch (error) {
      console.error(`❌ Error creando "${task.title}":`, error.message);
    }
  }
  
  console.log('✨ Tareas creadas exitosamente\n');
  process.exit(0);
}

createTasks();
