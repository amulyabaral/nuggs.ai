const express = require('express');
const fetch = require('node-fetch'); // Use node-fetch for broader Node.js version compatibility
const app = express();
const PORT = process.env.PORT || 3001; // Render will set PORT environment variable

// Middleware to parse JSON bodies
app.use(express.json());

// Retrieve API Key from environment variables (set this in Render)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
    console.error("CRITICAL: GEMINI_API_KEY environment variable is not set. The proxy will not function.");
}

app.post('/api/generate', async (req, res) => {
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
        // "safetySettings": [{ "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }],
        // "generationConfig": { "temperature": 0.7, "maxOutputTokens": 800 }
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
            // Forward the status and error message from Gemini if possible
            return res.status(geminiResponse.status).json({ 
                error: `Gemini API request failed: ${geminiResponse.statusText}`,
                details: responseData.error || responseData
            });
        }
        
        // Send the successful response from Gemini back to the client
        res.json(responseData);

    } catch (error) {
        console.error('Error calling Gemini API via proxy:', error);
        res.status(500).json({ error: 'Failed to call Gemini API.', details: error.message });
    }
});

// Basic route for health check or root
app.get('/', (req, res) => {
    res.send('Nuggs.ai API Proxy is running!');
});


app.listen(PORT, () => {
    console.log(`Nuggs.ai API Proxy server listening on port ${PORT}`);
    if (!GEMINI_API_KEY) {
        console.warn("Warning: GEMINI_API_KEY is not set. API calls will fail.");
    }
}); 