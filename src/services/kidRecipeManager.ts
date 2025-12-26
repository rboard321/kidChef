import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { aiService } from './aiService';
import type { Recipe, KidRecipe, ReadingLevel, KidProfile, KidRecipeCacheEntry } from '../types';

export interface KidRecipeManagerService {
  convertAndSaveRecipe: (originalRecipe: Recipe, kidId: string, readingLevel: ReadingLevel, kidAge?: number) => Promise<string>;
  getKidRecipe: (kidRecipeId: string) => Promise<KidRecipe | null>;
  getKidRecipeByOriginal: (originalRecipeId: string, kidId: string) => Promise<KidRecipe | null>;
  getKidRecipes: (kidId: string) => Promise<KidRecipe[]>;
  isRecipeAlreadyConverted: (originalRecipeId: string, kidId: string) => Promise<boolean>;
  deleteKidRecipe: (kidRecipeId: string) => Promise<void>;
  reconvertRecipe: (originalRecipe: Recipe, kidId: string, readingLevel: ReadingLevel, kidAge?: number) => Promise<string>;
  updateConversionCount: (kidRecipeId: string) => Promise<void>;
}

const stripUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) {
        result[key] = stripUndefined(entry);
      }
    }
    return result;
  }
  return value;
};

const normalizeUrl = (url: string): string => url.trim().toLowerCase().replace(/\/+$/, '');

const getAgeRangeForKid = (kidAge: number | undefined, readingLevel: ReadingLevel): string => {
  if (kidAge !== undefined) {
    if (kidAge <= 8) return '6-8';
    if (kidAge <= 12) return '9-12';
    return '12+';
  }
  switch (readingLevel) {
    case 'beginner': return '6-8';
    case 'intermediate': return '9-12';
    case 'advanced': return '12+';
    default: return '9-12';
  }
};

const hashString = (input: string): string => {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash >>>= 0;
  }
  return hash.toString(36);
};

const buildCacheKey = (sourceUrl: string, readingLevel: ReadingLevel, ageRange: string): string => {
  const normalized = normalizeUrl(sourceUrl);
  return `kid_recipe_${hashString(`${normalized}|${readingLevel}|${ageRange}`)}`;
};

export const kidRecipeManagerService: KidRecipeManagerService = {
  async convertAndSaveRecipe(originalRecipe: Recipe, kidId: string, readingLevel: ReadingLevel, kidAge?: number): Promise<string> {
    try {
      // Check if already converted
      const existingKidRecipe = await this.getKidRecipeByOriginal(originalRecipe.id, kidId);
      if (existingKidRecipe) {
        console.log('Recipe already converted for this kid');
        return existingKidRecipe.id;
      }

      const sourceUrl = (originalRecipe as { sourceUrl?: string }).sourceUrl || originalRecipe.url;
      const ageRange = sourceUrl ? getAgeRangeForKid(kidAge, readingLevel) : null;
      let convertedData: Omit<KidRecipe, 'id' | 'originalRecipeId' | 'createdAt'> | null = null;

      if (sourceUrl && ageRange) {
        const cacheKey = buildCacheKey(sourceUrl, readingLevel, ageRange);
        const cacheDoc = await getDoc(doc(db, 'kidRecipeCache', cacheKey));
        if (cacheDoc.exists()) {
          const cacheEntry = cacheDoc.data() as KidRecipeCacheEntry;
          convertedData = {
            userId: originalRecipe.userId || '',
            kidAge: cacheEntry.kidAge,
            targetReadingLevel: cacheEntry.readingLevel,
            simplifiedIngredients: cacheEntry.simplifiedIngredients,
            simplifiedSteps: cacheEntry.simplifiedSteps,
            safetyNotes: cacheEntry.safetyNotes,
            estimatedDuration: cacheEntry.estimatedDuration,
            skillsRequired: cacheEntry.skillsRequired,
          };
        }
      }

      if (!convertedData) {
        console.log(`Converting recipe "${originalRecipe.title}" for kid ${kidId} at ${readingLevel} level`);
        convertedData = await aiService.convertToKidFriendly(originalRecipe, readingLevel, kidAge);
        if (sourceUrl && ageRange) {
          const cacheKey = buildCacheKey(sourceUrl, readingLevel, ageRange);
          const now = Timestamp.now();
          const cacheEntry: KidRecipeCacheEntry = {
            sourceUrl,
            readingLevel,
            ageRange,
            kidAge: convertedData.kidAge,
            simplifiedIngredients: convertedData.simplifiedIngredients,
            simplifiedSteps: convertedData.simplifiedSteps,
            safetyNotes: convertedData.safetyNotes,
            estimatedDuration: convertedData.estimatedDuration,
            skillsRequired: convertedData.skillsRequired,
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(db, 'kidRecipeCache', cacheKey), stripUndefined(cacheEntry));
        }
      }

      const safeConvertedData = stripUndefined(convertedData) as Omit<KidRecipe, 'id' | 'originalRecipeId' | 'createdAt'>;

      // Create kid recipe object
      const kidRecipe: Omit<KidRecipe, 'id'> = {
        ...safeConvertedData,
        originalRecipeId: originalRecipe.id,
        kidId,
        createdAt: Timestamp.now(),
        conversionCount: 1,
        lastConvertedAt: Timestamp.now(),
        isActive: true,
      };

      // Save to database
      const docRef = await addDoc(collection(db, 'kidRecipes'), stripUndefined(kidRecipe));
      console.log('Kid recipe saved successfully with ID:', docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error converting and saving recipe:', error);
      throw error;
    }
  },

  async getKidRecipe(kidRecipeId: string): Promise<KidRecipe | null> {
    try {
      const docSnap = await getDoc(doc(db, 'kidRecipes', kidRecipeId));
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as KidRecipe;
      }
      return null;
    } catch (error) {
      console.error('Error fetching kid recipe:', error);
      return null;
    }
  },

  async getKidRecipeByOriginal(originalRecipeId: string, kidId: string): Promise<KidRecipe | null> {
    try {
      const q = query(
        collection(db, 'kidRecipes'),
        where('originalRecipeId', '==', originalRecipeId),
        where('kidId', '==', kidId),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
        } as KidRecipe;
      }
      return null;
    } catch (error) {
      console.error('Error fetching kid recipe by original:', error);
      return null;
    }
  },

  async getKidRecipes(kidId: string): Promise<KidRecipe[]> {
    try {
      const q = query(
        collection(db, 'kidRecipes'),
        where('kidId', '==', kidId),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const kidRecipes: KidRecipe[] = [];

      querySnapshot.forEach((doc) => {
        kidRecipes.push({
          id: doc.id,
          ...doc.data(),
        } as KidRecipe);
      });

      return kidRecipes.sort((a, b) => {
        const aTime = a.createdAt ? (a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt.toMillis()) : 0;
        const bTime = b.createdAt ? (b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt.toMillis()) : 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error fetching kid recipes:', error);
      return [];
    }
  },

  async isRecipeAlreadyConverted(originalRecipeId: string, kidId: string): Promise<boolean> {
    try {
      const existingRecipe = await this.getKidRecipeByOriginal(originalRecipeId, kidId);
      return existingRecipe !== null;
    } catch (error) {
      console.error('Error checking if recipe is converted:', error);
      return false;
    }
  },

  async deleteKidRecipe(kidRecipeId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'kidRecipes', kidRecipeId));
      console.log('Kid recipe deleted successfully');
    } catch (error) {
      console.error('Error deleting kid recipe:', error);
      throw error;
    }
  },

  async reconvertRecipe(originalRecipe: Recipe, kidId: string, readingLevel: ReadingLevel, kidAge?: number): Promise<string> {
    try {
      // Mark existing version as inactive
      const existingKidRecipe = await this.getKidRecipeByOriginal(originalRecipe.id, kidId);
      if (existingKidRecipe) {
        await updateDoc(doc(db, 'kidRecipes', existingKidRecipe.id), {
          isActive: false,
          deactivatedAt: Timestamp.now(),
        });
      }

      // Create new conversion
      return await this.convertAndSaveRecipe(originalRecipe, kidId, readingLevel, kidAge);
    } catch (error) {
      console.error('Error reconverting recipe:', error);
      throw error;
    }
  },

  async updateConversionCount(kidRecipeId: string): Promise<void> {
    try {
      const kidRecipeRef = doc(db, 'kidRecipes', kidRecipeId);
      const kidRecipeDoc = await getDoc(kidRecipeRef);

      if (kidRecipeDoc.exists()) {
        const currentCount = kidRecipeDoc.data().conversionCount || 0;
        await updateDoc(kidRecipeRef, {
          conversionCount: currentCount + 1,
          lastConvertedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error updating conversion count:', error);
      throw error;
    }
  },
};

// Helper interface for extended KidRecipe with conversion tracking
export interface ExtendedKidRecipe extends KidRecipe {
  conversionCount: number;
  lastConvertedAt: Date;
  isActive: boolean;
  deactivatedAt?: Date;
}
