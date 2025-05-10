import Head from 'next/head';
import Image from 'next/image'; // For optimized images
import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

// Tools data with added icons and more detailed descriptions
const tools = [
    {
        id: 'recipe',
        name: 'AI Nugget Recipe Generator',
        description: 'Create unique recipes for chicken or veggie nuggets based on your preferences, dietary restrictions, or available ingredients.',
        icon: '🍳',
        inputType: 'textarea',
        inputPlaceholder: "e.g., 'Spicy gluten-free veggie nuggets' or 'Korean-inspired chicken nuggets with gochujang'",
        buttonText: 'Generate Recipe',
    },
    {
        id: 'critic',
        name: 'Nugget Critic AI',
        description: 'Upload a photo of your nuggets and get professional feedback on appearance, probable texture, and overall appeal.',
        icon: '📸',
        inputType: 'file',
        inputPlaceholder: "Upload an image of your nuggets",
        buttonText: 'Analyze Nuggets',
        comingSoon: true,
    },
    {
        id: 'dip',
        name: 'Dip Pairing AI',
        description: 'Discover the perfect sauce pairings for any nugget style. Get personalized recommendations and homemade sauce recipes.',
        icon: '🥫',
        inputPlaceholder: "e.g., 'Spicy chicken nuggets' or 'Plant-based nuggets with herbs'",
        buttonText: 'Find Perfect Dip',
    },
    {
        id: 'brands',
        name: 'Nugget Brand Comparator',
        description: 'Compare nutritional values, ingredients, and taste profiles of popular nugget brands to find your perfect match.',
        icon: '⚖️',
        inputPlaceholder: "e.g., 'Compare Tyson vs. Perdue nuggets' or 'Healthiest frozen nugget brands'",
        buttonText: 'Compare Brands',
        comingSoon: true,
    },
    {
        id: 'deals',
        name: 'Fast Food Deal Finder',
        description: 'Locate the best nugget promotions and deals at restaurants near you for maximum nugget value.',
        icon: '🔍',
        inputPlaceholder: "e.g., 'Best nugget deals in Chicago' or 'Where to find BOGO nuggets'",
        buttonText: 'Find Deals',
        comingSoon: true,
    },
    {
        id: 'calories',
        name: 'Nugget Calorie Counter',
        description: 'Upload a photo of your nugget meal and get an estimate of calories, protein, and other nutritional information.',
        icon: '🔢',
        inputType: 'file',
        inputPlaceholder: "Upload an image of your nugget meal",
        buttonText: 'Calculate Calories',
        comingSoon: true,
    },
    {
        id: 'trivia',
        name: 'Nugget History & Trivia',
        description: 'Explore fascinating facts and history about chicken nuggets, or ask specific nugget-related questions.',
        icon: '🧠',
        inputPlaceholder: "e.g., 'When were chicken nuggets invented?' (or leave empty for random facts)",
        buttonText: 'Get Nugget Knowledge',
    },
];

// New: Placeholder data for famous nugget recipes
const famousNuggetRecipes = [
  {
    id: 'classic_crispy',
    source: 'From a Chef',
    votes: 1045,
    title: "Chef John's Ultimate Crispy Nuggets",
    description: "The crispiest, juiciest homemade chicken nuggets you'll ever make. A true classic.",
    icon: '🧑‍🍳' // Example icon
  },
  {
    id: 'spicy_kick',
    source: 'From an Enthusiast',
    votes: 779,
    title: 'Spicy Sriracha Kick Nuggets',
    description: 'Quick & simple. Guaranteed happiness with this clean, balanced and fiery bite.',
    icon: '🌶️'
  },
  {
    id: 'veggie_delight',
    source: 'From a Foodie',
    votes: 523,
    title: 'Vegan Cauliflower Power Nuggets',
    description: 'A surprisingly meaty and delicious plant-based alternative that everyone will love.',
    icon: '🥦'
  },
  {
    id: 'honey_garlic',
    source: 'Championship',
    votes: 428,
    title: 'Honey Garlic Glazed Nuggets',
    description: 'Sweet, savory, and utterly addictive. Perfect for game day or any day.',
    icon: '🏆'
  },
  {
    id: 'parmesan_herb',
    source: 'From a Chef',
    votes: 357,
    title: 'Parmesan Herb Baked Nuggets',
    description: 'A simple recipe for a healthier, flavorful nugget, baked to perfection.',
    icon: '🌿'
  },
  {
    id: 'bbq_ranch',
    source: 'From an Enthusiast',
    votes: 264,
    title: 'Smoky BBQ Ranch Nuggets',
    description: 'Learn how to brew a sweet and smoky flavor combination for your nuggets.',
    icon: '🤠'
  }
];

const PROXY_API_URL = '/api/generate'; // Our backend API route

export default function HomePage() {
    const [selectedToolId, setSelectedToolId] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [results, setResults] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // State for new UI elements if needed (e.g., sorting, filtering)
    const [sortBy, setSortBy] = useState('Most Votes');
    const [activeFilters, setActiveFilters] = useState({});

    useEffect(() => {
        // Reset states when tool changes
        if (selectedToolId) {
            const tool = tools.find(t => t.id === selectedToolId);
            setActiveTool(tool);
            setInputValue('');
            setResults('');
            setError('');
            setSelectedFile(null);
        }
    }, [selectedToolId]);

    const getPromptForTool = (tool, userInput) => {
        switch (tool.id) {
            case 'trivia':
                let triviaPrompt = "You are a fun and knowledgeable AI expert on chicken nugget history, trivia, and fun facts. ";
                if (userInput) {
                    triviaPrompt += `Please answer the following question concisely and engagingly: "${userInput}"`;
                } else {
                    triviaPrompt += "Tell me an interesting and surprising fun fact or piece of trivia about chicken nuggets.";
                }
                triviaPrompt += " Keep your response friendly and suitable for a general audience. ONLY answer nugget-related questions. If asked about non-nugget topics, politely explain you're a nugget specialist.";
                return triviaPrompt;
            case 'recipe':
                if (!userInput) {
                    setError("Please describe the type of nugget recipe you'd like.");
                    return null;
                }
                return `You are an AI chef specializing in creative chicken (and vegetarian/vegan) nugget recipes.
Generate a unique and delicious nugget recipe based on these preferences: "${userInput}".
Please provide:
1. A catchy name for the recipe.
2. A brief, enticing description.
3. A list of ingredients with quantities.
4. Clear, step-by-step instructions.
5. Optional: A suggestion for a dipping sauce that would pair well.
IMPORTANT: You MUST ONLY generate nugget-related recipes. If asked for any non-nugget recipe, politely explain you only specialize in nugget recipes.
Be creative and make it sound delicious!`;
            case 'dip':
                if (!userInput) {
                    setError("Please describe the type of nugget you're having.");
                    return null;
                }
                return `You are an AI dip pairing expert. For nuggets described as "${userInput}", suggest 3 perfect dipping sauces. For each sauce, briefly explain why it's a good pairing and include a simple homemade recipe. ONLY suggest sauces for nuggets. If asked about non-nugget foods, politely explain you specialize in nugget pairings only.`;
            default:
                return null;
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!activeTool || activeTool.comingSoon) return;

        const promptText = getPromptForTool(activeTool, inputValue);
        if (!promptText && activeTool.id !== 'trivia') {
            return; // Error already set by getPromptForTool
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
                setResults(data.candidates[0].content.parts[0].text);
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

    // Placeholder function for filter changes
    const handleFilterChange = (filterType, value) => {
        setActiveFilters(prev => ({ ...prev, [filterType]: value }));
        // Add logic to filter recipes if this were a dynamic list
        console.log("Filters updated:", { ...activeFilters, [filterType]: value });
    };

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>nuggs.ai - The Ultimate Nugget AI Platform</title>
                <meta name="description" content="AI-powered tools for all your chicken nugget needs - recipes, reviews, pairings and more!" />
                <link rel="icon" href="/nuggets.png" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <header className={styles.mainHeader}>
                <div className={styles.logoArea}>
                    <Image src="/nuggets.png" alt="nuggs.ai Logo" width={40} height={40} />
                    <span className={styles.logoText}>nuggs.ai</span>
                </div>
                <nav className={styles.mainNav}>
                    <a href="#feeling-lucky">Feeling Lucky?</a>
                    <a href="#activity">Activity</a>
                    <a href="#share-recipe">Share Your Recipe</a>
                </nav>
                <div className={styles.userActions}>
                    <a href="#signin" className={styles.signInButton}>Sign in</a>
                    <a href="#signup" className={styles.signUpButton}>Sign up</a>
                </div>
            </header>
            
            {/* New Tool Slider Section */}
            <section className={styles.toolSliderSection}>
                <div className={styles.toolSlider}>
                    {tools.map((tool) => (
                        <div
                            key={tool.id}
                            className={`${styles.toolCard} ${styles.sliderToolCard} ${tool.comingSoon ? styles.comingSoon : ''}`}
                            onClick={() => !tool.comingSoon && setSelectedToolId(tool.id)}
                        >
                            <div className={styles.toolIcon}>{tool.icon}</div>
                            <h3>{tool.name}</h3>
                            <p>{tool.description}</p>
                            {tool.comingSoon && <span className={styles.comingSoonTag}>Coming Soon</span>}
                        </div>
                    ))}
                </div>
            </section>

            <div className={styles.mainContentArea}>
                <section className={styles.recipeListingSection}>
                    <div className={styles.listingControls}>
                        <p className={styles.listingInfo}>Nuggs.ai® recipes! Viewing: all recipes ({famousNuggetRecipes.length}+)</p>
                        <div className={styles.sortByContainer}>
                            <label htmlFor="sort-by">Sort by: </label>
                            <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortBySelect}>
                                <option value="Most Votes">Most Votes</option>
                                <option value="Newest">Newest</option>
                                <option value="Difficulty">Difficulty</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.recipeGrid}>
                        {famousNuggetRecipes.map(recipe => (
                            <div key={recipe.id} className={styles.recipeCard}>
                                <div className={styles.recipeCardHeader}>
                                    <span className={styles.recipeSourceIcon}>{recipe.icon || '🍴'}</span>
                                    <span className={styles.recipeSource}>{recipe.source}</span>
                                    <div className={styles.recipeVotes}>
                                        <span role="img" aria-label="thumbs up">👍</span> {recipe.votes}
                                    </div>
                                </div>
                                <h4 className={styles.recipeTitle}>{recipe.title}</h4>
                                <p className={styles.recipeDescription}>{recipe.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className={styles.sidebarSection}>
                    <h3 className={styles.sidebarTitle}>Refine your recipe</h3>
                    <div className={styles.filterGroup}>
                        <h4>Category</h4>
                        {['All', 'Chicken', 'Veggie', 'Spicy', 'Kid-Friendly'].map(cat => (
                            <label key={cat} className={styles.filterOption}>
                                <input type="radio" name="category" value={cat} onChange={() => handleFilterChange('category', cat)} defaultChecked={cat === 'All'} />
                                {cat === 'Chicken' ? '👑 Championship' : cat === 'Veggie' ? '🌱 Experimental' : cat === 'Spicy' ? '🌶️ From a Barista' : cat === 'Kid-Friendly' ? '😊 From an Enthusiast' : cat}
                            </label>
                        ))}
                    </div>
                    <div className={styles.filterGroup}>
                        <h4>Difficulty</h4>
                        {['Any', 'Easy', 'Medium', 'Hard'].map(diff => (
                            <label key={diff} className={styles.filterOption}>
                                <input type="radio" name="difficulty" value={diff} onChange={() => handleFilterChange('difficulty', diff)} defaultChecked={diff === 'Any'} />
                                {diff}
                            </label>
                        ))}
                    </div>
                     <div className={styles.filterGroup}>
                        <h4>Cook Time</h4>
                        {['Any', '< 20 min', '20-40 min', '> 40 min'].map(time => (
                            <label key={time} className={styles.filterOption}>
                                <input type="radio" name="cookTime" value={time} onChange={() => handleFilterChange('cookTime', time)} defaultChecked={time === 'Any'} />
                                {time}
                            </label>
                        ))}
                    </div>
                </aside>
            </div>

            {selectedToolId && (
                <section className={styles.toolSection}>
                    <div className={styles.toolContainer}>
                        <button className={styles.backButton} onClick={() => setSelectedToolId(null)}>
                            &larr; Back to Tools
                        </button>
                        
                        <div className={styles.toolHeader}>
                            <span className={styles.toolIconLarge}>{activeTool?.icon}</span>
                            <h2>{activeTool?.name}</h2>
                        </div>
                        
                        <p className={styles.toolDescription}>{activeTool?.description}</p>
                        
                        {activeTool?.comingSoon ? (
                            <div className={styles.comingSoonMessage}>
                                <h3>Coming Soon!</h3>
                                <p>We're still perfecting this nugget tool. Check back soon!</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className={styles.toolForm}>
                                {activeTool?.inputType === 'textarea' ? (
                                    <textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={activeTool.inputPlaceholder}
                                        rows="4"
                                        disabled={isLoading}
                                    />
                                ) : activeTool?.inputType === 'file' ? (
                                    <div className={styles.fileUpload}>
                                        <label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                disabled={isLoading}
                                            />
                                            <div className={styles.uploadArea}>
                                                {selectedFile ? (
                                                    <div className={styles.selectedFile}>
                                                        <p>{selectedFile.name}</p>
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => {e.stopPropagation(); setSelectedFile(null)}}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={styles.uploadIcon}>📁</span>
                                                        <p>{activeTool.inputPlaceholder}</p>
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
                                        placeholder={activeTool?.inputPlaceholder}
                                        disabled={isLoading}
                                    />
                                )}
                                
                                <button 
                                    type="submit" 
                                    disabled={isLoading || (activeTool?.inputType === 'file' && !selectedFile)}
                                    className={styles.submitButton}
                                >
                                    {isLoading ? 'Processing...' : activeTool?.buttonText}
                                </button>
                            </form>
                        )}
                        
                        {isLoading && <div className={styles.loadingSpinner}></div>}
                        {error && <p className={styles.errorMessage}>Error: {error}</p>}
                        {results && (
                            <div className={styles.resultsContainer}>
                                <h3>Results</h3>
                                <div className={styles.resultsContent}>
                                    {results}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
} 