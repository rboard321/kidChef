import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Recipe, KidRecipe } from '../types';

export interface RecipeService {
  addRecipe: (userId: string, recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateRecipe: (recipeId: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  getUserRecipes: (userId: string) => Promise<Recipe[]>;
  getRecipe: (recipeId: string) => Promise<Recipe | null>;
  createKidFriendlyVersion: (recipeId: string, kidRecipe: Omit<KidRecipe, 'id' | 'createdAt'>) => Promise<string>;
  getKidRecipe: (kidRecipeId: string) => Promise<KidRecipe | null>;
}

export const recipeService: RecipeService = {
  async addRecipe(userId: string, recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const now = Timestamp.now();
      const recipeData: Omit<Recipe, 'id'> = {
        ...recipe,
        userId,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, 'recipes'), recipeData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding recipe:', error);
      throw error;
    }
  },

  async updateRecipe(recipeId: string, updates: Partial<Recipe>) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'recipes', recipeId), updateData);
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  },

  async deleteRecipe(recipeId: string) {
    try {
      await deleteDoc(doc(db, 'recipes', recipeId));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  },

  async getUserRecipes(userId: string): Promise<Recipe[]> {
    try {
      // Simplified query without orderBy to avoid index requirement temporarily
      const q = query(
        collection(db, 'recipes'),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const recipes: Recipe[] = [];

      querySnapshot.forEach((doc) => {
        recipes.push({
          id: doc.id,
          ...doc.data(),
        } as Recipe);
      });

      // Sort locally instead of using Firestore orderBy
      return recipes.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis() || 0;
        const bTime = b.updatedAt?.toMillis() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      throw error;
    }
  },

  async getRecipe(recipeId: string): Promise<Recipe | null> {
    try {
      const docSnap = await getDoc(doc(db, 'recipes', recipeId));
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Recipe;
      }
      return null;
    } catch (error) {
      console.error('Error fetching recipe:', error);
      return null;
    }
  },

  async createKidFriendlyVersion(recipeId: string, kidRecipe: Omit<KidRecipe, 'id' | 'createdAt'>) {
    try {
      const kidRecipeData: Omit<KidRecipe, 'id'> = {
        ...kidRecipe,
        originalRecipeId: recipeId,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'kidRecipes'), kidRecipeData);

      // Update the original recipe to reference the kid version
      await updateDoc(doc(db, 'recipes', recipeId), {
        kidVersionId: docRef.id,
        updatedAt: Timestamp.now(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating kid-friendly version:', error);
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
};