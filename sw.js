// 离线优先：缓存先回，后台静默更新
const CACHE = 'daily-v1';
const CORE = ['/daily/', '/daily/wubao/', '/daily/wanbao/', '/daily/tujian/', '/daily/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 页面：先给缓存（打开即有内容），同时后台拉新的存起来
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const hit = await c.match(req, { ignoreSearch: true });
        const fresh = fetch(req)
          .then(r => { if (r && r.ok) c.put(req, r.clone()); return r; })
          .catch(() => hit);
        return hit || fresh;
      })
    );
    return;
  }

  // 图片等静态资源：缓存优先
  if (url.pathname.startsWith('/daily/assets/') || /\.(png|jpe?g|webp|svg|json)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        const r = await fetch(req);
        if (r && r.ok) c.put(req, r.clone());
        return r;
      })
    );
  }
});
