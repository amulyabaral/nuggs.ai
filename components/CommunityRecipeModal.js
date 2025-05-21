import RecipeDisplay from './RecipeDisplay';

export default function CommunityRecipeModal({
  isOpen,
  onClose,
  recipe, // This will be the full object { id, recipe_name, recipe_data }
  onSave,
  isSaved,
  userLoggedIn,
  saveStatus, // 'loading', 'success', 'error', or null
  saveMessage
}) {
  if (!isOpen || !recipe || !recipe.recipe_data) return null;

  return (
    <div className="modalOverlay">
      <div className="authModal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '60px' }}>
        <button className="modalCloseButton" onClick={onClose}>×</button>
        <RecipeDisplay recipeData={recipe.recipe_data} />
        
        <div style={{ marginTop: '20px', textAlign: 'center', padding: '10px' }}>
          {userLoggedIn ? (
            <>
              {isSaved ? (
                <p className="saveStatusMessage saveSuccess" style={{color: 'green'}}>This recipe is already in your collection.</p>
              ) : (
                <button 
                  onClick={onSave} 
                  className="saveRecipeButton primaryButton" // Reusing button styles
                  disabled={saveStatus === 'loading'}
                >
                  {saveStatus === 'loading' ? 'Saving...' : 'Save This Recipe'}
                </button>
              )}
              {saveStatus && saveStatus !== 'loading' && saveMessage && (
                <p className={`saveStatusMessage ${saveStatus === 'success' ? 'saveSuccess' : 'saveError'}`} style={{marginTop: '10px'}}>
                  {saveMessage}
                </p>
              )}
            </>
          ) : (
            <p>Log in or sign up to save this recipe!</p>
          )}
        </div>
      </div>
    </div>
  );
} 