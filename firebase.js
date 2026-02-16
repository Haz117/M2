// firebase.js
// Configuración mínima para Firebase v9 modular + helper para Firestore
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Intentamos obtener valores inyectados por app.config.js (expo) o desde process.env
const extra = Constants.expoConfig?.extra || {};

// Configuración de Firebase
// NOTA: Para producción, configura estas variables en Vercel o tu hosting
const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "AIzaSyDNo2YzEqelUXBcMuSJq1n-eOKN5sHhGKM",
  authDomain: extra.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "infra-sublime-464215-m5.firebaseapp.com",
  projectId: extra.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "infra-sublime-464215-m5",
  storageBucket: extra.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "infra-sublime-464215-m5.firebasestorage.app",
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "205062729291",
  appId: extra.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "1:205062729291:web:da314180f361bf2a3367ce",
  measurementId: extra.FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || "G-T987W215LH"
};

if (!firebaseConfig.apiKey) {
  // Firebase no configurado
}

// Inicializar Firebase App (solo si no existe)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inicializar Analytics (solo en plataformas que lo soportan)
let analytics = null;
try {
  // Analytics solo funciona en plataformas nativas reales (no en web/expo-web)
  if (Platform.OS !== 'web') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.warn('Analytics no disponible en esta plataforma:', error.message);
  analytics = null;
}

// Inicializar Firestore
const db = getFirestore(app);

// Exportar app, db, analytics y serverTimestamp
export { app, db, analytics };

// Helper: timestamp de servidor (útil para operaciones y mensajes)
export const getServerTimestamp = () => serverTimestamp();
