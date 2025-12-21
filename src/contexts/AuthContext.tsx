import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/auth';
import { parentProfileService } from '../services/parentProfile';
import { kidProfileService } from '../services/kidProfile';
import { migrationService } from '../services/migration';
import type { UserProfile, ParentProfile, KidProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null; // Legacy profile for backward compatibility
  parentProfile: ParentProfile | null; // Enhanced parent profile
  kidProfiles: KidProfile[]; // All kids for this parent
  currentKid: KidProfile | null; // Currently selected kid
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateParentProfile: (updates: Partial<ParentProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  selectKid: (kidId: string | null) => void;
  addKid: (kidData: Omit<KidProfile, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateKid: (kidId: string, updates: Partial<KidProfile>) => Promise<void>;
  removeKid: (kidId: string) => Promise<void>;
  checkAndRunMigration: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const [kidProfiles, setKidProfiles] = useState<KidProfile[]>([]);
  const [currentKid, setCurrentKid] = useState<KidProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (user: User) => {
    try {
      // Load legacy profile for backward compatibility
      const profile = await authService.getUserProfile(user.uid);
      setUserProfile(profile);

      // Load or migrate to new multi-kid system
      let parent = await parentProfileService.getParentProfile(user.uid);

      if (!parent) {
        // Check if migration is needed
        const migrationNeeded = await migrationService.checkMigrationNeeded(user.uid);
        if (migrationNeeded) {
          console.log('Migrating user to multi-kid system...');
          const { parentId } = await migrationService.migrateUserToMultiKid(user.uid);
          parent = await parentProfileService.getParentProfile(user.uid);
        }
      }

      setParentProfile(parent);

      // Load kids if parent profile exists
      if (parent) {
        const kids = await kidProfileService.getParentKids(parent.id);
        setKidProfiles(kids);

        // Set first kid as current if none selected
        if (kids.length > 0 && !currentKid) {
          setCurrentKid(kids[0]);
        }
      } else {
        setKidProfiles([]);
        setCurrentKid(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setUser(user);

      if (user) {
        await loadUserProfile(user);
      } else {
        setUserProfile(null);
        setParentProfile(null);
        setKidProfiles([]);
        setCurrentKid(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.signIn(email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, profile: Partial<UserProfile>) => {
    setLoading(true);
    try {
      await authService.signUp(email, password, profile);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      await authService.updateUserProfile(user.uid, updates);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const updateParentProfile = async (updates: Partial<ParentProfile>) => {
    if (!parentProfile) throw new Error('No parent profile found');

    try {
      await parentProfileService.updateParentProfile(parentProfile.id, updates);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating parent profile:', error);
      throw error;
    }
  };

  const selectKid = (kidId: string | null) => {
    if (kidId) {
      const kid = kidProfiles.find(k => k.id === kidId);
      setCurrentKid(kid || null);
    } else {
      setCurrentKid(null);
    }
  };

  const addKid = async (kidData: Omit<KidProfile, 'id' | 'parentId' | 'createdAt' | 'updatedAt'>) => {
    if (!parentProfile) throw new Error('No parent profile found');

    try {
      const kidId = await kidProfileService.createKidProfile(parentProfile.id, kidData);
      await parentProfileService.addKidToParent(parentProfile.id, kidId);
      await refreshProfile();
      return kidId;
    } catch (error) {
      console.error('Error adding kid:', error);
      throw error;
    }
  };

  const updateKid = async (kidId: string, updates: Partial<KidProfile>) => {
    try {
      await kidProfileService.updateKidProfile(kidId, updates);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating kid:', error);
      throw error;
    }
  };

  const removeKid = async (kidId: string) => {
    if (!parentProfile) throw new Error('No parent profile found');

    try {
      await kidProfileService.deleteKidProfile(kidId);
      await parentProfileService.removeKidFromParent(parentProfile.id, kidId);

      // Clear current kid if it was the one being removed
      if (currentKid?.id === kidId) {
        setCurrentKid(null);
      }

      await refreshProfile();
    } catch (error) {
      console.error('Error removing kid:', error);
      throw error;
    }
  };

  const checkAndRunMigration = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const migrationNeeded = await migrationService.checkMigrationNeeded(user.uid);
      if (migrationNeeded) {
        await migrationService.migrateUserToMultiKid(user.uid);
        await refreshProfile();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    parentProfile,
    kidProfiles,
    currentKid,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updateParentProfile,
    refreshProfile,
    selectKid,
    addKid,
    updateKid,
    removeKid,
    checkAndRunMigration,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };