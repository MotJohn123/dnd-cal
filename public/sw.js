// Minimal service worker for PWA installability
// This service worker doesn't provide offline functionality

const CACHE_NAME = 'dnd-cal-v1';

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy - always fetch from network
  // No offline caching since offline mode is not required
  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fails and it's a navigation request, show a simple offline message
      if (event.request.mode === 'navigate') {
        return new Response(
          `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DnD Calendar - Offline</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f9fafb;
                color: #374151;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
              h1 { color: #7c3aed; }
              p { color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📅 DnD Calendar</h1>
              <p>You appear to be offline.</p>
              <p>Please check your internet connection and try again.</p>
            </div>
          </body>
          </html>`,
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html' },
          }
        );
      }
      // For other requests, just let them fail
      return new Response('Network error', { status: 503 });
    })
  );
});
