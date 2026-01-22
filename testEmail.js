// testEmail.js
// Script para probar el sistema de notificaciones por email
// Ejecutar con: node testEmail.js

import { notifyTaskAssigned, notifyTaskDueSoon, notifyNewChatMessage, sendDailySummary } from './services/emailNotifications.js';

// ⚠️ CONFIGURA TU EMAIL AQUÍ
const TEST_EMAIL = 'tu.email@gmail.com'; // 👈 Cambia esto por tu email real

console.log('🧪 Iniciando pruebas de email...\n');

// Test 1: Notificación de tarea asignada
async function testTaskAssigned() {
  console.log('📧 Test 1: Nueva tarea asignada');
  
  const testTask = {
    id: 'test-001',
    title: 'Tarea de Prueba - Asignación',
    description: 'Esta es una prueba del sistema de notificaciones por email',
    priority: 'alta',
    dueAt: Date.now() + 86400000, // Mañana
    assignedTo: TEST_EMAIL,
    assignedToName: 'Usuario de Prueba',
    assignedBy: 'admin@test.com',
    assignedByName: 'Administrador'
  };
  
  await notifyTaskAssigned(testTask);
  console.log('✅ Email de tarea asignada enviado\n');
}

// Test 2: Notificación de tarea por vencer
async function testTaskDueSoon() {
  console.log('⏰ Test 2: Tarea por vencer');
  
  const testTask = {
    id: 'test-002',
    title: 'Tarea Urgente - Por Vencer',
    description: 'Esta tarea vence en pocas horas',
    priority: 'alta',
    dueAt: Date.now() + 3600000, // En 1 hora
    assignedTo: TEST_EMAIL,
    assignedToName: 'Usuario de Prueba'
  };
  
  await notifyTaskDueSoon(testTask);
  console.log('✅ Email de tarea por vencer enviado\n');
}

// Test 3: Notificación de nuevo mensaje en chat
async function testChatMessage() {
  console.log('💬 Test 3: Nuevo mensaje en chat');
  
  const testTask = {
    id: 'test-003',
    title: 'Proyecto X - Desarrollo',
    assignedTo: TEST_EMAIL,
    assignedToName: 'Usuario de Prueba'
  };
  
  const testMessage = {
    text: '¡Hola! Este es un mensaje de prueba del sistema de chat.',
    authorName: 'Colega de Prueba'
  };
  
  await notifyNewChatMessage(testTask, testMessage);
  console.log('✅ Email de nuevo mensaje enviado\n');
}

// Test 4: Resumen diario
async function testDailySummary() {
  console.log('📊 Test 4: Resumen diario');
  
  const mockStats = {
    overdue: [
      {
        title: 'Tarea Vencida 1',
        dueAt: Date.now() - 86400000,
        priority: 'alta'
      }
    ],
    dueToday: [
      {
        title: 'Tarea del Día 1',
        dueAt: Date.now(),
        priority: 'media'
      },
      {
        title: 'Tarea del Día 2',
        dueAt: Date.now() + 3600000,
        priority: 'baja'
      }
    ],
    dueSoon: [
      {
        title: 'Tarea Próxima',
        dueAt: Date.now() + 172800000,
        priority: 'media'
      }
    ],
    completed: 5
  };
  
  await sendDailySummary(TEST_EMAIL, 'Usuario de Prueba', mockStats);
  console.log('✅ Email de resumen diario enviado\n');
}

// Ejecutar todas las pruebas
async function runAllTests() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (TEST_EMAIL === 'tu.email@gmail.com') {
      console.error('❌ ERROR: Debes configurar tu email en TEST_EMAIL antes de ejecutar las pruebas');
      console.log('\nAbre testEmail.js y cambia:');
      console.log('const TEST_EMAIL = \'tu.email@gmail.com\';');
      console.log('por tu email real.\n');
      return;
    }
    
    await testTaskAssigned();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s entre emails
    
    await testTaskDueSoon();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testChatMessage();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testDailySummary();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Todas las pruebas completadas');
    console.log(`\n📬 Revisa tu bandeja de entrada: ${TEST_EMAIL}`);
    console.log('   (También verifica la carpeta de SPAM)\n');
    console.log('Si no recibes los emails:');
    console.log('1. Verifica que SENDGRID_API_KEY esté configurado en emailNotifications.js');
    console.log('2. Verifica que FROM_EMAIL esté verificado en SendGrid');
    console.log('3. Revisa los logs de SendGrid en: https://app.sendgrid.com/email_activity\n');
    
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error);
    console.log('\nPosibles causas:');
    console.log('• SENDGRID_API_KEY no configurado o inválido');
    console.log('• FROM_EMAIL no verificado en SendGrid');
    console.log('• Error de red o límite de emails alcanzado\n');
  }
}

// Ejecutar
runAllTests();
