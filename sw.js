// Service Worker for Chess Puzzle Trainer PWA
const CACHE_NAME = 'chess-trainer-v1';
const urlsToCache = [
  '/',
  '/trainer',
  '/profile',
  '/analytics',
  '/trainer.html',
  '/profile.html',
  '/analytics.html',
  '/trainer.css',
  '/trainerApp.js',
  '/training.js',
  '/rushMode.js',
  '/focusedMode.js',
  '/userAuth.js',
  '/soundManager.js',
  '/boardCustomization.js',
  '/gamification.js',
  '/learningMode.js',
  '/socialFeatures.js',
  '/puzzleDatabase.js',
  '/matesIn2Database.js',
  'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css',
  'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js',
  'https://code.jquery.com/jquery-3.6.0.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
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

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Network request failed, try to get from cache
          return caches.match('/offline.html');
        });
      })
  );
});

// Background sync for puzzle progress
self.addEventListener('sync', event => {
  if (event.tag === 'sync-puzzle-progress') {
    event.waitUntil(syncPuzzleProgress());
  }
});

async function syncPuzzleProgress() {
  try {
    const db = await openDB();
    const pendingSync = await db.getAllFromIndex('puzzle-progress', 'pending');
    
    for (const item of pendingSync) {
      await fetch('/api/sync-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      });
      
      await db.delete('puzzle-progress', item.id);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New puzzle challenge available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Play Now',
        icon: '/icons/play.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Chess Puzzle Trainer', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/trainer')
    );
  }
});

// Message handling
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});