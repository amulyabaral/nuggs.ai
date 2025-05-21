import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { FaHeart, FaRegHeart, FaTrash, FaEdit } from 'react-icons/fa';

export default function Dashboard() {
  const { user, profile, signOut, loading: authLoading, usageRemaining, isPremium, refreshUserProfile, supabaseClient, profileError } = useAuth();
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [errorRecipes, setErrorRecipes] = useState('');
  const router = useRouter();

  // State for folder management
  const [uniqueFolders, setUniqueFolders] = useState(['Favorites', 'Saved Recipes']);

  // State for move recipe modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [recipeToMove, setRecipeToMove] = useState(null); // Store the whole recipe object
  const [selectedDestinationFolder, setSelectedDestinationFolder] = useState(''); // For dropdown
  const [customDestinationFolder, setCustomDestinationFolder] = useState(''); // For new folder input

  // Simple effect to check authentication and redirect if needed
  useEffect(() => {
    // Don't try to refresh if still loading authentication
    if (authLoading) return;
    
    // Redirect if not logged in
    if (!user) {
      router.push('/');
      return;
    }
    
    // Only try to refresh the profile once when the component mounts
    // and only if we have a user but no profile (and no error yet)
    const shouldRefreshProfile = user && !profile && !profileError;
    
    if (shouldRefreshProfile) {
      // Use a one-time refresh attempt
      const refreshAttempt = async () => {
        await refreshUserProfile();
      };
      refreshAttempt();
    }
    // Remove profile from the dependencies to prevent the loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router, refreshUserProfile, profileError]);
  
  // Fetch recipes when user and profile are available
  useEffect(() => {
    const fetchRecipes = async () => {
      if (!user || !supabaseClient) return;
      
      try {
        setLoadingRecipes(true);
        setErrorRecipes('');
        
        const { data, error } = await supabaseClient
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
    
    if (user && supabaseClient) {
      fetchRecipes();
    }
  }, [user, supabaseClient]);
  
  // Effect to derive unique folders from savedRecipes
  useEffect(() => {
    if (savedRecipes.length > 0) {
      const allFolders = savedRecipes.map(r => r.folder).filter(Boolean); // Filter out null/undefined folders

      let distinctFoldersSet = new Set(['Favorites', 'Saved Recipes', ...allFolders]);
      let distinctFoldersArray = Array.from(distinctFoldersSet);
      
      // Sort: Favorites first, then Saved Recipes, then alphabetically
      distinctFoldersArray.sort((a, b) => {
        if (a === 'Favorites') return -1;
        if (b === 'Favorites') return 1;
        if (a === 'Saved Recipes') return -1;
        if (b === 'Saved Recipes') return 1;
        return a.localeCompare(b);
      });
      
      setUniqueFolders(distinctFoldersArray);
    } else {
      setUniqueFolders(['Favorites', 'Saved Recipes']);
    }
  }, [savedRecipes]);

  const handleToggleFavorite = async (recipe) => {
    if (!user || !supabaseClient) return;

    const newIsFavorite = !recipe.is_favorite;
    const newFolder = newIsFavorite
      ? 'Favorites'
      : recipe.folder === 'Favorites' 
      ? 'Saved Recipes' // Default to 'Saved Recipes' if unfavorited from 'Favorites'
      : recipe.folder;

    try {
      const { data: updatedRecipe, error } = await supabaseClient
        .from('saved_recipes')
        .update({ is_favorite: newIsFavorite, folder: newFolder })
        .eq('id', recipe.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSavedRecipes(prevRecipes =>
        prevRecipes.map(r => (r.id === recipe.id ? updatedRecipe : r))
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setErrorRecipes('Could not update favorite status.');
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!user || !supabaseClient) return;

    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('saved_recipes')
        .delete()
        .eq('id', recipeId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedRecipes(prevRecipes => prevRecipes.filter(r => r.id !== recipeId));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      setErrorRecipes('Could not delete recipe.');
    }
  };

  const openMoveModal = (recipe) => {
    setRecipeToMove(recipe);
    setSelectedDestinationFolder(recipe.folder || 'Saved Recipes'); // Default to current or 'Saved Recipes'
    setCustomDestinationFolder('');
    setShowMoveModal(true);
  };

  const handleConfirmMove = async () => {
    if (!recipeToMove || !supabaseClient || !user) return;

    const destinationFolder = customDestinationFolder.trim() || selectedDestinationFolder;

    if (!destinationFolder) {
      alert("Please select or enter a folder name.");
      return;
    }
    
    if (destinationFolder === recipeToMove.folder) {
      setShowMoveModal(false); // No change needed
      return;
    }

    // If moving to 'Favorites', is_favorite becomes true.
    // If moving out of 'Favorites', is_favorite becomes false.
    // Otherwise, is_favorite status remains unchanged unless explicitly set by favoriting action.
    let newIsFavorite = recipeToMove.is_favorite;
    if (destinationFolder === 'Favorites') {
      newIsFavorite = true;
    } else if (recipeToMove.folder === 'Favorites' && destinationFolder !== 'Favorites') {
      newIsFavorite = false;
    }

    try {
      const { data: updatedRecipe, error } = await supabaseClient
        .from('saved_recipes')
        .update({ folder: destinationFolder, is_favorite: newIsFavorite })
        .eq('id', recipeToMove.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSavedRecipes(prevRecipes =>
        prevRecipes.map(r => (r.id === recipeToMove.id ? updatedRecipe : r))
      );
      setShowMoveModal(false);
      setRecipeToMove(null);
      setCustomDestinationFolder('');
      setSelectedDestinationFolder('');
    } catch (error) {
      console.error('Error moving recipe:', error);
      setErrorRecipes(`Could not move recipe: ${error.message}`);
    }
  };
  
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
            uniqueFolders.map(folderName => {
              const recipesInFolder = savedRecipes.filter(r => r.folder === folderName);
              // Optionally, only render folder if it has recipes or if it's a default one
              // if (recipesInFolder.length === 0 && folderName !== 'Favorites' && folderName !== 'Saved Recipes') {
              //   return null; 
              // }

              return (
                <div key={folderName} className="recipeFolderSection">
                  <h3 className="folderTitle">{folderName} ({recipesInFolder.length})</h3>
                  {recipesInFolder.length === 0 ? (
                    <p className="emptyFolderMessage">This folder is empty.</p>
                  ) : (
                    <div className="savedRecipesGrid">
                      {recipesInFolder.map(recipe => (
                        <div key={recipe.id} className="savedRecipeCard">
                          <div className="savedRecipeHeader">
                            <h4 className="recipeCardTitle">{recipe.recipe_name}</h4>
                            <div className="recipeCardActions">
                              <button 
                                onClick={() => handleToggleFavorite(recipe)} 
                                title={recipe.is_favorite ? "Unfavorite" : "Favorite"} 
                                className="iconButton"
                              >
                                {recipe.is_favorite ? <FaHeart style={{ color: 'var(--accent-primary)' }} /> : <FaRegHeart />}
                              </button>
                              <button 
                                onClick={() => openMoveModal(recipe)} 
                                title="Move to folder" 
                                className="iconButton"
                              >
                                <FaEdit />
                              </button>
                              <button 
                                onClick={() => handleDeleteRecipe(recipe.id)} 
                                title="Delete recipe" 
                                className="iconButton"
                              >
                                <FaTrash />
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
                </div>
              );
            })
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

      {/* Modal for Moving Recipe */}
      {showMoveModal && recipeToMove && (
        <div className="modalOverlay">
          <div className="authModal moveRecipeModal"> {/* Reusing authModal style for base */}
            <button className="modalCloseButton" onClick={() => setShowMoveModal(false)}>×</button>
            <h4>Move "{recipeToMove.recipe_name}"</h4>
            <div className="formGroup">
              <label htmlFor="folderSelect">Select Folder:</label>
              <select
                id="folderSelect"
                className="folderSelectDropdown"
                value={selectedDestinationFolder}
                onChange={(e) => {
                  setSelectedDestinationFolder(e.target.value);
                  if (customDestinationFolder) setCustomDestinationFolder(''); // Clear custom if selecting from dropdown
                }}
              >
                {uniqueFolders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="formGroup">
              <label htmlFor="newFolderInput">Or Create New Folder:</label>
              <input
                type="text"
                id="newFolderInput"
                className="newFolderInput"
                placeholder="Type new folder name"
                value={customDestinationFolder}
                onChange={(e) => {
                  setCustomDestinationFolder(e.target.value);
                  if (e.target.value.trim()) setSelectedDestinationFolder(''); // Clear selection if typing new
                }}
              />
            </div>
            <div className="modalActions">
              <button onClick={handleConfirmMove} className="authButton primaryButton">Confirm Move</button>
              <button onClick={() => setShowMoveModal(false)} className="authButton secondaryButton">Cancel</button>
            </div>
            {errorRecipes && <p className="errorMessage" style={{marginTop: '1rem'}}>{errorRecipes}</p>}
          </div>
        </div>
      )}
    </div>
  );
} 