(function(){
  function loadTesseract(){
    if(window.Tesseract) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js?v=2';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Unable to load OCR library'));
      document.head.appendChild(s);
    });
  }

  function tidy(line){return String(line||'').replace(/[•●▪■]+/g,'').replace(/^[-–—]\s*/,'').replace(/\s+/g,' ').trim();}
  function parseRecipe(raw){
    const lines=String(raw||'').split(/\r?\n/).map(tidy).filter(Boolean);
    const low=lines.map(x=>x.toLowerCase());
    const ing=low.findIndex(x=>/^ingredients?\b/.test(x));
    const ins=low.findIndex(x=>/^(instructions?|directions?|method)\b/.test(x));
    let ingredients=ing>=0?lines.slice(ing+1,ins>ing?ins:lines.length):[];
    let instructions=ins>=0?lines.slice(ins+1):[];
    let title='';
    for(const x of lines){
      if(x.length>=3&&x.length<=60&&!/^ingredients?$/i.test(x)&&!/^(instructions?|directions?|method)$/i.test(x)&&!/^\d+[.)]?\s/.test(x)&&!/\b(cup|cups|tsp|tbsp|teaspoon|tablespoon|oz|ounce|lb|pound|minutes?|hours?)\b/i.test(x)){title=x;break;}
    }
    if(title) ingredients=ingredients.filter(x=>x!==title);
    return {title,ingredients:ingredients.join('\n'),instructions:instructions.join('\n'),raw:lines.join('\n')};
  }

  window.extractCurrentPhoto=async function(){
    const status=document.getElementById('ocrStatus');
    const progress=document.getElementById('ocrProgress');
    const btn=document.getElementById('ocrButton');
    const img=document.getElementById('reviewPhoto');
    if(!img||!img.src){if(status)status.textContent='No recipe photo is selected.';return;}
    try{
      if(btn){btn.disabled=true;btn.textContent='Reading Photo…';}
      if(status)status.textContent='Loading the photo reader…';
      if(progress)progress.style.width='10%';
      await loadTesseract();
      if(status)status.textContent='Reading the recipe photo…';
      const result=await Tesseract.recognize(img.src,'eng',{logger:m=>{
        if(m&&m.status&&status)status.textContent=m.status.replace(/_/g,' ');
        if(m&&typeof m.progress==='number'&&progress)progress.style.width=Math.max(10,Math.round(m.progress*100))+'%';
      }});
      const p=parseRecipe(result&&result.data?result.data.text:'');
      const rawEl=document.getElementById('reviewRawText');
      const titleEl=document.getElementById('reviewTitle');
      const ingEl=document.getElementById('reviewIngredients');
      const insEl=document.getElementById('reviewInstructions');
      if(rawEl)rawEl.value=p.raw;
      if(titleEl&&!titleEl.value.trim())titleEl.value=p.title;
      if(ingEl)ingEl.value=p.ingredients;
      if(insEl)insEl.value=p.instructions;
      if(progress)progress.style.width='100%';
      if(status)status.textContent='Photo read complete. Review the fields and correct anything that scanned incorrectly.';
      if(typeof currentReviewId!=='undefined'&&currentReviewId&&Array.isArray(queue)){
        const q=queue.find(a=>a.id===currentReviewId);
        if(q){q.rawText=p.raw;q.draftTitle=titleEl?.value||'';q.draftIngredients=ingEl?.value||'';q.draftInstructions=insEl?.value||'';if(typeof save==='function')save();}
      }
    }catch(e){
      console.error(e);
      if(progress)progress.style.width='0%';
      if(status)status.textContent='The photo reader failed to load or finish. Please send me this message so I can fix the next part.';
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Read Text From Photo';}
    }
  };
})();