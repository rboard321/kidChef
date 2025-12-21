import type { Timestamp } from 'firebase/firestore';

// Common Types
export type ReadingLevel = 'beginner' | 'intermediate' | 'advanced';

// Date types that handle both Date objects and Firestore Timestamps
type FirestoreDate = Date | Timestamp;

// User Profile Types (Legacy - maintained for backward compatibility)
export interface UserProfile {
  id: string;
  parentName: string;
  kidName: string;
  kidAge: number;
  readingLevel: ReadingLevel;
  email?: string;
  settings?: UserSettings;
  familyName?: string;
  createdAt: FirestoreDate;
}

// Enhanced Multi-Kid Profile Types
export interface ParentProfile {
  id: string;
  userId: string; // Firebase Auth UID
  familyName: string;
  parentName: string;
  email: string;
  settings: UserSettings;
  kidIds: string[]; // References to KidProfile documents
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface KidProfile {
  id: string;
  parentId: string; // Reference to ParentProfile
  name: string;
  age: number;
  readingLevel: ReadingLevel;
  allergyFlags: string[]; // e.g., ['nuts', 'dairy', 'eggs']
  permissions: KidPermissions;
  avatarEmoji?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface KidPermissions {
  canViewIngredients: boolean;
  canUseKnives: boolean;
  canUseStove: boolean;
  canUseOven: boolean;
  requiresAdultHelp: boolean;
  maxCookingTimeMinutes: number;
}

export interface UserSettings {
  safetyNotes: boolean;
  readAloud: boolean;
  autoSimplify: boolean;
  fontSize: 'small' | 'medium' | 'large';
  temperatureUnit: 'fahrenheit' | 'celsius';
  language: string; // ISO language code
  showDifficulty: boolean;
  enableVoiceInstructions: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// Enhanced Recipe Types
export interface Recipe {
  id: string;
  userId: string; // Legacy field for backward compatibility
  parentId?: string; // New field linking to ParentProfile
  title: string;
  description?: string;
  url?: string;
  image?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  ingredients: Ingredient[];
  steps: RecipeStep[];
  instructions?: string[]; // Legacy field for backward compatibility
  allergens?: string[]; // Common allergens in this recipe
  equipment?: string[]; // Required cooking equipment
  tags?: string[]; // Custom tags for organization
  nutritionInfo?: NutritionInfo;
  kidVersionId?: string; // Reference to simplified version
  isFavorite?: boolean;
  lastCooked?: FirestoreDate;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface Ingredient {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  notes?: string;
  order: number;
  allergens?: string[]; // Allergens in this specific ingredient
  isOptional?: boolean;
  substitutions?: string[]; // Alternative ingredients
}

export interface RecipeStep {
  id: string;
  step: string;
  order: number;
  temperature?: string;
  time?: string;
  equipment?: string[]; // Equipment needed for this step
  safetyWarning?: string; // Safety notes for this step
  difficulty?: 'easy' | 'medium' | 'hard';
  requiresAdultSupervision?: boolean;
}

// Nutrition Information
export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
}

// Enhanced Kid-Friendly Recipe Types
export interface KidRecipe {
  id: string;
  originalRecipeId: string;
  userId: string; // Legacy field for backward compatibility
  parentId?: string; // New field linking to ParentProfile
  kidId?: string; // Specific kid this version was created for
  kidAge: number;
  targetReadingLevel: 'beginner' | 'intermediate' | 'advanced';
  simplifiedIngredients: KidIngredient[];
  simplifiedSteps: KidStep[];
  safetyNotes: string[];
  estimatedDuration?: number; // Total time including prep for kids
  skillsRequired?: string[]; // Skills this recipe helps develop
  createdAt: FirestoreDate;
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
  difficulty?: 'easy' | 'medium' | 'hard';
  encouragement?: string; // Motivational message for kids
  helpText?: string; // Additional guidance for this step
  visualAid?: string; // URL or description of visual help
}

// Multi-Kid Feature Types
export interface RecipeRecommendation {
  recipeId: string;
  score: number; // 0-100 compatibility score
  reasons: string[]; // Why this recipe is recommended
  adaptations?: string[]; // Suggested modifications
}

export interface CookingSession {
  id: string;
  kidId: string;
  recipeId: string;
  kidRecipeId?: string;
  startedAt: FirestoreDate;
  completedAt?: FirestoreDate;
  currentStep: number;
  totalSteps: number;
  notes?: string;
  rating?: number; // 1-5 stars
  photos?: string[]; // URLs to photos taken during cooking
}

export interface FamilyMeal {
  id: string;
  parentId: string;
  name: string;
  description?: string;
  scheduledFor: FirestoreDate;
  recipeIds: string[];
  assignedKids: string[]; // Which kids are helping
  status: 'planned' | 'in_progress' | 'completed';
  notes?: string;
}

// Enhanced Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  KidLevel: undefined;
  ParentSettings: { kidData?: { name: string; age: number; readingLevel: 'beginner' | 'intermediate' | 'advanced' } };
  Main: undefined;
  RecipeDetail: { recipeId: string };
  RecipeView: { recipeId?: string };
  KidRecipeDetail: { kidRecipeId: string };
  CookingMode: { kidRecipeId: string; kidId?: string };
  KidSelector: { recipeId: string };
  FamilyMeals: undefined;
  CookingHistory: { kidId?: string };
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