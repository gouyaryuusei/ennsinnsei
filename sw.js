const CACHE_NAME = 'ebt-tracker-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './mediapipe/camera_utils.js',
  './mediapipe/pose.js',
  './mediapipe/pose_solution_packed_assets_loader.js',
  './mediapipe/pose_solution_packed_assets.data',
  './mediapipe/pose_solution_simd_wasm_bin.js',
  './mediapipe/pose_solution_simd_wasm_bin.wasm',
  './mediapipe/pose_solution_wasm_bin.js',
  './mediapipe/pose_solution_wasm_bin.wasm',
  './mediapipe/pose_web.binarypb',
  './mediapipe/pose_landmark_full.tflite',
  './mediapipe/pose_landmark_lite.tflite',
  './mediapipe/pose_landmark_heavy.tflite'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[ServiceWorker] Some assets failed to pre-cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // オフライン時のフォールバック
        return caches.match('./index.html');
      });
    })
  );
});
