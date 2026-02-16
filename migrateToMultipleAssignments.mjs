// migrateToMultipleAssignments.mjs
// MIGRACIÓN: Convierte assignedTo de string a array
// Ejecuta: node migrateToMultipleAssignments.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, writeBatch, arrayUnion } from 'firebase/firestore';

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

async function migrateToMultipleAssignments() {
  console.log('\n🚀 Iniciando migración a asignaciones múltiples...\n');
  
  try {
    // 1. Obtener todas las tareas
    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);
    
    let migratedCount = 0;
    let skippedCount = 0;
    const tasks = [];
    
    // 2. Analizar tareas
    snapshot.forEach(doc => {
      const task = doc.data();
      tasks.push({ id: doc.id, ...task });
    });
    
    console.log(`📦 Total de tareas encontradas: ${tasks.length}\n`);
    
    if (tasks.length === 0) {
      console.log('✅ No hay tareas que migrar\n');
      process.exit(0);
    }
    
    // 3. Crear batch para actualizar
    let batch = writeBatch(db);
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore limita a 500 operaciones por batch
    
    for (const task of tasks) {
      try {
        const taskRef = doc(db, 'tasks', task.id);
        
        // Determinar si ya está migrada
        const isAlreadyMigrated = Array.isArray(task.assignedTo);
        
        if (isAlreadyMigrated) {
          console.log(`⏭️  ${task.title} - Ya está migrada`);
          skippedCount++;
          continue;
        }
        
        // Obtener nombre del usuario asignado (si existe)
        let assignedToName = 'Sin asignar';
        if (task.assignedTo && task.assignedTo !== 'sin_asignar') {
          try {
            const usersRef = collection(db, 'users');
            // Buscar el usuario para obtener su nombre
            const userSnapshot = await getDocs(usersRef);
            const user = userSnapshot.docs.find(doc => doc.data().email === task.assignedTo);
            if (user) {
              assignedToName = user.data().displayName || task.assignedTo;
            }
          } catch (userError) {
            assignedToName = task.assignedToName || task.assignedTo;
          }
        }
        
        // Construir estructura de asignatarios
        const assignments = task.assignedTo && task.assignedTo !== 'sin_asignar'
          ? [{
              email: task.assignedTo,
              name: assignedToName,
              status: task.status === 'completada' ? 'completada' : 'pendiente',
              completedAt: task.completedAt || null,
              assignedAt: task.createdAt || new Date()
            }]
          : [];
        
        // Actualizar documento
        batch.update(taskRef, {
          assignedTo: assignments.length > 0 ? [task.assignedTo] : [],
          assignedToNames: assignments.length > 0 ? [assignedToName] : [],
          assignments: assignments,
          progressPercentage: task.status === 'completada' ? 100 : 0,
          parentTaskId: null,
          // Preservar campos existentes
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueAt: task.dueAt,
          area: task.area,
          createdAt: task.createdAt,
          updatedAt: new Date(),
          createdBy: task.createdBy
        });
        
        batchCount++;
        console.log(`✅ ${task.title} - Preparada para migración (${batchCount})`);
        
        // Commit cada 500 documentos
        if (batchCount === MAX_BATCH_SIZE) {
          await batch.commit();
          console.log(`   📤 Batch enviado (${batchCount} tareas)\n`);
          batch = writeBatch(db);
          batchCount = 0;
          migratedCount += MAX_BATCH_SIZE;
        }
        
      } catch (taskError) {
        console.error(`   ❌ Error procesando ${task.title}:`, taskError.message);
      }
    }
    
    // Commit final
    if (batchCount > 0) {
      await batch.commit();
      migratedCount += batchCount;
      console.log(`\n📤 Batch final enviado (${batchCount} tareas)`);
    }
    
    console.log(`\n✅ MIGRACIÓN COMPLETADA`);
    console.log(`   ✅ Migradas: ${migratedCount}`);
    console.log(`   ⏭️  Ya estaban migradas: ${skippedCount}`);
    console.log(`   📊 Total procesadas: ${migratedCount + skippedCount}\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error en migración:', error.message);
    process.exit(1);
  }
}

// Ejecutar
migrateToMultipleAssignments();
