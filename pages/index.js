import Head from 'next/head';
import Image from 'next/image'; // For optimized images
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from '../styles/Home.module.css';

const AMAZON_AFFILIATE_TAG = 'yournewtag-20';

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
    { id: 'vegan', label: 'Vegan (Strict Plant-Based)', emoji: '🌿' },
    { id: 'vegetarian', label: 'Vegetarian (No Meat/Fish)', emoji: '🥕' },
    { id: 'lowcarb', label: 'Low Carb', emoji: '📉' },
    { id: 'lowfat', label: 'Low Fat', emoji: '🥑' },
    { id: 'highprotein', label: 'High Protein', emoji: '💪' },
];

// Updated Tools data for Healthy Food Substitutes
const tools = [
    {
        id: 'suggestionExplorer',
        name: 'Find Healthy Alternatives',
        description: 'Enter a food or ingredient, and get healthier suggestions, direct alternatives, or portion advice. Compare nutritional information side-by-side.',
        icon: '🔄', // Icon for swapping/alternatives
        inputType: 'textarea',
        inputPlaceholder: "e.g., 'Potato chips', 'White bread', 'Sour cream in a recipe', 'Ground beef for burgers'",
        buttonText: 'Get Suggestions',
    },
    {
        id: 'recipeGenerator',
        name: 'Healthy Recipe Ideas',
        description: 'Get custom healthy recipes. Specify ingredients you have, dietary needs, preferred cuisine, cook time, and equipment. Click ingredients for Amazon search.',
        icon: '🥗', // Icon for healthy recipes
        inputType: 'textarea',
        inputPlaceholder: "e.g., 'Quick vegan lunch with quinoa and avocado' or 'Low-carb dinner using chicken breast and broccoli'",
        buttonText: 'Generate Healthy Recipe',
        difficultyOptions: [ // Kept difficulty, can be adapted
            { label: 'Beginner', value: 'Beginner', emoji: '🧑‍🍳' },
            { label: 'Intermediate', value: 'Intermediate', emoji: '👩‍🍳' },
            { label: 'Advanced', value: 'Advanced', emoji: '🌟' },
        ],
        cookTimeOptions: [ // Kept cook time
            { label: '< 20 min', value: '< 20 min', emoji: '⏱️' },
            { label: '20-45 min', value: '20-45 min', emoji: '⏳' },
            { label: '> 45 min', value: '> 45 min', emoji: '⏰' },
        ],
        equipmentOptions: [ // Kept equipment
            { label: 'Oven', value: 'oven', emoji: '♨️' },
            { label: 'Air Fryer', value: 'airfryer', emoji: '💨' },
            { label: 'Stovetop', value: 'pan', emoji: '🍳' },
            { label: 'Microwave', value: 'microwave', emoji: '💡' },
            { label: 'Blender', value: 'blender', emoji: '🥤' },
            { label: 'Instant Pot / Pressure Cooker', value: 'pressurecooker', emoji: '🍲' },
        ],
    },
    {
        id: 'mealAnalyzer',
        name: 'Analyze Your Meal',
        description: 'Upload a photo of your meal or describe it. Get feedback on its healthiness, suggestions for improvement, ingredient swaps, and portion advice.',
        icon: '🍽️', // Icon for meal analysis
        inputType: 'file', // Can also allow text input as fallback
        inputPlaceholder: "Upload an image or describe your meal (e.g., 'Pasta with cream sauce and garlic bread')",
        buttonText: 'Analyze Meal',
    },
    {
        id: 'nutritionFacts',
        name: 'Nutrition & Healthy Eating Facts',
        description: 'Ask questions about nutrition, food benefits, or get interesting facts about healthy eating.',
        icon: '💡', // Icon for knowledge/facts
        inputPlaceholder: "e.g., 'Benefits of eating broccoli?' or 'What are complete proteins?' (or leave empty for random facts)",
        buttonText: 'Get Facts',
    },
    {
        id: 'foodComparer',
        name: 'Compare Foods',
        description: 'Compare nutritional values and ingredients of different food items or brands.',
        icon: '⚖️',
        inputPlaceholder: "e.g., 'Compare almond milk vs oat milk' or 'Greek yogurt vs regular yogurt'",
        buttonText: 'Compare Foods',
        comingSoon: true, // This can be complex to implement well without structured data
    },
    {
        id: 'community',
        name: 'Healthy Food Community',
        description: 'See what others are cooking and sharing! Click to view posts tagged with #HealthyEating or #HealthySubstitutes on Instagram.',
        icon: '🌐',
        isLinkOut: true,
        linkUrl: 'https://www.instagram.com/explore/tags/healthyeating/' // Example link
    },
    {
        id: 'mealPlanner',
        name: 'AI Meal Planner',
        description: 'Get AI-suggested meal plans for the day or week based on your dietary goals and preferences. (Coming Soon)',
        icon: '📅',
        buttonText: 'Plan My Meals',
        comingSoon: true,
    },
];

const PROXY_API_URL = '/api/generate';

export default function HomePage() {
    const [selectedToolId, setSelectedToolId] = useState(tools[0].id);
    const [activeTool, setActiveTool] = useState(tools[0]);
    const [inputValue, setInputValue] = useState('');
    const [results, setResults] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const [selectedDifficulty, setSelectedDifficulty] = useState(tools.find(t => t.id === 'recipeGenerator')?.difficultyOptions?.[0]?.value || 'Beginner');
    const [selectedCookTime, setSelectedCookTime] = useState(tools.find(t => t.id === 'recipeGenerator')?.cookTimeOptions?.[0]?.value || '< 20 min');
    const [selectedEquipment, setSelectedEquipment] = useState({});
    const [currentMimeType, setCurrentMimeType] = useState('');

    // New state for recipe tool inputs
    const [selectedExclusions, setSelectedExclusions] = useState({});

    // New state for instruction timers
    const [instructionTimersData, setInstructionTimersData] = useState({});
    // { index: { checked: boolean, originalDuration: number | null, timeLeft: number | null, timerActive: boolean }}
    const [currentRunningTimer, setCurrentRunningTimer] = useState({ intervalId: null, stepIndex: null });

    // Effect to update activeTool when selectedToolId changes
    useEffect(() => {
        const tool = tools.find(t => t.id === selectedToolId);
        if (tool) {
            setActiveTool(tool);
            setInputValue('');
            setResults('');
            setError('');
            setSelectedFile(null);
            // Reset recipe-specific options if switching to the recipe tool
            if (tool.id === 'recipeGenerator') {
                setSelectedDifficulty(tool.difficultyOptions?.[0]?.value || 'Beginner');
                setSelectedCookTime(tool.cookTimeOptions?.[0]?.value || '< 20 min');
                setSelectedEquipment({}); // Reset equipment
                setSelectedExclusions({}); // Reset exclusions
                setInstructionTimersData({}); // Clear timer data
                if (currentRunningTimer.intervalId) {
                    clearInterval(currentRunningTimer.intervalId);
                }
                setCurrentRunningTimer({ intervalId: null, stepIndex: null });
            } else { // If switching away from recipe tool, also clear timers
                setInstructionTimersData({});
                if (currentRunningTimer.intervalId) {
                    clearInterval(currentRunningTimer.intervalId);
                }
                setCurrentRunningTimer({ intervalId: null, stepIndex: null });
            }
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
        let basePrompt = `You are an AI expert focused on healthy eating, nutrition, and food substitutions. Your goal is to provide helpful, actionable, and evidence-informed advice. `;
        switch (tool.id) {
            case 'nutritionFacts':
                let triviaPrompt = basePrompt + "You are a knowledgeable and engaging AI expert on nutrition, healthy eating habits, food science, and the benefits of various foods. Format your response using Markdown. ";
                if (userInput) {
                    triviaPrompt += `Please answer the following question concisely and engagingly: "${userInput}"`;
                } else {
                    triviaPrompt += "Tell me an interesting and surprising fun fact or piece of information about healthy eating or nutrition.";
                }
                triviaPrompt += " Keep your response friendly, informative, and suitable for a general audience. If asked about non-food/nutrition topics, politely explain your specialization.";
                return triviaPrompt;

            case 'recipeGenerator':
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

                const activeExclusionLabels = Object.entries(selectedExclusions)
                    .filter(([_, value]) => value)
                    .map(([key]) => commonExclusions.find(ex => ex.id === key)?.label || key)
                    .join(', ');

                let recipePrompt = `You are an AI chef specializing in creating healthy and delicious recipes.
The user wants a recipe based on this core request: "${userInput}".
Additionally, consider these user preferences:
- Difficulty: ${selectedDifficulty}
- Target Cook Time: ${selectedCookTime}
- Available Equipment: ${equipmentInstructions}
- Dietary Restrictions/Preferences to AVOID or ACCOMMODATE: "${activeExclusionLabels || 'None specified'}"

Please provide the response STRICTLY as a single, valid JSON object with the following structure:
{
  "recipeName": "A catchy and descriptive healthy recipe name (e.g., 'Mediterranean Quinoa Salad with Lemon-Herb Dressing')",
  "description": "A brief, enticing description of the recipe, highlighting its health aspects (2-3 sentences). Mention if any specific dietary preferences were addressed.",
  "prepTime": "Estimated preparation time (e.g., '15 minutes')",
  "cookTime": "Estimated cooking time (e.g., '20 minutes')",
  "difficultyRating": "${selectedDifficulty}",
  "servings": "Number of servings (e.g., '2-3 servings' or 'Approx. 4 cups')",
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
- For "ingredients", "quantity" and "unit" should be strings.
- For "instructions", "stepNumber" should be a number.
- For "substitutionSuggestions" (0-3 suggestions): focus on common swaps to make the dish even healthier or cater to restrictions.
- For "pairingSuggestions" (0-2 suggestions): suggest healthy side dishes, drinks, or garnishes.
- If dietary restrictions are mentioned, try to create a recipe that meets them. If a core ingredient conflicts, clearly state this and suggest an alternative in the 'notes' of that ingredient or in the main recipe 'description' or 'substitutionSuggestions'.
- All string values within the JSON must be properly escaped.`;
                return recipePrompt;

            case 'suggestionExplorer':
                if (!userInput) {
                    setError("Please enter a food or ingredient you'd like to find alternatives for.");
                    return null;
                }
                return basePrompt + `The user is looking for healthy alternatives or advice regarding: "${userInput}".
Provide the response STRICTLY as a single, valid JSON object with the following structure:
{
  "originalItem": "${userInput}",
  "analysis": "Brief nutritional overview or common concerns associated with the original item (1-2 sentences).",
  "suggestions": [
    {
      "type": "Direct Substitute | Healthier Version | Ingredient Swap | Portion Control | Recipe Idea",
      "suggestedItem": "Name of the suggested food/ingredient/method",
      "description": "Detailed explanation of the suggestion, why it's healthier, and how to use it (2-4 sentences). Include specific benefits like 'lower in sugar', 'higher in fiber', 'plant-based option'.",
      "nutritionalComparison": { // Optional: if applicable and data is available
        "original": { "calories": "X kcal", "fat": "Y g", "sugar": "Z g", "notes": "per serving/100g" },
        "suggested": { "calories": "A kcal", "fat": "B g", "sugar": "C g", "notes": "per serving/100g" }
      },
      "recipeSnippet": "Optional: A very brief recipe idea or usage tip (e.g., 'Try using mashed avocado instead of mayonnaise in your next sandwich.')",
      "amazonSearchKeywords": ["keyword1 for suggested item", "keyword2"]
    }
  ],
  "generalTips": [
    "Offer 1-2 general healthy eating tips related to the user's query."
  ]
}

IMPORTANT:
- Provide 2-4 diverse and actionable suggestions.
- Focus on practical, easily accessible alternatives.
- If the original item is already healthy, acknowledge that and perhaps offer tips on preparation or pairing.
- Ensure the entire response is a single, valid JSON object. No text outside this structure.
- All string values must be properly escaped.
- If the query is unclear or not food-related, respond with JSON: {"error": "Please provide a specific food or ingredient for suggestions."}`;

            case 'mealAnalyzer':
                // For image analysis, the prompt is more about the output structure.
                // The actual image data is sent separately.
                // If userInput is present, it means the user described the meal.
                let mealDescription = userInput ? `The user describes their meal as: "${userInput}".` : "The user has uploaded an image of their meal.";

                return basePrompt + `You are "NutriVision AI", a sophisticated AI nutritionist specializing in analyzing meals (from images or descriptions) for their healthiness.
${mealDescription}
Based on the provided information (image and/or text), provide a constructive analysis and suggestions for improvement.

Please provide the response STRICTLY as a single, valid JSON object with the following structure:
{
  "mealTitle": "string (e.g., 'NutriVision AI Meal Analysis')",
  "overallAssessment": {
    "healthScore": "number (A rating from 1-10, 10 being healthiest. Be critical but fair.)",
    "summary": "string (A descriptive paragraph on the meal's apparent composition, potential nutritional balance (macros, micros), and overall health impression. 2-4 sentences.)",
    "positiveAspects": ["string (List 1-3 positive aspects, e.g., 'Good source of vegetables', 'Includes lean protein')"],
    "areasForImprovement": ["string (List 1-3 areas for improvement, e.g., 'High in saturated fat', 'Could include more fiber', 'Portion size appears large')"]
  },
  "detailedSuggestions": [
    {
      "suggestionType": "Ingredient Swap | Portion Adjustment | Cooking Method Change | Add Nutrient-Rich Food | Reduce Unhealthy Component",
      "specificAdvice": "string (Actionable advice, e.g., 'Swap white rice for brown rice to increase fiber.', 'Consider reducing the cheese portion by half.')",
      "reasoning": "string (Why this change would be beneficial, e.g., 'Brown rice has a lower glycemic index and more micronutrients.')"
    }
  ],
  "healthierAlternativeMealIdea": { // Optional: Suggest a completely different healthier meal
    "name": "string (e.g., 'Instead of creamy pasta, try a Zucchini Noodle Stir-fry with Tofu')",
    "description": "string (Brief description of the alternative meal and its benefits)"
  },
  "estimatedNutrition": { // Optional: very rough estimate if possible
    "calories": "string (e.g., 'Approx. 600-800 kcal')",
    "protein": "string (e.g., 'Approx. 20-30g')",
    "fat": "string (e.g., 'Approx. 30-40g')",
    "carbs": "string (e.g., 'Approx. 50-70g')",
    "notes": "string (e.g., 'This is a rough estimate. Actual values depend on specific ingredients and portions.')"
  },
  "error": "string (Optional: Use this field if the image is unclear, not of food, or if analysis is not possible, e.g., 'Cannot provide analysis: Image is unclear or not of food.')"
}

IMPORTANT:
- Ensure the entire response is a single, valid JSON object. No text outside this structure.
- All string values must be properly escaped.
- Provide 1-3 "detailedSuggestions".
- If the meal is already very healthy, acknowledge this and offer minor tips or affirmations.
- If only a text description is provided (no image), base the analysis on that.
- If the image/description is unsuitable, populate the main "error" field.`;
            case 'community':
                return null; // No AI prompt needed for this tool
            default:
                let defaultPrompt = basePrompt + `Format your response using Markdown. `;
                if (userInput) {
                     defaultPrompt += `Regarding the tool "${tool.name}", process the following input: "${userInput}". Provide a concise, helpful, nugget-related response.`;
                } else {
                    defaultPrompt += `You are an AI for "${tool.name}". Please provide information or perform the requested task related to nuggets.`;
                }
                return defaultPrompt;
        }
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Get base64 part
        reader.onerror = error => reject(error);
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!activeTool || activeTool.comingSoon) return;

        // If it's a link-out tool, don't proceed with API call logic
        if (activeTool.isLinkOut) {
            if (activeTool.linkUrl) {
                window.open(activeTool.linkUrl, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        const promptText = getPromptForTool(activeTool, inputValue);

        if (activeTool.id === 'mealAnalyzer' && !selectedFile && !inputValue) {
            setError('Please upload an image or describe your meal for analysis.');
            return;
        }

        if (!promptText && activeTool.id !== 'nutritionFacts' && activeTool.id !== 'mealAnalyzer' && activeTool.id !== 'suggestionExplorer') {
            return;
        }

        setIsLoading(true);
        setResults('');
        setError('');

        let requestBody = { promptText };

        try {
            if (activeTool.id === 'mealAnalyzer' && selectedFile) {
                const imageData = await fileToBase64(selectedFile);
                requestBody = {
                    promptText, // This is the instructional prompt for the analyzer
                    imageData,
                    mimeType: currentMimeType || selectedFile.type // Use stored mimeType or derive from file
                };
            }

            const response = await fetch(PROXY_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `API request failed: ${response.statusText}`);
            }

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                let aiResponseText = data.candidates[0].content.parts[0].text;

                if (activeTool.id === 'recipeGenerator' || activeTool.id === 'mealAnalyzer' || activeTool.id === 'suggestionExplorer' ) {
                    // Attempt to extract JSON string if wrapped in markdown code blocks
                    // Handles ```json ... ``` or ``` ... ```
                    const markdownMatch = aiResponseText.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
                    if (markdownMatch && markdownMatch[1]) {
                        aiResponseText = markdownMatch[1];
                    }
                    aiResponseText = aiResponseText.trim();
                }

                setResults(aiResponseText);
                if (activeTool.id === 'recipeGenerator') {
                    // setCheckedInstructions({}); // This line is now handled by instructionTimersData reset
                }
            } else if (data.promptFeedback?.blockReason) {
                setError(`Request blocked: ${data.promptFeedback.blockReason}. Try a different prompt.`);
            } else {
                setError('Received an unexpected response from the AI.');
            }
        } catch (err) {
            console.error("API Call Error:", err);
            setError(err.message || 'Failed to fetch response from AI.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setCurrentMimeType(file.type); // Store mime type
            setError(''); // Clear previous errors
        } else {
            setSelectedFile(null);
            setCurrentMimeType('');
        }
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
                return <p className={styles.errorMessage}>Error from AI: {recipe.error}</p>;
            }

            return (
                <div className={styles.recipeOutputContainer}>
                    <div className={styles.recipeNameCard}>
                        <h2>{recipe.recipeName || 'Healthy Recipe'}</h2>
                        <p>{recipe.description || 'No description provided.'}</p>
                        <div className={styles.recipeMeta}>
                            <span><strong>Prep:</strong> {recipe.prepTime || 'N/A'}</span>
                            <span><strong>Cook:</strong> {recipe.cookTime || 'N/A'}</span>
                            <span><strong>Difficulty:</strong> {recipe.difficultyRating || 'N/A'}</span>
                            <span><strong>Servings:</strong> {recipe.servings || 'N/A'}</span>
                        </div>
                        {recipe.healthBenefits && recipe.healthBenefits.length > 0 && (
                            <div className={styles.healthBenefitsSection}>
                                <strong>Health Highlights:</strong>
                                <ul>
                                    {recipe.healthBenefits.map((benefit, idx) => <li key={idx}>{benefit}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className={styles.recipeSection}>
                        <h3>Ingredients</h3>
                        <div className={styles.ingredientsGrid}>
                            {recipe.ingredients && recipe.ingredients.length > 0 ? recipe.ingredients.map((ing, index) => (
                                <div 
                                    key={index} 
                                    className={styles.ingredientPill}
                                    onClick={() => handleAmazonSearch(ing.name, 'ingredient')}
                                    title={`Click to search for ${ing.name} on Amazon`}
                                >
                                    <span className={styles.ingredientName}>{ing.name}</span>
                                    <span className={styles.ingredientQuantity}>{`${ing.quantity || ''} ${ing.unit || ''}`}</span>
                                    {ing.notes && <small className={styles.ingredientNotes}>({ing.notes})</small>}
                                </div>
                            )) : <p>No ingredients listed.</p>}
                        </div>
                    </div>

                    <div className={styles.recipeSection}>
                        <h3>Instructions</h3>
                        {recipe.instructions && recipe.instructions.length > 0 ? (
                            <ul className={styles.instructionsList}>
                                {recipe.instructions.map((instr, index) => {
                                    const timerStepData = instructionTimersData[index] || {};
                                    const { checked, originalDuration, timeLeft, timerActive } = timerStepData;
                                    const displayTime = timerActive ? formatTime(timeLeft) : (originalDuration ? formatTime(originalDuration) : '');

                                    return (
                                        <li
                                            key={instr.stepNumber || index}
                                            className={`${styles.instructionStep} ${checked ? styles.checkedInstruction : ''} ${timerActive ? styles.activeTimerInstruction : ''}`}
                                            onClick={() => handleInstructionToggle(index)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!checked}
                                                readOnly
                                                className={styles.instructionCheckbox}
                                            />
                                            <span className={styles.stepNumber}>Step {instr.stepNumber}:</span>
                                            <span className={styles.stepDescription}>{instr.description}</span>
                                            {originalDuration !== null && (
                                                <span className={styles.timerDisplay}>
                                                    {timerActive ? `⏳ ${displayTime}` : (checked && timeLeft === 0) ? `✅ Done` : (displayTime ? `⏱️ ${displayTime}` : '')}
                                                </span>
                                            )}
                                            {!timerActive && !checked && originalDuration !== null && currentRunningTimer.stepIndex === null && (
                                                <button
                                                    className={styles.startTimerButton}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent li onClick from firing
                                                        startTimerForStep(index);
                                                    }}
                                                >
                                                    Start Timer
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <p>No instructions provided.</p>}
                    </div>

                    {recipe.substitutionSuggestions && recipe.substitutionSuggestions.length > 0 && (
                        <div className={styles.recipeSection}>
                            <h3>Healthier Substitution Ideas</h3>
                            <div className={styles.suggestionCardsContainer}>
                                {recipe.substitutionSuggestions.map((sub, index) => (
                                    <div key={`sub-${index}`} className={styles.suggestionCard}>
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
                        <div className={styles.recipeSection}>
                            <h3>Healthy Pairing Suggestions</h3>
                            <div className={styles.suggestionCardsContainer}>
                                {recipe.pairingSuggestions.map((item, index) => (
                                    <div 
                                        key={`pairing-${index}`} 
                                        className={styles.suggestionCard}
                                        onClick={() => handleAmazonSearch(item.amazonSearchKeywords || item.name, 'pairing_suggestion')}
                                        title={`Search for ${item.name} related items on Amazon`}
                                    >
                                        <h4>{item.emoji && <span className={styles.suggestionEmoji}>{item.emoji}</span>} {item.name} <small>({item.type})</small></h4>
                                        {item.description && <p>{item.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            console.error("Failed to parse healthy recipe JSON. Error:", e);
            console.error("Raw JSON data that failed to parse:", jsonData);
            // Fallback to render as markdown if JSON parsing fails
            return (
                <>
                    <p className={styles.errorMessage}>
                        Oops! We had trouble displaying this recipe in the structured format. 
                        This can sometimes happen if the AI's response isn't perfect JSON. 
                        Here's the raw data from the AI:
                    </p>
                    <div className={styles.resultsContent}>
                        <ReactMarkdown>{jsonData}</ReactMarkdown>
                    </div>
                </>
            );
        }
    };

    // Helper function to render critique results
    const renderCritiqueResults = (jsonData) => {
        console.log("Attempting to parse meal analysis JSON. Raw data received:", jsonData);
        try {
            const analysis = JSON.parse(jsonData);
            console.log("Successfully parsed meal analysis JSON:", analysis);

            if (analysis.error && analysis.error.trim() !== "") {
                return <p className={styles.errorMessage}>Error from AI: {analysis.error}</p>;
            }

            const {
                mealTitle = "NutriVision AI Meal Analysis",
                overallAssessment = {},
                detailedSuggestions = [],
                healthierAlternativeMealIdea,
                estimatedNutrition
            } = analysis;

            const {
                healthScore,
                summary = "No overall summary provided.",
                positiveAspects = [],
                areasForImprovement = []
            } = overallAssessment;

            return (
                <div className={styles.critiqueOutputContainer}>
                    {mealTitle && <h3 className={styles.critiqueOverallTitle}>{mealTitle}</h3>}

                    <div className={styles.critiqueCard}>
                        <h4 className={styles.critiqueCardTitle}>Overall Assessment</h4>
                        <div className={styles.critiqueCardContent}>
                            {healthScore !== undefined && <p><strong>Health Score:</strong> {Number(healthScore).toFixed(1)} / 10</p>}
                            <p>{summary}</p>
                            {positiveAspects.length > 0 && (
                                <>
                                    <strong>Positive Aspects:</strong>
                                    <ul>{positiveAspects.map((aspect, i) => <li key={`pos-${i}`}>{aspect}</li>)}</ul>
                                </>
                            )}
                            {areasForImprovement.length > 0 && (
                                <>
                                    <strong>Areas for Improvement:</strong>
                                    <ul>{areasForImprovement.map((area, i) => <li key={`imp-${i}`}>{area}</li>)}</ul>
                                </>
                            )}
                        </div>
                    </div>

                    {detailedSuggestions.length > 0 && (
                        <div className={styles.critiqueCard}>
                            <h4 className={styles.critiqueCardTitle}>Detailed Suggestions</h4>
                            {detailedSuggestions.map((sugg, index) => (
                                <div key={`sugg-${index}`} className={styles.suggestionDetailItem}>
                                    <h5>{sugg.suggestionType}</h5>
                                    <p><strong>Advice:</strong> {sugg.specificAdvice}</p>
                                    <p><em>Reasoning: {sugg.reasoning}</em></p>
                                </div>
                            ))}
                        </div>
                    )}

                    {healthierAlternativeMealIdea && healthierAlternativeMealIdea.name && (
                         <div className={styles.critiqueCard}>
                            <h4 className={styles.critiqueCardTitle}>Healthier Alternative Idea</h4>
                            <div className={styles.critiqueCardContent}>
                                <p><strong>Try:</strong> {healthierAlternativeMealIdea.name}</p>
                                <p>{healthierAlternativeMealIdea.description}</p>
                            </div>
                        </div>
                    )}
                    
                    {estimatedNutrition && (
                         <div className={styles.critiqueCard}>
                            <h4 className={styles.critiqueCardTitle}>Estimated Nutrition (Rough Guide)</h4>
                            <div className={styles.critiqueCardContent}>
                                {estimatedNutrition.calories && <p><strong>Calories:</strong> {estimatedNutrition.calories}</p>}
                                {estimatedNutrition.protein && <p><strong>Protein:</strong> {estimatedNutrition.protein}</p>}
                                {estimatedNutrition.fat && <p><strong>Fat:</strong> {estimatedNutrition.fat}</p>}
                                {estimatedNutrition.carbs && <p><strong>Carbs:</strong> {estimatedNutrition.carbs}</p>}
                                {estimatedNutrition.notes && <p><small><em>{estimatedNutrition.notes}</em></small></p>}
                            </div>
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            console.error("Failed to parse or render meal analysis JSON. Error:", e);
            console.error("Raw JSON data that failed to parse:", jsonData);
            return (
                <>
                    <p className={styles.errorMessage}>
                        Oops! We had trouble displaying this meal analysis.
                        This can sometimes happen if the AI's response isn't perfect JSON.
                        Here's the raw data from the AI:
                    </p>
                    <div className={styles.resultsContent}>
                        <ReactMarkdown>{jsonData}</ReactMarkdown>
                    </div>
                </>
            );
        }
    };

    // New helper function to render Suggestion Explorer results
    const renderSuggestionExplorerResults = (jsonData) => {
        console.log("Attempting to parse suggestion explorer JSON. Raw data received:", jsonData);
        try {
            const data = JSON.parse(jsonData);
            console.log("Successfully parsed suggestion explorer JSON:", data);

            if (data.error) {
                return <p className={styles.errorMessage}>Error from AI: {data.error}</p>;
            }

            const { originalItem, analysis, suggestions = [], generalTips = [] } = data;

            return (
                <div className={styles.suggestionExplorerOutputContainer}>
                    <h3>Alternatives for: {originalItem}</h3>
                    {analysis && <p className={styles.suggestionAnalysis}>{analysis}</p>}

                    {suggestions.length > 0 && (
                        <div className={styles.suggestionList}>
                            <h4>Suggestions:</h4>
                            {suggestions.map((sugg, index) => (
                                <div key={index} className={styles.suggestionItemCard}>
                                    <h5>{sugg.suggestedItem} <span className={styles.suggestionTypeTag}>({sugg.type})</span></h5>
                                    <p>{sugg.description}</p>
                                    {sugg.nutritionalComparison && (
                                        <div className={styles.nutritionalComparison}>
                                            <h6>Nutritional Snapshot (Approx.):</h6>
                                            <div className={styles.comparisonTable}>
                                                <div>
                                                    <strong>Original ({originalItem}):</strong>
                                                    {sugg.nutritionalComparison.original && Object.entries(sugg.nutritionalComparison.original).map(([key, value]) => key !== 'notes' ? <span key={key}>{key}: {value}</span> : null)}
                                                    {sugg.nutritionalComparison.original?.notes && <small><em>({sugg.nutritionalComparison.original.notes})</em></small>}
                                                </div>
                                                <div>
                                                    <strong>Suggested ({sugg.suggestedItem}):</strong>
                                                    {sugg.nutritionalComparison.suggested && Object.entries(sugg.nutritionalComparison.suggested).map(([key, value]) => key !== 'notes' ? <span key={key}>{key}: {value}</span> : null)}
                                                    {sugg.nutritionalComparison.suggested?.notes && <small><em>({sugg.nutritionalComparison.suggested.notes})</em></small>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {sugg.recipeSnippet && <p className={styles.recipeSnippet}><strong>Tip:</strong> {sugg.recipeSnippet}</p>}
                                    {sugg.amazonSearchKeywords && sugg.amazonSearchKeywords.length > 0 && (
                                        <button 
                                            onClick={() => handleAmazonSearch(sugg.amazonSearchKeywords, 'suggestion_item')}
                                            className={styles.amazonSearchButtonSmall}
                                        >
                                            Search for {sugg.suggestedItem} on Amazon
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {generalTips.length > 0 && (
                        <div className={styles.generalTipsSection}>
                            <h4>General Healthy Eating Tips:</h4>
                            <ul>
                                {generalTips.map((tip, index) => <li key={index}>{tip}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            console.error("Failed to parse suggestion explorer JSON. Error:", e);
            console.error("Raw JSON data that failed to parse:", jsonData);
            return (
                <>
                    <p className={styles.errorMessage}>
                        Oops! We had trouble displaying these suggestions.
                        Here's the raw data from the AI:
                    </p>
                    <div className={styles.resultsContent}>
                        <ReactMarkdown>{jsonData}</ReactMarkdown>
                    </div>
                </>
            );
        }
    };

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>AI Healthy Food Substitutes & Recipes</title>
                <meta name="description" content="AI-powered tools for healthy food suggestions, recipes, meal analysis, and nutritional information." />
                <link rel="icon" href="/healthy-icon.png" />
            </Head>

            <header className={styles.mainHeaderPill}>
                <div className={styles.logoArea}>
                    <Image src="/healthy-icon.png" alt="Healthy Food AI Logo" width={40} height={40} />
                    <span className={styles.logoText}>HealthySubst.AI</span>
                </div>
                <p className={styles.tagline}>
                    Your AI companion for smarter, healthier eating choices and delicious recipes.
                </p>
                <nav className={styles.toolPillNavigation}>
                    {tools.map(tool => (
                        <button
                            key={tool.id}
                            className={`${styles.toolPill} ${selectedToolId === tool.id ? styles.activeToolPill : ''} ${tool.comingSoon ? styles.comingSoonPill : ''}`}
                            onClick={() => {
                                if (!tool.comingSoon) {
                                    setSelectedToolId(tool.id);
                                }
                            }}
                            disabled={tool.comingSoon}
                        >
                            {tool.icon} {tool.name}
                            {tool.comingSoon && <span className={styles.comingSoonTagPill}>Soon</span>}
                        </button>
                    ))}
                </nav>
            </header>
            
            {activeTool && (
                <section className={styles.toolDisplaySection}>
                    <div className={styles.toolContainer}>
                        <div className={styles.toolHeader}>
                            <span className={styles.toolIconLarge}>{activeTool.icon}</span>
                            <h2>{activeTool.name}</h2>
                        </div>
                        
                        <p className={styles.toolDescription}>{activeTool.description}</p>
                        
                        {activeTool.comingSoon ? (
                            <div className={styles.comingSoonMessage}>
                                <h3>Coming Soon!</h3>
                                <p>We're working on this feature to help you eat healthier. Check back soon!</p>
                            </div>
                        ) : activeTool.isLinkOut ? (
                            <div className={styles.linkOutToolContainer}>
                                <a
                                    href={activeTool.linkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles.submitButton} ${styles.linkOutButton}`}
                                >
                                    {activeTool.icon} {activeTool.name === "Healthy Food Community" ? "Explore #HealthyEating on Instagram" : `View ${activeTool.name}`}
                                </a>
                                {activeTool.id === 'community' && (
                                    <p className={styles.inputHint} style={{marginTop: '1rem', textAlign: 'center'}}>
                                        Share your healthy creations with #HealthyEating or #HealthySubstitutes!
                                    </p>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className={styles.toolForm}>
                                {activeTool.id === 'recipeGenerator' && (
                                    <>
                                        <div className={styles.recipeOptionsRow}>
                                            <div className={styles.recipeOptionsGroup}>
                                                <label>Difficulty:</label>
                                                <div className={styles.radioButtonsContainer}>
                                                    {activeTool.difficultyOptions.map(opt => (
                                                        <button
                                                            type="button"
                                                            key={opt.value}
                                                            className={`${styles.radioButton} ${styles.smallRadioButton} ${selectedDifficulty === opt.value ? styles.radioButtonSelected : ''}`}
                                                            onClick={() => setSelectedDifficulty(opt.value)}
                                                            disabled={isLoading}
                                                        >
                                                            <span className={styles.radioButtonEmoji}>{opt.emoji}</span> {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className={styles.recipeOptionsGroup}>
                                                <label>Cook Time:</label>
                                                <div className={styles.radioButtonsContainer}>
                                                    {activeTool.cookTimeOptions.map(opt => (
                                                        <button
                                                            type="button"
                                                            key={opt.value}
                                                            className={`${styles.radioButton} ${styles.smallRadioButton} ${selectedCookTime === opt.value ? styles.radioButtonSelected : ''}`}
                                                            onClick={() => setSelectedCookTime(opt.value)}
                                                            disabled={isLoading}
                                                        >
                                                            <span className={styles.radioButtonEmoji}>{opt.emoji}</span> {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.recipeOptionsGroup}>
                                            <label>Available Equipment (select all that apply):</label>
                                            <div className={styles.radioButtonsContainer}>
                                                {activeTool.equipmentOptions.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        className={`${styles.radioButton} ${styles.smallRadioButton} ${selectedEquipment[opt.value] ? styles.radioButtonSelected : ''}`}
                                                        onClick={() => handleEquipmentToggle(opt.value)}
                                                        disabled={isLoading}
                                                    >
                                                        {opt.emoji && <span className={styles.radioButtonEmoji}>{opt.emoji}</span>} {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={styles.recipeOptionsGroup}>
                                            <label htmlFor="exclusions">Items to Exclude/Avoid (optional):</label>
                                            <div className={styles.radioButtonsContainer} id="exclusions">
                                                {commonExclusions.map(ex => (
                                                    <button
                                                        type="button"
                                                        key={ex.id}
                                                        className={`${styles.radioButton} ${styles.exclusionButton} ${selectedExclusions[ex.id] ? styles.exclusionButtonSelected : ''}`}
                                                        onClick={() => handleExclusionToggle(ex.id)}
                                                        disabled={isLoading}
                                                        title={`Click to ${selectedExclusions[ex.id] ? 'include' : 'exclude'} ${ex.label}`}
                                                    >
                                                        {ex.emoji && <span className={styles.radioButtonEmoji}>{ex.emoji}</span>} {ex.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <p className={styles.inputHint}>
                                            For the main request below, be specific! Mention ingredients you like, dislike, or have on hand.
                                        </p>
                                    </>
                                )}
                                {activeTool.id === 'mealAnalyzer' && activeTool.inputType === 'file' && (
                                     <p className={styles.inputHint}>
                                        You can upload an image of your meal, or describe it in the text box below. For best results with image uploads, ensure the photo is clear and well-lit.
                                    </p>
                                )}

                                {activeTool.inputType === 'textarea' || (activeTool.id === 'mealAnalyzer' && !selectedFile) ? (
                                    <textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={activeTool.id === 'mealAnalyzer' && selectedFile ? "Optional: Add details about the meal in the image..." : activeTool.inputPlaceholder}
                                        rows="4"
                                        disabled={isLoading}
                                    />
                                ) : null }

                                {activeTool.inputType === 'file' ? (
                                    <div className={styles.fileUpload}>
                                        <label htmlFor={`fileUpload-${activeTool.id}`} className={styles.uploadAreaLabel}>
                                            <input
                                                id={`fileUpload-${activeTool.id}`}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                disabled={isLoading}
                                                style={{ display: 'none' }}
                                            />
                                            <div className={styles.uploadArea}>
                                                {selectedFile ? (
                                                    <div className={styles.selectedFile}>
                                                        <p>{selectedFile.name}</p>
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setSelectedFile(null);
                                                                const fileInput = document.getElementById(`fileUpload-${activeTool.id}`);
                                                                if (fileInput) fileInput.value = "";
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={styles.uploadIcon}>📁</span>
                                                        <p>{activeTool.inputPlaceholder}</p>
                                                        <p className={styles.uploadAreaHint}>Click or drag file here</p>
                                                    </>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                ) : (activeTool.inputType !== 'textarea' && !(activeTool.id === 'mealAnalyzer')) ? 
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={activeTool.inputPlaceholder}
                                        disabled={isLoading}
                                    />
                                  : null
                                }
                                
                                <button 
                                    type="submit" 
                                    disabled={isLoading || (activeTool.id === 'mealAnalyzer' && !selectedFile && !inputValue && !activeTool.comingSoon) || (activeTool.inputType === 'file' && !selectedFile && activeTool.id !== 'mealAnalyzer' && !activeTool.comingSoon) || activeTool.comingSoon}
                                    className={styles.submitButton}
                                >
                                    {isLoading ? 'Processing...' : activeTool.buttonText}
                                </button>
                            </form>
                        )}
                        
                        {isLoading && <div className={styles.loadingSpinner}></div>}
                        {error && <p className={styles.errorMessage}>Error: {error}</p>}
                        
                        {results && !activeTool.comingSoon && !activeTool.isLinkOut && (
                            <div className={styles.resultsContainer}>
                                {activeTool.id === 'recipeGenerator' ? renderRecipeResults(results) : 
                                 activeTool.id === 'mealAnalyzer' ? renderCritiqueResults(results) :
                                 activeTool.id === 'suggestionExplorer' ? renderSuggestionExplorerResults(results) :
                                 (
                                    <div className={styles.resultsContent}>
                                        <ReactMarkdown>{results}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
} 