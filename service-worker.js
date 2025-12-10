// service-worker.js - Progressive Web App Service Worker (NO PHP VERSION)
const CACHE_NAME = 'cookease-v1.2';
const OFFLINE_URL = 'offline.html';

// Assets to cache on install (REMOVED PHP REFERENCES)
const PRECACHE_ASSETS = [
  '/',                    // Root path
  'index.html',
  'recipe.html',
  'cooking.html',
  'styles.css',
  'app.js',
  'recipe.js',
  'cooking.js',
  'recipe.json',          // Add recipe.json (no more PHP!)
  'manifest.json',
  'firebase-init.js',
  'offline.html'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // Skip Firebase/Google/Facebook auth domains
  if (event.request.url.includes('google') || 
      event.request.url.includes('facebook') ||
      event.request.url.includes('gstatic') ||
      event.request.url.includes('firebase')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise, fetch from network
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the new response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            // Network request failed, try to show offline page
            console.log('Fetch failed; returning offline page:', error);
            
            // If request is for HTML, show offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
            
            // For recipe.json requests, return cached version if available
            if (event.request.url.includes('recipe.json')) {
              return caches.match('recipe.json');
            }
          });
      })
  );
});

// Background sync for recipes (updated for JSON file)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-recipes') {
    event.waitUntil(syncRecipes());
  }
});

// Sync recipes in background (updated for JSON file)
async function syncRecipes() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch('recipe.json');
    await cache.put('recipe.json', response.clone());
    console.log('Recipes synced in background');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Cookease notification',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Cookease', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there's already a window/tab open
      for (const client of windowClients) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});