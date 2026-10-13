import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase web config is public by design (it ships in every browser bundle); access is
// controlled by Firebase Auth + authorized domains, not by hiding these values.
// VITE_FIREBASE_* env vars override them, e.g. for a different Firebase project.
const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyACjRFC4BQKQpCUFLUCX0f3dvZR-YC7wyU',
  authDomain: 'boostwork-469a4.firebaseapp.com',
  projectId: 'boostwork-469a4',
  storageBucket: 'boostwork-469a4.firebasestorage.app',
  messagingSenderId: '603614248775',
  appId: '1:603614248775:web:9b733705fab3e4d6ee1662',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_CONFIG.appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
