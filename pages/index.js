import Head from 'next/head';
import Image from 'next/image'; // For optimized images
import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

const tools = [
    { id: 'trivia', name: 'AI Nugget History & Trivia Bot', description: 'Answers your questions or provides fun facts and history about chicken nuggets.', inputPlaceholder: 'e.g., When were chicken nuggets invented? (Optional)', buttonText: 'Get Trivia / Answer' },
    { id: 'recipe', name: 'AI Nugget Recipe Generator', description: 'Generates unique chicken (or veggie) nugget recipes based on your preferences.', inputType: 'textarea', inputPlaceholder: "e.g., 'Spicy, gluten-free veggie nuggets', 'Classic crispy chicken nuggets with a honey mustard dip recipe'", buttonText: 'Generate Recipe' },
    { id: 'dip', name: 'Dip Pairing AI', description: 'Suggests the perfect dipping sauce for any type of nugget. Describe your nugget!', inputPlaceholder: "e.g., 'Spicy chicken nuggets', 'Plain veggie nuggets'", buttonText: 'Suggest Dip' },
    // Add other tools here with similar structure
    // { id: 'critic', name: 'Nugget Critic AI', description: 'Upload a photo of nuggets, and the AI will rate them... (Image upload coming soon!)', disabled: true },
];

const PROXY_API_URL = '/api/generate'; // Our backend API route

export default function HomePage() {
    const [selectedToolId, setSelectedToolId] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [results, setResults] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const selectedTool = tools.find(tool => tool.id === selectedToolId);

    const handleToolSelect = (toolId) => {
        setSelectedToolId(toolId);
        setInputValue('');
        setResults('');
        setError('');
    };

    const getPromptForTool = (tool, userInput) => {
        switch (tool.id) {
            case 'trivia':
                let triviaPrompt = "You are a fun and knowledgeable AI expert on chicken nugget history, trivia, and fun facts. ";
                if (userInput) {
                    triviaPrompt += `Please answer the following question concisely and engagingly: "${userInput}"`;
                } else {
                    triviaPrompt += "Tell me an interesting and surprising fun fact or piece of trivia about chicken nuggets.";
                }
                triviaPrompt += " Keep your response friendly and suitable for a general audience.";
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
Be creative and make it sound yummy!`;
            case 'dip':
                if (!userInput) {
                    setError("Please describe the type of nugget you're having.");
                    return null;
                }
                return `You are an AI dip pairing expert. For nuggets described as "${userInput}", suggest 2-3 perfect dipping sauces. For each sauce, briefly explain why it's a good pairing. If possible, include a simple recipe for one of the suggested homemade dips.`;
            default:
                return userInput; // Fallback, should be customized
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedTool || selectedTool.disabled) return;

        const promptText = getPromptForTool(selectedTool, inputValue);
        if (!promptText && selectedTool.id !== 'trivia') { // Trivia can have empty input for random fact
             // Error already set by getPromptForTool
            return;
        }
        if (!promptText && selectedTool.id === 'trivia' && inputValue) { // Specific question for trivia
            // This case is fine, prompt is constructed
        } else if (!promptText && selectedTool.id === 'trivia' && !inputValue) {
            // This case is also fine for random trivia
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

    return (
        <div className={styles.container}>
            <Head>
                <title>nuggs.ai - Your Nugget AI Companion</title>
                <meta name="description" content="AI tools for all your chicken nugget needs!" />
                <link rel="icon" href="/favicon.ico" /> {/* Add a favicon later */}
            </Head>

            <header className={styles.header}>
                <h1>nuggs.ai</h1>
                <p>Your AI companion for all things nuggets!</p>
            </header>

            <div className={styles.mainLayout}>
                <aside className={styles.sidebar}>
                    <h2>AI Tools</h2>
                    <ul className={styles.toolList}>
                        {tools.map((tool) => (
                            <li
                                key={tool.id}
                                className={`${styles.toolListItem} ${selectedToolId === tool.id ? styles.toolListItemActive : ''} ${tool.disabled ? styles.disabled : ''}`}
                                onClick={() => !tool.disabled && handleToolSelect(tool.id)}
                                style={tool.disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                            >
                                {tool.name} {tool.disabled ? "(Soon)" : ""}
                            </li>
                        ))}
                    </ul>
                </aside>

                <main className={styles.mainContent}>
                    {!selectedTool ? (
                        <div className={styles.toolPlaceholder}>
                            <Image src="/nugget.png" alt="A cute nugget" width={150} height={150} style={{ objectFit: 'contain' }} />
                            <h2>Welcome to nuggs.ai!</h2>
                            <p>Select a tool from the sidebar to get started.</p>
                        </div>
                    ) : (
                        <div className={styles.toolInterface}>
                            <h3>{selectedTool.name}</h3>
                            <p>{selectedTool.description}</p>
                            {!selectedTool.disabled && (
                                <form onSubmit={handleSubmit}>
                                    {selectedTool.inputType === 'textarea' ? (
                                        <textarea
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder={selectedTool.inputPlaceholder}
                                            rows="4"
                                            disabled={isLoading}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder={selectedTool.inputPlaceholder}
                                            disabled={isLoading}
                                        />
                                    )}
                                    <button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Thinking...' : selectedTool.buttonText}
                                    </button>
                                </form>
                            )}
                            {isLoading && <div className={styles.loadingSpinner}></div>}
                            {error && <p style={{ color: 'red', marginTop: '15px' }}>Error: {error}</p>}
                            {results && (
                                <div className={styles.resultsArea}>
                                    {results}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <footer className={styles.footer}>
                <p>&copy; {new Date().getFullYear()} nuggs.ai - Powered by AI, fueled by nuggets.</p>
            </footer>
        </div>
    );
} 