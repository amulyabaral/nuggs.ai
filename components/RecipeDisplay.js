import React from 'react'; // Ensure React is imported if not already

// Copied and adapted from pages/recipe/[id].js
// Ensure any necessary imports like Link or specific styles are handled if they were page-specific.
// For now, this is a direct copy of the functional component part.

export default function RecipeDisplay({ recipeData }) {
  if (!recipeData) {
    return <p className="errorMessage">Recipe details are not available for display.</p>;
  }

  // Helper to simulate Amazon search (can be expanded or linked to existing function)
  const handleLocalAmazonSearch = (itemName) => {
    const AMAZON_AFFILIATE_TAG = 'nuggs00-20'; // Or get from context/props if dynamic
    const searchTerm = encodeURIComponent(itemName);
    const amazonSearchUrl = `https://www.amazon.com/s?k=${searchTerm}&tag=${AMAZON_AFFILIATE_TAG}&ref=community_recipe_item`;
    window.open(amazonSearchUrl, '_blank', 'noopener,noreferrer');
    console.log(`Searching Amazon for: ${itemName}`);
  };


  return (
    <div className="recipeOutputContainer">
      <div className="recipeNameCard highlightedRecipeCard">
        <h2 className="recipeTitlePill">{recipeData.recipeName || 'Saved Recipe'}</h2>
        <p>{recipeData.description || 'No description provided.'}</p>
        <div className="recipeMeta">
          {recipeData.prepTime && <span><strong>Prep:</strong> {recipeData.prepTime}</span>}
          {recipeData.cookTime && <span><strong>Cook:</strong> {recipeData.cookTime}</span>}
          {recipeData.difficultyRating && <span><strong>Difficulty:</strong> {recipeData.difficultyRating}</span>}
          {recipeData.servings && <span><strong>Servings:</strong> <span style={{fontWeight: '600'}}>{recipeData.servings}</span></span>}
          {recipeData.nutritionInfo && recipeData.nutritionInfo.calories && (
            <span><strong>Calories:</strong> <span style={{fontWeight: '600'}}>{recipeData.nutritionInfo.calories}</span></span>
          )}
        </div>
        {recipeData.healthBenefits && recipeData.healthBenefits.length > 0 && (
          <div className="healthBenefitsSection">
            <strong>Health Highlights:</strong>
            <ul>
              {recipeData.healthBenefits.map((benefit, idx) => <li key={idx}>{benefit}</li>)}
            </ul>
          </div>
        )}
      </div>

      {recipeData.ingredients && recipeData.ingredients.length > 0 && (
        <div className="recipeSection">
          <h3>Ingredients</h3>
           <p className="amazonNote"> (You can click any ingredient to automatically search for it on Amazon!)</p>
          <div className="ingredientsGrid">
            {recipeData.ingredients.map((ing, index) => (
              <div
                key={index}
                className="ingredientPill"
                onClick={() => handleLocalAmazonSearch(ing.name)}
                title={`Click to search for ${ing.name} on Amazon`}
                style={{cursor: 'pointer'}}
              >
                <span className="ingredientName">{ing.name}</span>
                <span className="ingredientQuantity">{`${ing.quantity || ''} ${ing.unit || ''}`}</span>
                {ing.notes && <small className="ingredientNotes">({ing.notes})</small>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recipeData.instructions && recipeData.instructions.length > 0 && (
        <div className="recipeSection">
          <h3>Instructions</h3>
          <ul className="instructionsList">
            {recipeData.instructions.map((instr, index) => (
              <li key={instr.stepNumber || index} className="instructionStep">
                <div className="instructionHeader">
                  <div className="instructionCheckboxWrapper">
                    <span className="stepNumber">Step {instr.stepNumber}:</span>
                  </div>
                </div>
                <div className="stepDescriptionWrapper">
                  <span className="stepDescription">{instr.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipeData.substitutionSuggestions && recipeData.substitutionSuggestions.length > 0 && (
        <div className="recipeSection">
          <h3>Healthier Substitution Ideas</h3>
          <div className="suggestionCardsContainer">
            {recipeData.substitutionSuggestions.map((sub, index) => (
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

      {recipeData.pairingSuggestions && recipeData.pairingSuggestions.length > 0 && (
        <div className="recipeSection">
          <h3>Healthy Pairing Suggestions</h3>
          <div className="suggestionCardsContainer">
            {recipeData.pairingSuggestions.map((item, index) => (
              <div
                key={`pairing-${index}`}
                className="suggestionCard"
                onClick={() => handleLocalAmazonSearch(item.amazonSearchKeywords || item.name)}
                title={`Search for ${item.name} related items on Amazon`}
                style={{cursor: 'pointer'}}
              >
                <h4>{item.emoji && <span className="suggestionEmoji">{item.emoji}</span>} {item.name} <small>({item.type})</small></h4>
                {item.description && <p>{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recipeData.nutritionInfo && (
        <div className="nutritionInfoSection">
          <strong>Nutrition (per serving):</strong>
          <div className="nutritionGrid">
            {recipeData.nutritionInfo.calories && (
              <div className="nutritionPill">
                <span className="nutritionLabel">Calories:</span>
                <span className="nutritionValue">{recipeData.nutritionInfo.calories}</span>
              </div>
            )}
            {recipeData.nutritionInfo.protein && (
              <div className="nutritionPill">
                <span className="nutritionLabel">Protein:</span>
                <span className="nutritionValue">{recipeData.nutritionInfo.protein}</span>
              </div>
            )}
            {recipeData.nutritionInfo.carbs && (
              <div className="nutritionPill">
                <span className="nutritionLabel">Carbs:</span>
                <span className="nutritionValue">{recipeData.nutritionInfo.carbs}</span>
              </div>
            )}
            {recipeData.nutritionInfo.fat && (
              <div className="nutritionPill">
                <span className="nutritionLabel">Fat:</span>
                <span className="nutritionValue">{recipeData.nutritionInfo.fat}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 