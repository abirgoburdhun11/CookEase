// app.js - Homepage functionality (NO PHP VERSION)
let allRecipes = [];
let deferredPrompt = null;

// DOM Elements
const elements = {
  grid: document.getElementById('cardsGrid'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  retryBtn: document.getElementById('retryBtn'),
  emptyState: document.getElementById('emptyState'),
  installBtn: document.getElementById('installBtn'),
  loginButtons: document.getElementById('loginButtons'),
  userProfile: document.getElementById('userProfile'),
  userName: document.getElementById('userName'),
  authPhoto: document.getElementById('authPhoto'),
  logoutBtn: document.getElementById('logoutBtn'),
  googleLogin: document.getElementById('googleLogin'),
  facebookLogin: document.getElementById('facebookLogin')
};

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (elements.installBtn) {
    elements.installBtn.style.display = 'inline';
    elements.installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User ${outcome} the install prompt`);
      deferredPrompt = null;
      elements.installBtn.style.display = 'none';
    });
  }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Fetch recipes directly from JSON file
async function fetchRecipes() {
  try {
    showLoading();
    
    // Load recipes directly from JSON file (NO PHP)
    const response = await fetch('recipe.json');
    if (!response.ok) {
      throw new Error(`Failed to load recipes: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Normalize keys for all recipes
    const recipes = (data.food_recipes || []).map(recipe => {
      const normalized = { ...recipe };
      // Handle both naming conventions
      if (recipe.minimum_duration && !recipe.minimumDuration) {
        normalized.minimumDuration = recipe.minimum_duration;
      }
      return normalized;
    });
    
    allRecipes = recipes;
    hideLoading();
    renderCards(recipes);
    
    // Cache recipes in localStorage
    localStorage.setItem('cachedRecipes', JSON.stringify(recipes));
    localStorage.setItem('cacheTimestamp', Date.now());
    
  } catch (error) {
    console.error('Fetch error:', error);
    showError();
    
    // Try to load from cache
    const cached = localStorage.getItem('cachedRecipes');
    const timestamp = localStorage.getItem('cacheTimestamp');
    
    if (cached && timestamp && (Date.now() - timestamp < 24 * 60 * 60 * 1000)) {
      hideLoading();
      allRecipes = JSON.parse(cached);
      renderCards(allRecipes);
      showMessage('Showing cached recipes (offline mode)');
    }
  }
}

// Render recipe cards
function renderCards(recipes) {
  if (!elements.grid) return;
  
  elements.grid.innerHTML = '';
  
  if (!recipes || recipes.length === 0) {
    elements.emptyState.style.display = 'block';
    return;
  }
  
  elements.emptyState.style.display = 'none';
  
  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'card glass';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View ${recipe.title} recipe`);
    
    const duration = recipe.minimumDuration ? `${recipe.minimumDuration}` : '';
    
    card.innerHTML = `
      <div class="card-content">
        <h3 class="card-title">${recipe.title}</h3>
        ${duration ? `<span class="card-duration">⏱️ ${duration}</span>` : ''}
      </div>
    `;
    
    // Click handler
    card.addEventListener('click', () => {
      const encodedTitle = encodeURIComponent(recipe.title);
      window.location.href = `recipe.html?title=${encodedTitle}`;
    });
    
    // Keyboard support
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const encodedTitle = encodeURIComponent(recipe.title);
        window.location.href = `recipe.html?title=${encodedTitle}`;
      }
    });
    
    elements.grid.appendChild(card);
  });
}

// Update UI based on auth state
function updateAuthUI(user) {
  if (user) {
    // User is logged in
    elements.loginButtons.style.display = 'none';
    elements.userProfile.style.display = 'flex';
    
    // Set user info
    elements.userName.textContent = user.displayName || user.email || 'User';
    if (user.photoURL) {
      elements.authPhoto.src = user.photoURL;
      elements.authPhoto.style.display = 'block';
    } else {
      elements.authPhoto.style.display = 'none';
    }
    
    console.log('User logged in:', user.displayName || user.email);
  } else {
    // User is logged out
    elements.loginButtons.style.display = 'flex';
    elements.userProfile.style.display = 'none';
    
    // Clear user info
    elements.userName.textContent = '';
    elements.authPhoto.src = '';
    
    console.log('User logged out');
  }
}

// Handle user logout
async function handleLogout() {
  try {
    if (window.firebaseLogout) {
      await firebaseLogout();
    }
    // Clear local storage
    localStorage.removeItem('firebaseUser');
    
    // Update UI
    updateAuthUI(null);
    
    showMessage('Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('Logout failed. Please try again.');
  }
}

// Initialize authentication buttons
function initAuthButtons() {
  const googleBtn = elements.googleLogin;
  const facebookBtn = elements.facebookLogin;
  const logoutBtn = elements.logoutBtn;
  
  // Google Login
  if (googleBtn && window.firebaseGoogleLogin) {
    googleBtn.addEventListener('click', async () => {
      try {
        const user = await firebaseGoogleLogin();
        updateAuthUI(user);
        showMessage(`Welcome, ${user.displayName || 'User'}!`);
      } catch (error) {
        console.error('Google login failed:', error);
        showMessage('Google login failed. Please try again.');
      }
    });
  }
  
  // Facebook Login
  if (facebookBtn && window.firebaseFacebookLogin) {
    facebookBtn.addEventListener('click', async () => {
      try {
        const user = await firebaseFacebookLogin();
        updateAuthUI(user);
        showMessage(`Welcome, ${user.displayName || 'User'}!`);
      } catch (error) {
        console.error('Facebook login failed:', error);
        showMessage('Facebook login failed. Please try again.');
      }
    });
  }
  
  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Listen to auth changes
  if (window.firebaseAuthOnChange) {
    firebaseAuthOnChange(user => {
      updateAuthUI(user);
    });
  }
  
  // Check initial auth state
  const currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
  if (currentUser) {
    updateAuthUI(currentUser);
  }
}

// UI State Management
function showLoading() {
  if (elements.loading) elements.loading.style.display = 'block';
  if (elements.error) elements.error.style.display = 'none';
  if (elements.grid) elements.grid.style.display = 'none';
}

function hideLoading() {
  if (elements.loading) elements.loading.style.display = 'none';
  if (elements.grid) elements.grid.style.display = 'grid';
}

function showError() {
  if (elements.loading) elements.loading.style.display = 'none';
  if (elements.error) elements.error.style.display = 'block';
  if (elements.grid) elements.grid.style.display = 'none';
}

function showMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  messageEl.textContent = message;
  messageEl.style.cssText = `
    background: rgba(0, 210, 106, 0.1);
    border: 1px solid var(--success);
    color: var(--success);
    padding: 12px;
    border-radius: var(--radius-md);
    margin: 16px 0;
    text-align: center;
  `;
  
  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(messageEl, container.firstChild);
    
    setTimeout(() => {
      messageEl.style.opacity = '0';
      messageEl.style.transition = 'opacity 0.5s';
      setTimeout(() => messageEl.remove(), 500);
    }, 3000);
  }
}

// Add search functionality
function addSearch() {
  const searchHTML = `
    <div class="search-container" style="margin-bottom: 20px;">
      <input 
        type="search" 
        id="searchInput" 
        placeholder="Search recipes..." 
        style="
          width: 100%;
          padding: 12px 16px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          color: var(--text);
          font-size: 16px;
        "
      />
    </div>
  `;
  
  const grid = elements.grid;
  if (grid) {
    grid.insertAdjacentHTML('beforebegin', searchHTML);
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      
      if (!searchTerm) {
        renderCards(allRecipes);
        return;
      }
      
      const filtered = allRecipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchTerm) ||
        (recipe.ingredients && recipe.ingredients.some(ing => 
          ing.toLowerCase().includes(searchTerm)
        ))
      );
      
      renderCards(filtered);
    });
  }
}

// Initialize app
async function init() {
  // Retry button
  if (elements.retryBtn) {
    elements.retryBtn.addEventListener('click', fetchRecipes);
  }
  
  // Fetch recipes
  await fetchRecipes();
  
  // Initialize auth
  initAuthButtons();
  
  // Add search functionality
  addSearch();
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}