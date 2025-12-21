"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeRecipeV2 = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const cheerio = require("cheerio");
admin.initializeApp();
exports.scrapeRecipeV2 = functions.https.onCall(async (data, context) => {
    try {
        const { url } = data;
        if (!url) {
            throw new functions.https.HttpsError('invalid-argument', 'URL is required');
        }
        if (!isValidUrl(url)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid URL format');
        }
        const recipe = await extractRecipeFromUrl(url);
        return { recipe };
    }
    catch (error) {
        console.error('Error scraping recipe:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to scrape recipe');
    }
});
function isValidUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch (_a) {
        return false;
    }
}
async function extractRecipeFromUrl(url) {
    var _a;
    try {
        // Fetch the webpage
        const response = await axios_1.default.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; KidChef Recipe Bot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        const $ = cheerio.load(response.data);
        // Try to extract from JSON-LD structured data first (most reliable)
        const jsonLdRecipe = extractFromJsonLd($);
        if (jsonLdRecipe && jsonLdRecipe.title) {
            return {
                title: jsonLdRecipe.title,
                description: jsonLdRecipe.description,
                image: jsonLdRecipe.image,
                prepTime: jsonLdRecipe.prepTime,
                cookTime: jsonLdRecipe.cookTime,
                totalTime: jsonLdRecipe.totalTime,
                servings: jsonLdRecipe.servings,
                difficulty: jsonLdRecipe.difficulty,
                ingredients: jsonLdRecipe.ingredients || [],
                instructions: jsonLdRecipe.instructions || [],
                sourceUrl: url,
                tags: jsonLdRecipe.tags
            };
        }
        // Fall back to microdata extraction
        const microdataRecipe = extractFromMicrodata($);
        if (microdataRecipe && microdataRecipe.title) {
            return {
                title: microdataRecipe.title,
                description: microdataRecipe.description,
                image: microdataRecipe.image,
                prepTime: microdataRecipe.prepTime,
                cookTime: microdataRecipe.cookTime,
                totalTime: microdataRecipe.totalTime,
                servings: microdataRecipe.servings,
                difficulty: microdataRecipe.difficulty,
                ingredients: microdataRecipe.ingredients || [],
                instructions: microdataRecipe.instructions || [],
                sourceUrl: url,
                tags: microdataRecipe.tags
            };
        }
        // Fall back to common CSS selectors
        const cssRecipe = extractFromCommonSelectors($);
        if (cssRecipe && cssRecipe.title) {
            return {
                title: cssRecipe.title,
                description: cssRecipe.description,
                image: cssRecipe.image,
                prepTime: cssRecipe.prepTime,
                cookTime: cssRecipe.cookTime,
                totalTime: cssRecipe.totalTime,
                servings: cssRecipe.servings,
                difficulty: cssRecipe.difficulty,
                ingredients: cssRecipe.ingredients || [],
                instructions: cssRecipe.instructions || [],
                sourceUrl: url,
                tags: cssRecipe.tags
            };
        }
        throw new Error('No recipe data found on this page');
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.code === 'ENOTFOUND') {
                throw new Error('Website not found');
            }
            if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                throw new Error('Recipe page not found');
            }
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timed out');
            }
        }
        throw error;
    }
}
function extractFromJsonLd($) {
    try {
        const jsonLdScripts = $('script[type="application/ld+json"]');
        for (let i = 0; i < jsonLdScripts.length; i++) {
            const scriptContent = $(jsonLdScripts[i]).html();
            if (!scriptContent)
                continue;
            try {
                const data = JSON.parse(scriptContent);
                const recipe = findRecipeInJsonLd(data);
                if (recipe)
                    return recipe;
            }
            catch (parseError) {
                continue; // Try next script tag
            }
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
function findRecipeInJsonLd(data) {
    // Handle different JSON-LD structures
    if (Array.isArray(data)) {
        for (const item of data) {
            const recipe = findRecipeInJsonLd(item);
            if (recipe)
                return recipe;
        }
        return null;
    }
    if (data['@type'] === 'Recipe') {
        return parseJsonLdRecipe(data);
    }
    // Handle nested structures
    if (data['@graph']) {
        return findRecipeInJsonLd(data['@graph']);
    }
    return null;
}
function parseJsonLdRecipe(recipe) {
    var _a;
    const extractText = (value) => {
        if (typeof value === 'string')
            return value;
        if (value && value.text)
            return value.text;
        if (value && value['@value'])
            return value['@value'];
        return '';
    };
    const extractArray = (value) => {
        if (!value)
            return [];
        if (Array.isArray(value)) {
            return value.map(extractText).filter(Boolean);
        }
        return [extractText(value)].filter(Boolean);
    };
    const extractTime = (duration) => {
        if (!duration)
            return '';
        if (typeof duration === 'string') {
            // Parse ISO 8601 duration (PT15M = 15 minutes)
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            if (match) {
                const hours = match[1] ? parseInt(match[1]) : 0;
                const minutes = match[2] ? parseInt(match[2]) : 0;
                if (hours && minutes)
                    return `${hours}h ${minutes}min`;
                if (hours)
                    return `${hours}h`;
                if (minutes)
                    return `${minutes}min`;
            }
        }
        return extractText(duration);
    };
    const extractNumber = (value) => {
        if (typeof value === 'number')
            return value;
        if (typeof value === 'string') {
            const num = parseInt(value);
            return isNaN(num) ? undefined : num;
        }
        return undefined;
    };
    return {
        title: extractText(recipe.name),
        description: extractText(recipe.description),
        image: extractText(((_a = recipe.image) === null || _a === void 0 ? void 0 : _a.url) || recipe.image),
        prepTime: extractTime(recipe.prepTime),
        cookTime: extractTime(recipe.cookTime),
        totalTime: extractTime(recipe.totalTime),
        servings: extractNumber(recipe.recipeYield || recipe.yield),
        ingredients: extractArray(recipe.recipeIngredient),
        instructions: recipe.recipeInstructions ?
            extractArray(recipe.recipeInstructions).map((instruction, index) => {
                // Clean up instruction text
                return instruction.replace(/^\d+\.\s*/, '').trim();
            }) : [],
        tags: extractArray(recipe.recipeCategory).concat(extractArray(recipe.recipeCuisine)),
    };
}
function extractFromMicrodata($) {
    const recipeElement = $('[itemtype*="schema.org/Recipe"]').first();
    if (!recipeElement.length)
        return null;
    const extractProp = (prop) => {
        const elements = recipeElement.find(`[itemprop="${prop}"]`);
        const values = [];
        elements.each((_, el) => {
            const $el = $(el);
            const text = $el.text().trim() || $el.attr('content') || '';
            if (text)
                values.push(text);
        });
        return values;
    };
    const title = extractProp('name')[0];
    if (!title)
        return null;
    return {
        title,
        description: extractProp('description')[0],
        image: recipeElement.find('[itemprop="image"]').attr('src'),
        prepTime: extractProp('prepTime')[0],
        cookTime: extractProp('cookTime')[0],
        totalTime: extractProp('totalTime')[0],
        servings: parseInt(extractProp('recipeYield')[0]) || undefined,
        ingredients: extractProp('recipeIngredient'),
        instructions: extractProp('recipeInstructions'),
    };
}
function extractFromCommonSelectors($) {
    // Common recipe site patterns
    const titleSelectors = [
        '.recipe-title', '.entry-title', 'h1.recipe-name', '.recipe-header h1',
        '[class*="recipe-title"]', '[class*="recipe-name"]'
    ];
    const ingredientSelectors = [
        '.recipe-ingredient', '.ingredient', '.recipe-ingredients li',
        '[class*="ingredient"]', '.ingredients li'
    ];
    const instructionSelectors = [
        '.recipe-instruction', '.instruction', '.recipe-instructions li',
        '.recipe-method li', '[class*="instruction"]', '.directions li'
    ];
    const title = findTextBySelectors($, titleSelectors);
    if (!title)
        return null;
    const ingredients = findMultipleTextBySelectors($, ingredientSelectors);
    const instructions = findMultipleTextBySelectors($, instructionSelectors);
    if (ingredients.length === 0 && instructions.length === 0)
        return null;
    return {
        title: title.trim(),
        ingredients,
        instructions,
    };
}
function findTextBySelectors($, selectors) {
    for (const selector of selectors) {
        const element = $(selector).first();
        if (element.length) {
            const text = element.text().trim();
            if (text)
                return text;
        }
    }
    return '';
}
function findMultipleTextBySelectors($, selectors) {
    for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length) {
            const texts = [];
            elements.each((_, el) => {
                const text = $(el).text().trim();
                if (text)
                    texts.push(text);
            });
            if (texts.length > 0)
                return texts;
        }
    }
    return [];
}
//# sourceMappingURL=index.js.map