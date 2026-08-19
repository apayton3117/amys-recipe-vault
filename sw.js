const CACHE='amys-recipe-vault-v2';
const CORE=['./styles.css','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);

  // Always request the newest HTML and JavaScript first so app updates appear immediately.
  if(req.mode==='navigate' || /\.(?:js|html)$/.test(url.pathname)){
    event.respondWith(
      fetch(req,{cache:'no-store'})
        .then(response=>response)
        .catch(()=>caches.match(req))
    );
    return;
  }

  // Static assets can use cache-first behavior.
  event.respondWith(
    caches.match(req).then(cached=>cached || fetch(req).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
      return response;
    }))
  );
});
