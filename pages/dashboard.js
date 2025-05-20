import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';

export default function Dashboard() {
  const { user, profile, signOut, loading: authLoading, usageRemaining, isPremium } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [errorRecipes, setErrorRecipes] = useState('');
  const router = useRouter();

  // Simple effect to check authentication and redirect if needed
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);
  
  // Fetch recipes when user and profile are available
  useEffect(() => {
    const fetchRecipes = async () => {
      if (!user) return;
      
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
        console.error('Error fetching recipes:', error);
        setErrorRecipes('Could not load your saved recipes.');
      } finally {
        setLoadingRecipes(false);
      }
    };
    
    if (user) {
      fetchRecipes();
    }
  }, [user]);
  
  // Simple loading state
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
        <main className="dashboardContainer">
          <div className="loadingSpinner" style={{ margin: '3rem auto' }}>Loading your session...</div>
        </main>
      </div>
    );
  }
  
  // If not authenticated, redirect (this should rarely show due to the useEffect redirect)
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
          <div style={{textAlign: 'center', marginTop: '3rem'}}>
            <h1>Access Denied</h1>
            <p>You need to be logged in to view the dashboard. Redirecting...</p>
          </div>
        </main>
      </div>
    );
  }
  
  // Main dashboard view
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
          <Link href="/" className="navLink">Home</Link>
          <Link href="/blog" className="navLink">Blog</Link>
          <Link href="/dashboard" className="navLink navLinkActive">Dashboard</Link>
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
            <div className="errorMessage">{errorRecipes}</div>
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
                  <h3>{recipe.recipe_name}</h3>
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
          </div>
          
          <button onClick={signOut} className="signOutButton">Sign Out</button>
        </div>
      </main>
    </div>
  );
} 