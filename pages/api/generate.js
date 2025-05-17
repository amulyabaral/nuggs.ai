// pages/api/generate.js

// Retrieve API Key from environment variables (set this in Render for your Next.js service)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'; // Using a potentially more capable model
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
    console.error("CRITICAL: GEMINI_API_KEY environment variable is not set. The API route will not function.");
}

// Add this config to increase the body size limit
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb', // Reduced limit as image uploads are removed
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key not configured on server.' });
    }

    const { promptText } = req.body; // Removed imageData and mimeType

    if (!promptText) {
        return res.status(400).json({ error: 'promptText is required in the request body.' });
    }

    // Updated system instruction focused on healthy recipe generation
    const systemInstruction = `You are an AI chef specializing in creating healthy and delicious recipes.
The user wants a recipe based on this core request: "${userInput}".
Additionally, consider these user preferences:
- Difficulty: ${selectedDifficulty}
- Target Cook Time: ${selectedCookTime}
- Target Serving Size: ${selectedServingSize || 'Not specified, default to 2-4 servings'}
- Available Equipment: ${equipmentInstructions}
- Positive Dietary Preferences (e.g., make the recipe align with these): "${activePreferenceLabels || 'None specified'}"
- Ingredients/Categories to STRICTLY EXCLUDE: "${activeExclusionLabels || 'None specified'}"

Please provide the response STRICTLY as a single, valid JSON object with the following structure:
{
  "recipeName": "A catchy and descriptive healthy recipe name (e.g., 'Mediterranean Quinoa Salad with Lemon-Herb Dressing')",
  "description": "A brief, enticing description of the recipe, highlighting its health aspects (2-3 sentences). Mention if any specific dietary preferences were addressed.",
  "prepTime": "Estimated preparation time (e.g., '15 minutes')",
  "cookTime": "Estimated cooking time (e.g., '20 minutes')",
  "difficultyRating": "${selectedDifficulty}",
  "servings": "Number of servings (e.g., '${selectedServingSize || '2-4'} servings' or 'Approx. 4 cups')",
  "nutritionInfo": {
    "calories": "Calories per serving (e.g., '320 kcal')",
    "protein": "Protein per serving (e.g., '12g')",
    "carbs": "Carbs per serving (e.g., '45g')",
    "fat": "Fat per serving (e.g., '14g')"
  },
  "healthBenefits": ["Briefly list 2-3 key health benefits or nutritional highlights (e.g., 'Rich in fiber', 'Good source of plant-based protein', 'Low in saturated fat')"],
  "ingredients": [
    { "name": "Ingredient Name", "quantity": "Amount (e.g., '1', '1/2', '2-3')", "unit": "Unit (e.g., 'cup', 'tbsp', 'cloves', 'medium', 'oz')", "notes": "Optional: brief notes like 'cooked', 'finely chopped', 'low-sodium version recommended'" }
  ],
  "instructions": [
    { "stepNumber": 1, "description": "Detailed instruction for this step. Be clear and concise. If specific equipment was mentioned, tailor instructions for it. Offer healthy cooking tips where appropriate (e.g., 'bake instead of fry')." }
  ],
  "substitutionSuggestions": [
    { "originalIngredient": "Original Ingredient Name (if applicable)", "healthierSubstitute": "Healthier Substitute Name", "reason": "Why it's a healthier choice (1-2 sentences)", "notes": "Optional: tips for using the substitute" }
  ],
  "pairingSuggestions": [
    { "type": "Side Dish | Drink | Garnish", "name": "Item Name", "description": "Why it pairs well and complements the meal's healthiness (1-2 sentences)", "amazonSearchKeywords": ["keyword1", "keyword2 for pairing"] }
  ]
}

IMPORTANT:
- You MUST ONLY generate healthy food recipes. If asked for an unhealthy recipe without a request for modification, or a non-food recipe, respond with a JSON object: {"error": "I specialize in healthy recipes. How can I help you make a healthier version or find a nutritious alternative?"}.
- Ensure the entire response is a single, valid JSON object. Do not include any text, pleasantries, or markdown formatting outside of this JSON object.
- ALWAYS include calorie information and basic nutritional values in the "nutritionInfo" object.
- For "ingredients", "quantity" and "unit" should be strings.
- For "instructions", "stepNumber" should be a number.
- For "substitutionSuggestions" (0-3 suggestions): focus on common swaps to make the dish even healthier or cater to restrictions.
- For "pairingSuggestions" (0-2 suggestions): suggest healthy side dishes, drinks, or garnishes.
- If "Positive Dietary Preferences" are specified (e.g., Vegan, Low Carb), the recipe MUST adhere to these. Clearly state in the recipe 'description' how these preferences have been met.
- ABSOLUTELY DO NOT include any ingredients that match the "Ingredients/Categories to STRICTLY EXCLUDE": ${activeExclusionLabels || 'None specified'}. Completely remove these ingredients and find suitable alternatives. If an exclusion makes a requested positive preference impossible (e.g., excluding all legumes for a vegan high-protein request), note this challenge in the recipe description and offer the best possible compliant recipe.
- All string values within the JSON must be properly escaped.`;

    const parts = [{ text: promptText }];

    const requestPayload = {
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        contents: [
            {
                role: "user",
                parts: parts
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.95,
            topK: 40
        }
    };

    try {
        const geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload),
        });

        const responseData = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error('Gemini API Error:', responseData);
            return res.status(geminiResponse.status).json({
                error: `Gemini API request failed: ${geminiResponse.statusText}`,
                details: responseData.error || responseData
            });
        }
        
        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Error calling Gemini API via proxy:', error);
        return res.status(500).json({ error: 'Failed to call Gemini API.', details: error.message });
    }
} 