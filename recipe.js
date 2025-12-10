// recipe.js - Recipe detail page functionality (NO PHP VERSION)

// Get URL parameter
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Debug: Log everything to console
function debugLog(message, data = null) {
  console.log(`[DEBUG] ${message}`, data || '');
}

// Fetch recipe by title (loads from JSON file)
async function fetchRecipeByTitle(title) {
  try {
    const decodedTitle = decodeURIComponent(title);
    debugLog('Looking for recipe:', decodedTitle);
    
    // First, try to load from localStorage cache
    const cached = localStorage.getItem('cachedRecipes');
    if (cached) {
      try {
        const recipes = JSON.parse(cached);
        debugLog('Cached recipes found:', recipes.length);
        
        // Try to find recipe in cache
        const recipe = recipes.find(r => {
          if (!r || !r.title) return false;
          return r.title.trim().toLowerCase() === decodedTitle.trim().toLowerCase();
        });
        
        if (recipe) {
          debugLog('Found recipe in cache:', recipe.title);
          return recipe;
        }
      } catch (e) {
        debugLog('Cache parse error:', e);
      }
    }
    
    // If not in cache, load from recipe.json
    debugLog('Loading from recipe.json...');
    const response = await fetch('recipe.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load recipe data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    debugLog('Raw JSON data:', data);
    
    // Handle different JSON structures
    let recipes = [];
    
    // Check if data has food_recipes (based on your JSON structure)
    if (data.food_recipes && Array.isArray(data.food_recipes)) {
      debugLog('Found food_recipes array');
      recipes = data.food_recipes;
    } else if (Array.isArray(data)) {
      debugLog('JSON is direct array');
      recipes = data;
    } else if (data.recipes && Array.isArray(data.recipes)) {
      debugLog('Found recipes array');
      recipes = data.recipes;
    } else {
      debugLog('Unknown JSON structure, trying to extract any array');
      // Try to find any array in the object
      for (const key in data) {
        if (Array.isArray(data[key])) {
          recipes = data[key];
          debugLog(`Using array from key: ${key}`);
          break;
        }
      }
    }
    
    debugLog('Available recipes:', recipes.length);
    debugLog('Recipe titles:', recipes.map(r => r.title));
    
    if (recipes.length === 0) {
      throw new Error('No recipes found in the JSON file');
    }
    
    // Find the specific recipe
    const recipe = recipes.find(r => {
      if (!r || !r.title) return false;
      return r.title.trim().toLowerCase() === decodedTitle.trim().toLowerCase();
    });
    
    if (!recipe) {
      // Try partial match
      const partialMatch = recipes.find(r => 
        r.title && r.title.toLowerCase().includes(decodedTitle.toLowerCase())
      );
      
      if (partialMatch) {
        debugLog('Found partial match:', partialMatch.title);
        return partialMatch;
      }
      
      throw new Error(`Recipe "${decodedTitle}" not found. Available recipes: ${recipes.map(r => r.title).join(', ')}`);
    }
    
    // Normalize keys
    const normalizedRecipe = { ...recipe };
    if (recipe.minimum_duration && !recipe.minimumDuration) {
      normalizedRecipe.minimumDuration = recipe.minimum_duration;
    }
    if (recipe.minimumDuration && !recipe.minimum_duration) {
      normalizedRecipe.minimum_duration = recipe.minimumDuration;
    }
    
    debugLog('Found recipe:', normalizedRecipe);
    return normalizedRecipe;
    
  } catch (error) {
    console.error('Error fetching recipe:', error);
    throw error;
  }
}

// Render recipe details WITHOUT IMAGES
function renderRecipe(recipe) {
  const card = document.getElementById('recipeCard');
  if (!card || !recipe) {
    console.error('No card element or recipe data');
    return;
  }
  
  debugLog('Rendering recipe:', recipe);
  
  const duration = recipe.minimumDuration || recipe.minimum_duration || 'Not specified';
  const ingredients = recipe.ingredients || [];
  const instructions = recipe.instructions || [];
  const servings = recipe.servings || '';
  const difficulty = recipe.difficulty || '';
  const notes = recipe.notes || '';
  
  // No image HTML - removed as images are no longer needed
  const recipeImageHTML = '';
  
  // Only render recipe content, NO IMAGES
  card.innerHTML = `
    <h2 class="section-title">${recipe.title || 'Untitled Recipe'}</h2>
    
    <div class="recipe-meta">
      <div class="meta-item">
        <strong>⏱️ Time:</strong> ${duration}
      </div>
      ${servings ? `
        <div class="meta-item">
          <strong>👥 Servings:</strong> ${servings}
        </div>
      ` : ''}
      ${difficulty ? `
        <div class="meta-item">
          <strong>⚡ Difficulty:</strong> ${difficulty}
        </div>
      ` : ''}
    </div>
    
    <div class="ingredients-section">
      <h3 class="section-title">📝 Ingredients</h3>
      <ul class="list ingredients-list">
        ${ingredients.length > 0 
          ? ingredients.map(ing => `<li class="ingredient-item">${ing}</li>`).join('')
          : '<li class="ingredient-item">No ingredients listed</li>'
        }
      </ul>
    </div>
    
    <div class="instructions-section">
      <h3 class="section-title">👨‍🍳 Instructions</h3>
      <ol class="list instructions-list">
        ${instructions.length > 0 
          ? instructions.map((step, index) => 
              `<li class="instruction-step">${step}</li>`
            ).join('')
          : '<li class="instruction-step">No instructions available</li>'
        }
      </ol>
    </div>
    
    ${notes ? `
      <div class="notes-section">
        <h3 class="section-title">📝 Notes</h3>
        <p class="recipe-notes">${notes}</p>
      </div>
    ` : ''}
  `;
  
  // Update page title
  document.title = `Cookease — ${recipe.title}`;
  
  // Set up start cooking button (uses existing button in HTML)
  const startBtn = document.getElementById('startCooking');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const encodedTitle = encodeURIComponent(recipe.title);
      window.location.href = `cooking.html?title=${encodedTitle}`;
    });
  }
  
  // Set up share button (uses existing button in HTML)
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn && navigator.share) {
    shareBtn.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: recipe.title,
          text: `Check out this recipe for ${recipe.title} on Cookease!\n\nIngredients:\n${ingredients.join('\n')}\n\nInstructions:\n${instructions.join('\n\n')}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled:', error);
      }
    });
  } else if (shareBtn) {
    // Fallback: copy to clipboard
    shareBtn.addEventListener('click', () => {
      const textToCopy = `${recipe.title}\n\nIngredients:\n${ingredients.join('\n')}\n\nInstructions:\n${instructions.join('\n\n')}`;
      
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          const originalText = shareBtn.textContent;
          shareBtn.textContent = 'Copied!';
          shareBtn.style.background = '#4CAF50';
          shareBtn.style.color = 'white';
          
          setTimeout(() => {
            shareBtn.textContent = originalText;
            shareBtn.style.background = '';
            shareBtn.style.color = '';
          }, 2000);
        })
        .catch(err => {
          console.error('Copy failed:', err);
          shareBtn.textContent = 'Copy failed';
          shareBtn.style.background = '#f44336';
          shareBtn.style.color = 'white';
        });
    });
  }
}

// Initialize recipe page
async function init() {
  debugLog('Initializing recipe page...');
  
  const title = getQueryParam('title');
  debugLog('URL title parameter:', title);
  
  if (!title) {
    document.getElementById('recipeCard').innerHTML = `
      <div class="error-message">
        <h3>No Recipe Selected</h3>
        <p>Please go back to the main page and select a recipe.</p>
        <button onclick="window.history.back()" class="primary-btn">Go Back</button>
      </div>
    `;
    return;
  }
  
  // Show loading state
  const card = document.getElementById('recipeCard');
  card.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading recipe...</p>
    </div>
  `;
  
  try {
    const recipe = await fetchRecipeByTitle(title);
    
    if (!recipe) {
      throw new Error('Recipe not found in JSON file or cache');
    }
    
    renderRecipe(recipe);
    
  } catch (error) {
    console.error('Error:', error);
    card.innerHTML = `
      <div class="error-message">
        <h3>Failed to Load Recipe</h3>
        <p>${error.message}</p>
        <div class="error-actions">
          <button onclick="window.location.reload()" class="primary-btn">Retry</button>
          <button onclick="window.history.back()" class="secondary-btn">Go Back</button>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}