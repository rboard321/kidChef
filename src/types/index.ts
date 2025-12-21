// User Profile Types
export interface UserProfile {
  id: string;
  parentName: string;
  kidName: string;
  kidAge: number;
  readingLevel: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
}

export interface UserSettings {
  safetyNotes: boolean;
  readAloud: boolean;
  autoSimplify: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// Recipe Types
export interface Recipe {
  id: string;
  userId: string;
  title: string;
  url?: string;
  image?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  notes?: string;
  order: number;
}

export interface RecipeStep {
  id: string;
  step: string;
  order: number;
  temperature?: string;
  time?: string;
}

// Kid-Friendly Recipe Types
export interface KidRecipe {
  id: string;
  originalRecipeId: string;
  userId: string;
  kidAge: number;
  simplifiedIngredients: KidIngredient[];
  simplifiedSteps: KidStep[];
  safetyNotes: string[];
  createdAt: Date;
}

export interface KidIngredient {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  kidFriendlyName: string;
  description?: string;
  order: number;
}

export interface KidStep {
  id: string;
  step: string;
  kidFriendlyText: string;
  icon?: string;
  safetyNote?: string;
  time?: string;
  order: number;
  completed: boolean;
}

// Navigation Types
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  RecipeDetail: { recipeId: string };
  KidRecipeDetail: { kidRecipeId: string };
  CookingMode: { kidRecipeId: string };
};

export type ParentTabParamList = {
  Home: undefined;
  Import: undefined;
  Settings: undefined;
};

export type KidTabParamList = {
  Recipes: undefined;
  Cooking: undefined;
  Parent: undefined;
};

// App State Types
export interface AppState {
  isFirstLaunch: boolean;
  currentMode: 'parent' | 'kid';
  user: UserProfile | null;
  settings: UserSettings;
}

// API Types
export interface ScrapedRecipe {
  title: string;
  image?: string;
  ingredients: string[];
  steps: string[];
  servings?: number;
  prepTime?: number;
  cookTime?: number;
}

export interface KidConversionRequest {
  recipe: Recipe;
  kidAge: number;
  readingLevel: string;
  includeSafetyNotes: boolean;
}

export interface KidConversionResponse {
  simplifiedIngredients: KidIngredient[];
  simplifiedSteps: KidStep[];
  safetyNotes: string[];
}