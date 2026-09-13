const CACHE_NAME = 'ebt-tracker-v5';
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
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[ServiceWorker] Some assets failed to pre-cache:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/');

  // HTMLナビゲーションは Network-First（オンライン時は必ず最新を取得し、オフライン時のみキャッシュを利用）
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // 静的リソース（MediaPipe Wasm/モデル等）は Cache-First（高速化＆完全オフライン対応）
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
        return caches.match('./index.html');
      });
    })
  );
});
