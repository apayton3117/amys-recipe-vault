const CACHE='amys-recipe-vault-v4';
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

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(req,{cache:'no-store'});
        let html=await response.text();
        if(!html.includes('ocr-v2.js')){
          html=html.replace('</body>','<script src="./ocr-v2.js?v=20260819-1820"></script></body>');
        }
        if(!html.includes('recipe-details-v1.js')){
          html=html.replace('</body>','<script src="./recipe-details-v1.js?v=20260819-2010"></script><script src="./recipe-photo-edit-v1.js?v=20260819-2010"></script></body>');
        }
        const headers=new Headers(response.headers);
        headers.set('cache-control','no-store, no-cache, must-revalidate');
        return new Response(html,{status:response.status,statusText:response.statusText,headers});
      }catch(e){
        return caches.match('./index.html') || Response.error();
      }
    })());
    return;
  }

  if(/\.(?:js|html)$/.test(url.pathname)){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match(req)));
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached || fetch(req).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
      return response;
    }))
  );
});
