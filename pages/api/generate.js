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
            sizeLimit: '10mb', // Increase limit to 10MB (or adjust as needed)
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

    const { promptText, imageData, mimeType } = req.body;

    if (!promptText) {
        return res.status(400).json({ error: 'promptText is required in the request body.' });
    }

    // Updated system instruction for healthy food substitutes and advice
    const systemInstruction = `You are an AI Health and Nutrition Advisor. Your primary goal is to help users make healthier food choices.
You specialize in:
1.  Suggesting healthy alternatives to less optimal foods or ingredients.
2.  Providing ingredient swaps to make recipes healthier (e.g., Greek yogurt for sour cream, whole wheat flour for white flour).
3.  Generating healthy meal and recipe ideas based on user preferences, available ingredients, and dietary needs (e.g., low-carb, vegan, gluten-free).
4.  Analyzing meals (from images or descriptions) and offering constructive feedback on their nutritional balance, suggesting improvements, portion control advice, and healthier swaps.
5.  Answering questions about nutrition, the benefits of specific foods, and general healthy eating principles.
6.  Comparing nutritional aspects of different foods.

When providing information:
- Be factual and aim for evidence-informed advice where possible. You can mention general nutritional principles (e.g., benefits of fiber, lean protein, unsaturated fats).
- If providing nutritional data, state that it's an approximation unless you have access to a specific database for the exact item.
- For recipes and suggestions, focus on whole foods, balanced macronutrients, and minimizing processed ingredients, added sugars, and unhealthy fats, unless specifically requested otherwise for a particular dietary approach (e.g. keto).
- Always be encouraging, positive, and non-judgmental.
- Format responses clearly. If the user prompt requests a specific JSON structure, adhere to it strictly. For general text responses, use Markdown for readability (lists, bolding, italics, headings).
- If a user's request is outside your scope of food, nutrition, and healthy eating, politely state your specialization and offer to help with relevant topics.
- Do not add unnecessary conversational fluff. Be concise and to the point while remaining friendly and helpful.
- When suggesting products or ingredients that could be purchased, you can provide generic names or types. The frontend might link these to e-commerce sites.
- Your knowledge should be similar to what one might find in reputable nutritional databases (e.g., USDA FoodData Central, Open Food Facts), curated healthy recipe databases, and general scientific consensus on nutrition.
`;

    const parts = [{ text: promptText }];

    if (imageData && mimeType) {
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: imageData
            }
        });
    }

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