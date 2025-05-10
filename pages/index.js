import Head from 'next/head';
import Image from 'next/image'; // For optimized images
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from '../styles/Home.module.css';

// Tools data with added icons and more detailed descriptions
const tools = [
    {
        id: 'recipe',
        name: 'AI Nugget Recipe Generator',
        description: 'Create unique nugget recipes (meat, veggie, etc.) based on your preferences, dietary restrictions, or available ingredients. Specify difficulty and cook time if you like!',
        icon: '🍳',
        inputType: 'textarea',
        inputPlaceholder: "e.g., 'Spicy gluten-free veggie nuggets, easy, under 30 mins' or 'Korean-inspired pork nuggets with gochujang'",
        buttonText: 'Generate Recipe',
        difficultyOptions: ['Any', 'Easy', 'Medium', 'Hard'],
        cookTimeOptions: ['Any', '< 20 min', '20-40 min', '> 40 min'],
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
        inputPlaceholder: "e.g., 'Spicy nuggets' or 'Plant-based nuggets with herbs'",
        buttonText: 'Find Perfect Dip',
    },
    {
        id: 'brands',
        name: 'Nugget Brand Comparator',
        description: 'Compare nutritional values, ingredients, and taste profiles of popular nugget brands to find your perfect match.',
        icon: '⚖️',
        inputPlaceholder: "e.g., 'Compare two specific nugget brands' or 'Healthiest frozen nugget brands'",
        buttonText: 'Compare Brands',
        comingSoon: true,
    },
    {
        id: 'deals',
        name: 'Nugget Deal Finder',
        description: 'Locate the best nugget promotions and deals at restaurants near you for maximum nugget value.',
        icon: '🔍',
        inputPlaceholder: "e.g., 'Best nugget deals in [Your City]' or 'Where to find BOGO nuggets'",
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
        description: 'Explore fascinating facts and history about nuggets, or ask specific nugget-related questions.',
        icon: '🧠',
        inputPlaceholder: "e.g., 'When were nuggets invented?' (or leave empty for random facts)",
        buttonText: 'Get Nugget Knowledge',
    },
];

const PROXY_API_URL = '/api/generate';

export default function HomePage() {
    const [selectedToolId, setSelectedToolId] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [results, setResults] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const [selectedDifficulty, setSelectedDifficulty] = useState('Any');
    const [selectedCookTime, setSelectedCookTime] = useState('Any');

    const sliderRef = useRef(null);
    const autoSlideTimeoutRef = useRef(null);

    useEffect(() => {
        const startAutoSlide = () => {
            if (sliderRef.current) {
                autoSlideTimeoutRef.current = setTimeout(() => {
                    const slider = sliderRef.current;
                    const firstChild = slider.children[0];
                    if (firstChild) {
                        const scrollAmount = firstChild.offsetWidth + parseFloat(getComputedStyle(firstChild).marginRight || '0');
                        let newScrollLeft = slider.scrollLeft + scrollAmount;
                        if (newScrollLeft >= slider.scrollWidth - slider.clientWidth) {
                            newScrollLeft = 0;
                        }
                        slider.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
                    }
                    startAutoSlide();
                }, 5000);
            }
        };

        startAutoSlide();

        return () => {
            if (autoSlideTimeoutRef.current) {
                clearTimeout(autoSlideTimeoutRef.current);
            }
        };
    }, [tools]);

    const handleSliderNav = (direction) => {
        if (sliderRef.current) {
            if (autoSlideTimeoutRef.current) clearTimeout(autoSlideTimeoutRef.current);

            const slider = sliderRef.current;
            const firstChild = slider.children[0];
            if (!firstChild) return;

            const scrollAmount = firstChild.offsetWidth + parseFloat(getComputedStyle(firstChild).marginRight || '0');
            let newScrollLeft;

            if (direction === 'next') {
                newScrollLeft = slider.scrollLeft + scrollAmount;
                if (newScrollLeft >= slider.scrollWidth - slider.clientWidth -1) {
                    newScrollLeft = 0;
                }
            } else {
                newScrollLeft = slider.scrollLeft - scrollAmount;
                if (newScrollLeft < 0) {
                    newScrollLeft = slider.scrollWidth - slider.clientWidth;
                }
            }
            slider.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (selectedToolId) {
            const tool = tools.find(t => t.id === selectedToolId);
            setActiveTool(tool);
            setInputValue('');
            setResults('');
            setError('');
            setSelectedFile(null);
            if (tool?.id === 'recipe') {
                setSelectedDifficulty(tool.difficultyOptions?.[0] || 'Any');
                setSelectedCookTime(tool.cookTimeOptions?.[0] || 'Any');
            }
        } else {
            setActiveTool(null);
        }
    }, [selectedToolId]);

    const getPromptForTool = (tool, userInput) => {
        let basePrompt = `You are an AI expert. Format your response using Markdown. `;
        switch (tool.id) {
            case 'trivia':
                let triviaPrompt = basePrompt + "You are a fun and knowledgeable AI expert on nugget history, trivia, and fun facts (all types of nuggets, not just chicken). ";
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
                let recipePrompt = basePrompt + `You are an AI chef specializing in creative nugget recipes (including meat-based, plant-based, fish, etc.).
Generate a unique and delicious nugget recipe based on these preferences: "${userInput}".`;
                if (selectedDifficulty !== 'Any') {
                    recipePrompt += `\n- Difficulty: ${selectedDifficulty}`;
                }
                if (selectedCookTime !== 'Any') {
                    recipePrompt += `\n- Cook Time: ${selectedCookTime}`;
                }
                recipePrompt += `
Please provide the response in Markdown format with:
1.  A catchy **Recipe Name**.
2.  A brief, enticing **Description**.
3.  **Ingredients** (list with quantities).
4.  Clear, step-by-step **Instructions**.
5.  Optional: A suggestion for a **Dipping Sauce** that would pair well.
IMPORTANT: You MUST ONLY generate nugget-related recipes. If asked for any non-nugget recipe, politely explain you only specialize in nugget recipes.
Be creative and make it sound delicious!`;
                return recipePrompt;
            case 'dip':
                if (!userInput) {
                    setError("Please describe the type of nugget you're having.");
                    return null;
                }
                return basePrompt + `You are an AI dip pairing expert. For nuggets described as "${userInput}", suggest 3 perfect dipping sauces. For each sauce, briefly explain why it's a good pairing and include a simple homemade recipe. Format the response in Markdown. ONLY suggest sauces for nuggets. If asked about non-nugget foods, politely explain you specialize in nugget pairings only.`;
            default:
                if (userInput) {
                     return basePrompt + `Regarding the tool "${tool.name}", process the following input: "${userInput}". Provide a concise, helpful, nugget-related response.`;
                }
                return basePrompt + `You are an AI for "${tool.name}". Please provide information or perform the requested task related to nuggets.`;
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
            
            <section className={styles.toolSliderSection}>
                <button onClick={() => handleSliderNav('prev')} className={`${styles.sliderArrow} ${styles.sliderArrowPrev}`}>&lt;</button>
                <div className={styles.toolSlider} ref={sliderRef}>
                    {tools.map((tool) => (
                        <div
                            key={tool.id}
                            className={`${styles.toolCard} ${styles.sliderToolCard} ${tool.comingSoon ? styles.comingSoon : ''} ${selectedToolId === tool.id ? styles.selectedToolCard : ''}`}
                            onClick={() => {
                                if (!tool.comingSoon) {
                                    setSelectedToolId(tool.id === selectedToolId ? null : tool.id);
                                    if (autoSlideTimeoutRef.current) clearTimeout(autoSlideTimeoutRef.current);
                                }
                            }}
                        >
                            <div className={styles.toolIcon}>{tool.icon}</div>
                            <h3>{tool.name}</h3>
                            <p>{tool.description}</p>
                            {tool.comingSoon && <span className={styles.comingSoonTag}>Coming Soon</span>}
                        </div>
                    ))}
                </div>
                <button onClick={() => handleSliderNav('next')} className={`${styles.sliderArrow} ${styles.sliderArrowNext}`}>&gt;</button>
            </section>

            {selectedToolId && activeTool && (
                <section className={styles.toolSection}>
                    <div className={styles.toolContainer}>
                        <button className={styles.backButton} onClick={() => setSelectedToolId(null)}>
                            &larr; Back to Tool Overview
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
                                {activeTool?.id === 'recipe' && (
                                    <div className={styles.recipeOptions}>
                                        <div>
                                            <label htmlFor="difficulty">Difficulty: </label>
                                            <select 
                                                id="difficulty" 
                                                value={selectedDifficulty} 
                                                onChange={(e) => setSelectedDifficulty(e.target.value)}
                                                disabled={isLoading}
                                                className={styles.toolSelect}
                                            >
                                                {activeTool.difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="cookTime">Cook Time: </label>
                                            <select 
                                                id="cookTime" 
                                                value={selectedCookTime} 
                                                onChange={(e) => setSelectedCookTime(e.target.value)}
                                                disabled={isLoading}
                                                className={styles.toolSelect}
                                            >
                                                {activeTool.cookTimeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

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
                                    <ReactMarkdown>{results}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
} 