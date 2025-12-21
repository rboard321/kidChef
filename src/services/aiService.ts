import type { Recipe, KidRecipe, ReadingLevel } from '../types';

export interface AIService {
  convertToKidFriendly: (recipe: Recipe, readingLevel: ReadingLevel) => Promise<Omit<KidRecipe, 'id' | 'originalRecipeId' | 'createdAt'>>;
}

interface KidFriendlyConversionRequest {
  recipe: Recipe;
  readingLevel: ReadingLevel;
  ageRange: string;
  safetyNotes: boolean;
}

export const aiService: AIService = {
  async convertToKidFriendly(recipe: Recipe, readingLevel: ReadingLevel): Promise<Omit<KidRecipe, 'id' | 'originalRecipeId' | 'createdAt'>> {
    try {
      // For now, we'll use a mock implementation
      // In production, this would call OpenAI, Claude, or another AI service
      return await mockKidFriendlyConversion({ recipe, readingLevel, ageRange: getAgeRangeForLevel(readingLevel), safetyNotes: true });
    } catch (error) {
      console.error('Error converting recipe to kid-friendly:', error);
      throw new Error('Failed to convert recipe. Please try again.');
    }
  }
};

function getAgeRangeForLevel(level: ReadingLevel): string {
  switch (level) {
    case 'beginner': return '6-8';
    case 'intermediate': return '9-12';
    case 'advanced': return '12+';
    default: return '9-12';
  }
}

// Mock implementation - replace with actual AI service call
async function mockKidFriendlyConversion(request: KidFriendlyConversionRequest): Promise<Omit<KidRecipe, 'id' | 'originalRecipeId' | 'createdAt'>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 3000));

  const { recipe, readingLevel } = request;

  // Simplify ingredients based on reading level
  const simplifiedIngredients = simplifyIngredients(recipe.ingredients, readingLevel);

  // Simplify instructions based on reading level
  const simplifiedInstructions = simplifyInstructions(recipe.instructions, readingLevel);

  // Add safety notes
  const safetyNotes = generateSafetyNotes(recipe, readingLevel);

  // Create kid-friendly steps
  const steps = createKidFriendlySteps(simplifiedInstructions, readingLevel);

  return {
    title: simplifyTitle(recipe.title, readingLevel),
    description: simplifyDescription(recipe.description, readingLevel),
    image: recipe.image,
    readingLevel,
    ageRange: getAgeRangeForLevel(readingLevel),
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    ingredients: simplifiedIngredients,
    steps,
    safetyNotes,
    encouragements: generateEncouragements(readingLevel),
    difficulty: mapDifficultyForKids(recipe.difficulty || 'Medium', readingLevel),
  };
}

function simplifyTitle(title: string, level: ReadingLevel): string {
  switch (level) {
    case 'beginner':
      return title.replace(/Classic|Traditional|Perfect|Amazing|Delicious/gi, '')
        .replace(/\b\w+ly\b/g, '') // Remove adverbs
        .trim();
    case 'intermediate':
      return title.replace(/Classic|Traditional/gi, '').trim();
    default:
      return title;
  }
}

function simplifyDescription(description: string, level: ReadingLevel): string {
  if (level === 'beginner') {
    return 'A yummy recipe that\'s fun to make!';
  } else if (level === 'intermediate') {
    return description.split('.')[0] + '.'; // Just first sentence
  }
  return description;
}

function simplifyIngredients(ingredients: string[], level: ReadingLevel): string[] {
  return ingredients.map(ingredient => {
    let simplified = ingredient;

    if (level === 'beginner') {
      // Use simpler measurements and terms
      simplified = simplified
        .replace(/tablespoon/gi, 'big spoon')
        .replace(/teaspoon/gi, 'small spoon')
        .replace(/all-purpose flour/gi, 'flour')
        .replace(/granulated sugar/gi, 'white sugar')
        .replace(/packed brown sugar/gi, 'brown sugar');
    } else if (level === 'intermediate') {
      // Slight simplification
      simplified = simplified
        .replace(/all-purpose/gi, '')
        .replace(/granulated/gi, '');
    }

    return simplified;
  });
}

function simplifyInstructions(instructions: string[], level: ReadingLevel): string[] {
  return instructions.map(instruction => {
    let simplified = instruction;

    if (level === 'beginner') {
      // Use very simple language
      simplified = simplified
        .replace(/Preheat oven to/gi, 'Turn oven to')
        .replace(/cream together/gi, 'mix')
        .replace(/gradually blend in/gi, 'slowly add')
        .replace(/until light and fluffy/gi, 'until mixed well')
        .replace(/wire rack/gi, 'cooling plate');
    } else if (level === 'intermediate') {
      // Moderately simple language
      simplified = simplified
        .replace(/gradually blend in/gi, 'slowly add')
        .replace(/until light and fluffy/gi, 'until mixed well');
    }

    return simplified;
  });
}

function createKidFriendlySteps(instructions: string[], level: ReadingLevel): Array<{
  step: number;
  title: string;
  instruction: string;
  timeEstimate?: string;
  needsAdultHelp: boolean;
  tips?: string[];
}> {
  return instructions.map((instruction, index) => {
    const step = index + 1;
    const needsAdultHelp = checkIfNeedsAdultHelp(instruction);

    return {
      step,
      title: generateStepTitle(instruction, step),
      instruction,
      timeEstimate: estimateStepTime(instruction),
      needsAdultHelp,
      tips: generateStepTips(instruction, level),
    };
  });
}

function checkIfNeedsAdultHelp(instruction: string): boolean {
  const adultHelpKeywords = [
    'oven', 'stove', 'heat', 'hot', 'knife', 'cut', 'chop', 'sharp',
    'electric', 'mixer', 'blender', 'boiling', 'frying'
  ];

  return adultHelpKeywords.some(keyword =>
    instruction.toLowerCase().includes(keyword)
  );
}

function generateStepTitle(instruction: string, step: number): string {
  const firstWords = instruction.split(' ').slice(0, 3).join(' ');
  return `Step ${step}: ${firstWords}`;
}

function estimateStepTime(instruction: string): string | undefined {
  if (instruction.toLowerCase().includes('mix')) return '2 min';
  if (instruction.toLowerCase().includes('bake')) return '10-15 min';
  if (instruction.toLowerCase().includes('heat')) return '3-5 min';
  if (instruction.toLowerCase().includes('cool')) return '10 min';
  return undefined;
}

function generateStepTips(instruction: string, level: ReadingLevel): string[] {
  const tips: string[] = [];

  if (instruction.toLowerCase().includes('mix') && level === 'beginner') {
    tips.push('Stir in a circle motion');
    tips.push('Make sure everything is mixed together');
  }

  if (instruction.toLowerCase().includes('oven')) {
    tips.push('Ask an adult to help with the oven');
    tips.push('Hot things can hurt - be careful!');
  }

  return tips;
}

function generateSafetyNotes(recipe: Recipe, level: ReadingLevel): string[] {
  const notes: string[] = [];

  const hasOven = recipe.instructions.some(inst =>
    inst.toLowerCase().includes('oven') || inst.toLowerCase().includes('bake')
  );

  const hasKnife = recipe.instructions.some(inst =>
    inst.toLowerCase().includes('cut') || inst.toLowerCase().includes('chop')
  );

  const hasHeat = recipe.instructions.some(inst =>
    inst.toLowerCase().includes('heat') || inst.toLowerCase().includes('hot')
  );

  if (hasOven) {
    notes.push('🔥 Ask an adult to help with the oven - it gets very hot!');
  }

  if (hasKnife) {
    notes.push('🔪 Let an adult do all the cutting with knives');
  }

  if (hasHeat) {
    notes.push('🌡️ Be careful around hot things - they can burn you');
  }

  notes.push('👨‍👩‍👧‍👦 Always cook with a grown-up nearby');
  notes.push('🧼 Wash your hands before and after cooking');

  return notes;
}

function generateEncouragements(level: ReadingLevel): string[] {
  const encouragements = [
    '🌟 You\'re doing great!',
    '👏 Nice job following the recipe!',
    '🎉 You\'re becoming a real chef!',
    '💪 Keep up the good work!',
    '😋 This is going to taste amazing!',
  ];

  if (level === 'beginner') {
    encouragements.push('🤗 Ask for help anytime you need it!');
    encouragements.push('🎈 Cooking is fun when we do it together!');
  }

  return encouragements;
}

function mapDifficultyForKids(difficulty: string, level: ReadingLevel): 'super easy' | 'easy' | 'medium' | 'challenging' {
  const originalDifficulty = difficulty.toLowerCase();

  if (level === 'beginner') {
    if (originalDifficulty.includes('easy')) return 'super easy';
    if (originalDifficulty.includes('medium')) return 'easy';
    return 'medium';
  } else if (level === 'intermediate') {
    if (originalDifficulty.includes('easy')) return 'super easy';
    if (originalDifficulty.includes('medium')) return 'easy';
    if (originalDifficulty.includes('hard')) return 'medium';
    return 'easy';
  } else {
    if (originalDifficulty.includes('easy')) return 'easy';
    if (originalDifficulty.includes('medium')) return 'medium';
    return 'challenging';
  }
}