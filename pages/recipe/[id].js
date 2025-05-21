import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../contexts/AuthContext';

// This component will render the actual recipe details
// It's similar to the renderRecipeResults function from your HomePage
function RecipeDisplay({ recipeData }) {
  if (!recipeData) {
    return <p className="errorMessage">Recipe details are not available for display.</p>;
  }

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
          <div className="ingredientsGrid">
            {recipeData.ingredients.map((ing, index) => (
              <div key={index} className="ingredientPill">
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
                    {/* Checkbox and timer functionality can be added if needed, simplified for display here */}
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
              <div key={`pairing-${index}`} className="suggestionCard">
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

export async function getServerSideProps(ctx) {
  const { params } = ctx;
  const recipeId = params.id;

  // Create authenticated Supabase Client
  const supabase = createPagesServerClient(ctx);

  // Check if we have a session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return {
      redirect: {
        destination: '/', // Or your login page
        permanent: false,
      },
    };
  }

  // Fetch the specific recipe for the logged-in user
  const { data: recipe, error } = await supabase
    .from('saved_recipes')
    .select('*') // Fetches all columns, including recipe_name and recipe_data
    .eq('id', recipeId)
    .eq('user_id', session.user.id) // Crucial: ensure recipe belongs to the user
    .single(); // Expects a single row

  if (error || !recipe) {
    console.error(`Error fetching recipe ${recipeId} for user ${session.user.id}:`, error);
    return {
      notFound: true, // Return 404 if recipe not found or error occurs
    };
  }

  // The recipe_data column is JSONB, so it's already an object here.
  // The recipe_name is a direct column.
  return {
    props: {
      recipe, // Pass the whole recipe object
      // initialSession: session, // AuthProvider should handle session context
    },
  };
}

export default function SavedRecipePage({ recipe }) {
  const { user } = useAuth(); // For header or other UI elements
  const router = useRouter();

  if (router.isFallback) {
    return (
      <div className="pageContainer">
        <main className="dashboardContainer">
          <div className="loadingSpinner" style={{ margin: '3rem auto' }}>Loading recipe...</div>
        </main>
      </div>
    );
  }

  // This check is mostly a fallback, getServerSideProps should handle notFound
  if (!recipe) {
    return (
      <div className="pageContainer">
        <header className="mainHeader">
          <Link href="/" className="logoLink">
            <div className="logoArea"><h1 className="logoText"><span className="logoEmoji">🥦 </span> nuggs.ai</h1></div>
          </Link>
          <nav>
            <Link href="/" className="navLink">Home</Link>
            <Link href="/dashboard" className="navLink">Dashboard</Link>
          </nav>
        </header>
        <main className="errorContainer" style={{textAlign: 'center', padding: '2rem'}}>
          <h1>Recipe Not Found</h1>
          <p>The recipe you are looking for could not be found or you do not have permission to view it.</p>
          <Link href="/dashboard" className="backButton">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="pageContainer">
      <Head>
        <title>{recipe.recipe_name || 'View Recipe'} | nuggs.ai</title>
        <meta name="description" content={`Details for your saved recipe: ${recipe.recipe_name || 'A healthy recipe from nuggs.ai'}`} />
      </Head>

      <header className="mainHeader">
        <Link href="/" className="logoLink">
          <div className="logoArea">
            <h1 className="logoText"><span className="logoEmoji">🥦 </span> nuggs.ai</h1>
          </div>
        </Link>
        <nav>
          <Link href="/" className="navLink">Home</Link>
          <Link href="/blog" className="navLink">Blog</Link>
          {user ? (
            <Link href="/dashboard" className="navLink">Dashboard</Link>
          ) : (
            <button onClick={() => router.push('/')} className="navLink authNavButton">Log In</button>
          )}
        </nav>
      </header>

      <main className="recipeDetailContainer">
        <div className="recipeDetailHeader" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
          <Link href="/dashboard" className="backLink">
            &larr; Back to Dashboard
          </Link>
        </div>
        {/* recipe.recipe_data contains the actual recipe JSON content */}
        <RecipeDisplay recipeData={recipe.recipe_data} />
      </main>
    </div>
  );
} 