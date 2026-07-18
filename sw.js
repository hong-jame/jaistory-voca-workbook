/* 영어 단어장 PWA 서비스워커 — 네트워크 우선(항상 최신) + 오프라인 캐시 폴백 */
const CACHE = 'voca-v13';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   // 외부(TTS 등)는 그대로

  // 네트워크 우선: 온라인이면 항상 최신본 → 캐시 staleness 없음
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      try {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      } catch (_) {}
      return fresh;
    } catch (err) {
      // 오프라인: 캐시 폴백
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = await caches.match('./') || await caches.match('index.html');
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
