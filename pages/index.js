import Head from 'next/head';
import Image from 'next/image'; // For optimized images
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import CommunityRecipeModal from '../components/CommunityRecipeModal'; // New Import

const AMAZON_AFFILIATE_TAG = 'nuggs00-20';

// Define common exclusions
const commonExclusions = [
    { id: 'gluten', label: 'Gluten', emoji: '🌾' },
    { id: 'dairy', label: 'Dairy', emoji: '🥛' },
    { id: 'nuts', label: 'Nuts', emoji: '🥜' },
    { id: 'shellfish', label: 'Shellfish', emoji: '🦐' },
    { id: 'beef', label: 'Beef', emoji: '🐄' },
    { id: 'pork', label: 'Pork', emoji: '🐖' },
    { id: 'soy', label: 'Soy', emoji: '🌱' },
    { id: 'eggs', label: 'Eggs', emoji: '🥚' },
    { id: 'fish', label: 'Fish', emoji: '🐟' },
];

// Define dietary preferences
const dietaryPreferences = [
    { id: 'vegan', label: 'Vegan (Strict Plant-Based)', emoji: '🌿' },
    { id: 'vegetarian', label: 'Vegetarian (No Meat/Fish)', emoji: '🥕' },
    { id: 'lowcarb', label: 'Low Carb', emoji: '📉' },
    { id: 'lowfat', label: 'Low Fat', emoji: '🥑' },
    { id: 'highprotein', label: 'High Protein', emoji: '💪' },
];

// Updated Tools data - Only Recipe Generator remains
const tools = [
    {
        id: 'recipeGenerator',
        name: 'Healthy Recipe Ideas',
        description: 'Get custom healthy recipes. Specify ingredients you have, dietary needs, preferred cuisine, cook time, and equipment.',
        icon: '🥗',
        inputType: 'textarea', // This might not be directly used if input is always in hero
        inputPlaceholder: "e.g., 'Quick vegan lunch with quinoa and avocado', 'Low-carb chicken dinner'",
        buttonText: 'Generate Healthy Recipe',
        difficultyOptions: [
            { label: 'Beginner', value: 'Beginner', emoji: '🧑‍🍳' },
            { label: 'Intermediate', value: 'Intermediate', emoji: '👩‍🍳' },
            { label: 'Advanced', value: 'Advanced', emoji: '🌟' },
        ],
        cookTimeOptions: [
            { label: '< 20 min', value: '< 20 min', emoji: '⏱️' },
            { label: '20-45 min', value: '20-45 min', emoji: '⏳' },
            { label: '> 45 min', value: '> 45 min', emoji: '⏰' },
        ],
        servingSizeOptions: [
            { label: '1-2', value: '1-2', emoji: '🍽️' },
            { label: '3-4', value: '3-4', emoji: '🍽️🍽️' },
            { label: '5-6', value: '5-6', emoji: '🍽️🍽️🍽️' },
            { label: '7+', value: '7+', emoji: '🍽️🍽️🍽️🍽️' },
        ],
        equipmentOptions: [
            { label: 'Oven', value: 'oven', emoji: '♨️' },
            { label: 'Air Fryer', value: 'airfryer', emoji: '💨' },
            { label: 'Stovetop', value: 'pan', emoji: '🍳' },
            { label: 'Microwave', value: 'microwave', emoji: '💡' },
            { label: 'Blender', value: 'blender', emoji: '🥤' },
            { label: 'Instant Pot / Pressure Cooker', value: 'pressurecooker', emoji: '🍲' },
        ],
    },
    // Removed: suggestionExplorer, mealAnalyzer, nutritionFacts, community
];

const PROXY_API_URL = '/api/generate';

export default function HomePage() {
    // Set 'recipeGenerator' as the default selected tool
    const [selectedToolId, setSelectedToolId] = useState(tools[0].id);
    const [activeTool, setActiveTool] = useState(tools[0]);
    const [inputValue, setInputValue] = useState('');
    const [results, setResults] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRandomLoading, setIsRandomLoading] = useState(false); // New state for random button
    const [error, setError] = useState('');

    // Add a new state variable to track whether the tool container should be shown
    const [showToolContainer, setShowToolContainer] = useState(false);

    const [selectedDifficulty, setSelectedDifficulty] = useState(tools[0].difficultyOptions[0].value);
    const [selectedCookTime, setSelectedCookTime] = useState(tools[0].cookTimeOptions[0].value);
    const [selectedEquipment, setSelectedEquipment] = useState({});

    // New state for recipe tool inputs
    const [selectedExclusions, setSelectedExclusions] = useState({});
    const [selectedPreferences, setSelectedPreferences] = useState({}); // New state for preferences

    // New state for instruction timers
    const [instructionTimersData, setInstructionTimersData] = useState({});
    // { index: { checked: boolean, originalDuration: number | null, timeLeft: number | null, timerActive: boolean }}
    const [currentRunningTimer, setCurrentRunningTimer] = useState({ intervalId: null, stepIndex: null });

    // Add serving size options to the recipe generator tool options
    const [selectedServingSize, setSelectedServingSize] = useState('3-4'); // Default to 3-4 servings

    // Add state to track when results are shown
    const [resultsShown, setResultsShown] = useState(false);

    // Create a ref for scrolling to results
    const recipeResultsRef = useRef(null);

    // Add a ref to the loading spinner
    const loadingRef = useRef(null);

    // Add this new state for tracking loading dots
    const [loadingDots, setLoadingDots] = useState('');

    const router = useRouter();

    // Add this to access auth context
    const { user, usageRemaining, isPremium, incrementUsage, signOut, profile, loading: authLoading, refreshUserProfile, profileError, supabaseClient } = useAuth();

    // Add to your existing state variables
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [usageLimitReached, setUsageLimitReached] = useState(false);

    // New state for anonymous user's remaining tries
    // Initial state assumes full tries, no longer loading from a separate API.
    const [anonymousUserTries, setAnonymousUserTries] = useState({
        remaining: parseInt(process.env.NEXT_PUBLIC_ANONYMOUS_TRIES || '3', 10),
        limit: parseInt(process.env.NEXT_PUBLIC_ANONYMOUS_TRIES || '3', 10),
        loading: false, // Not loading from API anymore
    });

    // Add these new state variables near the other useState declarations
    const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
    const [saveMessage, setSaveMessage] = useState('');

    // New state for community recipes
    const [communityRecipes, setCommunityRecipes] = useState([]);
    const [loadingCommunityRecipes, setLoadingCommunityRecipes] = useState(true);
    const [errorCommunityRecipes, setErrorCommunityRecipes] = useState('');
    const [selectedCommunityRecipe, setSelectedCommunityRecipe] = useState(null);
    const [showCommunityRecipeModal, setShowCommunityRecipeModal] = useState(false);
    const [isCommunityRecipeSaved, setIsCommunityRecipeSaved] = useState(false);
    const [saveCommunityRecipeStatus, setSaveCommunityRecipeStatus] = useState(null);
    const [saveCommunityRecipeMessage, setSaveCommunityRecipeMessage] = useState('');

    // Fetch anonymous usage info
    useEffect(() => {
        // This useEffect is now simplified as we are not fetching anonymous usage on page load.
        // The anonymousUserTries state is initialized with default values.
        // It will be updated after a successful generation via the /api/generate response.
        if (user) {
            // Reset anonymous tries if user logs in, or ensure it's not showing stale anonymous data.
            setAnonymousUserTries({
                remaining: parseInt(process.env.NEXT_PUBLIC_ANONYMOUS_TRIES || '3', 10), // Reset to default
                limit: parseInt(process.env.NEXT_PUBLIC_ANONYMOUS_TRIES || '3', 10),
                loading: false,
            });
        }
    }, [authLoading, user]);

    // Fetch community recipes on mount
    useEffect(() => {
        const fetchCommunityRecipes = async () => {
            setLoadingCommunityRecipes(true);
            setErrorCommunityRecipes('');
            try {
                const response = await fetch('/api/community-recipes');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to fetch community recipes: ${response.statusText}`);
                }
                const data = await response.json();
                setCommunityRecipes(data);
            } catch (err) {
                console.error("Error fetching community recipes:", err);
                setErrorCommunityRecipes(err.message || 'Could not load community recipes.');
            } finally {
                setLoadingCommunityRecipes(false);
            }
        };
        fetchCommunityRecipes();
    }, []);

    // Effect to update activeTool when selectedToolId changes
    useEffect(() => {
        const tool = tools.find(t => t.id === selectedToolId);
        if (tool) {
            setActiveTool(tool);
            setInputValue('');
            setResults('');
            setError('');
            // Reset recipe-specific options
            setSelectedDifficulty(tool.difficultyOptions?.[0]?.value || 'Beginner');
            setSelectedCookTime(tool.cookTimeOptions?.[0]?.value || '< 20 min');
            setSelectedEquipment({});
            setSelectedExclusions({});
            setSelectedPreferences({}); // Reset preferences
            // Clear timers when tool changes
            setInstructionTimersData({});
            if (currentRunningTimer.intervalId) {
                clearInterval(currentRunningTimer.intervalId);
            }
            setCurrentRunningTimer({ intervalId: null, stepIndex: null });
        }
    }, [selectedToolId]);

    // Effect to initialize/reset timers when recipe results change
    useEffect(() => {
        if (activeTool.id === 'recipeGenerator' && results) {
            try {
                const recipe = JSON.parse(results);
                if (recipe.instructions && Array.isArray(recipe.instructions)) {
                    const newTimersData = {};
                    recipe.instructions.forEach((instr, index) => {
                        const duration = parseTimeFromString(instr.description);
                        newTimersData[index] = {
                            checked: false,
                            originalDuration: duration,
                            timeLeft: duration,
                            timerActive: false, // Initially all timers are inactive
                        };
                    });
                    setInstructionTimersData(newTimersData);
                } else {
                     setInstructionTimersData({});
                }
            } catch (e) {
                console.error("Error parsing recipe for timers:", e);
                setInstructionTimersData({});
            }
            // Stop any previously running timer from an old recipe
            if (currentRunningTimer.intervalId) {
                clearInterval(currentRunningTimer.intervalId);
            }
            setCurrentRunningTimer({ intervalId: null, stepIndex: null });
        } else if (activeTool.id !== 'recipeGenerator') { // Clear if not recipe tool or no results
            setInstructionTimersData({});
            if (currentRunningTimer.intervalId) {
                clearInterval(currentRunningTimer.intervalId);
            }
            setCurrentRunningTimer({ intervalId: null, stepIndex: null });
        }
    }, [results, activeTool.id]);

    // Cleanup timer on component unmount
    useEffect(() => {
        return () => {
            if (currentRunningTimer.intervalId) {
                clearInterval(currentRunningTimer.intervalId);
            }
        };
    }, [currentRunningTimer.intervalId]);

    // Add this effect to animate the dots when loading
    useEffect(() => {
        let dotsInterval;
        if (isLoading || isRandomLoading) {
            dotsInterval = setInterval(() => {
                setLoadingDots(prev => {
                    if (prev === '...') return '';
                    return prev + '.';
                });
            }, 400); // Control the speed of the blinking
        } else {
            setLoadingDots('');
        }
        
        return () => {
            if (dotsInterval) clearInterval(dotsInterval);
        };
    }, [isLoading, isRandomLoading]);

    const parseTimeFromString = (text) => {
        if (!text || typeof text !== 'string') return null;
        // Regex for "X minutes" or "X-Y minutes"
        const minRegex = /(?:(\d+)-)?(\d+)\s+min(?:ute)?s?/i;
        // Regex for "X seconds" or "X-Y seconds"
        const secRegex = /(?:(\d+)-)?(\d+)\s+sec(?:ond)?s?/i;

        let totalSeconds = 0;
        let foundTime = false;

        const minMatch = text.match(minRegex);
        if (minMatch) {
            const val1 = minMatch[1] ? parseInt(minMatch[1], 10) : null;
            const val2 = parseInt(minMatch[2], 10);
            totalSeconds += (val1 || val2) * 60;
            foundTime = true;
        }

        const secMatch = text.match(secRegex);
        if (secMatch) {
            const val1 = secMatch[1] ? parseInt(secMatch[1], 10) : null;
            const val2 = parseInt(secMatch[2], 10);
            totalSeconds += (val1 || val2);
            foundTime = true;
        }
        
        return foundTime ? totalSeconds : null;
    };

    const formatTime = (totalSeconds) => {
        if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return '';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const startTimerForStep = (stepIndexToStart) => {
        // --- Snapshot current state at the beginning of the function execution ---
        const initialGlobalTimerState = currentRunningTimer;
        const initialInstructionTimersState = instructionTimersData;

        const stepToStartData = initialInstructionTimersState[stepIndexToStart];

        // Condition to start: step exists, has duration, not checked, not already active (in snapshot)
        if (!stepToStartData || !stepToStartData.originalDuration || stepToStartData.checked || stepToStartData.timerActive) {
            return;
        }

        // 1. Clear any previously running global timer
        if (initialGlobalTimerState.intervalId) {
            clearInterval(initialGlobalTimerState.intervalId);
        }
        
        // 2. Update instructionTimersData state
        setInstructionTimersData(prevTimersData => {
            let newTimersData = { ...prevTimersData };

            // Deactivate the timer for the previously active step (if it was different)
            if (initialGlobalTimerState.stepIndex !== null &&
                initialGlobalTimerState.stepIndex !== stepIndexToStart &&
                newTimersData[initialGlobalTimerState.stepIndex]) { 
                newTimersData[initialGlobalTimerState.stepIndex] = {
                    ...newTimersData[initialGlobalTimerState.stepIndex],
                    timerActive: false,
                };
            }

            // Activate and reset the timer for the current step
            newTimersData[stepIndexToStart] = {
                ...prevTimersData[stepIndexToStart], // Use data from prevTimersData for this step
                timeLeft: stepToStartData.originalDuration, // Reset timeLeft using the snapshot's originalDuration
                timerActive: true,
                checked: false, // Ensure it's not checked
            };
            return newTimersData;
        });

        // 3. Create the new interval
        const newIntervalId = setInterval(() => {
            setInstructionTimersData(latestTimersData => { // latestTimersData is the most current state
                const stepDataForInterval = latestTimersData[stepIndexToStart];

                // Stop condition for this interval:
                // - Step data is missing (e.g., recipe changed)
                // - This step is no longer marked 'timerActive' in the latest state
                if (!stepDataForInterval || !stepDataForInterval.timerActive) {
                    clearInterval(newIntervalId);
                    // If this interval was the one tracked globally, clear that tracking
                    setCurrentRunningTimer(crt => {
                        if (crt.intervalId === newIntervalId) {
                            return { intervalId: null, stepIndex: null };
                        }
                        return crt;
                    });
                    return latestTimersData; // No change to data, just stopping interval
                }

                const newTimeLeft = stepDataForInterval.timeLeft - 1;
                let updatedTimersData = { ...latestTimersData };

                if (newTimeLeft <= 0) { // Timer finished
                    clearInterval(newIntervalId);
                    updatedTimersData[stepIndexToStart] = {
                        ...stepDataForInterval,
                        timeLeft: 0,
                        timerActive: false,
                        checked: true,
                    };
                    // This timer is done, clear global tracking if it was this one
                    setCurrentRunningTimer(crt => {
                        if (crt.intervalId === newIntervalId) {
                            return { intervalId: null, stepIndex: null };
                        }
                        return crt;
                    });

                    // Attempt to start next timer
                    const nextStepIndex = stepIndexToStart + 1;
                    if (updatedTimersData[nextStepIndex] &&
                        updatedTimersData[nextStepIndex].originalDuration &&
                        !updatedTimersData[nextStepIndex].checked) {
                        setTimeout(() => startTimerForStep(nextStepIndex), 0);
                    }
                } else { // Timer ticking
                    updatedTimersData[stepIndexToStart] = {
                        ...stepDataForInterval,
                        timeLeft: newTimeLeft,
                    };
                }
                return updatedTimersData;
            });
        }, 1000);

        // 4. Update the global currentRunningTimer state to this new interval
        setCurrentRunningTimer({ intervalId: newIntervalId, stepIndex: stepIndexToStart });
    };

    const getPromptForTool = (tool, userInput) => {
        // Simplified: only recipeGenerator is left
        if (tool.id !== 'recipeGenerator') {
            // This case should ideally not be reached if UI only allows recipeGenerator
            setError("Invalid tool selected.");
            return null;
        }

        if (!userInput) {
            setError("Please describe the type of healthy recipe you'd like, or list some ingredients you have.");
            return null;
        }
        const activeEquipment = Object.keys(selectedEquipment)
                                    .filter(key => selectedEquipment[key] && tool.equipmentOptions.find(opt => opt.value === key))
                                    .map(key => tool.equipmentOptions.find(opt => opt.value === key).label);
        
        let equipmentInstructions = "standard kitchen equipment (oven, stovetop)";
        if (activeEquipment.length > 0) {
            equipmentInstructions = activeEquipment.join(', ');
        }

        // Get active exclusions as a formatted string with labels
        const activeExclusionLabels = Object.entries(selectedExclusions)
            .filter(([_, value]) => value)
            .map(([key]) => commonExclusions.find(ex => ex.id === key)?.label || key)
            .join(', ');

        // Get active preferences as a formatted string with labels
        const activePreferenceLabels = Object.entries(selectedPreferences)
            .filter(([_, value]) => value)
            .map(([key]) => dietaryPreferences.find(pref => pref.id === key)?.label || key)
            .join(', ');

        let recipePrompt = `You are an AI chef specializing in creating healthy and delicious recipes.
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
        return recipePrompt;
    };

    const handleSubmit = async (event, isRandom = false) => {
        if (event) event.preventDefault();
        if (!activeTool) return;

        // Don't try to proceed if auth is still loading
        if (authLoading) {
            setError("Please wait, your session is loading...");
            return;
        }

        const currentInput = isRandom ? "Surprise me with a random healthy recipe." : inputValue;
        const promptText = getPromptForTool(activeTool, currentInput);

        if (!promptText) {
            if (!isRandom) {
                setError("Please describe the type of healthy recipe you'd like, or list some ingredients you have.");
            }
            return;
        }

        // Usage increment logic
        let canProceed = true;
        if (user) { // For logged-in users
            canProceed = await incrementUsage();
            if (!canProceed) {
                setError(`You've reached your daily limit of ${isPremium ? 'unlimited' : (process.env.NEXT_PUBLIC_FREE_TRIES || 5)} recipe generations. Upgrade to premium for unlimited recipes, or check your dashboard for more details.`);
                setUsageLimitReached(true);
                return;
            }
        } else { // For anonymous users, the API route /api/generate will handle IP-based limiting
          // No client-side increment for anonymous, API handles it
        }

        // Show the tool container when either button is clicked
        setShowToolContainer(true);

        if (isRandom) {
            setIsRandomLoading(true);
        } else {
            setIsLoading(true);
        }
        setResults('');
        setError('');
        
        // Scroll to the loading spinner immediately
        setTimeout(() => {
            if (loadingRef.current) {
                loadingRef.current.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 50);

        let requestBody = { 
            promptText,
            // userId and isAnonymous will be determined by the API route from the session cookie
        };

        try {
            const response = await fetch(PROXY_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok) {
                // If the response is not OK (e.g., 429, 500 error)
                // Check if this is an anonymous user hitting their rate limit.
                if (!user && response.status === 429 && data && data.limitReached) {
                    setAnonymousUserTries(prev => ({
                        ...prev,
                        remaining: 0, // Explicitly set remaining tries to 0
                        loading: false,
                    }));
                }
                throw new Error(data.error || `API request failed: ${response.statusText}`);
            }

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                let aiResponseText = data.candidates[0].content.parts[0].text;

                // This logic is specific to recipeGenerator, which is the only tool left
                const markdownMatch = aiResponseText.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
                if (markdownMatch && markdownMatch[1]) {
                    aiResponseText = markdownMatch[1];
                }
                aiResponseText = aiResponseText.trim();
                
                setResults(aiResponseText);
                setResultsShown(true); // Set that results are now shown
                
                // Update anonymous user tries if data is present in the response
                if (!user && data.anonymousUserTriesRemaining !== undefined && data.anonymousUserTriesLimit !== undefined) {
                    setAnonymousUserTries({
                        remaining: data.anonymousUserTriesRemaining,
                        limit: data.anonymousUserTriesLimit,
                        loading: false,
                    });
                }
                
                // Scroll to results after a short delay to ensure rendering
                setTimeout(() => {
                    if (recipeResultsRef.current) {
                        recipeResultsRef.current.scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }, 100);
            } else if (data.promptFeedback?.blockReason) {
                setError(`Request blocked: ${data.promptFeedback.blockReason}. Try a different prompt.`);
            } else {
                setError('Received an unexpected response from the AI.');
            }
        } catch (err) {
            console.error("API Call Error:", err);
            setError(err.message || 'Failed to fetch response from AI.');
        } finally {
            if (isRandom) {
                setIsRandomLoading(false);
            } else {
                setIsLoading(false);
            }
        }
    };

    const handleRandomRecipeSubmit = () => {
        // Create arrays of diverse recipe components that will force variation
        const proteins = [
            "chicken", "salmon", "tofu", "beans", "lentils", "chickpeas", 
            "tempeh", "eggs", "tuna", "turkey", "shrimp", "ground beef",
            "cod", "halibut", "mackerel", "scallops", "black beans", "edamame"
        ];
        
        const vegetables = [
            "spinach", "kale", "bell peppers", "zucchini", "mushrooms", "broccoli",
            "cauliflower", "carrots", "sweet potatoes", "asparagus", "brussels sprouts",
            "eggplant", "tomatoes", "cucumber", "peas", "cabbage", "bok choy"
        ];
        
        const carbs = [
            "quinoa", "brown rice", "farro", "pasta", "sweet potato", "whole grain bread",
            "barley", "oats", "millet", "wild rice", "buckwheat noodles", "bulgur",
            "corn tortillas", "rice noodles", "whole wheat couscous"
        ];
        
        const cuisines = [
            "Mediterranean", "Thai", "Mexican", "Japanese", "Italian", "Lebanese",
            "Vietnamese", "Indian", "Korean", "Moroccan", "Greek", "American",
            "Chinese", "Brazilian", "Spanish", "French", "Turkish", "Ethiopian",
            "Caribbean", "Southwestern"
        ];
        
        const mealTypes = [
            "dinner", "lunch", "breakfast", "brunch", "snack", "appetizer", "side dish"
        ];
        
        const cookingMethods = [
            "baked", "grilled", "steamed", "stir-fried", "slow-cooked", "roasted",
            "sautéed", "air-fried", "braised", "poached", "pressure-cooked", 
            "pan-seared", "broiled"
        ];
        
        const dietaryStyles = [
            "vegetarian", "high-protein", "low-carb", "Mediterranean diet", "low-calorie",
            "balanced", "heart-healthy", "antioxidant-rich", "dairy-free", "gluten-free"
        ];
        
        // Function to get multiple random items from an array
        const getRandomItems = (array, count = 1) => {
            const shuffled = [...array].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        };
        
        // Generate a randomized recipe prompt with specific components that force variation
        const randomProtein = getRandomItems(proteins, 1)[0];
        const randomVeggies = getRandomItems(vegetables, 2);
        const randomCarb = getRandomItems(carbs, 1)[0];
        const randomCuisine = getRandomItems(cuisines, 1)[0];
        const randomMealType = getRandomItems(mealTypes, 1)[0];
        const randomCookingMethod = getRandomItems(cookingMethods, 1)[0];
        const randomDietaryStyle = getRandomItems(dietaryStyles, 1)[0];
        
        // Create a uniquely structured prompt each time by combining components differently
        let promptStructures = [
            `Create a ${randomCookingMethod} ${randomProtein} ${randomMealType} with ${randomVeggies[0]} and ${randomVeggies[1]}, ${randomCuisine}-inspired.`,
            `I want a ${randomDietaryStyle} recipe using ${randomProtein}, ${randomVeggies[0]}, and ${randomCarb} for ${randomMealType}.`,
            `Give me a ${randomCuisine} ${randomMealType} that uses ${randomProtein} and ${randomVeggies[0]}, cooked by ${randomCookingMethod}.`,
            `How can I make a healthy ${randomMealType} with ${randomProtein}, ${randomVeggies[0]}, and ${randomVeggies[1]}?`,
            `I need a quick ${randomDietaryStyle} ${randomCuisine} dish using ${randomProtein} and ${randomCarb}.`,
            `Create a ${randomCookingMethod} ${randomCarb} bowl with ${randomProtein} and ${randomVeggies[0]}.`,
            `I want to try a new ${randomCuisine} recipe that's ${randomDietaryStyle} and uses ${randomCookingMethod} ${randomProtein}.`,
            `How do I make ${randomCuisine}-style ${randomProtein} with ${randomVeggies[0]} for a healthy ${randomMealType}?`
        ];
        
        // Select a random prompt structure
        const selectedPromptIndex = Math.floor(Math.random() * promptStructures.length);
        let finalPrompt = promptStructures[selectedPromptIndex];
        
        // Add explicit instructions to ensure uniqueness
        finalPrompt += ` Make sure this is a unique recipe that hasn't been suggested before. Be creative with the flavors and presentation.`;
        
        // Store original input value
        const originalInput = inputValue;
        
        // Set the prompt for API call but don't show it to user
        setInputValue(finalPrompt);
        
        // Submit with the random prompt
        handleSubmit(null, true);
        
        // Restore original input
        setInputValue(originalInput);
    };

    const handleInstructionToggle = (toggledIndex) => {
        const stepToToggleData = instructionTimersData[toggledIndex];
        if (!stepToToggleData) return;

        const isNowChecked = !stepToToggleData.checked;

        // If a timer is running for this specific step and we are interacting with it, stop it.
        if (currentRunningTimer.stepIndex === toggledIndex && currentRunningTimer.intervalId) {
            clearInterval(currentRunningTimer.intervalId);
            setCurrentRunningTimer({ intervalId: null, stepIndex: null }); // Clear global timer
        }

        setInstructionTimersData(prev => {
            const newData = { ...prev };
            newData[toggledIndex] = {
                ...newData[toggledIndex],
                checked: isNowChecked,
                timerActive: false, // Always stop timer on manual toggle for this step
                timeLeft: isNowChecked ? 0 : (newData[toggledIndex].originalDuration || 0),
            };
            return newData;
        });

        if (isNowChecked) {
            // If the step was just checked, try to start the timer for the NEXT UNCHECKED step
            const nextIndex = toggledIndex + 1;
            // Use setTimeout to ensure state update has processed before starting next timer
            // startTimerForStep will read the latest state when it executes.
            setTimeout(() => {
                 // Check conditions using the latest state implicitly through startTimerForStep
                startTimerForStep(nextIndex);
            }, 0);
        }
    };

    const handleEquipmentToggle = (equipmentValue) => {
        setSelectedEquipment(prev => ({
            ...prev,
            [equipmentValue]: !prev[equipmentValue]
        }));
    };

    const handleExclusionToggle = (exclusionId) => {
        setSelectedExclusions(prev => ({
            ...prev,
            [exclusionId]: !prev[exclusionId]
        }));
    };

    const handlePreferenceToggle = (preferenceId) => {
        setSelectedPreferences(prev => ({
            ...prev,
            [preferenceId]: !prev[preferenceId]
        }));
    };

    const handleAmazonSearch = (itemNameOrKeywords, itemType = 'item') => {
        if (!itemNameOrKeywords) return;
        let searchTerm;
        if (Array.isArray(itemNameOrKeywords) && itemNameOrKeywords.length > 0) {
            searchTerm = encodeURIComponent(itemNameOrKeywords.join(' '));
        } else if (typeof itemNameOrKeywords === 'string') {
            searchTerm = encodeURIComponent(itemNameOrKeywords);
        } else {
            console.warn("Invalid search term for Amazon:", itemNameOrKeywords);
            return;
        }
        const amazonSearchUrl = `https://www.amazon.com/s?k=${searchTerm}&tag=${AMAZON_AFFILIATE_TAG}&ref=healthysubstai_${itemType}`;
        window.open(amazonSearchUrl, '_blank', 'noopener,noreferrer');
    };

    // Helper function to render recipe results from JSON
    const renderRecipeResults = (jsonData) => {
        console.log("Attempting to parse healthy recipe JSON. Raw data received:", jsonData);
        try {
            const recipe = JSON.parse(jsonData);
            console.log("Successfully parsed healthy recipe JSON:", recipe);

            if (recipe.error) {
                return <p className="errorMessage">Error from AI: {recipe.error}</p>;
            }

            return (
                <div className="recipeOutputContainer">
                    <div className="recipeNameCard highlightedRecipeCard" ref={recipeResultsRef}>
                        <h2 className="recipeTitlePill">{recipe.recipeName || 'Healthy Recipe'}</h2>
                        <p>{recipe.description || 'No description provided.'}</p>
                        <div className="recipeMeta">
                            <span><strong>Prep:</strong> {recipe.prepTime || 'N/A'}</span>
                            <span><strong>Cook:</strong> {recipe.cookTime || 'N/A'}</span>
                            <span><strong>Difficulty:</strong> {recipe.difficultyRating || 'N/A'}</span>
                            <span><strong>Servings:</strong> <span style={{fontWeight: '600'}}>{recipe.servings || 'N/A'}</span></span>
                            {recipe.nutritionInfo && recipe.nutritionInfo.calories && (
                                <span><strong>Calories:</strong> <span style={{fontWeight: '600'}}>{recipe.nutritionInfo.calories}</span></span>
                            )}
                        </div>
                        {recipe.healthBenefits && recipe.healthBenefits.length > 0 && (
                            <div className="healthBenefitsSection">
                                <strong>Health Highlights:</strong>
                                <ul>
                                    {recipe.healthBenefits.map((benefit, idx) => <li key={idx}>{benefit}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="recipeSection">
                        <h3>Ingredients</h3>
                        <p className="amazonNote"> (You can click any ingredient to automatically search for it on Amazon!)</p>
                        <div className="ingredientsGrid">
                            {recipe.ingredients && recipe.ingredients.length > 0 ? recipe.ingredients.map((ing, index) => (
                                <div
                                    key={index}
                                    className="ingredientPill"
                                    onClick={() => handleAmazonSearch(ing.name, 'ingredient')}
                                    title={`Click to search for ${ing.name} on Amazon`}
                                >
                                    <span className="ingredientName">{ing.name}</span>
                                    <span className="ingredientQuantity">{`${ing.quantity || ''} ${ing.unit || ''}`}</span>
                                    {ing.notes && <small className="ingredientNotes">({ing.notes})</small>}
                                </div>
                            )) : <p>No ingredients listed.</p>}
                        </div>
                    </div>

                    <div className="recipeSection">
                        <h3>Instructions</h3>
                        {recipe.instructions && recipe.instructions.length > 0 ? (
                            <ul className="instructionsList">
                                {recipe.instructions.map((instr, index) => {
                                    const timerStepData = instructionTimersData[index] || {};
                                    const { checked, originalDuration, timeLeft, timerActive } = timerStepData;
                                    const displayTime = timerActive ? formatTime(timeLeft) : (originalDuration ? formatTime(originalDuration) : '');

                                    return (
                                        <li
                                            key={instr.stepNumber || index}
                                            className={`instructionStep ${checked ? "checkedInstruction" : ''} ${timerActive ? "activeTimerInstruction" : ''}`}
                                            onClick={() => handleInstructionToggle(index)}
                                        >
                                            <div className="instructionHeader">
                                                <div className="instructionCheckboxWrapper">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!checked}
                                                        readOnly
                                                        className="instructionCheckbox"
                                                    />
                                                    <span className="stepNumber">Step {instr.stepNumber}:</span>
                                                </div>
                                                
                                                <div className="instructionControls">
                                                    {originalDuration !== null && (
                                                        <span className="timerDisplay">
                                                            {timerActive ? `⏳ ${displayTime}` : (checked && timeLeft === 0) ? `✅ Done` : (displayTime ? `⏱️ ${displayTime}` : '')}
                                                        </span>
                                                    )}
                                                    {!timerActive && !checked && originalDuration !== null && currentRunningTimer.stepIndex === null && (
                                                        <button
                                                            className="startTimerButton"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent li onClick from firing
                                                                startTimerForStep(index);
                                                            }}
                                                        >
                                                            Start Timer
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="stepDescriptionWrapper">
                                                <span className="stepDescription">{instr.description}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <p>No instructions provided.</p>}
                    </div>

                    {recipe.substitutionSuggestions && recipe.substitutionSuggestions.length > 0 && (
                        <div className="recipeSection">
                            <h3>Healthier Substitution Ideas</h3>
                            <div className="suggestionCardsContainer">
                                {recipe.substitutionSuggestions.map((sub, index) => (
                                    <div key={`sub-${index}`} className="suggestionCard">
                                        <h4>{sub.healthierSubstitute}</h4>
                                        {sub.originalIngredient && <p><small>Instead of: {sub.originalIngredient}</small></p>}
                                        <p>{sub.reason}</p>
                                        {sub.notes && <small><em>Note: {sub.notes}</em></small>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {recipe.pairingSuggestions && recipe.pairingSuggestions.length > 0 && (
                        <div className="recipeSection">
                            <h3>Healthy Pairing Suggestions</h3>
                            <div className="suggestionCardsContainer">
                                {recipe.pairingSuggestions.map((item, index) => (
                                    <div
                                        key={`pairing-${index}`}
                                        className="suggestionCard"
                                        onClick={() => handleAmazonSearch(item.amazonSearchKeywords || item.name, 'pairing_suggestion')}
                                        title={`Search for ${item.name} related items on Amazon`}
                                    >
                                        <h4>{item.emoji && <span className="suggestionEmoji">{item.emoji}</span>} {item.name} <small>({item.type})</small></h4>
                                        {item.description && <p>{item.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {recipe.nutritionInfo && (
                        <div className="nutritionInfoSection">
                            <strong>Nutrition (per serving):</strong>
                            <div className="nutritionGrid">
                                {recipe.nutritionInfo.calories && (
                                    <div className="nutritionPill">
                                        <span className="nutritionLabel">Calories:</span>
                                        <span className="nutritionValue">{recipe.nutritionInfo.calories}</span>
                                    </div>
                                )}
                                {recipe.nutritionInfo.protein && (
                                    <div className="nutritionPill">
                                        <span className="nutritionLabel">Protein:</span>
                                        <span className="nutritionValue">{recipe.nutritionInfo.protein}</span>
                                    </div>
                                )}
                                {recipe.nutritionInfo.carbs && (
                                    <div className="nutritionPill">
                                        <span className="nutritionLabel">Carbs:</span>
                                        <span className="nutritionValue">{recipe.nutritionInfo.carbs}</span>
                                    </div>
                                )}
                                {recipe.nutritionInfo.fat && (
                                    <div className="nutritionPill">
                                        <span className="nutritionLabel">Fat:</span>
                                        <span className="nutritionValue">{recipe.nutritionInfo.fat}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            console.error("Failed to parse healthy recipe JSON. Error:", e);
            console.error("Raw JSON data that failed to parse:", jsonData);
            // Improved error message for users
            return (
                <>
                    <p className="errorMessage">
                        We encountered an error processing your recipe. Please try again with a different request.
                    </p>
                    <details className="errorDetails">
                        <summary>Technical details (click to expand)</summary>
                        <pre>{e.message}</pre>
                        <pre>{jsonData}</pre>
                    </details>
                </>
            );
        }
    };

    // Update the handleSaveRecipe function
    const handleSaveRecipe = async () => {
        if (!user) {
            setAuthMode('login');
            setShowAuthModal(true);
            return;
        }
        
        if (!results || !supabaseClient) return; // Ensure supabaseClient is available
        
        try {
            let recipeData;
            try {
                recipeData = JSON.parse(results);
            } catch (e) {
                console.error("Error parsing recipe JSON:", e);
                setSaveStatus('error');
                setSaveMessage("Failed to save recipe: Invalid recipe data");
                return;
            }
            
            setSaveStatus('loading');
            setSaveMessage('Saving recipe...');
            
            const { error } = await supabaseClient
                .from('saved_recipes')
                .insert({
                    user_id: user.id,
                    recipe_name: recipeData.recipeName || 'Untitled Recipe',
                    recipe_data: recipeData,
                    folder: 'Saved Recipes', // Add default folder
                    is_favorite: false,     // Default favorite status
                });
                
            if (error) throw error;
            
            setSaveStatus('success');
            setSaveMessage('Recipe saved successfully!');
            
            // Auto-clear success message after 3 seconds
            setTimeout(() => {
                if (setSaveStatus) { // Check if component is still mounted
                    setSaveStatus(null);
                    setSaveMessage('');
                }
            }, 3000);
        } catch (error) {
            console.error('Error saving recipe:', error);
            setSaveStatus('error');
            setSaveMessage('Failed to save recipe. Please try again.');
            // Don't use setError here, as it would show at the top
        }
    };

    // Handler for viewing a community recipe
    const handleViewCommunityRecipe = async (recipe) => {
        setSelectedCommunityRecipe(recipe);
        setShowCommunityRecipeModal(true);
        setSaveCommunityRecipeStatus(null);
        setSaveCommunityRecipeMessage('');
        setIsCommunityRecipeSaved(false); // Reset

        if (user && supabaseClient && recipe.recipe_data?.recipeName) {
            try {
                const { data, error, count } = await supabaseClient
                    .from('saved_recipes')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('recipe_name', recipe.recipe_data.recipeName);

                if (error) {
                    console.error("Error checking if community recipe is saved:", error);
                    // Don't throw, just assume not saved or handle silently
                    setIsCommunityRecipeSaved(false);
                    return;
                };
                setIsCommunityRecipeSaved(count > 0);
            } catch (err) {
                console.error("Exception checking if community recipe is saved:", err);
                setIsCommunityRecipeSaved(false);
            }
        }
    };

    // Handler for saving a selected community recipe
    const handleSaveSelectedCommunityRecipe = async () => {
        if (!user) {
            setShowCommunityRecipeModal(false); // Close community modal
            setAuthMode('login'); // Set auth modal to login
            setShowAuthModal(true); // Show main auth modal
            return;
        }
        if (!selectedCommunityRecipe || !selectedCommunityRecipe.recipe_data || !supabaseClient) {
            setSaveCommunityRecipeStatus('error');
            setSaveCommunityRecipeMessage('Error: No recipe selected or data missing.');
            return;
        }

        setSaveCommunityRecipeStatus('loading');
        setSaveCommunityRecipeMessage('Saving...');

        try {
            const recipeToSave = selectedCommunityRecipe.recipe_data;
            const { error } = await supabaseClient
                .from('saved_recipes')
                .insert({
                    user_id: user.id,
                    recipe_name: recipeToSave.recipeName || 'Untitled Community Recipe',
                    recipe_data: recipeToSave,
                    folder: 'Saved Recipes', // Default folder
                    is_favorite: false,     // Default favorite status
                });

            if (error) throw error;

            setSaveCommunityRecipeStatus('success');
            setSaveCommunityRecipeMessage('Recipe saved to your collection!');
            setIsCommunityRecipeSaved(true);

            setTimeout(() => {
                if (setSaveCommunityRecipeStatus) { // Check if component is still mounted
                    setSaveCommunityRecipeStatus(null);
                    setSaveCommunityRecipeMessage('');
                }
            }, 3000);

        } catch (error) {
            console.error('Error saving community recipe:', error);
            setSaveCommunityRecipeStatus('error');
            setSaveCommunityRecipeMessage(`Failed to save: ${error.message}`);
        }
    };

    // New handler to open auth modal from community recipe modal
    const handleCommunityRecipeAuthRequest = () => {
        setShowCommunityRecipeModal(false); // Close the community recipe modal
        setAuthMode('login'); // Default to login, or 'signup' if preferred
        setShowAuthModal(true);     // Open the main auth modal
    };

    return (
        <div className="pageContainer">
            <Head>
                <title>nuggs.ai - Healthy Recipes with AI</title>
                <meta name="description" content="Discover tasty healthy recipes, find smart food substitutes, and get AI-powered nutrition advice with Nuggs.AI. Your free guide to healthier, delicious eating!" />
                <link rel="icon" href="/favicon.ico" />

                {/* SEO / Open Graph / Twitter Card Meta Tags */}
                <meta property="og:title" content="nuggs.ai - Healthy Recipes with AI" />
                <meta property="og:description" content="AI companion for smarter, healthier eating choices. Find substitutes, generate recipes, analyze meals, and get nutrition facts." />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://nuggs.ai" />
                <meta property="og:image" content="https://nuggs.ai/logo.png" />
                <meta property="og:image:alt" content="nuggs.ai Logo" />
                
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="nuggs.ai - Delicious Healthy Recipes Powered by AI" />
                <meta name="twitter:description" content="Your AI companion for smarter, healthier eating choices. Find substitutes, generate recipes, analyze meals, and get nutrition facts." />
                <meta name="twitter:image" content="https://nuggs.ai/logo.png" />

                <link rel="canonical" href="https://nuggs.ai" />

                {/* Structured Data (JSON-LD) */}
                <script type="application/ld+json">
                    {`
                        {
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            "name": "nugss.ai",
                            "url": "https://nuggs.ai",
                            "description": "AI-powered tools for healthy food suggestions, recipes, meal analysis, and nutritional information.",
                            "potentialAction": {
                                "@type": "SearchAction",
                                "target": {
                                    "@type": "EntryPoint",
                                    "urlTemplate": "https://nuggs.ai/search?q={search_term_string}"
                                },
                                "query-input": "required name=search_term_string"
                            }
                        }
                    `}
                </script>
            </Head>

            <header className="mainHeader">
                <Link href="/" className="logoLink">
                    <div className="logoArea">
                        <h1 className="logoText">
                          <img src="/logo.png" alt="Nuggs.ai logo" className="headerLogoImage" /> nuggs.ai
                        </h1>
                    </div>
                </Link>
                <nav>
                    <Link href="/" className="navLink navLinkActive">
                        Home
                    </Link>
                    <Link href="/blog" className="navLink">
                        Blog
                    </Link>
                    {user ? (
                        <Link href="/dashboard" className="navLink">
                            Dashboard
                        </Link>
                    ) : (
                        <button 
                            onClick={() => {
                                setAuthMode('login');
                                setShowAuthModal(true);
                            }}
                            className="navLink authNavButton"
                        >
                            Log In
                        </button>
                    )}
                </nav>
            </header>
            
            <div className="homePageLayout"> {/* New wrapper for main content and sidebar */}
                <main className="mainContentArea">
                    <section className="enhancedHeroSection">
                        <div className="heroContent">
                            <h2 className="heroTitle">Delicious <strong>Healthy</strong> Recipes</h2>
                            <p className="heroSubtitle">
                                Craving something delicious and nutritious? Tell us what you want or what you have in your fridge,  
                                and we&apos;ll whip up a custom recipe, just for you. Powered by AI.
                            </p>
                            
                            {/* This form is always for recipeGenerator now */}
                            <div className="pillSearchContainer">
                                <form onSubmit={handleSubmit} className="pillSearchForm">
                                    <div className="pillSearchBar">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="E.g., 'Pasta without gluten' or 'High-protein breakfast bowl'"
                                            className="pillSearchInput"
                                            disabled={isLoading || isRandomLoading}
                                        />
                                        <button
                                            type="submit"
                                            className="searchSubmitButton"
                                            disabled={isLoading || isRandomLoading || !inputValue}
                                            title="Generate recipe based on your input"
                                        >
                                            🔍
                                        </button>
                                    </div>
                                    
                                    {/* Recipe options in a more vertical layout */}
                                    <div className="recipeOptionsCompact">
                                        <div className="optionsSection">
                                            <h4>Difficulty:</h4>
                                            <div className="optionButtons">
                                                {activeTool.difficultyOptions.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        className={`optionPill ${selectedDifficulty === opt.value ? "optionPillSelected" : ''}`}
                                                        onClick={() => setSelectedDifficulty(opt.value)}
                                                        disabled={isLoading}
                                                    >
                                                        <span className="optionEmoji">{opt.emoji}</span> {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="optionsSection">
                                            <h4>Cook Time:</h4>
                                            <div className="optionButtons">
                                                {activeTool.cookTimeOptions.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        className={`optionPill ${selectedCookTime === opt.value ? "optionPillSelected" : ''}`}
                                                        onClick={() => setSelectedCookTime(opt.value)}
                                                        disabled={isLoading}
                                                    >
                                                        <span className="optionEmoji">{opt.emoji}</span> {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="optionsSection">
                                            <h4>Equipment:</h4>
                                            <div className="optionButtons">
                                                {activeTool.equipmentOptions.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        className={`optionPill ${selectedEquipment[opt.value] ? "optionPillSelected" : ''}`}
                                                        onClick={() => handleEquipmentToggle(opt.value)}
                                                        disabled={isLoading}
                                                    >
                                                        <span className="optionEmoji">{opt.emoji}</span> {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* New section for exclusions */}
                                        <div className="optionsSection">
                                            <h4>Exclude Ingredients:</h4>
                                            <div className="optionButtons">
                                                {commonExclusions.map(exclusion => (
                                                    <button
                                                        type="button"
                                                        key={exclusion.id}
                                                        className={`optionPill ${selectedExclusions[exclusion.id] ? "optionPillExcluded" : ''}`}
                                                        onClick={() => handleExclusionToggle(exclusion.id)}
                                                        disabled={isLoading}
                                                    >
                                                        <span className="optionEmoji">{exclusion.emoji}</span>
                                                        <span className={selectedExclusions[exclusion.id] ? "excludedText" : ""}>
                                                            {exclusion.label}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* New section for dietary preferences */}
                                        <div className="optionsSection">
                                            <h4>Dietary Preferences:</h4>
                                            <div className="optionButtons">
                                                {dietaryPreferences.map(preference => (
                                                    <button
                                                        type="button"
                                                        key={preference.id}
                                                        className={`optionPill ${selectedPreferences[preference.id] ? "optionPillSelected" : ''}`}
                                                        onClick={() => handlePreferenceToggle(preference.id)}
                                                        disabled={isLoading}
                                                    >
                                                        <span className="optionEmoji">{preference.emoji}</span>
                                                        {preference.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="optionsSection">
                                            <h4>Serving Size:</h4>
                                            <div className="optionButtons">
                                                {activeTool.servingSizeOptions.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        className={`optionPill ${selectedServingSize === opt.value ? "optionPillSelected" : ''}`}
                                                        onClick={() => setSelectedServingSize(opt.value)}
                                                        disabled={isLoading}
                                                    >
                                                        <span className="optionEmoji">{opt.emoji}</span> {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="heroActionButtons">
                                        <button
                                            type="submit"
                                            className="pillSearchButton"
                                            disabled={isLoading || isRandomLoading || !inputValue}
                                        >
                                            {isLoading ? 'Building your recipe...' : '✨ Create Healthy Recipe'}
                                        </button>
                                        <button
                                            type="button"
                                            className="pillSearchButton randomRecipeButton"
                                            onClick={handleRandomRecipeSubmit}
                                            disabled={isLoading || isRandomLoading}
                                        >
                                            {isRandomLoading ? 'Building your recipe...' : '🎲 Surprise Me!'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        
                        {/* Removed heroImageLayout and Image components as per instruction */}
                    </section>
                    
                    {/* Only show the tool container section if showToolContainer is true */}
                    {activeTool && showToolContainer && (
                        <section className={`toolDisplaySection ${resultsShown ? 'resultsActive' : ''}`}>
                            <div className="toolContainer">
                                {(isLoading || isRandomLoading) && (
                                    <div className="loadingSpinner" ref={loadingRef}>
                                        <p className="loadingText">Building your healthy recipe{loadingDots}</p>
                                    </div>
                                )}
                                {error && <p className="errorMessage">{error}</p>}
                                
                                {results && (
                                    <div className="resultsContainer">
                                        {renderRecipeResults(results)}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {results && (
                        <div className="saveRecipeContainer">
                            <button onClick={handleSaveRecipe} className="saveRecipeButton">
                                Save Recipe
                            </button>
                            
                            {saveStatus && (
                                <div className={`saveStatusMessage ${saveStatus === 'success' ? 'saveSuccess' : 'saveError'}`}>
                                    {saveMessage}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Display for logged-in, non-premium users showing remaining tries */}
                    {!authLoading && user && !isPremium && typeof usageRemaining === 'number' && usageRemaining >= 0 && (
                        <div className="usageRemainingTodayInfo">
                            <p>You have {usageRemaining} recipe generation{usageRemaining === 1 ? '' : 's'} left today.</p>
                        </div>
                    )}

                    {/* Display for anonymous users showing remaining tries */}
                    {!authLoading && !user && !anonymousUserTries.loading && typeof anonymousUserTries.remaining === 'number' && (
                         <div className="usageRemainingTodayInfo">
                            <p>You have {anonymousUserTries.remaining} recipe generation{anonymousUserTries.remaining === 1 ? '' : 's'} left today.</p>
                        </div>
                    )}

                    {usageLimitReached && user && ( // This shows when a logged-in user HITS their limit
                        <div className="usageLimitAlert">
                            <p>You've reached your daily limit of {isPremium ? 'unlimited' : (process.env.NEXT_PUBLIC_FREE_TRIES || 5)} recipe generations.</p>
                            <Link href="/pricing" className="upgradeToPremiumButton">
                                Upgrade to Premium
                            </Link>
                        </div>
                    )}

                    {!user && !authLoading && ( // General CTA for anonymous users
                        <div className="anonymousUsageNote">
                            <p>
                                {/* Removed: <strong>Anonymous users:</strong> You can generate up to {process.env.NEXT_PUBLIC_ANONYMOUS_TRIES || 3} recipes per day. */}
                                <button
                                    onClick={() => {
                                        setAuthMode('signup');
                                        setShowAuthModal(true);
                                    }}
                                    className="createAccountButton"
                                >
                                    Create a free account
                                </button>
                                &nbsp;to generate up to {process.env.NEXT_PUBLIC_FREE_TRIES || 5} recipes and save them for later.
                                <br />
                                For just $2 a month, you can also get premium to get unlimited recipes and saves.&nbsp;
                                <Link href="/pricing" className="learnMoreLink">
                                    Learn more
                                </Link>.
                            </p>
                        </div>
                    )}
                </main> {/* End of mainContentArea */}

                {/* Community Recipes Sidebar */}
                { !loadingCommunityRecipes && communityRecipes && communityRecipes.length > 0 && (
                  <aside className="communityRecipesSidebar">
                    <h2><strong>Community</strong> Recipes</h2>
                    <p className="communitySidebarSubtitle">
                      Get inspired by delicious and healthy recipes generated by other users!
                    </p>
                    {errorCommunityRecipes && <p className="errorMessage">{errorCommunityRecipes}</p>}
                    <div className="communityRecipeList">
                      {communityRecipes.map((recipe) => (
                        recipe.recipe_data && recipe.recipe_data.recipeName ? ( // Ensure data exists
                          <div key={recipe.id} className="communityRecipeCard">
                            <div className="recipeNameCard"> {/* No highlightedRecipeCard here, communityRecipeCard has shadow */}
                              <h3 className="recipeTitlePill">{recipe.recipe_data.recipeName}</h3>
                              {recipe.recipe_data.description && <p>{recipe.recipe_data.description}</p>}
                              {(recipe.recipe_data.prepTime || recipe.recipe_data.cookTime || recipe.recipe_data.difficultyRating || recipe.recipe_data.servings) && (
                                <div className="recipeMeta">
                                  {recipe.recipe_data.prepTime && <span><strong>Prep:</strong> {recipe.recipe_data.prepTime}</span>}
                                  {recipe.recipe_data.cookTime && <span><strong>Cook:</strong> {recipe.recipe_data.cookTime}</span>}
                                  {recipe.recipe_data.difficultyRating && <span><strong>Difficulty:</strong> {recipe.recipe_data.difficultyRating}</span>}
                                  {recipe.recipe_data.servings && <span><strong>Servings:</strong> {recipe.recipe_data.servings}</span>}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleViewCommunityRecipe(recipe)}
                              className="viewRecipeButton"
                            >
                              View Full Recipe
                            </button>
                          </div>
                        ) : null // Skip rendering if essential data is missing
                      ))}
                    </div>
                  </aside>
                )}
                { loadingCommunityRecipes && (
                  <aside className="communityRecipesSidebar">
                    <h2><strong>Community</strong> Recipes</h2>
                    <p className="communitySidebarSubtitle">
                      Get inspired by delicious and healthy recipes generated by other users!
                    </p>
                    <div className="loadingSpinner" style={{margin: '1rem auto'}}><p className="loadingText">Loading community recipes...</p></div>
                  </aside>
                )}
            </div> {/* End of homePageLayout */}

                <AuthModal 
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    authMode={authMode}
                    message={authMode === 'login' 
                        ? "Log in to save recipes and track your usage"
                        : "Create an account to save recipes and get 3 free generations daily"}
                />

                <CommunityRecipeModal
                    isOpen={showCommunityRecipeModal}
                    onClose={() => setShowCommunityRecipeModal(false)}
                    recipe={selectedCommunityRecipe}
                    onSave={handleSaveSelectedCommunityRecipe}
                    isSaved={isCommunityRecipeSaved}
                    userLoggedIn={!!user}
                    saveStatus={saveCommunityRecipeStatus}
                    saveMessage={saveCommunityRecipeMessage}
                    onAuthRequest={handleCommunityRecipeAuthRequest}
                />
        </div>
    );
} 