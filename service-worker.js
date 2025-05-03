// Tên cache
const CACHE_NAME = 'qlbh-cache-v1';

// Tài nguyên cần cache (App Shell)
const CACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/idb@7.1.1/build/index.min.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Sự kiện install - cache tài nguyên
self.addEventListener('install', event => {
  console.log('Service Worker: Đang cài đặt');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Đang cache tài nguyên');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Sự kiện activate - xóa cache cũ
self.addEventListener('activate', event => {
  console.log('Service Worker: Đã kích hoạt');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Xóa cache cũ', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

// Sự kiện fetch - trả về tài nguyên từ cache hoặc mạng
self.addEventListener('fetch', event => {
  console.log('Service Worker: Đang fetch', event.request.url);

  // Chiến lược Cache First, Network Fallback
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Trả về từ cache nếu có
        if (response) {
          console.log('Service Worker: Trả về từ cache', event.request.url);
          return response;
        }

        // Nếu không có trong cache, fetch từ mạng
        console.log('Service Worker: Fetch từ mạng', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Nếu không phải là request hợp lệ, trả về luôn
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone response để vừa cache vừa trả về
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          });
      })
      .catch(error => {
        console.error('Service Worker: Fetch failed', error);
        // Có thể trả về một trang offline.html ở đây
      })
  );
});
