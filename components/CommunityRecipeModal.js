import RecipeDisplay from './RecipeDisplay';

export default function CommunityRecipeModal({
  isOpen,
  onClose,
  recipe, // This will be the full object { id, recipe_name, recipe_data }
  onSave,
  isSaved,
  userLoggedIn,
  saveStatus, // 'loading', 'success', 'error', or null
  saveMessage,
  onAuthRequest, // New prop to request auth modal
}) {
  if (!isOpen || !recipe || !recipe.recipe_data) return null;

  const AuthOrSaveContent = () => {
    if (userLoggedIn) {
      return (
        <>
          {isSaved ? (
            <p className="saveStatusMessage saveSuccess" style={{color: 'green', marginBottom: '0'}}>This recipe is already in your collection.</p>
          ) : (
            <button
              onClick={onSave}
              className="saveRecipeButton primaryButton"
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
      );
    } else {
      return (
        <p className="authPromptText">
          <button onClick={onAuthRequest} className="authPromptButton">
            Log in or sign up
          </button>
          &nbsp;to save this recipe!
        </p>
      );
    }
  };

  return (
    <div className="modalOverlay">
      <div className="authModal" style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', paddingBottom: '20px' /* Adjusted padding */ }}>
        <button className="modalCloseButton" onClick={onClose}>×</button>
        
        <div style={{ padding: '15px 20px 10px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', flexShrink: 0 }}>
          <AuthOrSaveContent />
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}>
          <RecipeDisplay recipeData={recipe.recipe_data} />
        </div>
        
        {/* Old position of save/login prompt removed */}
      </div>
    </div>
  );
} 