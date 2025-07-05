import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../contexts/AuthContext';
import RecipeDisplay from '../../components/RecipeDisplay';
import AuthModal from '../../components/AuthModal'; // For login prompt

// Supabase Admin Client for server-side fetching
// Note: In a real app, you might centralize admin client creation
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


export async function getServerSideProps(ctx) {
  const { params } = ctx;
  const recipeId = params.id;

  if (!recipeId) {
    return { notFound: true };
  }

  try {
    const { data: recipe, error } = await supabaseAdmin
      .from('saved_recipes')
      .select('id, user_id, recipe_name, recipe_data, created_at') // Fetch necessary fields
      .eq('id', recipeId)
      .single();

    if (error || !recipe) {
      console.error(`Error fetching community recipe ${recipeId}:`, error);
      return { notFound: true };
    }
    
    return {
      props: {
        recipe,
      },
    };
  } catch (e) {
    console.error(`Exception fetching community recipe ${recipeId}:`, e);
    return { notFound: true };
  }
}

export default function CommunityRecipePage({ recipe }) {
  const { user, supabaseClient, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isSavedByCurrentUser, setIsSavedByCurrentUser] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'loading', 'success', 'error'
  const [saveMessage, setSaveMessage] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    const checkIfSaved = async () => {
      if (user && supabaseClient && recipe && recipe.recipe_data && recipe.recipe_data.recipeName) {
        try {
          const { data, error, count } = await supabaseClient
            .from('saved_recipes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            // A more robust check might involve comparing recipe content if names can collide
            // For simplicity, we'll use recipe_name.
            .eq('recipe_name', recipe.recipe_data.recipeName); 

          if (error) {
            console.error("Error checking if recipe is saved by current user:", error);
            return;
          }
          setIsSavedByCurrentUser(count > 0);
        } catch (err) {
          console.error("Exception checking if recipe is saved:", err);
        }
      } else {
        setIsSavedByCurrentUser(false);
      }
    };

    if (!authLoading) { // Only run after auth state is resolved
        checkIfSaved();
    }
  }, [user, supabaseClient, recipe, authLoading]);

  const handleSaveRecipeToCollection = async () => {
    if (!user) {
      setAuthMode('login'); // Or 'signup'
      setShowAuthModal(true);
      return;
    }

    if (!recipe || !recipe.recipe_data || !supabaseClient) {
      setSaveStatus('error');
      setSaveMessage('Error: Recipe data is missing.');
      return;
    }

    if (isSavedByCurrentUser) {
        setSaveStatus('success'); // Or some other status like 'info'
        setSaveMessage('This recipe is already in your collection.');
        return;
    }

    setSaveStatus('loading');
    setSaveMessage('Saving to your collection...');

    try {
      const recipeToSave = recipe.recipe_data;
      const { error: insertError } = await supabaseClient
        .from('saved_recipes')
        .insert({
          user_id: user.id,
          recipe_name: recipeToSave.recipeName || 'Untitled Community Recipe',
          recipe_data: recipeToSave,
          folder: 'Saved Recipes', // Default folder
          is_favorite: false,     // Default favorite status
        });

      if (insertError) throw insertError;

      setSaveStatus('success');
      setSaveMessage('Recipe saved to your collection!');
      setIsSavedByCurrentUser(true);

      setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error saving community recipe to user collection:', error);
      setSaveStatus('error');
      setSaveMessage(`Failed to save: ${error.message || 'Please try again.'}`);
    }
  };

  if (router.isFallback || !recipe) {
    return (
      <div className="pageContainer">
        <main className="dashboardContainer">
          <div className="loadingSpinner" style={{ margin: '3rem auto' }}>Loading recipe...</div>
        </main>
      </div>
    );
  }
  
  const recipeName = recipe.recipe_data?.recipeName || 'Community Recipe';

  return (
    <div className="pageContainer">
      <Head>
        <title>{recipeName} | Community Recipe | nuggs.ai</title>
        <meta name="description" content={`View the community recipe: ${recipeName}`} />
      </Head>

      <header className="mainHeader">
        <Link href="/" className="logoLink">
          <div className="logoArea">
            <h1 className="logoText">
              <img src="/logo.png" alt="Nuggs.ai logo" className="headerLogoImage" /> nuggs.ai
            </h1>
          </div>
        </Link>
        <nav>
          <Link href="/" className="navLink">Home</Link>
          <Link href="/blog" className="navLink">Blog</Link>
          {user ? (
            <Link href="/dashboard" className="navLink">Dashboard</Link>
          ) : (
            <button 
                onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                }} 
                className="navLink authNavButton"
            >
                Log In
            </button>
          )}
        </nav>
      </header>

      <main className="recipeDetailContainer" style={{maxWidth: '900px'}}>
        <div className="recipeDetailHeader" style={{ marginBottom: '1.5rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <Link href="/#community" className="backLink" style={{ marginRight: '1rem' }}> 
              &larr; Back to Community Recipes
            </Link>
          </div>
          {!authLoading && (
            <div className="saveRecipeContainer" style={{ margin: '0.5rem 0 0' }}>
              {isSavedByCurrentUser ? (
                <p className="saveStatusMessage saveSuccess" style={{padding: '0.6rem 1rem', margin: 0}}>Already in your collection!</p>
              ) : (
                <button
                  onClick={handleSaveRecipeToCollection}
                  className="saveRecipeButton primaryButton" // Re-using styles
                  disabled={saveStatus === 'loading'}
                >
                  {saveStatus === 'loading' ? 'Saving...' : 'Save to My Collection'}
                </button>
              )}
            </div>
          )}
        </div>
        {saveStatus && saveStatus !== 'loading' && saveMessage && (
            <div 
                className={`saveStatusMessage ${saveStatus === 'success' ? 'saveSuccess' : 'saveError'}`} 
                style={{marginBottom: '1rem', textAlign: 'center'}}
            >
                {saveMessage}
            </div>
        )}

        {recipe.recipe_data ? (
          <RecipeDisplay recipeData={recipe.recipe_data} />
        ) : (
          <p className="errorMessage">Recipe details are not available.</p>
        )}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        authMode={authMode}
        message={authMode === 'login' 
            ? "Log in to save this recipe to your collection."
            : "Sign up to save recipes and enjoy unlimited recipe generations!"}
      />
    </div>
  );
} 