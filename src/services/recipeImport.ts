import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { Recipe } from '../types';

export interface RecipeImportService {
  importFromUrl: (url: string) => Promise<Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
  validateUrl: (url: string) => boolean;
}

interface ScrapedRecipe {
  title: string;
  description?: string;
  image?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  difficulty?: string;
  ingredients: string[];
  instructions: string[];
  sourceUrl: string;
  tags?: string[];
}

export const recipeImportService: RecipeImportService = {
  validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  },

  async importFromUrl(url: string): Promise<Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
    if (!this.validateUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    try {
      // Call Firebase Cloud Function for real recipe scraping
      const scrapeRecipe = httpsCallable(functions, 'scrapeRecipeV2');
      const result = await scrapeRecipe({ url });

      const scrapedRecipe = result.data.recipe as ScrapedRecipe;

      if (!scrapedRecipe.title || scrapedRecipe.ingredients.length === 0) {
        throw new Error('Unable to extract recipe data from this URL. Please try a different recipe website.');
      }

      // Convert scraped recipe to our Recipe format
      return this.convertScrapedRecipe(scrapedRecipe);

    } catch (error) {
      console.error('Error importing recipe:', error);

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Failed to import recipe. Please try again or check the URL.');
    }
  },

  convertScrapedRecipe(scraped: ScrapedRecipe): Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    return {
      title: scraped.title,
      description: scraped.description || '',
      image: scraped.image || this.getEmojiForRecipe(scraped.title),
      prepTime: scraped.prepTime || '',
      cookTime: scraped.cookTime || '',
      totalTime: scraped.totalTime || '',
      servings: scraped.servings || 4,
      difficulty: scraped.difficulty || this.inferDifficulty(scraped),
      ingredients: scraped.ingredients,
      instructions: scraped.instructions,
      sourceUrl: scraped.sourceUrl,
      tags: scraped.tags || this.extractTagsFromTitle(scraped.title),
      kidVersionId: null,
    };
  },

  getEmojiForRecipe(title: string): string {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('cookie')) return '🍪';
    if (lowerTitle.includes('cake') || lowerTitle.includes('cupcake')) return '🧁';
    if (lowerTitle.includes('pancake')) return '🥞';
    if (lowerTitle.includes('pasta') || lowerTitle.includes('spaghetti')) return '🍝';
    if (lowerTitle.includes('pizza')) return '🍕';
    if (lowerTitle.includes('burger')) return '🍔';
    if (lowerTitle.includes('salad')) return '🥗';
    if (lowerTitle.includes('soup')) return '🍲';
    if (lowerTitle.includes('chicken')) return '🍗';
    if (lowerTitle.includes('fish')) return '🐟';
    if (lowerTitle.includes('bread')) return '🍞';
    if (lowerTitle.includes('curry')) return '🍛';
    return '🍽️'; // Default
  },

  inferDifficulty(recipe: ScrapedRecipe): string {
    const instructionCount = recipe.instructions.length;
    const ingredientCount = recipe.ingredients.length;

    // Simple heuristic based on complexity indicators
    if (instructionCount <= 5 && ingredientCount <= 8) return 'Easy';
    if (instructionCount <= 10 && ingredientCount <= 15) return 'Medium';
    return 'Hard';
  },

  extractTagsFromTitle(title: string): string[] {
    const tags: string[] = [];

    // Extract common recipe types
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('cookie') || lowerTitle.includes('biscuit')) {
      tags.push('cookies', 'dessert', 'baking');
    }
    if (lowerTitle.includes('cake') || lowerTitle.includes('cupcake')) {
      tags.push('cake', 'dessert', 'baking');
    }
    if (lowerTitle.includes('pancake') || lowerTitle.includes('waffle')) {
      tags.push('breakfast', 'pancakes');
    }
    if (lowerTitle.includes('pasta') || lowerTitle.includes('spaghetti')) {
      tags.push('pasta', 'dinner', 'italian');
    }
    if (lowerTitle.includes('chicken')) {
      tags.push('chicken', 'protein', 'dinner');
    }
    if (lowerTitle.includes('salad')) {
      tags.push('salad', 'healthy', 'lunch');
    }
    if (lowerTitle.includes('soup')) {
      tags.push('soup', 'comfort food', 'dinner');
    }
    if (lowerTitle.includes('easy') || lowerTitle.includes('simple')) {
      tags.push('easy', 'quick');
    }
    if (lowerTitle.includes('curry')) {
      tags.push('curry', 'spicy', 'dinner', 'asian');
    }

    return [...new Set(tags)]; // Remove duplicates
  }
};