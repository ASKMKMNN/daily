// 页面永远先取网络（密码壳随时会变），离线才回退缓存；静态图缓存优先
const CACHE = 'daily-v2';
const CORE = ['/daily/', '/daily/wubao/', '/daily/wanbao/', '/daily/tujian/', '/daily/blog/', '/daily/manifest.json'];

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

  // 页面：网络优先，拿不到才用缓存（避免旧明文页盖住新密码门）
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const r = await fetch(req);
        if (r && r.ok) c.put(req, r.clone());
        return r;
      } catch (err) {
        const hit = await c.match(req, { ignoreSearch: true });
        return hit || new Response('离线且没有缓存', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // 图片等静态资源：缓存优先（密文图文件名带 key 指纹，换密码自然换 URL）
  if (url.pathname.startsWith('/daily/assets/') || /\.(png|jpe?g|webp|svg|json|enc)$/.test(url.pathname)) {
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
