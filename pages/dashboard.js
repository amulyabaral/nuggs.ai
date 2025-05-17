import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';

export default function Dashboard() {
  const { user, profile, signOut, loading, usageRemaining, isPremium, refreshProfile } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [errorRecipes, setErrorRecipes] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const router = useRouter();
  const loadingTimeoutRef = useRef(null);
  
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (loading) {
      setDashboardError('');
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        if (loading) {
          console.warn('Dashboard loading timeout: Profile loading took too long. Signing out.');
          setDashboardError('Loading your profile took too long. You have been signed out. Please try logging in again.');
          signOut();
        }
      }, 5000);
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (!user) {
        router.push('/');
      } else if (user && profile) {
        fetchSavedRecipes();
      } else if (user && !profile) {
        if (!dashboardError) {
            setDashboardError("Your profile data could not be loaded. Please try refreshing or signing out and back in.");
        }
      }
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, user, profile, router, signOut, dashboardError]);
  
  async function fetchSavedRecipes() {
    if (!user || !profile) {
        setLoadingRecipes(false);
        setErrorRecipes("Cannot load recipes: User or profile data is missing.");
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
  
  if (dashboardError && !loading) {
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
                    {user && <button onClick={signOut} className="navLink authNavButton">Sign Out</button>}
                </nav>
            </header>
            <main className="dashboardContainer">
                <div className="errorContainer" style={{textAlign: 'center', marginTop: '3rem'}}>
                    <h1>Operation Timed Out</h1>
                    <p>{dashboardError}</p>
                    <Link href="/" className="backButton" onClick={() => router.push('/')}>
                        Go to Homepage
                    </Link>
                </div>
            </main>
        </div>
    );
  }
  
  if (loading) {
    return <div className="loadingSpinner">Loading your profile...</div>;
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
                    <p>You need to be logged in to view the dashboard.</p>
                    <Link href="/" className="backButton" onClick={() => router.push('/')}>Go to Homepage</Link>
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
                    <button onClick={signOut} className="navLink authNavButton">Sign Out</button>
                </nav>
            </header>
            <main className="dashboardContainer">
                <div className="errorContainer" style={{textAlign: 'center', marginTop: '2rem'}}>
                    <h1>Profile Data Error</h1>
                    <p>We couldn't load your complete profile information. This might be a temporary issue, or your profile data is missing.</p>
                    <p>Please try refreshing the page. If the problem persists, signing out and then back in might help. If the issue continues, please contact support.</p>
                    <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem'}}>
                        <button 
                            onClick={async () => {
                                setDashboardError('');
                                if (user) await refreshProfile();
                            }}
                            className="primaryButton" 
                            style={{padding: '0.7rem 1.3rem', fontSize: '0.9rem'}}
                        >
                            Retry Loading Profile
                        </button>
                        <button 
                            onClick={signOut} 
                            className="signOutButton"
                            style={{padding: '0.7rem 1.3rem', fontSize: '0.9rem'}}
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
          {user && (
            <button onClick={signOut} className="navLink authNavButton">
              Sign Out
            </button>
          )}
        </nav>
      </header>
      
      <main className="dashboardContainer">
        <div className="dashboardHeader">
          <h1>Your Profile</h1>
          <button onClick={signOut} className="signOutButton">Sign Out</button>
        </div>
        
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
      </main>
    </div>
  );
} 