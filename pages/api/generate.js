// pages/api/generate.js
import { createClient } from '@supabase/supabase-js';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

// Retrieve API Key from environment variables (set this in Render for your Next.js service)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'; // Using a potentially more capable model
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Initialize Supabase client for server (ADMIN CLIENT)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey); // Renamed for clarity

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

    // Create a Supabase client for user session
    const supabaseUserClient = createPagesServerClient({ req, res });
    const { data: { user: authUser } } = await supabaseUserClient.auth.getUser();

    const { promptText /*, userId, isAnonymous - these might change */ } = req.body;
    let userId = authUser?.id || null;
    let isAnonymousRequest = !authUser;

    if (!promptText) {
        return res.status(400).json({ error: 'promptText is required in the request body.' });
    }

    // Get client IP address
    const ip = req.headers['x-forwarded-for'] || 
               req.socket.remoteAddress || 
               null;
               
    // Determine anonymous vs authenticated status
    const isAuthenticatedUser = !!userId && !isAnonymousRequest; // Use derived userId and isAnonymousRequest
    const isAnonymousUserFlow = isAnonymousRequest; // Use derived isAnonymousRequest

    // Check usage limits based on authentication status
    if (isAuthenticatedUser) {
        // Existing code for authenticated users
        try {
            // Get user profile using ADMIN client for direct access
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', userId) // userId is from authUser.id
                .single();
                
            if (profileError) throw profileError;
            
            // Check if user is premium
            const isPremium = profile.subscription_tier === 'premium' && 
                             (profile.subscription_expires_at ? new Date(profile.subscription_expires_at) > new Date() : false);
            
            // If user is not premium, check usage limits
            if (!isPremium) {
                // Check if we need to reset the daily counter
                const resetDate = profile.daily_usage_reset_at ? new Date(profile.daily_usage_reset_at) : new Date(0); // Handle null reset_at
                const now = new Date();
                
                // Get default free tries from environment variable, fallback to 5
                const defaultFreeTries = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10); // Use NEXT_PUBLIC_ prefix if defined there
                
                if (now.toDateString() !== resetDate.toDateString()) { // Simpler daily reset check
                    // Reset the counter if it's a new day
                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            daily_usage_count: 1, // Set to 1 for this request
                            daily_usage_reset_at: now.toISOString() // Store as ISO string
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
                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            daily_usage_count: profile.daily_usage_count + 1
                        })
                        .eq('id', userId);
                }
            }
            
            // Log this usage using ADMIN client
            await supabaseAdmin
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
    } else if (isAnonymousUserFlow && ip) { // Use isAnonymousUserFlow
        // Modified code for anonymous users with IP tracking to handle missing table
        try {
            // Get the IP hash or just use the IP directly
            const ipIdentifier = ip;
            
            // Get default free tries from environment variable, fallback to 3 for anonymous users
            const anonymousFreeTries = parseInt(process.env.ANONYMOUS_FREE_TRIES || '3', 10);
            
            // Check if this IP has already used the service today
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of the current day
            
            try {
                const { data: ipUsage, error: ipUsageError } = await supabaseAdmin // Use ADMIN client
                    .from('anonymous_usage')
                    .select('*', { count: 'exact' }) // Get count for efficiency
                    .eq('ip_identifier', ipIdentifier)
                    .gte('created_at', today.toISOString());
                    
                if (ipUsageError) {
                    // Check if error is because table doesn't exist
                    if (ipUsageError.code === '42P01') {
                        console.warn('anonymous_usage table does not exist, skipping anonymous usage limit check');
                        // Continue without checking limits for now
                    } else {
                        throw ipUsageError;
                    }
                } else if (ipUsage && ipUsage.length >= anonymousFreeTries) {
                    return res.status(403).json({ 
                        error: 'Daily usage limit reached', 
                        limitReached: true,
                        message: `You've reached the daily limit for anonymous users. Please create an account to continue using our service.`
                    });
                }
            } catch (tableError) {
                console.error('Error with anonymous_usage table:', tableError);
                // Continue without tracking - don't block the user due to our infrastructure issue
            }
            
            // Try to log usage, but don't fail the request if it doesn't work
            try {
                await supabaseAdmin // Use ADMIN client
                    .from('anonymous_usage')
                    .insert({
                        ip_identifier: ipIdentifier,
                        prompt_text: promptText
                    });
            } catch (insertError) {
                console.warn('Could not insert into anonymous_usage, likely table missing:', insertError);
                // Continue anyway
            }
            
            // Also log in main usage history
            try {
                await supabaseAdmin // Use ADMIN client
                    .from('usage_history')
                    .insert({
                        prompt_text: promptText,
                        is_anonymous: true
                    });
            } catch (historyError) {
                console.warn('Error logging to usage_history:', historyError);
                // Continue anyway
            }
                
        } catch (error) {
            console.error('Error checking anonymous user limits:', error);
            // Continue with the request even if there's an error checking limits
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
                        if (userId && !isAnonymousRequest) { // Use derived userId and isAnonymousRequest
                            await supabaseAdmin // Use ADMIN client
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
                if (userId && !isAnonymousRequest) { // Use derived userId and isAnonymousRequest
                    await supabaseAdmin // Use ADMIN client
                        .from('usage_history')
                        .update({ recipe_name: recipeName })
                        .eq('user_id', userId) // More specific update
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