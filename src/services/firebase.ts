import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDTcvNJbdVkoICXZwg78Sh9lIks4j_XWvo",
  authDomain: "kidchef.firebaseapp.com",
  projectId: "kidchef",
  storageBucket: "kidchef.firebasestorage.app",
  messagingSenderId: "198273265652",
  appId: "1:198273265652:web:4a10431ff054f49e0fd3a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);

// Debug Firebase configuration
console.log('Firebase app initialized:', app.name);
console.log('Functions region:', 'us-central1');
console.log('Auth persistence configured for React Native');

// Set up auth state listener to ensure functions are properly connected
onAuthStateChanged(auth, (user) => {
  console.log('Auth state changed:', user ? { uid: user.uid, email: user.email } : 'null');
});

export default app;