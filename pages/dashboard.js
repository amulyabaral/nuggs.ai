import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase, testSupabaseConnection } from '../utils/supabaseClient';

export default function Dashboard() {
  const { 
    user, 
    profile, 
    signOut, 
    loading: authLoading,
    usageRemaining, 
    isPremium, 
    refreshProfile,
    refreshSession,
    sessionChecked,
    profileError,
  } = useAuth();

  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [errorRecipes, setErrorRecipes] = useState('');
  const [pageError, setPageError] = useState('');
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [hardRefreshNeeded, setHardRefreshNeeded] = useState(false);
  const router = useRouter();
  
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  const fetchSavedRecipes = useCallback(async () => {
    if (!user || !profile) {
      setLoadingRecipes(false);
      return;
    }
    try {
      console.log("Dashboard: Fetching saved recipes for user:", user.id);
      setLoadingRecipes(true);
      setErrorRecipes('');
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setSavedRecipes(data || []);
      console.log("Dashboard: Saved recipes fetched:", data);
    } catch (error) {
      console.error('Dashboard: Error fetching saved recipes:', error);
      setErrorRecipes('Could not load your saved recipes. Please try again later.');
    } finally {
      setLoadingRecipes(false);
    }
  }, [user, profile]);
  
  useEffect(() => {
    // Wait until initial session check is complete (either success or failure)
    if (!sessionChecked) {
      console.log("Dashboard: Waiting for initial session check to complete...");
      return;
    }

    if (authLoading) {
      console.log("Dashboard: AuthContext is loading. Waiting...");
      setPageError('');
      return;
    }

    console.log("Dashboard: AuthContext finished loading. User:", user ? "Found" : "Not found", "Profile:", profile ? "Found" : "Not found", "ProfileError:", profileError);
    
    if (!user) {
      console.log("Dashboard: No user found after auth loading. Redirecting to /");
      router.replace('/');
      return;
    }

    if (!profile) {
      if (profileError) {
        console.warn("Dashboard: User is authenticated, but profile loading failed:", profileError);
        setPageError(`Your profile data could not be loaded: ${profileError}. Some information might be missing. You can try refreshing.`);
      } else {
        console.warn("Dashboard: User is authenticated, but profile is null (no specific error). Attempting to refresh profile.");
        setPageError("Loading your profile information...");
        refreshProfile().then(success => {
          if (success && profile) {
            console.log("Dashboard: Profile refresh successful.");
            setPageError('');
          } else if (success && !profile) {
            console.warn("Dashboard: Profile refresh ran, but profile still null (might be new user or no data).");
            setPageError("Could not load all profile details. This might be a new account or data is unavailable.");
          } else {
            console.error("Dashboard: Profile refresh attempt failed.");
            setPageError(authContextProfileError => authContextProfileError || "Failed to load your profile information. Please try again later or contact support.");
          }
        });
      }
    } else {
      console.log("Dashboard: User and profile are available.");
      setPageError('');
    }
  }, [authLoading, user, profile, router, refreshSession, sessionChecked, profileError, refreshProfile]);
  
  useEffect(() => {
    if (user && profile && !authLoading) {
      fetchSavedRecipes();
    } else if (!user && !authLoading) {
      setSavedRecipes([]);
      setLoadingRecipes(false);
    }
  }, [user, profile, authLoading, fetchSavedRecipes]);
  
  useEffect(() => {
    const testConnection = async () => {
      const result = await testSupabaseConnection();
      console.log('Dashboard: Supabase connection test result:', result);
    };
    testConnection();
  }, []);
  
  useEffect(() => {
    let timeoutId;
    
    if (authLoading) {
      // Set a timeout to show a "loading too long" message
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 seconds
    } else {
      setLoadingTimeout(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [authLoading]);
  
  async function deleteRecipe(id) {
    try {
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
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
      
      setSavedRecipes(savedRecipes.map(recipe => 
        recipe.id === id 
          ? { ...recipe, is_favorite: !currentValue }
          : recipe
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }
  
  // Add this to show hard refresh UI if needed
  const handleForceSignOut = async () => {
    try {
      setPageError("Signing you out completely...");
      await signOut();
      
      // If signOut doesn't redirect, force reload the page
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      console.error("Error during forced sign out:", err);
      // Force reload anyway as a last resort
      window.location.href = '/';
    }
  };
  
  if (authLoading) {
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
            <div className="loadingSpinner">Loading your session...</div>
            
            {loadingTimeout && (
              <div style={{ marginTop: '2rem' }}>
                <p>Loading is taking longer than expected.</p>
                <button 
                  onClick={() => window.location.href = '/'} 
                  className="primaryButton"
                  style={{ marginTop: '1rem' }}
                >
                  Return to Home
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  className="secondaryButton"
                  style={{ marginTop: '1rem', marginLeft: '1rem' }}
                >
                  Refresh Page
                </button>
              </div>
            )}
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

  if (!profile && pageError && hardRefreshNeeded) {
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
                    {user && (
                        <Link href="/dashboard" className="navLink navLinkActive">
                            Dashboard
                        </Link>
                    )}
                </nav>
            </header>
            <main className="dashboardContainer">
                <div className="errorContainer" style={{textAlign: 'center', marginTop: '2rem'}}>
                    <h1>Profile Error</h1>
                    <p>{pageError || profileError || "We encountered an issue loading your profile."}</p>
                    <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem'}}>
                        <button
                            onClick={async () => {
                                const success = await refreshProfile();
                                if (!success) {
                                    setPageError("Still unable to load profile after refresh.");
                                } else {
                                    setPageError("");
                                }
                            }}
                            className="secondaryButton"
                            style={{padding: '0.7rem 1.3rem', fontSize: '0.9rem'}}
                        >
                            Retry Profile Load
                        </button>
                        <button
                            onClick={handleForceSignOut}
                            className="primaryButton"
                            style={{padding: '0.7rem 1.3rem', fontSize: '0.9rem'}}
                        >
                            Sign Out Completely
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
        
        {pageError && <div className="errorMessage" style={{marginBottom: '1rem', textAlign: 'center', backgroundColor: 'var(--accent-negative-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--accent-negative)'}}>{pageError}</div>}
        {profileError && !pageError && <div className="errorMessage" style={{marginBottom: '1rem', textAlign: 'center', backgroundColor: 'var(--accent-negative-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--accent-negative)'}}>Profile loading issue: {profileError} <button onClick={refreshProfile} className="linkButton">Try refreshing profile</button></div>}

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