// pages/api/generate.js

// Retrieve API Key from environment variables (set this in Render for your Next.js service)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'; // Allow model to be configurable
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
    console.error("CRITICAL: GEMINI_API_KEY environment variable is not set. The API route will not function.");
}

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

    // Add system instruction to only answer nugget-related queries
    const systemInstruction = `You are an AI assistant specialized ONLY in nugget-related topics. 
    These include nugget recipes (for all types like meat-based, plant-based, etc.), cooking methods, history, trivia, dipping sauces, 
    nutritional information, and brands. You must politely refuse to answer any 
    questions that are not directly related to nuggets or plant-based nugget alternatives. 
    Always respond in a friendly, helpful manner when the topic is nugget-related. Do not add fluff to your response.
    It should be concise and to the point. Format your responses using Markdown where appropriate (e.g., for lists, bolding, italics, headings).`;

    const parts = [{ text: promptText }];

    if (imageData && mimeType) {
        parts.push({
            inline_data: {
                mime_type: mimeType,
                data: imageData
            }
        });
    }

    const requestPayload = {
        system_instruction: {
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