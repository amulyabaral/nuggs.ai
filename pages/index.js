import Head from 'next/head';
import Image from 'next/image'; // For optimized images
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from '../styles/Home.module.css';

// Updated Tools data
const tools = [
    {
        id: 'recipe',
        name: 'Get custom nugget recipes',
        description: 'Create unique nugget recipes (meat, veggie, etc.) based on your preferences, dietary restrictions, or available ingredients. Specify difficulty, cook time, and available equipment!',
        icon: '🍳',
        inputType: 'textarea',
        inputPlaceholder: "e.g., 'Spicy gluten-free veggie nuggets' or 'Korean-inspired pork nuggets with gochujang'",
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
        comingSoon: true,
    },
    {
        id: 'dip',
        name: 'Find the perfect dip',
        description: 'Discover the perfect sauce pairings for any nugget style. Get personalized recommendations and homemade sauce recipes.',
        icon: '🥫',
        inputPlaceholder: "e.g., 'Spicy nuggets' or 'Plant-based nuggets with herbs'",
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
    const [checkedInstructions, setCheckedInstructions] = useState({});

    // State for ingredient substitutes modal
    const [substituteInfo, setSubstituteInfo] = useState({
        ingredientName: null,
        substitutesText: '',
        isLoading: false,
        error: '',
        showModal: false,
    });

    // Removed sliderRef and autoSlideTimeoutRef

    // Effect to update activeTool when selectedToolId changes
    useEffect(() => {
        const tool = tools.find(t => t.id === selectedToolId);
        if (tool) {
            setActiveTool(tool);
            setInputValue('');
            setResults('');
            setError('');
            setSelectedFile(null);
            setCheckedInstructions({});
            // Reset recipe-specific options if switching to the recipe tool
            if (tool.id === 'recipe') {
                setSelectedDifficulty(tool.difficultyOptions?.[0]?.value || 'Baby');
                setSelectedCookTime(tool.cookTimeOptions?.[0]?.value || '< 20 min');
                setSelectedEquipment({}); // Reset equipment
            }
        }
    }, [selectedToolId]);

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

                let recipePrompt = `You are an AI chef specializing in creative nugget recipes (including meat-based, plant-based, fish, etc.).
Based on these preferences: "${userInput}", and the following criteria:
- Difficulty: ${selectedDifficulty}
- Target Cook Time: ${selectedCookTime}
- Available Equipment: ${equipmentInstructions}

Please provide the response STRICTLY as a single, valid JSON object with the following structure:
{
  "recipeName": "A catchy recipe name (e.g., 'Spicy Honey Glazed Chicken Nuggets')",
  "description": "A brief, enticing description of the recipe (2-3 sentences).",
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
  "dippingSauceSuggestion": "Optional: A creative suggestion for a dipping sauce that would pair well, including a very brief recipe or store-bought idea."
}

IMPORTANT: 
- You MUST ONLY generate nugget-related recipes. If asked for any non-nugget recipe, respond with a JSON object: {"error": "I specialize only in nugget recipes."}.
- Ensure the entire response is a single, valid JSON object. Do not include any text, pleasantries, or markdown formatting outside of this JSON object.
- For "ingredients", "quantity" should be a string. "unit" should also be a string.
- For "instructions", "stepNumber" should be a number. Ensure instructions are adapted for the 'Available Equipment' specified.
- All string values within the JSON (especially in "description", "notes", "name") must be properly escaped if they contain special characters (e.g., double quotes within a string should be \\").
- Be creative and make the recipe sound delicious within the JSON structure!`;
                return recipePrompt;
            case 'dip':
                if (!userInput) {
                    setError("Please describe the type of nugget you're having.");
                    return null;
                }
                return basePrompt + `You are an AI dip pairing expert. Format your response using Markdown. For nuggets described as "${userInput}", suggest 3 perfect dipping sauces. For each sauce, briefly explain why it's a good pairing and include a simple homemade recipe. Format the response in Markdown. ONLY suggest sauces for nuggets. If asked about non-nugget foods, politely explain you specialize in nugget pairings only.`;
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!activeTool || activeTool.comingSoon) return;

        const promptText = getPromptForTool(activeTool, inputValue);
        if (!promptText && activeTool.id !== 'trivia') {
            return;
        }

        setIsLoading(true);
        setResults('');
        setError('');

        try {
            const response = await fetch(PROXY_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promptText }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `API request failed: ${response.statusText}`);
            }

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                let aiResponseText = data.candidates[0].content.parts[0].text;

                if (activeTool.id === 'recipe') {
                    // Attempt to extract JSON string if wrapped in markdown code blocks
                    // Handles ```json ... ``` or ``` ... ```
                    // Regex ensures the markdown block is the entire string or extracts from it.
                    const markdownMatch = aiResponseText.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
                    if (markdownMatch && markdownMatch[1]) {
                        aiResponseText = markdownMatch[1];
                    }
                    
                    // Trim whitespace thoroughly. This is very important for successful JSON.parse.
                    aiResponseText = aiResponseText.trim();
                }

                setResults(aiResponseText);
                if (activeTool.id === 'recipe') {
                    setCheckedInstructions({});
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
        setSelectedFile(event.target.files[0]);
    };

    const handleInstructionToggle = (index) => {
        setCheckedInstructions(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleEquipmentToggle = (equipmentValue) => {
        setSelectedEquipment(prev => ({
            ...prev,
            [equipmentValue]: !prev[equipmentValue]
        }));
    };

    const handleShowSubstitutes = async (ingredient) => {
        if (!ingredient || !ingredient.name) return;

        setSubstituteInfo({
            ingredientName: ingredient.name,
            substitutesText: '',
            isLoading: true,
            error: '',
            showModal: true,
        });

        const substitutePrompt = `You are an AI culinary assistant. The user is looking for substitutes for the ingredient "${ingredient.name}" in a nugget recipe. 
Please provide 3-5 common and practical substitutes. For each substitute:
1. Clearly state the substitute.
2. Briefly explain how it might change the taste or texture of the nuggets.
3. Suggest any simple quantity adjustments if needed (e.g., "use 1:1" or "use half the amount").
Format your response as a Markdown list. Keep it concise and helpful for a home cook. Only provide substitutes, no extra conversation.`;

        try {
            const response = await fetch(PROXY_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promptText: substitutePrompt }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `API request failed for substitutes: ${response.statusText}`);
            }

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                setSubstituteInfo(prev => ({ ...prev, substitutesText: data.candidates[0].content.parts[0].text, isLoading: false }));
            } else if (data.promptFeedback?.blockReason) {
                setSubstituteInfo(prev => ({ ...prev, error: `Request blocked: ${data.promptFeedback.blockReason}.`, isLoading: false }));
            } else {
                setSubstituteInfo(prev => ({ ...prev, error: 'Received an unexpected response for substitutes.', isLoading: false }));
            }
        } catch (err) {
            console.error("Substitute API Call Error:", err);
            setSubstituteInfo(prev => ({ ...prev, error: err.message || 'Failed to fetch substitutes.', isLoading: false }));
        }
    };

    const handleCloseSubstituteModal = () => {
        setSubstituteInfo({ ingredientName: null, substitutesText: '', isLoading: false, error: '', showModal: false });
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
                                    onClick={() => handleShowSubstitutes(ing)}
                                    title={`Click to find substitutes for ${ing.name}`}
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
                                {recipe.instructions.map((instr, index) => (
                                    <li 
                                        key={instr.stepNumber || index} 
                                        className={`${styles.instructionStep} ${checkedInstructions[index] ? styles.checkedInstruction : ''}`}
                                        onClick={() => handleInstructionToggle(index)}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={!!checkedInstructions[index]} 
                                            readOnly 
                                            className={styles.instructionCheckbox}
                                        />
                                        <span className={styles.stepNumber}>Step {instr.stepNumber}:</span>
                                        <span className={styles.stepDescription}>{instr.description}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p>No instructions provided.</p>}
                    </div>

                    {recipe.dippingSauceSuggestion && (
                        <div className={styles.recipeSection}>
                            <h3>Dipping Sauce Suggestion</h3>
                            <ReactMarkdown>{recipe.dippingSauceSuggestion}</ReactMarkdown>
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

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>nuggs.ai - The Ultimate Nugget AI Platform</title>
                <meta name="description" content="AI-powered tools for all your chicken nugget needs - recipes, reviews, pairings and more!" />
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
                                        <div className={styles.recipeOptionsGroup}>
                                            <label>Difficulty:</label>
                                            <div className={styles.radioButtonsContainer}>
                                                {activeTool.difficultyOptions.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        className={`${styles.radioButton} ${selectedDifficulty === opt.value ? styles.radioButtonSelected : ''}`}
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
                                                        className={`${styles.radioButton} ${selectedCookTime === opt.value ? styles.radioButtonSelected : ''}`}
                                                        onClick={() => setSelectedCookTime(opt.value)}
                                                        disabled={isLoading}
                                                    >
                                                        <span className={styles.radioButtonEmoji}>{opt.emoji}</span> {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={styles.recipeOptionsGroup}>
                                            <label>Available Equipment (select all that apply):</label>
                                            <div className={styles.radioButtonsContainer}>
                                                {activeTool.equipmentOptions.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        className={`${styles.radioButton} ${selectedEquipment[opt.value] ? styles.radioButtonSelected : ''}`}
                                                        onClick={() => handleEquipmentToggle(opt.value)}
                                                        disabled={isLoading}
                                                    >
                                                        {opt.emoji && <span className={styles.radioButtonEmoji}>{opt.emoji}</span>} {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
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
                        {results && !activeTool.comingSoon && (
                            <div className={styles.resultsContainer}>
                                <h3>Results</h3>
                                {activeTool.id === 'recipe' ? renderRecipeResults(results) : (
                                    <div className={styles.resultsContent}>
                                        <ReactMarkdown>{results}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {substituteInfo.showModal && (
                <div className={styles.modalOverlay} onClick={handleCloseSubstituteModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.modalCloseButton} onClick={handleCloseSubstituteModal}>&times;</button>
                        <h3>Substitutes for {substituteInfo.ingredientName}</h3>
                        {substituteInfo.isLoading && <div className={styles.loadingSpinnerSmall}></div>}
                        {substituteInfo.error && <p className={styles.errorMessage}>{substituteInfo.error}</p>}
                        {substituteInfo.substitutesText && !substituteInfo.isLoading && (
                            <div className={styles.substitutesResultsContent}>
                                <ReactMarkdown>{substituteInfo.substitutesText}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Footer or other sections can go here */}
        </div>
    );
} 