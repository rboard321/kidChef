import { httpsCallable } from 'firebase/functions';
import { functions, auth } from './firebase';
import type { Recipe } from '../types';

export interface RecipeImportService {
  importFromUrl: (url: string, options?: ImportOptions) => Promise<ImportResult>;
  validateUrl: (url: string) => boolean;
}

export interface ImportOptions {
  maxRetries?: number;
  onProgress?: (status: ImportStatus) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface ImportResult {
  success: boolean;
  recipe?: Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  error?: ImportError;
  fromFallback?: boolean;
}

export interface ImportError {
  code: string;
  message: string;
  suggestion?: string;
  canRetry: boolean;
  allowManualEdit?: boolean;
}

export enum ImportStatus {
  VALIDATING = 'validating',
  FETCHING = 'fetching',
  PARSING = 'parsing',
  VALIDATING_CONTENT = 'validating_content',
  COMPLETE = 'complete',
  ERROR = 'error'
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

  async importFromUrl(url: string, options: ImportOptions = {}): Promise<ImportResult> {
    const { maxRetries = 3, onProgress, onRetry } = options;

    // Validate URL first
    onProgress?.(ImportStatus.VALIDATING);

    if (!this.validateUrl(url)) {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Please enter a valid recipe URL starting with http:// or https://',
          suggestion: 'Make sure the URL is complete and points to a recipe page',
          canRetry: false,
          allowManualEdit: true
        }
      };
    }

    // Try secure import with retry logic
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        onProgress?.(ImportStatus.FETCHING);

        console.log('Calling importRecipeSecure with URL:', url);
        console.log('Current auth user:', auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : 'null');

        // Check if user is authenticated
        if (!auth.currentUser) {
          throw new Error('User not authenticated');
        }

        // Get fresh auth token to ensure we're authenticated
        const token = await auth.currentUser.getIdToken(true); // Force refresh
        console.log('Got auth token:', token ? 'present' : 'null');
        console.log('Token preview:', token ? token.substring(0, 50) + '...' : 'null');

        // Use HTTP endpoint that properly handles React Native auth
        const functionUrl = 'https://us-central1-kidchef.cloudfunctions.net/importRecipeHttp';

        console.log('Calling importRecipeHttp via HTTP with proper auth...');

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        console.log('Request headers:', {
          'Content-Type': headers['Content-Type'],
          'Authorization': headers.Authorization ? headers.Authorization.substring(0, 20) + '...' : 'null'
        });

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url })
        });

        console.log('HTTP response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.log('HTTP error response:', errorData);
          const message = errorData.message || errorData.error || `HTTP ${response.status}`;
          const httpError = new Error(message) as Error & { code?: string };
          if (errorData.code) {
            httpError.code = errorData.code;
          }
          throw httpError;
        }

        const result = await response.json();
        console.log('HTTP result:', result);

        if (result.success) {
          onProgress?.(ImportStatus.COMPLETE);

          return {
            success: true,
            recipe: result.recipe
          };
        } else {
          throw new Error(result.error || 'Import failed');
        }

      } catch (error: any) {
        console.error(`Import attempt ${attempt} failed:`, error);

        const importError = this.parseError(error);

        // Don't retry for certain error types
        if (!importError.canRetry || attempt === maxRetries) {
          onProgress?.(ImportStatus.ERROR);

          return {
            success: false,
            error: importError
          };
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          onRetry?.(attempt, error);
          await this.delay(delay);
        }
      }
    }

    // This should never be reached, but just in case
    return {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: 'Failed to import recipe after multiple attempts',
        suggestion: 'Please try again later or use manual entry',
        canRetry: true,
        allowManualEdit: true
      }
    };
  },

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  parseError(error: any): ImportError {
    const message = error?.message || error?.toString() || 'Unknown error';

    // Parse Firebase Functions errors
    if (error?.code) {
      switch (error.code) {
        case 'unauthenticated':
          return {
            code: 'UNAUTHENTICATED',
            message: 'Please log in to import recipes',
            canRetry: false
          };

        case 'resource-exhausted':
          return {
            code: 'RATE_LIMITED',
            message: 'You\'ve reached your daily import limit',
            suggestion: 'Try again tomorrow or upgrade to premium',
            canRetry: false
          };

        case 'invalid-argument':
          if (message.includes('No recipe data found')) {
            return {
              code: 'NO_RECIPE_FOUND',
              message: 'No recipe found on this page',
              suggestion: 'Make sure the URL points to a recipe page, not a blog post or search results',
              canRetry: false,
              allowManualEdit: true
            };
          }

          if (message.includes('Missing instructions')) {
            return {
              code: 'MISSING_INSTRUCTIONS',
              message: 'This website did not provide recipe steps',
              suggestion: 'Try a different recipe URL or enter the recipe manually',
              canRetry: false,
              allowManualEdit: true
            };
          }

          if (message.includes('Missing ingredients')) {
            return {
              code: 'MISSING_INGREDIENTS',
              message: 'This website did not provide ingredients',
              suggestion: 'Try a different recipe URL or enter the recipe manually',
              canRetry: false,
              allowManualEdit: true
            };
          }


          return {
            code: 'INVALID_RECIPE',
            message: message,
            canRetry: false,
            allowManualEdit: true
          };

        case 'not-found':
          return {
            code: 'PAGE_NOT_FOUND',
            message: 'Recipe page not found',
            suggestion: 'Check that the URL is correct and the page exists',
            canRetry: false
          };

        case 'deadline-exceeded':
          return {
            code: 'TIMEOUT',
            message: 'Import timed out - the website may be slow',
            suggestion: 'Try again in a few minutes',
            canRetry: true
          };

        default:
          return {
            code: 'UNKNOWN_ERROR',
            message: message,
            canRetry: true,
            allowManualEdit: true
          };
      }
    }

    // Parse network errors
    if (message.includes('Network Error') || message.includes('ENOTFOUND')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error - check your internet connection',
        suggestion: 'Make sure you\'re connected to the internet and try again',
        canRetry: true
      };
    }

    // Default error
    return {
      code: 'IMPORT_FAILED',
      message: 'Failed to import recipe',
      suggestion: 'Please try again or enter the recipe manually',
      canRetry: true,
      allowManualEdit: true
    };
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
