import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserProfile } from '../types';

export interface AuthService {
  signUp: (email: string, password: string, profile: Partial<UserProfile>) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
  getUserProfile: (userId: string) => Promise<UserProfile | null>;
  updateUserProfile: (userId: string, profile: Partial<UserProfile>) => Promise<void>;
}

export const authService: AuthService = {
  async signUp(email: string, password: string, profile: Partial<UserProfile>) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      id: user.uid,
      parentName: profile.parentName || '',
      kidName: profile.kidName || '',
      kidAge: profile.kidAge || 6,
      readingLevel: profile.readingLevel || 'beginner',
      email: user.email || email,
      createdAt: new Date(),
      ...profile
    };

    await setDoc(doc(db, 'userProfiles', user.uid), userProfile);
    return user;
  },

  async signIn(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  async signOut() {
    await signOut(auth);
  },

  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docSnap = await getDoc(doc(db, 'userProfiles', userId));
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  async updateUserProfile(userId: string, profile: Partial<UserProfile>) {
    try {
      await setDoc(doc(db, 'userProfiles', userId), profile, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },
};