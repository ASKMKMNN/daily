// 页面与 /daily/*.js 永远先取网络，离线才回退缓存。
// 阅读脚本在 /daily/assets/reader.js，不能跟图片一起缓存优先，否则回访用户会一直拿到旧脚本。
// 图片、图标、json、密文图仍缓存优先（密文图文件名带 key 指纹，换密码自然换 URL）。
const CACHE = 'daily-v4';
const CORE = ['/daily/', '/daily/read.html', '/daily/wubao/', '/daily/wanbao/', '/daily/tujian/', '/daily/blog/', '/daily/manifest.json'];

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

function isScript(pathname) {
  return pathname.startsWith('/daily/') && /\.js$/.test(pathname);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 页面，以及阅读脚本等 .js：网络优先，拿不到才用缓存
  if (req.mode === 'navigate' || isScript(url.pathname)) {
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
