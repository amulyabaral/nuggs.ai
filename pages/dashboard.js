import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase, testSupabaseConnection } from '../utils/supabaseClient';

export default function Dashboard() {
  const { user, profile, signOut, loading, usageRemaining, isPremium, refreshProfile } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [errorRecipes, setErrorRecipes] = useState('');
  const [pageError, setPageError] = useState('');
  const router = useRouter();
  const authLoadingTimeoutRef = useRef(null);
  
  const fetchSavedRecipes = useCallback(async () => {
    if (!user || !profile) {
      setLoadingRecipes(false);
      return;
    }
    try {
      setLoadingRecipes(true);
      setErrorRecipes('');
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setSavedRecipes(data || []);
    } catch (error) {
      console.error('Error fetching saved recipes:', error);
      setErrorRecipes('Could not load your saved recipes. Please try again later.');
    } finally {
      setLoadingRecipes(false);
    }
  }, [user, profile]);
  
  useEffect(() => {
    // Cleanup previous timeout if effect re-runs
    if (authLoadingTimeoutRef.current) {
      clearTimeout(authLoadingTimeoutRef.current);
      authLoadingTimeoutRef.current = null;
    }

    if (loading) {
      setPageError('');
      authLoadingTimeoutRef.current = setTimeout(() => {
        console.warn('Dashboard: Auth loading timeout. AuthContext might be stuck. Forcing sign out.');
        setPageError('Loading your session took too long. You have been signed out. Please try logging in again.');
        signOut();
      }, 20000);
    } else {
      if (!user) {
        router.push('/');
      } else {
        if (!profile) {
          setPageError("Your profile data could not be loaded. Please try refreshing your profile or sign out and log back in.");
        } else {
          setPageError('');
        }
      }
    }

    // Cleanup function for the timeout
    return () => {
      if (authLoadingTimeoutRef.current) {
        clearTimeout(authLoadingTimeoutRef.current);
        authLoadingTimeoutRef.current = null;
      }
    };
  }, [loading, user, profile, router, signOut]);
  
  useEffect(() => {
    if (user && profile && !loading) {
      fetchSavedRecipes();
    }
  }, [user, profile, loading, fetchSavedRecipes]);
  
  useEffect(() => {
    // Test Supabase connection on component mount
    const testConnection = async () => {
      const result = await testSupabaseConnection();
      console.log('Supabase connection test result:', result);
    };
    
    testConnection();
  }, []);
  
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
  
  if (pageError && pageError.includes("took too long")) {
    return (
        <div className="pageContainer">
            <header className="mainHeader">
                <Link href="/" className="logoLink">
                    <div className="logoArea">
                        <h1 className="logoText"><span className="logoEmoji">🥦 </span> nuggs.ai</h1>
                    </div>
                </Link>
                <nav>
                    <Link href="/" className="navLink">Home</Link>
                    <Link href="/blog" className="navLink">Blog</Link>
                </nav>
            </header>
            <main className="dashboardContainer">
                <div className="errorContainer" style={{textAlign: 'center', marginTop: '3rem'}}>
                    <h1>Operation Timed Out</h1>
                    <p>{pageError}</p>
                    <button onClick={() => router.push('/')} className="backButton">
                        Go to Homepage
                    </button>
                </div>
            </main>
        </div>
    );
  }
  
  if (loading) {
    return (
      <div className="pageContainer">
        <header className="mainHeader">
            <Link href="/" className="logoLink">
                <div className="logoArea">
                    <h1 className="logoText"><span className="logoEmoji">🥦 </span> nuggs.ai</h1>
                </div>
            </Link>
            <nav>
                <Link href="/" className="navLink">Home</Link>
                <Link href="/blog" className="navLink">Blog</Link>
            </nav>
        </header>
        <main className="dashboardContainer" style={{ textAlign: 'center', paddingTop: '3rem' }}>
            <div className="loadingSpinner">Loading your dashboard...</div>
        </main>
      </div>
    );
  }
  
  if (!user) {
    return (
        <div className="pageContainer">
            <header className="mainHeader">
                <Link href="/" className="logoLink">
                  <div className="logoArea">
                    <h1 className="logoText"><span className="logoEmoji">🥦 </span> nuggs.ai</h1>
                  </div>
                </Link>
                <nav>
                  <Link href="/" className="navLink">Home</Link>
                  <Link href="/blog" className="navLink">Blog</Link>
                </nav>
            </header>
            <main className="dashboardContainer">
                <div className="errorContainer" style={{textAlign: 'center', marginTop: '3rem'}}>
                    <h1>Access Denied</h1>
                    <p>You need to be logged in to view the dashboard. Redirecting...</p>
                </div>
            </main>
        </div>
    );
  }

  if (!profile) {
    return (
        <div className="pageContainer">
            <header className="mainHeader">
                <Link href="/" className="logoLink">
                    <div className="logoArea">
                        <h1 className="logoText"><span className="logoEmoji">🥦 </span> nuggs.ai</h1>
                    </div>
                </Link>
                <nav>
                    <Link href="/" className="navLink">Home</Link>
                    <Link href="/blog" className="navLink">Blog</Link>
                    <Link href="/dashboard" className="navLink navLinkActive">
                        Dashboard
                    </Link>
                </nav>
            </header>
            <main className="dashboardContainer">
                <div className="errorContainer" style={{textAlign: 'center', marginTop: '2rem'}}>
                    <h1>Profile Data Error</h1>
                    <p>{pageError || "We couldn't load your complete profile information. This might be a temporary issue, or your profile data is missing."}</p>
                    <p>Please try refreshing the profile. If the problem persists, signing out and then back in might help.</p>
                    <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem'}}>
                        <button
                            onClick={async () => {
                                setPageError('');
                                if (user) {
                                    try {
                                        const refreshed = await refreshProfile();
                                        if (!refreshed) {
                                           setPageError("Failed to refresh profile. The profile data is still unavailable.");
                                        }
                                    } catch (e) {
                                        console.error('Dashboard: Manual refreshProfile call failed:', e);
                                        setPageError("An error occurred while trying to refresh your profile. Please try signing out and back in.");
                                    }
                                }
                            }}
                            className="primaryButton"
                            style={{padding: '0.7rem 1.3rem', fontSize: '0.9rem'}}
                        >
                            Retry Loading Profile
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await signOut();
                                } catch (err) {
                                    console.error('Error during sign out from dashboard error state:', err);
                                } finally {
                                    router.push('/');
                                }
                            }}
                            className="navLink authNavButton"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
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
        </div>
        
        <section className="savedRecipesSection">
          <h2>Your Saved Recipes</h2>
          
          {loadingRecipes ? (
            <div className="loadingSpinner">Loading your recipes...</div>
          ) : errorRecipes ? (
            <div className="errorMessage" style={{textAlign: 'center', padding: '1rem', backgroundColor: 'var(--accent-negative-bg)'}}>
                {errorRecipes}
            </div>
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
        
        <div className="userInfoCard">
          <div className="userEmail">
            <strong>Email:</strong> {user?.email || profile?.email}
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
            
            {!isPremium && profile.subscription_tier !== 'premium' && (
              <Link href="/pricing" className="upgradeToPremiumLink">
                Upgrade to Premium for Unlimited Recipes
              </Link>
            )}
          </div>
          
          <button onClick={signOut} className="signOutButton" style={{marginTop: '1rem'}}>Sign Out</button>
        </div>
      </main>
    </div>
  );
} 