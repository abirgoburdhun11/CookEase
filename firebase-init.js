// firebase-init.js - Firebase Authentication
// Replace with your Firebase config
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyACQXMhNdJCCy6fdPG_HzqadM2_4hSPyXQ",
  authDomain: "cookease-76f6f.firebaseapp.com",
  projectId: "cookease-76f6f",
  storageBucket: "cookease-76f6f.firebasestorage.app",
  messagingSenderId: "340267061478",
  appId: "1:340267061478:web:edbcf049c83127fe7eeb27",
  measurementId: "G-45JDDHRKWF"
};

// Initialize Firebase
let auth = null;

try {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Google Login
window.firebaseGoogleLogin = async function() {
  try {
    if (!auth) throw new Error('Firebase not initialized');
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    const result = await auth.signInWithPopup(provider);
    saveUserToLocalStorage(result.user);
    return result.user;
    
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

// Facebook Login
window.firebaseFacebookLogin = async function() {
  try {
    if (!auth) throw new Error('Firebase not initialized');
    
    const provider = new firebase.auth.FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');
    
    const result = await auth.signInWithPopup(provider);
    saveUserToLocalStorage(result.user);
    return result.user;
    
  } catch (error) {
    console.error('Facebook login error:', error);
    throw error;
  }
};

// Logout function
window.firebaseLogout = async function() {
  try {
    if (!auth) throw new Error('Firebase not initialized');
    await auth.signOut();
    localStorage.removeItem('firebaseUser');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Auth state change listener
window.firebaseAuthOnChange = function(callback) {
  if (!auth) {
    console.warn('Firebase auth not available');
    return () => {};
  }
  
  return auth.onAuthStateChanged((user) => {
    if (user) {
      saveUserToLocalStorage(user);
    } else {
      localStorage.removeItem('firebaseUser');
    }
    callback(user);
  });
};

// Save user to localStorage for persistence
function saveUserToLocalStorage(user) {
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastLogin: new Date().toISOString()
  };
  
  localStorage.setItem('firebaseUser', JSON.stringify(userData));
}

// Get current user from localStorage (for immediate UI updates)
window.getCurrentUser = function() {
  const userStr = localStorage.getItem('firebaseUser');
  return userStr ? JSON.parse(userStr) : null;
};

// Check if user is logged in
window.isUserLoggedIn = function() {
  return !!localStorage.getItem('firebaseUser');
};

// Auto-login from localStorage on page load
(function autoLogin() {
  const user = getCurrentUser();
  if (user && auth) {
    // User is already logged in via localStorage
    console.log('User auto-logged in:', user.email);
  }
})();