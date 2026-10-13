import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

const AuthContext = createContext(null);

// Keys left behind by the old localStorage-only auth; removed on load.
const LEGACY_KEYS = ['upwork-ai-users-v1', 'upwork-ai-session-v1'];

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Allow popups and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase.',
  'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication settings.',
};

const toFriendlyError = (error) => new Error(ERROR_MESSAGES[error?.code] || error?.message || 'Something went wrong.');

const toSessionUser = (firebaseUser) => (firebaseUser ? {
  uid: firebaseUser.uid,
  name: firebaseUser.displayName || '',
  email: firebaseUser.email || '',
  photoURL: firebaseUser.photoURL || '',
} : null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));

    // Firebase persists the session itself and restores it here on reload.
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(toSessionUser(firebaseUser));
      setIsInitializing(false);
    });
  }, []);

  const register = async ({ name, email, password }) => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Please enter your name.');

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: cleanName });
      // onAuthStateChanged fired before the display name was set
      setUser(toSessionUser(credential.user));
    } catch (error) {
      throw toFriendlyError(error);
    }
  };

  const login = async ({ email, password }) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      throw toFriendlyError(error);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      throw toFriendlyError(error);
    }
  };

  const resetPassword = async (email) => {
    if (!email.trim()) throw new Error('Enter your email first, then click "Forgot password".');

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw toFriendlyError(error);
    }
  };

  const logout = () => signOut(auth);

  const value = {
    isAuthenticated: Boolean(user),
    isInitializing,
    login,
    loginWithGoogle,
    logout,
    register,
    resetPassword,
    user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
