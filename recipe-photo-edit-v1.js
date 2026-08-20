// Saved recipe photo replacement controls.
(function(){
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

    input.onchange=()=>{
      const file=input.files?.[0];
      if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>{
        r.photo=reader.result;
        save();
        const img=cover.querySelector('img');
        if(img){
          img.src=r.photo;
        }else{
          cover.innerHTML=`<img src="${r.photo}" alt="${escapeHtml(r.title)}">`;
          addPhotoControls(rid);
        }
        renderRecipes();
      };
      reader.readAsDataURL(file);
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
