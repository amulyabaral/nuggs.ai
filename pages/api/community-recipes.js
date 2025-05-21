import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for this query
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Fetch a pool of recipes.
    // For a more truly random selection on larger datasets,
    // you might explore database functions or more complex query patterns.
    const { data, error } = await supabaseAdmin
      .from('saved_recipes')
      .select('id, recipe_name, recipe_data') // Only select what's needed
      .order('created_at', { ascending: false }) // Get newer ones to increase variety if table is large
      .limit(50); // Fetch a pool of 50 recipes

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }

    // Filter out recipes that might not have the necessary data
    const validRecipes = data.filter(recipe => recipe.recipe_data && recipe.recipe_data.recipeName);

    // Shuffle the valid recipes
    const shuffled = validRecipes.sort(() => 0.5 - Math.random());

    // Get unique by recipe_name to add variety, then take up to 10
    const uniqueRecipes = [];
    const seenNames = new Set();
    for (const recipe of shuffled) {
      if (!seenNames.has(recipe.recipe_data.recipeName)) {
        uniqueRecipes.push(recipe);
        seenNames.add(recipe.recipe_data.recipeName);
      }
      if (uniqueRecipes.length >= 10) break;
    }

    res.status(200).json(uniqueRecipes);

  } catch (error) {
    console.error('Error fetching community recipes:', error.message);
    res.status(500).json({ error: 'Failed to fetch community recipes', details: error.message });
  }
} 