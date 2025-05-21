// pages/api/generate.js
import { createClient } from '@supabase/supabase-js';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

// Retrieve API Key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Initialize Supabase client for server (ADMIN CLIENT)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Ensure this is set for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const ANONYMOUS_TRIES_PER_DAY = parseInt(process.env.NEXT_PUBLIC_ANONYMOUS_TRIES || '3', 10);
const FREE_USER_TRIES_PER_DAY = parseInt(process.env.NEXT_PUBLIC_FREE_TRIES || '5', 10);

if (!GEMINI_API_KEY) {
    console.error("CRITICAL: GEMINI_API_KEY environment variable is not set. The API route will not function.");
}
if (!supabaseUrl || !supabaseServiceKey) {
    console.error("CRITICAL: Supabase URL or Service Role Key is not set. API route may fail for DB operations.");
}

// Add this config to increase the body size limit
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
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

    const supabaseUserClient = createPagesServerClient({ req, res });
    const { data: { user: authUser } } = await supabaseUserClient.auth.getUser();

    const { promptText } = req.body;
    const userId = authUser?.id || null;
    const isAnonymousRequest = !authUser;

    if (!promptText) {
        return res.status(400).json({ error: 'promptText is required in the request body.' });
    }

    const clientIpRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    // Extract the first IP if multiple are present (common with proxies)
    const clientIp = clientIpRaw ? clientIpRaw.split(',')[0].trim() : 'unknown_ip';

    // --- Usage Limit Check ---
    if (isAnonymousRequest) {
        if (clientIp === 'unknown_ip') {
            console.warn("Could not determine client IP for anonymous request. Allowing request without limit check.");
        } else {
            try {
                const today = new Date();
                const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
                const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

                const { count, error: countError } = await supabaseAdmin
                    .from('anonymous_usage')
                    .select('*', { count: 'exact', head: true })
                    .eq('ip_identifier', clientIp)
                    .gte('created_at', startOfDay)
                    .lte('created_at', endOfDay);

                if (countError) {
                    console.error('Error counting anonymous usage:', countError.message);
                    // Fail open: If we can't check, allow the request but log it.
                } else if (count !== null && count >= ANONYMOUS_TRIES_PER_DAY) {
                    return res.status(429).json({
                        error: `Daily limit of ${ANONYMOUS_TRIES_PER_DAY} generations reached for anonymous users. Please create an account or try again tomorrow.`,
                        limitReached: true,
                    });
                }
            } catch (e) {
                console.error('Exception during anonymous usage check:', e.message);
                // Fail open
            }
        }
        // Log anonymous attempt (will happen after successful generation or if limit check fails open)
    } else { // Logged-in user
        try {
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('subscription_tier, subscription_expires_at, daily_usage_count, daily_usage_reset_at')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Error fetching profile for usage check:', profileError.message);
                // Fail open for logged-in user if profile fetch fails, but log it.
            } else if (profile) {
                const isPremium = profile.subscription_tier === 'premium' &&
                                 (profile.subscription_expires_at ? new Date(profile.subscription_expires_at) > new Date() : false);

                if (!isPremium) {
                    const now = new Date();
                    let currentUsageCount = profile.daily_usage_count || 0;
                    let lastReset = profile.daily_usage_reset_at ? new Date(profile.daily_usage_reset_at) : new Date(0);

                    if (now.toDateString() !== lastReset.toDateString()) {
                        currentUsageCount = 0; // Reset count for the new day
                        await supabaseAdmin
                            .from('profiles')
                            .update({ daily_usage_count: 1, daily_usage_reset_at: now.toISOString() })
                            .eq('id', userId);
                    } else {
                         if (currentUsageCount >= FREE_USER_TRIES_PER_DAY) {
                            return res.status(429).json({
                                error: `Daily limit of ${FREE_USER_TRIES_PER_DAY} generations reached. Upgrade to premium for unlimited access.`,
                                limitReached: true,
                            });
                        }
                        await supabaseAdmin
                            .from('profiles')
                            .update({ daily_usage_count: currentUsageCount + 1 })
                            .eq('id', userId);
                    }
                }
            }
        } catch (e) {
            console.error('Exception during logged-in user usage check:', e.message);
            // Fail open
        }
    }
    // --- End Usage Limit Check ---

    try {
        const requestPayload = {
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048, topP: 0.95, topK: 40 }
        };

        const geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

        // Log successful generation
        let recipeNameFromAI = null;
        if (responseData.candidates && responseData.candidates[0]?.content?.parts[0]?.text) {
            try {
                const aiText = responseData.candidates[0].content.parts[0].text;
                const jsonMatch = aiText.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
                const recipeJson = jsonMatch ? jsonMatch[1] : aiText;
                const parsedRecipe = JSON.parse(recipeJson);
                recipeNameFromAI = parsedRecipe.recipeName || null;
            } catch (e) { /* Could not parse recipe name, proceed without it */ }
        }

        try {
            if (isAnonymousRequest && clientIp !== 'unknown_ip') {
                await supabaseAdmin.from('anonymous_usage').insert({
                    ip_identifier: clientIp,
                    prompt_text: promptText.substring(0, 500),
                });
            }
            await supabaseAdmin.from('usage_history').insert({
                user_id: userId, // Will be null for anonymous
                prompt_text: promptText.substring(0, 1000),
                recipe_name: recipeNameFromAI,
                is_anonymous: isAnonymousRequest,
            });
        } catch (dbError) {
            console.error("Error logging usage to DB:", dbError.message);
        }

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Error calling Gemini API or processing response:', error.message);
        return res.status(500).json({ error: 'Failed to process your request.', details: error.message });
    }
} 