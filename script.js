// script.js now calls our own backend proxy, which securely handles the API key.

// The URL for your backend proxy.
// If running locally for development, it might be 'http://localhost:3001/api/generate'.
// For production on Render, this will be your Render backend service URL.
// Example: 'https://your-nuggs-ai-backend.onrender.com/api/generate'
// You might want to make this configurable based on environment (dev vs. prod)
const PROXY_API_URL = '/api/generate'; // Assumes proxy is served on the same domain or configured for relative paths

document.addEventListener('DOMContentLoaded', () => {
    const toolListItems = document.querySelectorAll('#tool-list li');
    const mainContent = document.getElementById('main-content');
    const defaultPlaceholderHTML = mainContent.innerHTML; // Save initial placeholder content

    toolListItems.forEach(item => {
        item.addEventListener('click', () => {
            toolListItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const toolName = item.getAttribute('data-tool');
            loadToolInterface(toolName);
        });
    });

    function getToolTitle(toolName) {
        const titles = {
            'recipe': 'AI Nugget Recipe Generator',
            'critic': 'Nugget Critic AI',
            'dip': 'Dip Pairing AI',
            'comparator': 'Nugget Brand Comparator AI',
            'deal': 'AI Fast Food Deal Finder',
            'calorie': 'Calorie Counter for Nuggets AI',
            'map': 'Global Nugget Taste Map AI',
            'cooking': 'AI for Perfect Nugget Frying/Baking',
            'planner': 'Kid-Friendly Meal Planner AI',
            'trivia': 'AI Nugget History & Trivia Bot'
        };
        return titles[toolName] || 'Unknown Tool';
    }

    function getToolDescription(toolName) {
        const descriptions = {
            'recipe': 'Generates unique chicken (or veggie) nugget recipes based on your preferences.',
            'critic': 'Upload a photo of nuggets, and the AI will rate them on crispiness, color, and more. (Image upload coming soon!)',
            'dip': 'Suggests the perfect dipping sauce for any type of nugget. Describe your nugget!',
            'comparator': 'Analyzes nutritional info and reviews of different nugget brands. Enter brands to compare.',
            'deal': 'Finds the best deals on chicken nuggets near you. (Location features coming soon!)',
            'calorie': 'Estimates calories based on a picture of nuggets. (Image upload coming soon!)',
            'map': 'Users submit reviews, AI maps regional nugget preferences. (Interactive map coming soon!)',
            'cooking': 'Provides real-time tips for cooking nuggets to perfection. Ask about your cooking method!',
            'planner': 'Helps plan balanced meals incorporating nuggets, especially for kids. Describe your needs.',
            'trivia': 'Answers your questions or provides fun facts and history about chicken nuggets.'
        };
        return descriptions[toolName] || 'Select a tool to get started.';
    }

    function loadToolInterface(toolName) {
        mainContent.innerHTML = ''; // Clear previous content

        const toolInterface = document.createElement('div');
        toolInterface.classList.add('tool-interface', 'active');

        let toolHTML = `<h3>${getToolTitle(toolName)}</h3>`;
        toolHTML += `<p>${getToolDescription(toolName)}</p>`;

        // Add specific inputs and button for the tool
        switch (toolName) {
            case 'trivia':
                toolHTML += `
                    <input type="text" id="trivia-question" placeholder="e.g., When were chicken nuggets invented? (Optional)">
                    <button id="get-trivia-btn">Get Trivia / Answer</button>
                `;
                break;
            case 'recipe':
                toolHTML += `
                    <textarea id="recipe-prompt" rows="4" placeholder="e.g., 'Spicy, gluten-free veggie nuggets', 'Classic crispy chicken nuggets with a honey mustard dip recipe'"></textarea>
                    <button id="get-recipe-btn">Generate Recipe</button>
                `;
                break;
            case 'dip':
                 toolHTML += `
                    <input type="text" id="dip-nugget-type" placeholder="e.g., 'Spicy chicken nuggets', 'Plain veggie nuggets'">
                    <button id="get-dip-btn">Suggest Dip</button>
                `;
                break;
            // Add more cases for other tools here as they are developed
            default:
                // If a tool is clicked but not yet implemented, show the placeholder
                mainContent.innerHTML = defaultPlaceholderHTML;
                // Optionally, add a message like:
                // const comingSoonMsg = document.createElement('p');
                // comingSoonMsg.textContent = `The "${getToolTitle(toolName)}" tool is coming soon!`;
                // mainContent.appendChild(comingSoonMsg);
                return;
        }

        toolHTML += `<div class="loading-spinner" id="loading-spinner"></div>`;
        toolHTML += `<div class="results-area" id="results-area">Your AI-generated content will appear here.</div>`;
        toolInterface.innerHTML = toolHTML;
        mainContent.appendChild(toolInterface);

        // Add event listeners for the newly created buttons
        if (toolName === 'trivia') {
            document.getElementById('get-trivia-btn').addEventListener('click', handleTriviaRequest);
        } else if (toolName === 'recipe') {
            document.getElementById('get-recipe-btn').addEventListener('click', handleRecipeRequest);
        } else if (toolName === 'dip') {
            document.getElementById('get-dip-btn').addEventListener('click', handleDipRequest);
        }
    }

    async function callGeminiAPI(promptText) {
        const loadingSpinner = document.getElementById('loading-spinner');
        const resultsArea = document.getElementById('results-area');

        if (loadingSpinner) loadingSpinner.style.display = 'block';
        if (resultsArea) resultsArea.textContent = 'Nuggeting some thoughts...';

        try {
            const response = await fetch(PROXY_API_URL, { // Call your backend proxy
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ promptText: promptText }), // Send promptText in the body
            });

            const data = await response.json(); // Get JSON response from your proxy

            if (!response.ok) {
                // Handle errors from your proxy (which might include errors from Gemini)
                console.error('API Proxy Error Response:', data);
                let errorMessage = `API request failed: ${response.statusText}.`;
                if (data.error) {
                    errorMessage += ` Message: ${data.error}`;
                    if (data.details && data.details.message) {
                         errorMessage += ` Details: ${data.details.message}`;
                    } else if (typeof data.details === 'string') {
                        errorMessage += ` Details: ${data.details}`;
                    }
                }
                throw new Error(errorMessage);
            }

            // Assuming your proxy forwards Gemini's response structure
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                return data.candidates[0].content.parts[0].text;
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                console.warn("Prompt blocked by API (via proxy):", data.promptFeedback);
                return `Your request was blocked by the AI. Reason: ${data.promptFeedback.blockReason}. Please try a different prompt.`;
            } else if (data.error) { // Handle cases where proxy returns an error but Gemini structure isn't there
                 return `Sorry, an error occurred: ${data.error}`;
            }
            else {
                console.error('Unexpected API response structure from proxy:', data);
                return 'Sorry, I received an unexpected response from the AI. Please check the console for details.';
            }

        } catch (error) {
            console.error('Error calling API Proxy:', error);
            return `Error: ${error.message}. Please check the console for more details.`;
        } finally {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    async function handleTriviaRequest() {
        const questionInput = document.getElementById('trivia-question');
        const resultsArea = document.getElementById('results-area');
        const userQuestion = questionInput.value.trim();

        let promptText = "You are a fun and knowledgeable AI expert on chicken nugget history, trivia, and fun facts. ";
        if (userQuestion) {
            promptText += `Please answer the following question concisely and engagingly: "${userQuestion}"`;
        } else {
            promptText += "Tell me an interesting and surprising fun fact or piece of trivia about chicken nuggets.";
        }
        promptText += " Keep your response friendly and suitable for a general audience.";

        const responseText = await callGeminiAPI(promptText);
        resultsArea.textContent = responseText;
    }

    async function handleRecipeRequest() {
        const recipePromptInput = document.getElementById('recipe-prompt');
        const resultsArea = document.getElementById('results-area');
        const userPreference = recipePromptInput.value.trim();

        if (!userPreference) {
            resultsArea.textContent = "Please describe the type of nugget recipe you'd like (e.g., 'spicy gluten-free veggie nuggets', 'classic crispy chicken nuggets').";
            return;
        }

        let promptText = `You are an AI chef specializing in creative chicken (and vegetarian/vegan) nugget recipes.
Generate a unique and delicious nugget recipe based on these preferences: "${userPreference}".
Please provide:
1. A catchy name for the recipe.
2. A brief, enticing description.
3. A list of ingredients with quantities.
4. Clear, step-by-step instructions.
5. Optional: A suggestion for a dipping sauce that would pair well.
Be creative and make it sound yummy!`;

        const responseText = await callGeminiAPI(promptText);
        resultsArea.textContent = responseText;
    }

    async function handleDipRequest() {
        const nuggetDescInput = document.getElementById('dip-nugget-type');
        const resultsArea = document.getElementById('results-area');
        const nuggetDescription = nuggetDescInput.value.trim();

        if (!nuggetDescription) {
            resultsArea.textContent = "Please describe the type of nugget you're having (e.g., 'spicy chicken nuggets', 'plain veggie nuggets').";
            return;
        }

        let promptText = `You are an AI dip pairing expert. For nuggets described as "${nuggetDescription}", suggest 2-3 perfect dipping sauces. For each sauce, briefly explain why it's a good pairing. If possible, include a simple recipe for one of the suggested homemade dips.`;

        const responseText = await callGeminiAPI(promptText);
        resultsArea.textContent = responseText;
    }

    // Initialize with the placeholder when the page loads
    mainContent.innerHTML = defaultPlaceholderHTML;
}); 