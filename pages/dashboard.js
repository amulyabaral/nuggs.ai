import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';

export default function Dashboard() {
  const { user, profile, signOut, loading, usageRemaining, isPremium } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/');
    } else if (user) {
      fetchSavedRecipes();
    }
  }, [loading, user, router]);
  
  async function fetchSavedRecipes() {
    try {
      setLoadingRecipes(true);
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setSavedRecipes(data || []);
    } catch (error) {
      console.error('Error fetching saved recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  }
  
  async function deleteRecipe(id) {
    try {
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update the state to remove the deleted recipe
      setSavedRecipes(savedRecipes.filter(recipe => recipe.id !== id));
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  }
  
  async function toggleFavorite(id, currentValue) {
    try {
      const { error } = await supabase
        .from('saved_recipes')
        .update({ is_favorite: !currentValue })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update state
      setSavedRecipes(savedRecipes.map(recipe => 
        recipe.id === id 
          ? { ...recipe, is_favorite: !currentValue }
          : recipe
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }
  
  if (loading) {
    return <div className="loadingSpinner">Loading your profile...</div>;
  }
  
  return (
    <div className="pageContainer">
      <Head>
        <title>Your Profile | nuggs.ai</title>
        <meta name="description" content="Manage your nuggs.ai account and saved recipes" />
      </Head>
      
      <header className="mainHeader">
        <Link href="/" className="logoLink">
          <div className="logoArea">
            <h1 className="logoText"><span className="logoEmoji">🥦 </span> nuggs.ai</h1>
          </div>
        </Link>
        <nav>
          <Link href="/" className="navLink">
            Home
          </Link>
          <Link href="/blog" className="navLink">
            Blog
          </Link>
          <Link href="/dashboard" className="navLink navLinkActive">
            Dashboard
          </Link>
        </nav>
      </header>
      
      <main className="dashboardContainer">
        <div className="dashboardHeader">
          <h1>Your Profile</h1>
          <button onClick={signOut} className="signOutButton">Sign Out</button>
        </div>
        
        <div className="userInfoCard">
          <div className="userEmail">
            <strong>Email:</strong> {user?.email}
          </div>
          
          <div className="subscriptionInfo">
            <div className="subscriptionTier">
              <strong>Subscription:</strong> 
              <span className={`tierBadge ${isPremium ? 'premiumBadge' : 'freeBadge'}`}>
                {isPremium ? 'Premium' : 'Free'}
              </span>
            </div>
            
            {!isPremium && (
              <div className="usageLimits">
                <strong>Daily Recipe Generations:</strong> 
                <span>{usageRemaining} remaining today</span>
              </div>
            )}
            
            {!isPremium && (
              <Link href="/pricing" className="upgradeToPremiumLink">
                Upgrade to Premium for Unlimited Recipes
              </Link>
            )}
          </div>
        </div>
        
        <section className="savedRecipesSection">
          <h2>Your Saved Recipes</h2>
          
          {loadingRecipes ? (
            <div className="loadingSpinner">Loading your recipes...</div>
          ) : savedRecipes.length === 0 ? (
            <div className="emptyState">
              <p>You haven't saved any recipes yet.</p>
              <Link href="/" className="createRecipeButton">
                Create Your First Recipe
              </Link>
            </div>
          ) : (
            <div className="savedRecipesGrid">
              {savedRecipes.map(recipe => (
                <div key={recipe.id} className="savedRecipeCard">
                  <div className="savedRecipeHeader">
                    <h3>{recipe.recipe_name}</h3>
                    <div className="recipeActions">
                      <button 
                        onClick={() => toggleFavorite(recipe.id, recipe.is_favorite)}
                        className={`favoriteButton ${recipe.is_favorite ? 'favorited' : ''}`}
                      >
                        {recipe.is_favorite ? '★' : '☆'}
                      </button>
                      <button 
                        onClick={() => deleteRecipe(recipe.id)}
                        className="deleteRecipeButton"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="savedRecipeDate">
                    Saved on {new Date(recipe.created_at).toLocaleDateString()}
                  </div>
                  
                  <Link 
                    href={`/recipe/${recipe.id}`} 
                    className="viewRecipeButton"
                  >
                    View Recipe
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
} 