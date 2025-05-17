// pages/api/generate.js
import { createClient } from '@supabase/supabase-js';

// Retrieve API Key from environment variables (set this in Render for your Next.js service)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'; // Using a potentially more capable model
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Initialize Supabase client for server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { promptText, userId, isAnonymous } = req.body;

    if (!promptText) {
        return res.status(400).json({ error: 'promptText is required in the request body.' });
    }

    // Check user limits
    if (userId && !isAnonymous) {
        try {
            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (profileError) throw profileError;
            
            // Check if user is premium
            const isPremium = profile.subscription_tier === 'premium' && 
                             (profile.subscription_expires_at ? new Date(profile.subscription_expires_at) > new Date() : false);
            
            // If user is not premium, check usage limits
            if (!isPremium) {
                // Check if we need to reset the daily counter
                const resetDate = new Date(profile.daily_usage_reset_at);
                const now = new Date();
                
                // Get default free tries from environment variable, fallback to 5
                const defaultFreeTries = parseInt(process.env.FREE_TRIES || '5', 10);
                
                if (resetDate < now) {
                    // Reset the counter if it's a new day
                    await supabase
                        .from('profiles')
                        .update({
                            daily_usage_count: 1, // Set to 1 for this request
                            daily_usage_reset_at: now
                        })
                        .eq('id', userId);
                } else {
                    // Check if user has reached their daily limit
                    if (profile.daily_usage_count >= defaultFreeTries) {
                        return res.status(403).json({ 
                            error: 'Daily usage limit reached', 
                            limitReached: true,
                            message: `You have reached your daily limit of ${defaultFreeTries} recipe generations. Upgrade to premium for unlimited generations.`
                        });
                    }
                    
                    // Increment usage count
                    await supabase
                        .from('profiles')
                        .update({
                            daily_usage_count: profile.daily_usage_count + 1
                        })
                        .eq('id', userId);
                }
            }
            
            // Log this usage
            await supabase
                .from('usage_history')
                .insert({
                    user_id: userId,
                    prompt_text: promptText,
                    is_anonymous: false
                });
                
        } catch (error) {
            console.error('Error checking user limits:', error);
            // Continue with the request even if there's an error checking limits
            // This ensures the app doesn't break completely if there's a database issue
        }
    } else if (isAnonymous) {
        // Log anonymous usage
        try {
            await supabase
                .from('usage_history')
                .insert({
                    prompt_text: promptText,
                    is_anonymous: true
                });
        } catch (error) {
            console.error('Error logging anonymous usage:', error);
            // Continue with the request
        }
    }

    try {
        const requestPayload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: promptText }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topP: 0.95,
                topK: 40
            }
        };

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
        
        // If we have a valid recipe name, update the usage history with it
        if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
            try {
                const recipeText = responseData.candidates[0].content.parts[0].text;
                let recipeName = "Recipe";
                
                // Try to extract the recipe name from the JSON response
                try {
                    const jsonMatch = recipeText.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
                    const jsonText = jsonMatch ? jsonMatch[1] : recipeText;
                    const recipeData = JSON.parse(jsonText);
                    
                    if (recipeData.recipeName) {
                        recipeName = recipeData.recipeName;
                        
                        // If this was a logged-in user, also save the recipe to the database
                        if (userId && !isAnonymous) {
                            await supabase
                                .from('saved_recipes')
                                .insert({
                                    user_id: userId,
                                    recipe_name: recipeName,
                                    recipe_data: recipeData
                                });
                        }
                    }
                } catch (e) {
                    console.error('Error parsing recipe JSON:', e);
                    // Continue without saving recipe
                }
                
                // Update usage history with recipe name if available
                if (userId || !isAnonymous) {
                    await supabase
                        .from('usage_history')
                        .update({ recipe_name: recipeName })
                        .eq('prompt_text', promptText)
                        .order('created_at', { ascending: false })
                        .limit(1);
                }
            } catch (e) {
                console.error('Error updating usage history with recipe name:', e);
                // Continue without updating
            }
        }
        
        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Error calling Gemini API via proxy:', error);
        return res.status(500).json({ error: 'Failed to call Gemini API.', details: error.message });
    }
} 