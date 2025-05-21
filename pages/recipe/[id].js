import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../contexts/AuthContext';
import RecipeDisplay from '../../components/RecipeDisplay';

// This component will render the actual recipe details
// It's similar to the renderRecipeResults function from your HomePage
// function RecipeDisplay({ recipeData }) { // This is now removed from here
//   if (!recipeData) {
//     return <p className="errorMessage">Recipe details are not available for display.</p>;
//   }
// ... rest of the old RecipeDisplay component code is removed
// }

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
            <div className="logoArea"><h1 className="logoText">
              <img src="/logo.png" alt="Nuggs.ai logo" className="headerLogoImage" /> nuggs.ai
            </h1></div>
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