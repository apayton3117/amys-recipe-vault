// Reliable recipe persistence: compress photos before storage and verify writes.
(function(){
  const RECIPE_KEY='amysRecipeVault_recipes_v1';
  const QUEUE_KEY='amysRecipeVault_queue_v1';

  function field(id){return (document.getElementById(id)?.value||'').trim();}

  async function compressDataUrl(src,maxSide=1200,quality=.78){
    if(!src || !String(src).startsWith('data:image/')) return src||'';
    return new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{
        try{
          let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
          const scale=Math.min(1,maxSide/Math.max(w,h));
          w=Math.max(1,Math.round(w*scale)); h=Math.max(1,Math.round(h*scale));
          const c=document.createElement('canvas');c.width=w;c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          resolve(c.toDataURL('image/jpeg',quality));
        }catch(e){resolve(src);}
      };
      img.onerror=()=>resolve(src);
      img.src=src;
    });
  }
  window.__amyCompressRecipePhoto=compressDataUrl;

  function persistVerified(nextRecipes,nextQueue){
    try{
      // Free queue storage first, then write the cookbook.
      localStorage.setItem(QUEUE_KEY,JSON.stringify(nextQueue));
      localStorage.setItem(RECIPE_KEY,JSON.stringify(nextRecipes));
      const checkRecipes=JSON.parse(localStorage.getItem(RECIPE_KEY)||'[]');
      const checkQueue=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');
      if(checkRecipes.length!==nextRecipes.length || checkQueue.length!==nextQueue.length) throw new Error('Storage verification failed');
      return true;
    }catch(err){
      console.error('Verified recipe save failed',err);
      return false;
    }
  }

  window.saveReviewedPhotoRecipe=async function(){
    const x=queue.find(a=>a.id===currentReviewId);
    if(!x) return;
    const title=field('reviewTitle');
    if(!title) return alert('Add the recipe name before saving.');

    const button=[...document.querySelectorAll('#photoReview button')].find(b=>/Save Recipe to My Cookbook/i.test(b.textContent));
    const oldText=button?.textContent||'';
    if(button){button.disabled=true;button.textContent='Saving Recipe…';}

    try{
      const photo=await compressDataUrl(x.thumb||'',1200,.76);
      const status=document.getElementById('reviewStatus')?.value||'saved';
      const recipe={
        id:id(), title,
        ingredients:field('reviewIngredients'),
        instructions:field('reviewInstructions'),
        tags:field('reviewTags').split(',').map(v=>v.trim()).filter(Boolean),
        source:'Imported from recipe photo', status, favorite:status==='favorite', photo,
        prepTime:field('reviewPrepTime'), cookTime:field('reviewCookTime'), totalTime:field('reviewTotalTime'), notes:field('reviewNotes'),
        createdAt:new Date().toISOString()
      };
      const nextRecipes=[recipe,...recipes];
      const nextQueue=queue.filter(a=>a.id!==currentReviewId);

      if(!persistVerified(nextRecipes,nextQueue)){
        alert('The recipe was not saved. Your browser storage rejected the write, so I kept it in Review instead of pretending it saved.');
        return;
      }

      recipes=nextRecipes;
      queue=nextQueue;
      currentReviewId=null;
      try{updateStats();}catch(e){}
      renderRecipes();
      showView('recipes');
    }finally{
      if(button){button.disabled=false;button.textContent=oldText||'Save Recipe to My Cookbook';}
    }
  };

  // Override replacement-photo behavior with compressed, verified persistence.
  function installPhotoEditor(){
    if(typeof window.openRecipe!=='function' || window.openRecipe.__verifiedPhotoEdit) return false;
    const original=window.openRecipe;
    const wrapped=function(rid){
      original(rid);
      setTimeout(()=>{
        const r=recipes.find(x=>x.id===rid);
        const cover=document.querySelector('#detailCard .detail-cover');
        if(!r||!cover) return;
        const old=cover.querySelector('.change-photo-btn'); if(old) old.remove();
        const oldInput=cover.querySelector('#replaceRecipePhotoInput'); if(oldInput) oldInput.remove();
        cover.style.position='relative';
        const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;input.id='replaceRecipePhotoInput';
        const btn=document.createElement('button');btn.type='button';btn.className='btn btn-soft change-photo-btn';btn.textContent='📷 Change Photo';
        btn.style.cssText='position:absolute;right:16px;bottom:16px;z-index:5;background:rgba(255,255,255,.96);box-shadow:0 8px 24px rgba(69,48,55,.16)';
        btn.onclick=()=>input.click();
        input.onchange=async()=>{
          const file=input.files?.[0];if(!file)return;
          btn.disabled=true;btn.textContent='Updating Photo…';
          const raw=await new Promise(resolve=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>resolve('');fr.readAsDataURL(file)});
          const photo=await compressDataUrl(raw,1200,.76);
          const nextRecipes=recipes.map(a=>a.id===rid?{...a,photo}:a);
          if(!persistVerified(nextRecipes,queue)){
            btn.disabled=false;btn.textContent='📷 Change Photo';
            alert('The new photo could not be saved. Your original photo is unchanged.');
            return;
          }
          recipes=nextRecipes;
          r.photo=photo;
          const img=cover.querySelector('img');
          if(img) img.src=photo; else {const ph=cover.querySelector('.photo-fallback');if(ph)ph.remove();const ni=document.createElement('img');ni.src=photo;ni.alt=r.title;cover.insertBefore(ni,cover.firstChild);}
          renderRecipes();
          btn.disabled=false;btn.textContent='Photo Updated ✓';
          setTimeout(()=>btn.textContent='📷 Change Photo',1300);
        };
        cover.appendChild(input);cover.appendChild(btn);
      },0);
    };
    wrapped.__verifiedPhotoEdit=true;
    window.openRecipe=wrapped;
    return true;
  }

  if(!installPhotoEditor()){
    const t=setInterval(()=>{if(installPhotoEditor()) clearInterval(t)},100);
    setTimeout(()=>clearInterval(t),10000);
  }

  window.__amyPersistenceV2Loaded=true;
})();
