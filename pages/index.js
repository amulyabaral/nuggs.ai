import Head from 'next/head';
import Image from 'next/image'; // For optimized images
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from '../styles/Home.module.css';

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
];

// Updated Tools data
const tools = [
    {
        id: 'recipe',
        name: 'Get custom nugget recipes',
        description: 'Create unique nugget recipes (meat, veggie, etc.) based on your preferences. Specify difficulty, cook time, equipment, exclusions, and general ideas. Click on ingredients, dips, or drinks to search for them on Amazon!',
        icon: '🍳',
        inputType: 'textarea',
        inputPlaceholder: "e.g., 'Spicy veggie nuggets using chickpeas' or 'Kid-friendly baked chicken nuggets, simple ingredients'",
        buttonText: 'Generate Recipe',
        difficultyOptions: [
            { label: 'Baby', value: 'Baby', emoji: '👶' },
            { label: 'Home Chef', value: 'Home Chef', emoji: '👩‍🍳' },
            { label: 'Enthusiast', value: 'Enthusiast', emoji: '🔥' },
            { label: 'Pro', value: 'Pro', emoji: '🌟' },
        ],
        cookTimeOptions: [
            { label: '< 20 min', value: '< 20 min', emoji: '⏱️' },
            { label: '20-40 min', value: '20-40 min', emoji: '⏳' },
            { label: '> 40 min', value: '> 40 min', emoji: '⏰' },
        ],
        equipmentOptions: [
            { label: 'Oven', value: 'oven', emoji: '♨️' },
            { label: 'Air Fryer', value: 'airfryer', emoji: '💨' },
            { label: 'Deep Fryer', value: 'deepfryer', emoji: '🔥' },
            { label: 'Pan/Stovetop', value: 'pan', emoji: '🍳' },
            { label: 'Microwave', value: 'microwave', emoji: '💡' }, // For reheating or specific steps
        ],
    },
    {
        id: 'critic',
        name: 'AI critique for your nuggz',
        description: 'Upload a photo of your nuggets and get professional feedback on appearance, probable texture, and overall appeal.',
        icon: '📸',
        inputType: 'file',
        inputPlaceholder: "Upload an image of your nuggets",
        buttonText: 'Analyze Nuggets',
    },
    {
        id: 'dip',
        name: 'Find the perfect dip',
        description: 'Discover sauce pairings for any nugget style. Get personalized recommendations, homemade sauce recipes, and links to search for related products on Amazon.',
        icon: '🥫',
        inputPlaceholder: "e.g., 'Spicy chicken nuggets' or 'Plant-based nuggets with herbs'",
        buttonText: 'Find Perfect Dip',
    },
    {
        id: 'brands',
        name: 'Compare nugget brands',
        description: 'Compare nutritional values, ingredients, and taste profiles of popular nugget brands to find your perfect match.',
        icon: '⚖️',
        inputPlaceholder: "e.g., 'Compare two specific nugget brands' or 'Healthiest frozen nugget brands'",
        buttonText: 'Compare Brands',
        comingSoon: true,
    },
    {
        id: 'deals',
        name: 'Discover nugget deals',
        description: 'Locate the best nugget promotions and deals at restaurants near you for maximum nugget value.',
        icon: '🔍',
        inputPlaceholder: "e.g., 'Best nugget deals in [Your City]' or 'Where to find BOGO nuggets'",
        buttonText: 'Find Deals',
        comingSoon: true,
    },
    {
        id: 'calories',
        name: 'Estimate nugget calories',
        description: 'Upload a photo of your nugget meal and get an estimate of calories, protein, and other nutritional information.',
        icon: '🔢',
        inputType: 'file',
        inputPlaceholder: "Upload an image of your nugget meal",
        buttonText: 'Calculate Calories',
        comingSoon: true,
    },
    {
        id: 'trivia',
        name: 'Nugget history & trivia',
        description: 'Explore fascinating facts and history about nuggets, or ask specific nugget-related questions.',
        icon: '🧠',
        inputPlaceholder: "e.g., 'When were nuggets invented?' (or leave empty for random facts)",
        buttonText: 'Get Nugget Knowledge',
    },
];

const PROXY_API_URL = '/api/generate';

export default function HomePage() {
    const [selectedToolId, setSelectedToolId] = useState(tools[0].id); // Default to the first tool (recipe)
    const [activeTool, setActiveTool] = useState(tools[0]);
    const [inputValue, setInputValue] = useState('');
    const [results, setResults] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const [selectedDifficulty, setSelectedDifficulty] = useState(tools[0].difficultyOptions[0].value);
    const [selectedCookTime, setSelectedCookTime] = useState(tools[0].cookTimeOptions[0].value);
    const [selectedEquipment, setSelectedEquipment] = useState({}); // For multi-select equipment
    const [currentMimeType, setCurrentMimeType] = useState(''); // Added for image uploads

    // New state for recipe tool inputs
    const [selectedExclusions, setSelectedExclusions] = useState({}); // For selectable exclusion buttons

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
            if (tool.id === 'recipe') {
                setSelectedDifficulty(tool.difficultyOptions?.[0]?.value || 'Baby');
                setSelectedCookTime(tool.cookTimeOptions?.[0]?.value || '< 20 min');
                setSelectedEquipment({}); // Reset equipment
                setSelectedExclusions({}); // Reset exclusions
                setInstructionTimersData({}); // Clear timer data
                if (currentRunningTimer.intervalId) {
                    clearInterval(currentRunningTimer.intervalId);
                }
                setCurrentRunningTimer({ intervalId: null, stepIndex: null });
            }
        }
    }, [selectedToolId]);

    // Effect to initialize/reset timers when recipe results change
    useEffect(() => {
        if (activeTool.id === 'recipe' && results) {
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
                            timerActive: false,
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
        } else if (activeTool.id !== 'recipe') { // Clear if not recipe tool
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
        const stepData = instructionTimersData[stepIndexToStart];
        if (!stepData || !stepData.originalDuration || stepData.checked || stepData.timerActive) {
            return; // Don't start if no duration, already checked, or already active
        }

        // Clear any existing global timer first
        if (currentRunningTimer.intervalId) {
            clearInterval(currentRunningTimer.intervalId);
            // If the cleared timer was for a different step, mark it as inactive
            if (currentRunningTimer.stepIndex !== null && currentRunningTimer.stepIndex !== stepIndexToStart) {
                setInstructionTimersData(prev => ({
                    ...prev,
                    [currentRunningTimer.stepIndex]: {
                        ...prev[currentRunningTimer.stepIndex],
                        timerActive: false,
                    }
                }));
            }
        }
        
        setInstructionTimersData(prev => ({
            ...prev,
            [stepIndexToStart]: {
                ...prev[stepIndexToStart],
                timeLeft: prev[stepIndexToStart].originalDuration,
                timerActive: true,
                checked: false, 
            }
        }));

        const newIntervalId = setInterval(() => {
            setInstructionTimersData(prevData => {
                // Critical check: ensure this interval is still the globally active one for this step
                if (currentRunningTimer.intervalId !== newIntervalId || 
                    !prevData[stepIndexToStart] || 
                    !prevData[stepIndexToStart].timerActive) {
                    clearInterval(newIntervalId);
                    return prevData;
                }

                const newTimeLeft = prevData[stepIndexToStart].timeLeft - 1;
                let updatedData = { ...prevData };

                if (newTimeLeft <= 0) {
                    clearInterval(newIntervalId);
                    updatedData[stepIndexToStart] = {
                        ...updatedData[stepIndexToStart],
                        timeLeft: 0,
                        timerActive: false,
                        checked: true,
                    };
                    setCurrentRunningTimer({ intervalId: null, stepIndex: null });

                    // Automatically try to start the next timer
                    const nextStepIndexAfterTimer = stepIndexToStart + 1;
                    if (updatedData[nextStepIndexAfterTimer] && 
                        updatedData[nextStepIndexAfterTimer].originalDuration && 
                        !updatedData[nextStepIndexAfterTimer].checked) {
                        setTimeout(() => startTimerForStep(nextStepIndexAfterTimer), 0);
                    }
                } else {
                    updatedData[stepIndexToStart] = { ...updatedData[stepIndexToStart], timeLeft: newTimeLeft };
                }
                return updatedData;
            });
        }, 1000);
        setCurrentRunningTimer({ intervalId: newIntervalId, stepIndex: stepIndexToStart });
    };

    const getPromptForTool = (tool, userInput) => {
        let basePrompt = `You are an AI expert. `;
        switch (tool.id) {
            case 'trivia':
                let triviaPrompt = basePrompt + "You are a fun and knowledgeable AI expert on nugget history, trivia, and fun facts (all types of nuggets, not just chicken). Format your response using Markdown. ";
                if (userInput) {
                    triviaPrompt += `Please answer the following question concisely and engagingly: "${userInput}"`;
                } else {
                    triviaPrompt += "Tell me an interesting and surprising fun fact or piece of trivia about nuggets.";
                }
                triviaPrompt += " Keep your response friendly and suitable for a general audience. ONLY answer nugget-related questions. If asked about non-nugget topics, politely explain you're a nugget specialist.";
                return triviaPrompt;
            case 'recipe':
                if (!userInput) {
                    setError("Please describe the type of nugget recipe you'd like.");
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

                let recipePrompt = `You are an AI chef specializing in creative nugget recipes (including meat-based, plant-based, fish, etc.).
The user wants a recipe based on this core request: "${userInput}".
Additionally, consider these user preferences:
- Difficulty: ${selectedDifficulty}
- Target Cook Time: ${selectedCookTime}
- Available Equipment: ${equipmentInstructions}
- Items to AVOID if possible: "${activeExclusionLabels || 'None specified'}"

Please provide the response STRICTLY as a single, valid JSON object with the following structure:
{
  "recipeName": "A catchy recipe name (e.g., 'Spicy Honey Glazed Chicken Nuggets')",
  "description": "A brief, enticing description of the recipe (2-3 sentences). Include a note if any exclusion preferences were specifically addressed.",
  "prepTime": "Estimated preparation time (e.g., '15 minutes')",
  "cookTime": "Estimated cooking time (e.g., '20 minutes')",
  "difficultyRating": "${selectedDifficulty}",
  "servings": "Number of servings (e.g., 'Approx. 20 nuggets' or '4 servings')",
  "ingredients": [
    { "name": "Ingredient Name", "quantity": "Amount (e.g., '1', '1/2', '2-3')", "unit": "Unit (e.g., 'lb', 'cup', 'tbsp', 'cloves', 'medium')", "notes": "Optional: brief notes like 'boneless, skinless', 'finely chopped', 'to taste'" }
  ],
  "instructions": [
    { "stepNumber": 1, "description": "Detailed instruction for this step. Be clear and concise. If specific equipment was mentioned (Available Equipment above), tailor instructions for it. If multiple suitable equipment options were listed, you can prioritize one or briefly mention alternatives." }
  ],
  "dippingSauceSuggestions": [
    { "name": "Sauce Name 1", "description": "Why it pairs well (1-2 sentences)", "recipeDetails": "Optional: Simple homemade recipe for the dip (Markdown for lists/steps, keep concise).", "amazonSearchKeywords": ["keyword1", "keyword2 for sauce 1"] }
  ],
  "drinkSuggestions": [
    { "name": "Drink Name 1", "emoji": "🥤", "description": "Why it pairs well (1-2 sentences)", "amazonSearchKeywords": ["keyword for drink 1"] }
  ]
}

IMPORTANT:
- You MUST ONLY generate nugget-related recipes. If asked for any non-nugget recipe, respond with a JSON object: {"error": "I specialize only in nugget recipes."}.
- Ensure the entire response is a single, valid JSON object. Do not include any text, pleasantries, or markdown formatting outside of this JSON object.
- For "ingredients", "quantity" should be a string. "unit" should also be a string. Each ingredient object should be simple.
- For "instructions", "stepNumber" should be a number. Ensure instructions are adapted for the 'Available Equipment' specified.
- All string values within the JSON must be properly escaped.
- Be creative and make the recipe sound delicious within the JSON structure!
- If items to AVOID are mentioned, try to create a recipe that avoids them. If an unavoidable ingredient from this list is core to the request, clearly state this and suggest an alternative in the 'notes' of that ingredient or in the main recipe 'description'.
- For "dippingSauceSuggestions" (1-3 suggestions): each object needs "name", "description", "amazonSearchKeywords" (array). "recipeDetails" is optional.
- For "drinkSuggestions" (1-3 suggestions): each object needs "name", "description", "amazonSearchKeywords" (array). "emoji" is optional but encouraged (e.g., 🥤, 🍷, 🍺, 🍹, 🥛).`;
                return recipePrompt;
            case 'dip':
                if (!userInput) {
                    setError("Please describe the type of nugget you're having.");
                    return null;
                }
                // The AI should now return a JSON array of dip objects
                return basePrompt + `You are an AI dip pairing expert. For nuggets described as "${userInput}", suggest 2-3 perfect dipping sauces.
Provide the response STRICTLY as a single, valid JSON array, where each object in the array has the following structure:
{
  "dipName": "string (e.g., 'Creamy Honey Mustard')",
  "description": "string (Briefly explain why it's a good pairing, 1-2 sentences)",
  "recipeDetails": "string (A simple homemade recipe for the dip. Use Markdown for formatting if needed, like lists for ingredients/steps. Keep it concise.)",
  "amazonSearchKeywords": ["string", "string"] 
}

Example for "amazonSearchKeywords": For 'Creamy Honey Mustard', keywords could be ["honey mustard dip", "dijon mustard for dip"]. These should be terms to find pre-made versions or key ingredients on an e-commerce site. These keywords will be used to construct a search link.
IMPORTANT:
- Ensure the entire response is a single, valid JSON array of objects. Do not include any text, pleasantries, or markdown formatting outside of this JSON structure, except within the "recipeDetails" field.
- All string values within the JSON must be properly escaped.
- ONLY suggest sauces for nuggets. If asked about non-nugget foods, respond with a JSON array containing a single object: [{"error": "I specialize only in nugget pairings."}].`;
            case 'critic':
                // For the critic tool, the userInput (text input) is not directly used in the prompt to Gemini,
                // as the primary input is the image. However, the prompt itself is static.
                // The image data will be handled separately in handleSubmit.
                return `You are "NuggetVision AI", a sophisticated food critic specializing in analyzing images of nuggets (all types: chicken, veggie, fish, etc.).
Based on the provided image, provide a concise and constructive critique.

Please provide the response STRICTLY as a single, valid JSON object with the following structure:
{
  "critiqueTitle": "string (e.g., 'NuggetVision AI Critique')",
  "appearance": {
    "title": "Appearance",
    "color": "string (e.g., 'Golden brown with some darker spots')",
    "shapeAndUniformity": "string (e.g., 'Mostly uniform, classic nugget shapes')",
    "coatingTexture": "string (e.g., 'Appears crispy and well-adhered')"
  },
  "probableTexture": {
    "title": "Probable Texture",
    "description": "string (e.g., 'Likely crispy on the outside, tender inside')"
  },
  "overallAppeal": {
    "title": "Overall Appeal",
    "description": "string (e.g., 'Looks appetizing and well-cooked')"
  },
  "suggestionsForImprovement": {
    "title": "Suggestions for Improvement",
    "suggestion": "string (Optional: 1-2 brief, actionable tips. If none, provide 'N/A' or an empty string)"
  },
  "dippingSaucePairing": {
    "title": "Dipping Sauce Pairing",
    "sauceName": "string (e.g., 'Classic Honey Mustard')",
    "reason": "string (e.g., 'The sweetness would complement the savory nugget well.')"
  },
  "error": "string (Optional: Use this field if the image is unclear, not of nuggets, or if no image is provided, e.g., 'Cannot provide critique: Image is unclear or not of nuggets.')"
}

IMPORTANT:
- Ensure the entire response is a single, valid JSON object. Do not include any text, pleasantries, or markdown formatting outside of this JSON object.
- All string values within the JSON must be properly escaped if they contain special characters (e.g., double quotes within a string should be \\").
- If a specific aspect (like 'suggestion' in 'suggestionsForImprovement') is not applicable, provide a neutral placeholder like "N/A" or an empty string for that field, but ensure the parent object (e.g., 'suggestionsForImprovement') and its 'title' field are present.
- If the image is unsuitable for critique, populate the main "error" field in the JSON and provide minimal or placeholder content for other fields.`;
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

        const promptText = getPromptForTool(activeTool, inputValue);

        if (activeTool.id === 'critic' && !selectedFile) {
            setError('Please upload an image of your nuggets for critique.');
            return;
        }

        if (!promptText && activeTool.id !== 'trivia' && activeTool.id !== 'critic') {
            return;
        }

        setIsLoading(true);
        setResults('');
        setError('');

        let requestBody = { promptText };

        try {
            if (activeTool.id === 'critic' && selectedFile) {
                const imageData = await fileToBase64(selectedFile);
                requestBody = {
                    promptText, // This is the instructional prompt for the critic
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

                if (activeTool.id === 'recipe' || activeTool.id === 'critic' || activeTool.id === 'dip') {
                    // Attempt to extract JSON string if wrapped in markdown code blocks
                    // Handles ```json ... ``` or ``` ... ```
                    const markdownMatch = aiResponseText.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
                    if (markdownMatch && markdownMatch[1]) {
                        aiResponseText = markdownMatch[1];
                    }
                    aiResponseText = aiResponseText.trim();
                }

                setResults(aiResponseText);
                if (activeTool.id === 'recipe') {
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

        // If a timer is running for this specific step, clear it.
        if (currentRunningTimer.stepIndex === toggledIndex && currentRunningTimer.intervalId) {
            clearInterval(currentRunningTimer.intervalId);
            setCurrentRunningTimer({ intervalId: null, stepIndex: null });
        }

        setInstructionTimersData(prev => {
            const newData = { ...prev };
            newData[toggledIndex] = {
                ...newData[toggledIndex],
                checked: isNowChecked,
                timerActive: false, // Always stop timer on manual toggle
                timeLeft: isNowChecked ? 0 : (newData[toggledIndex].originalDuration || 0),
            };
            return newData;
        });

        if (isNowChecked) {
            // If the step was just checked, try to start the timer for the NEXT step
            const nextIndex = toggledIndex + 1;
            const nextStepData = instructionTimersData[nextIndex];
            if (nextStepData && nextStepData.originalDuration && !nextStepData.checked && !nextStepData.timerActive) {
                 // Use setTimeout to ensure state update has processed before starting next timer
                setTimeout(() => startTimerForStep(nextIndex), 0);
            }
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
        const amazonSearchUrl = `https://www.amazon.com/s?k=${searchTerm}&tag=${AMAZON_AFFILIATE_TAG}&ref=nuggsai_${itemType}`;
        window.open(amazonSearchUrl, '_blank', 'noopener,noreferrer');
    };

    // Helper function to render recipe results from JSON
    const renderRecipeResults = (jsonData) => {
        console.log("Attempting to parse recipe JSON. Raw data received:", jsonData); // Log the raw data
        try {
            const recipe = JSON.parse(jsonData);
            console.log("Successfully parsed recipe JSON:", recipe); // Log the parsed object

            if (recipe.error) {
                return <p className={styles.errorMessage}>Error from AI: {recipe.error}</p>;
            }

            return (
                <div className={styles.recipeOutputContainer}>
                    <div className={styles.recipeNameCard}>
                        <h2>{recipe.recipeName || 'N/A'}</h2>
                        <p>{recipe.description || 'No description provided.'}</p>
                        <div className={styles.recipeMeta}>
                            <span><strong>Prep:</strong> {recipe.prepTime || 'N/A'}</span>
                            <span><strong>Cook:</strong> {recipe.cookTime || 'N/A'}</span>
                            <span><strong>Difficulty:</strong> {recipe.difficultyRating || 'N/A'}</span>
                            <span><strong>Servings:</strong> {recipe.servings || 'N/A'}</span>
                        </div>
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

                    {recipe.dippingSauceSuggestions && recipe.dippingSauceSuggestions.length > 0 && (
                        <div className={styles.recipeSection}>
                            <h3>Dipping Sauce Suggestions</h3>
                            <div className={styles.suggestionCardsContainer}>
                                {recipe.dippingSauceSuggestions.map((sauce, index) => (
                                    <div 
                                        key={`sauce-${index}`} 
                                        className={styles.suggestionCard}
                                        onClick={() => handleAmazonSearch(sauce.amazonSearchKeywords || sauce.name, 'dip_suggestion')}
                                        title={`Search for ${sauce.name} related items on Amazon`}
                                    >
                                        <h4>{sauce.name}</h4>
                                        {sauce.description && <p>{sauce.description}</p>}
                                        {sauce.recipeDetails && (
                                            <div className={styles.suggestionRecipeDetails}>
                                                <h5>Simple Recipe:</h5>
                                                <ReactMarkdown>{sauce.recipeDetails}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {recipe.drinkSuggestions && recipe.drinkSuggestions.length > 0 && (
                        <div className={styles.recipeSection}>
                            <h3>Drink Pairing Suggestions</h3>
                            <div className={styles.suggestionCardsContainer}>
                                {recipe.drinkSuggestions.map((drink, index) => (
                                    <div 
                                        key={`drink-${index}`} 
                                        className={styles.suggestionCard}
                                        onClick={() => handleAmazonSearch(drink.amazonSearchKeywords || drink.name, 'drink_suggestion')}
                                        title={`Search for ${drink.name} related items on Amazon`}
                                    >
                                        <h4>{drink.emoji && <span className={styles.suggestionEmoji}>{drink.emoji}</span>} {drink.name}</h4>
                                        {drink.description && <p>{drink.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            console.error("Failed to parse recipe JSON. Error:", e);
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

    // Helper function to render dip results
    const renderDipResults = (jsonData) => {
        console.log("Attempting to parse dip JSON. Raw data received:", jsonData);
        try {
            const dips = JSON.parse(jsonData);
            console.log("Successfully parsed dip JSON:", dips);

            if (!Array.isArray(dips)) {
                 throw new Error("Dip data is not an array.");
            }
            if (dips.length === 0) {
                return <p>No dip suggestions found.</p>;
            }
            if (dips[0]?.error) {
                return <p className={styles.errorMessage}>Error from AI: {dips[0].error}</p>;
            }

            return (
                <div className={styles.dipResultsContainer}>
                    {dips.map((dip, index) => (
                        <div key={index} className={styles.dipCard}>
                            <h3>{dip.dipName || 'Unnamed Dip'}</h3>
                            <p className={styles.dipDescription}>{dip.description || 'No description.'}</p>
                            <div className={styles.dipRecipeDetails}>
                                <h4>Recipe:</h4>
                                <ReactMarkdown>{dip.recipeDetails || 'No recipe details provided.'}</ReactMarkdown>
                            </div>
                            {dip.amazonSearchKeywords && dip.amazonSearchKeywords.length > 0 && (
                                <div className={styles.dipAmazonSearchLinkSection}>
                                    <a
                                        href={`https://www.amazon.com/s?k=${encodeURIComponent(dip.amazonSearchKeywords.join(' '))}&tag=${AMAZON_AFFILIATE_TAG}`}
                                        target="_blank"
                                        rel="noopener noreferrer sponsored"
                                        className={styles.amazonSearchButton}
                                    >
                                        🛒 Search for "{dip.dipName}" related items on Amazon
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        } catch (e) {
            console.error("Failed to parse or render dip JSON. Error:", e);
            console.error("Raw JSON data that failed to parse:", jsonData);
            return (
                <>
                    <p className={styles.errorMessage}>
                        Oops! We had trouble displaying these dip suggestions.
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
                <title>nuggs.ai - Nugget recipes and more</title>
                <meta name="description" content="AI-powered tool for chicken nugget recipes, reviews, pairings and more!" />
                <link rel="icon" href="/nuggets.png" />
                {/* Font links moved to _app.js */}
            </Head>

            <header className={styles.mainHeaderPill}>
                <div className={styles.logoArea}>
                    <Image src="/nuggets.png" alt="nuggs.ai Logo" width={40} height={40} />
                    <span className={styles.logoText}>nuggs.ai</span>
                </div>
                <p className={styles.tagline}>
                    This AI won't steal your job. It will instead help you make the best nuggets of your life, and more..
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
            
            {/* Removed toolSliderSection */}

            {activeTool && (
                <section className={styles.toolDisplaySection}>
                    <div className={styles.toolContainer}>
                        {/* Removed backButton as pill navigation is primary */}
                        
                        <div className={styles.toolHeader}>
                            <span className={styles.toolIconLarge}>{activeTool.icon}</span>
                            <h2>{activeTool.name}</h2> {/* Name is already updated */}
                        </div>
                        
                        <p className={styles.toolDescription}>{activeTool.description}</p>
                        
                        {activeTool.comingSoon ? (
                            <div className={styles.comingSoonMessage}>
                                <h3>Coming Soon!</h3>
                                <p>We're still perfecting this nugget tool. Check back soon!</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className={styles.toolForm}>
                                {activeTool.id === 'recipe' && (
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

                                {activeTool.inputType === 'textarea' ? (
                                    <textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={activeTool.inputPlaceholder}
                                        rows="4"
                                        disabled={isLoading}
                                    />
                                ) : activeTool.inputType === 'file' ? (
                                    <div className={styles.fileUpload}>
                                        <label htmlFor={`fileUpload-${activeTool.id}`} className={styles.uploadAreaLabel}>
                                            <input
                                                id={`fileUpload-${activeTool.id}`}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                disabled={isLoading}
                                                style={{ display: 'none' }} // Hide default input
                                            />
                                            <div className={styles.uploadArea}>
                                                {selectedFile ? (
                                                    <div className={styles.selectedFile}>
                                                        <p>{selectedFile.name}</p>
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => {
                                                                e.preventDefault(); // Prevent form submission if inside label
                                                                setSelectedFile(null);
                                                                // Clear the file input visually if needed
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
                                ) : (
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={activeTool.inputPlaceholder}
                                        disabled={isLoading}
                                    />
                                )}
                                
                                <button 
                                    type="submit" 
                                    disabled={isLoading || (activeTool.inputType === 'file' && !selectedFile && !activeTool.comingSoon) || activeTool.comingSoon}
                                    className={styles.submitButton}
                                >
                                    {isLoading ? 'Processing...' : activeTool.buttonText}
                                </button>
                            </form>
                        )}
                        
                        {isLoading && <div className={styles.loadingSpinner}></div>}
                        {error && <p className={styles.errorMessage}>Error: {error}</p>}
                        
                        {/* Display AI/Gemini results */}
                        {results && !activeTool.comingSoon && (
                            <div className={styles.resultsContainer}>
                                <h3>Results for {activeTool.name}</h3>
                                {activeTool.id === 'recipe' ? renderRecipeResults(results) : 
                                 activeTool.id === 'critic' ? renderCritiqueResults(results) :
                                 activeTool.id === 'dip' ? renderDipResults(results) : (
                                    <div className={styles.resultsContent}>
                                        <ReactMarkdown>{results}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </section>
            )}

            {/* Footer or other sections can go here */}
        </div>
    );
} 