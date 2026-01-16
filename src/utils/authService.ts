// Firebase Authentication Service
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { firestoreService } from './firestoreService';
import { User } from '@/types';

// Convert Firebase error codes to user-friendly messages
const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Contact support.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'An error occurred. Please try again.';
  }
};

export const authService = {
  // Sign up with email and password
  async signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        emailVerified: firebaseUser.emailVerified,
        profileComplete: false,
      };

      await firestoreService.createUserDocument(user);

      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: getErrorMessage(error.code) };
    }
  },

  // Login with email and password
  async login(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch user data from Firestore
      const userData = await firestoreService.getUserDocument(firebaseUser.uid);

      if (userData) {
        return { user: userData, error: null };
      }

      // If no Firestore document exists, create one
      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        emailVerified: firebaseUser.emailVerified,
        profileComplete: false,
      };

      await firestoreService.createUserDocument(user);
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: getErrorMessage(error.code) };
    }
  },

  // Logout
  async logout(): Promise<{ error: string | null }> {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error: any) {
      return { error: getErrorMessage(error.code) };
    }
  },

  // Send password reset email
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error: any) {
      return { error: getErrorMessage(error.code) };
    }
  },

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  // Subscribe to auth state changes
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  // Update user display name
  async updateDisplayName(displayName: string): Promise<{ error: string | null }> {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName });
      }
      return { error: null };
    } catch (error: any) {
      return { error: getErrorMessage(error.code) };
    }
  },
};
