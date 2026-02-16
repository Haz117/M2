#!/usr/bin/env node
// Migration script: Convert assignedTo from string to array format
// This prepares existing tasks for the multiple assignees feature

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAZm72LB0RGqGlJ4hSZpLzC3CqV2A5fJK8",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "infra-sublime-464215-m5.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "infra-sublime-464215-m5",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "infra-sublime-464215-m5.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "637234852765",
  appId: process.env.FIREBASE_APP_ID || "1:637234852765:web:42af7a0a58c006dc2b92e1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateToMultipleAssignees() {
  console.log('Starting migration of tasks to multiple assignees...\n');
  
  try {
    const tasksRef = collection(db, 'tasks');
    const snapshot = await getDocs(tasksRef);
    
    let totalTasks = snapshot.size;
    let migratedTasks = 0;
    let skippedTasks = 0;
    let errorCount = 0;
    
    console.log(`Found ${totalTasks} tasks to process\n`);
    
    // Process in batches of 500 (Firestore limit)
    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_SIZE = 500;
    
    for (const docSnap of snapshot.docs) {
      const task = docSnap.data();
      
      // Skip if already migrated (assignedTo is already an array)
      if (Array.isArray(task.assignedTo)) {
        console.log(`⏭️  Skipping ${docSnap.id}: already migrated`);
        skippedTasks++;
        continue;
      }
      
      // Skip if no assignedTo field
      if (!task.assignedTo) {
        console.log(`⏭️  Skipping ${docSnap.id}: no assignedTo field`);
        skippedTasks++;
        continue;
      }
      
      try {
        // Convert string to array
        const newAssignedTo = [task.assignedTo.toLowerCase()];
        
        batch.update(doc(db, 'tasks', docSnap.id), {
          assignedTo: newAssignedTo
        });
        
        batchCount++;
        migratedTasks++;
        console.log(`✅ Task ${docSnap.id}: ${task.assignedTo} → ${JSON.stringify(newAssignedTo)}`);
        
        // Commit batch when reaching limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`   📦 Committed batch of ${batchCount} tasks\n`);
          batchCount = 0;
        }
      } catch (error) {
        console.error(`❌ Error processing task ${docSnap.id}:`, error.message);
        errorCount++;
      }
    }
    
    // Commit remaining tasks
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Committed final batch of ${batchCount} tasks\n`);
    }
    
    // Print summary
    console.log('=== Migration Summary ===');
    console.log(`Total tasks processed: ${totalTasks}`);
    console.log(`✅ Successfully migrated: ${migratedTasks}`);
    console.log(`⏭️  Skipped (already migrated or no assignedTo): ${skippedTasks}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\nMigration completed! Your tasks are now ready for multiple assignees.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during migration:', error.message);
    process.exit(1);
  }
}

migrateToMultipleAssignees();
