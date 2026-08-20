// Saved recipe photo replacement controls.
(function(){
  function ensurePhotoStyles(){
    if(document.getElementById('amy-photo-detail-style-v2')) return;
    const style=document.createElement('style');
    style.id='amy-photo-detail-style-v2';
    style.textContent=`
      #detailCard .detail-cover{height:340px;min-height:340px;background:#f7f1ee;position:relative}
      #detailCard .detail-cover img{width:100%;height:100%;object-fit:contain;object-position:center center;display:block}
      @media(max-width:780px){#detailCard .detail-cover{height:285px;min-height:285px}}
    `;
    document.head.appendChild(style);
  }

  function compressImage(file,maxSide=1400,quality=.8){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=reject;
      reader.onload=()=>{
        const img=new Image();
        img.onerror=reject;
        img.onload=()=>{
          let w=img.width,h=img.height;
          const scale=Math.min(1,maxSide/Math.max(w,h));
          w=Math.max(1,Math.round(w*scale));
          h=Math.max(1,Math.round(h*scale));
          const canvas=document.createElement('canvas');
          canvas.width=w;canvas.height=h;
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,w,h);
          resolve(canvas.toDataURL('image/jpeg',quality));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function photoReallyPersisted(rid,photo){
    try{
      const saved=JSON.parse(localStorage.getItem('amysRecipeVault_recipes_v1')||'[]');
      const found=saved.find(x=>x.id===rid);
      return !!found && found.photo===photo;
    }catch(e){return false;}
  }

  function addPhotoControls(rid){
    ensurePhotoStyles();
    const r=recipes.find(x=>x.id===rid);
    const cover=document.querySelector('#detailCard .detail-cover');
    if(!r || !cover) return;

    // Always redraw the cover from the CURRENT stored recipe photo.
    let img=cover.querySelector('img');
    if(r.photo){
      if(!img){
        cover.querySelector('.photo-fallback')?.remove();
        img=document.createElement('img');
        img.alt=r.title||'Recipe photo';
        cover.prepend(img);
      }
      if(img.src!==r.photo) img.src=r.photo;
    }

    if(cover.querySelector('.change-photo-btn')) return;
    cover.style.position='relative';

    const input=document.createElement('input');
    input.type='file';
    input.accept='image/*';
    input.hidden=true;
    input.id='replaceRecipePhotoInput';

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='btn btn-soft change-photo-btn';
    btn.textContent='📷 Change Photo';
    btn.style.cssText='position:absolute;right:16px;bottom:16px;z-index:3;background:rgba(255,255,255,.96);box-shadow:0 8px 24px rgba(69,48,55,.16)';
    btn.onclick=()=>input.click();

    input.onchange=async()=>{
      const file=input.files?.[0];
      if(!file) return;
      const oldText=btn.textContent;
      const oldPhoto=r.photo||'';
      try{
        btn.disabled=true;
        btn.textContent='Updating Photo…';
        const compressed=await compressImage(file);
        r.photo=compressed;
        const ok=save();
        if(ok===false || !photoReallyPersisted(rid,compressed)){
          r.photo=oldPhoto;
          save();
          alert('The new photo did not save. Please try again.');
          return;
        }

        // Force the visible recipe image to redraw from the newly persisted photo.
        let currentImg=cover.querySelector('img');
        if(!currentImg){
          cover.querySelector('.photo-fallback')?.remove();
          currentImg=document.createElement('img');
          currentImg.alt=r.title||'Recipe photo';
          cover.prepend(currentImg);
        }
        currentImg.src='';
        requestAnimationFrame(()=>{ currentImg.src=compressed; });
        renderRecipes();
        btn.textContent='Photo Updated ✓';
        setTimeout(()=>{btn.textContent=oldText;btn.disabled=false;},1400);
      }catch(err){
        console.error(err);
        r.photo=oldPhoto;
        alert('The new photo could not be saved. Please try another image.');
        btn.textContent=oldText;
        btn.disabled=false;
      }finally{
        input.value='';
      }
    };

    cover.appendChild(input);
    cover.appendChild(btn);
  }

  function install(){
    ensurePhotoStyles();
    if(typeof window.openRecipe!=='function' || window.openRecipe.__photoEditWrapped) return false;
    const original=window.openRecipe;
    const wrapped=function(rid){
      original(rid);
      setTimeout(()=>addPhotoControls(rid),0);
    };
    wrapped.__photoEditWrapped=true;
    window.openRecipe=wrapped;
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install()) clearInterval(timer)},50);
    setTimeout(()=>clearInterval(timer),10000);
  }
})();
