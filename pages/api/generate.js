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

    const { promptText } = req.body;

    if (!promptText) {
        return res.status(400).json({ error: 'promptText is required in the request body.' });
    }

    const requestBody = {
        contents: [{
            parts: [{ text: promptText }]
        }],
        // Optional: Add safety settings or generation config if needed
        // safetySettings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }],
        // generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
    };

    try {
        const geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
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