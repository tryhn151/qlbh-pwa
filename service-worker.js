// Tên cache
const CACHE_NAME = 'qlbh-cache-v-none';

// Sự kiện install - skip waiting to activate immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Sự kiện activate - xóa TẤT CẢ cache cũ
self.addEventListener('activate', event => {
  console.log('Service Worker: Đang xóa tất cả cache...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          console.log('Service Worker: Xóa cache', cache);
          return caches.delete(cache);
        })
      );
    })
  );
  return self.clients.claim();
});

// Sự kiện fetch - Luôn fetch từ mạng, không cache
self.addEventListener('fetch', event => {
  // Bỏ qua cache hoàn toàn
  event.respondWith(fetch(event.request));
});
