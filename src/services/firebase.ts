import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config with validation
const getFirebaseConfig = () => {
  // In a production app, you might want to get these from a secure config service
  // For now, keeping them here since Firebase client keys are safe to expose
  const config = {
    apiKey: "AIzaSyDTcvNJbdVkoICXZwg78Sh9lIks4j_XWvo",
    authDomain: "kidchef.firebaseapp.com",
    projectId: "kidchef",
    storageBucket: "kidchef.firebasestorage.app",
    messagingSenderId: "198273265652",
    appId: "1:198273265652:web:4a10431ff054f49e0fd3a1"
  };

  // Validate required config values
  if (!config.apiKey || !config.projectId || !config.authDomain) {
    throw new Error('Firebase configuration is incomplete. Missing required fields.');
  }

  return config;
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase with error handling
let app: any;
let auth: any;
let db: any;
let functions: any;
let storage: any;

try {
  app = initializeApp(firebaseConfig);

  // Initialize Firebase services with error handling
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

  db = getFirestore(app);
  functions = getFunctions(app, 'us-central1');
  storage = getStorage(app);

  // Dev-only logging
  if (__DEV__) {
    console.log('Firebase app initialized:', app.name);
    console.log('Functions region:', 'us-central1');
    console.log('Auth persistence configured for React Native');
  }

} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  throw new Error('Firebase initialization failed. Check configuration and network connection.');
}

// Set up auth state listener with security logging
onAuthStateChanged(auth, (user) => {
  if (!__DEV__) return;
  if (user) {
    console.log('Auth state changed:', {
      uid: user.uid,
      timestamp: new Date().toISOString()
    });
  } else {
    console.log('User signed out');
  }
});

// Export services with validation
export { auth, db, functions, storage };

export default app;
