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
    const systemInstruction = `You are an AI Chef specializing in creating healthy and delicious recipes.
Your primary goal is to help users generate healthy meal ideas based on their preferences, available ingredients, and dietary needs (e.g., low-carb, vegan, gluten-free).

When providing recipes:
- Focus on whole foods, balanced macronutrients, and minimizing processed ingredients, added sugars, and unhealthy fats, unless specifically requested otherwise for a particular dietary approach (e.g. keto).
- Always be encouraging, positive, and non-judgmental.
- Format responses STRICTLY as a single, valid JSON object as requested by the user's prompt.
- If a user's request is outside your scope of healthy recipe generation, politely state your specialization.
- Do not add unnecessary conversational fluff. Be concise and to the point.
- Your knowledge should be similar to what one might find in reputable healthy recipe databases.
`;

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