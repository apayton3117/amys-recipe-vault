// Saved recipe photo replacement controls.
(function(){
  function compressImage(file,maxSide=1600,quality=.82){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=reject;
      reader.onload=()=>{
        const img=new Image();
        img.onerror=reject;
        img.onload=()=>{
          let w=img.width,h=img.height;
          const scale=Math.min(1,maxSide/Math.max(w,h));
          w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
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

  function addPhotoControls(rid){
    const r=recipes.find(x=>x.id===rid);
    const cover=document.querySelector('#detailCard .detail-cover');
    if(!r || !cover || cover.querySelector('.change-photo-btn')) return;

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
    btn.style.cssText='position:absolute;right:16px;bottom:16px;z-index:3;background:rgba(255,255,255,.95);box-shadow:0 8px 24px rgba(69,48,55,.16)';
    btn.onclick=()=>input.click();

    input.onchange=async()=>{
      const file=input.files?.[0];
      if(!file) return;
      const oldText=btn.textContent;
      try{
        btn.disabled=true;
        btn.textContent='Updating Photo…';
        const compressed=await compressImage(file);
        const oldPhoto=r.photo||'';
        r.photo=compressed;
        const ok=save();
        if(ok===false){
          r.photo=oldPhoto;
          save();
          return;
        }
        const img=cover.querySelector('img');
        if(img){
          img.src=r.photo;
        }else{
          cover.innerHTML=`<img src="${r.photo}" alt="${escapeHtml(r.title)}">`;
          addPhotoControls(rid);
        }
        renderRecipes();
        btn.textContent='Photo Updated ✓';
        setTimeout(()=>{btn.textContent=oldText;btn.disabled=false;},1200);
      }catch(err){
        console.error(err);
        alert('The new photo could not be saved. Please try another image.');
        btn.textContent=oldText;
        btn.disabled=false;
      }
      input.value='';
    };

    cover.appendChild(input);
    cover.appendChild(btn);
  }

  function install(){
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
