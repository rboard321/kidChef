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
import { cacheService } from './cacheService';
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

      // Invalidate user's recipe list cache since we added a new recipe
      cacheService.invalidateRecipes(userId);

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

      // Invalidate both the recipe detail and the user's recipe list cache
      cacheService.invalidateRecipeDetail(recipeId);
      if (updates.userId) {
        cacheService.invalidateRecipes(updates.userId);
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  },

  async deleteRecipe(recipeId: string) {
    try {
      // First get the recipe to find the userId for cache invalidation
      const recipeToDelete = await this.getRecipe(recipeId);

      await deleteDoc(doc(db, 'recipes', recipeId));

      // Invalidate both the recipe detail cache and the user's recipe list cache
      cacheService.invalidateRecipeDetail(recipeId);
      if (recipeToDelete?.userId) {
        cacheService.invalidateRecipes(recipeToDelete.userId);
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  },

  async getUserRecipes(userId: string): Promise<Recipe[]> {
    try {
      // Check cache first
      const cached = cacheService.getRecipes(userId);
      if (cached) {
        console.log('Returning cached recipes for user:', userId);
        return cached;
      }

      console.log('Cache miss - fetching recipes from Firestore for user:', userId);

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
      const sortedRecipes = recipes.sort((a, b) => {
        // Handle both Date objects and Firestore Timestamps
        const aTime = a.updatedAt ? (a.updatedAt instanceof Date ? a.updatedAt.getTime() : a.updatedAt.toMillis()) : 0;
        const bTime = b.updatedAt ? (b.updatedAt instanceof Date ? b.updatedAt.getTime() : b.updatedAt.toMillis()) : 0;
        return bTime - aTime;
      });

      // Cache the results
      cacheService.setRecipes(userId, sortedRecipes);

      return sortedRecipes;
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      throw error;
    }
  },

  async getRecipe(recipeId: string): Promise<Recipe | null> {
    try {
      // Check cache first
      const cached = cacheService.getRecipeDetail(recipeId);
      if (cached) {
        console.log('Returning cached recipe detail for:', recipeId);
        return cached;
      }

      console.log('Cache miss - fetching recipe from Firestore:', recipeId);

      const docSnap = await getDoc(doc(db, 'recipes', recipeId));
      if (docSnap.exists()) {
        const recipe = {
          id: docSnap.id,
          ...docSnap.data(),
        } as Recipe;

        // Cache the result
        cacheService.setRecipeDetail(recipeId, recipe);

        return recipe;
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