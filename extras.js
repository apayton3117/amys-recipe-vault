if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

let amyOcrScriptPromise=null;
function loadAmyOcr(){
  if(window.Tesseract) return Promise.resolve();
  if(amyOcrScriptPromise) return amyOcrScriptPromise;
  amyOcrScriptPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload=resolve;
    s.onerror=()=>reject(new Error('Could not load the photo text reader.'));
    document.head.appendChild(s);
  });
  return amyOcrScriptPromise;
}

function cleanOcrLine(s){
  return String(s||'').replace(/[•●▪■]+/g,'').replace(/^[-–—]\s*/,'').replace(/\s+/g,' ').trim();
}

function parseRecipeOcr(raw){
  const lines=String(raw||'').split(/\r?\n/).map(cleanOcrLine).filter(Boolean);
  const lower=lines.map(x=>x.toLowerCase());
  const ingIndex=lower.findIndex(x=>/^ingredients?\b/.test(x));
  const instIndex=lower.findIndex(x=>/^(instructions?|directions?|method)\b/.test(x));
  let ingredients=[];
  let instructions=[];
  if(ingIndex>=0){const end=instIndex>ingIndex?instIndex:lines.length;ingredients=lines.slice(ingIndex+1,end)}
  if(instIndex>=0){instructions=lines.slice(instIndex+1)}
  const excluded=new Set([ingIndex,instIndex]);
  const titleCandidates=lines.map((x,i)=>({x,i}))
    .filter(({x,i})=>!excluded.has(i) && x.length>=3 && x.length<=60)
    .filter(({x})=>!/^\d+[.)]?\s/.test(x))
    .filter(({x})=>!/\b(cup|cups|tsp|tbsp|teaspoon|tablespoon|oz|ounce|lb|pound|degree|minutes?|hours?)\b/i.test(x))
    .filter(({x})=>!/^(ingredients?|instructions?|directions?|method)$/i.test(x));
  let title='';
  if(ingIndex>=0 && instIndex>ingIndex){const between=titleCandidates.filter(c=>c.i>ingIndex && c.i<instIndex);if(between.length) title=between[between.length-1].x}
  if(!title && ingIndex>0){const before=titleCandidates.filter(c=>c.i<ingIndex);if(before.length) title=before[before.length-1].x}
  if(!title && titleCandidates.length) title=titleCandidates[0].x;
  if(title) ingredients=ingredients.filter(x=>x!==title);
  return {title,ingredients:ingredients.join('\n'),instructions:instructions.join('\n'),raw:lines.join('\n')};
}

window.extractCurrentPhoto=async function(){
  const status=document.getElementById('ocrStatus');
  const progress=document.getElementById('ocrProgress');
  const btn=document.getElementById('ocrButton');
  const img=document.getElementById('reviewPhoto');
  if(!img || !img.src){if(status) status.textContent='No recipe photo is selected.';return;}
  try{
    if(btn) btn.disabled=true;
    if(status) status.textContent='Loading the photo text reader…';
    if(progress) progress.style.width='8%';
    await loadAmyOcr();
    if(status) status.textContent='Reading the recipe photo… this can take a little while.';
    const worker=await Tesseract.createWorker('eng',1,{logger:m=>{
      if(m && m.status && status) status.textContent=m.status.replace(/_/g,' ');
      if(m && typeof m.progress==='number' && progress) progress.style.width=Math.max(8,Math.round(m.progress*100))+'%';
    }});
    const result=await worker.recognize(img.src);
    await worker.terminate();
    const parsed=parseRecipeOcr(result?.data?.text||'');
    const rawEl=document.getElementById('reviewRawText');
    const titleEl=document.getElementById('reviewTitle');
    const ingEl=document.getElementById('reviewIngredients');
    const instEl=document.getElementById('reviewInstructions');
    if(rawEl) rawEl.value=parsed.raw;
    if(titleEl && !titleEl.value.trim()) titleEl.value=parsed.title;
    if(ingEl) ingEl.value=parsed.ingredients;
    if(instEl) instEl.value=parsed.instructions;
    if(progress) progress.style.width='100%';
    if(status) status.textContent='Photo read complete. Please check the recipe and correct anything that did not scan perfectly.';
    if(typeof currentReviewId!=='undefined' && currentReviewId){
      const q=queue.find(a=>a.id===currentReviewId);
      if(q){q.rawText=parsed.raw;q.draftTitle=titleEl?.value||'';q.draftIngredients=ingEl?.value||'';q.draftInstructions=instEl?.value||'';save();}
    }
  }catch(err){
    console.error(err);
    if(progress) progress.style.width='0%';
    if(status) status.textContent='The photo reader could not finish. Refresh the app and try again. If it still fails, tell me what message appears here.';
  }finally{if(btn) btn.disabled=false;}
};

(function(){
  const s=document.createElement('script');
  s.src='./queue-tools-v1.js?v=20260819-1833';
  document.body.appendChild(s);
})();

function relocateReviewPanels(){
  const section=document.getElementById('import');
  const layout=section?.querySelector('.import-layout');
  if(!section || !layout) return;
  const photo=document.getElementById('photoReview');
  const website=document.getElementById('websiteReview');
  if(photo && photo.parentElement!==section){photo.classList.add('full-review-panel');section.appendChild(photo)}
  if(website && website.parentElement!==section){website.classList.add('full-review-panel');section.appendChild(website)}
}
window.addEventListener('DOMContentLoaded',relocateReviewPanels);
setTimeout(relocateReviewPanels,0);

(function(){
  const style=document.createElement('style');
  style.id='amy-layout-width-fix-v2';
  style.textContent=`
    .full-review-panel{width:100%;margin-top:22px;background:#fff;border:1px solid var(--line);border-radius:24px;padding:26px;box-shadow:var(--shadow)}
    @media (min-width: 1100px){
      .shell{max-width:none;width:100%;padding-left:30px;padding-right:30px}
      .layout{grid-template-columns:220px minmax(0,1fr);gap:26px}
      .import-layout{grid-template-columns:minmax(520px,1.2fr) minmax(440px,1fr);gap:22px;width:100%}
      #import{width:100%}
      .panel{padding:26px}
      .full-review-panel .review-grid{grid-template-columns:minmax(420px,.95fr) minmax(620px,1.35fr);gap:30px}
      .full-review-panel .field input,.full-review-panel .field textarea,.full-review-panel .field select{width:100%}
      .full-review-panel .review-image-wrap{min-height:440px}
      .full-review-panel .review-image-wrap img{max-height:760px}
    }
    @media (min-width: 1450px){
      .shell{padding-left:36px;padding-right:36px}
      .import-layout{grid-template-columns:minmax(600px,1.25fr) minmax(500px,.95fr)}
      .full-review-panel .review-grid{grid-template-columns:minmax(480px,.9fr) minmax(720px,1.4fr)}
    }
    @media (max-width:1099px) and (min-width:781px){
      .shell{max-width:1180px}
      .import-layout{grid-template-columns:1fr}
      .full-review-panel .review-grid{grid-template-columns:minmax(300px,.9fr) minmax(0,1.1fr)}
    }
    @media (max-width:780px){
      .full-review-panel{padding:18px;border-radius:20px}
      .full-review-panel .review-grid{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);
})();
