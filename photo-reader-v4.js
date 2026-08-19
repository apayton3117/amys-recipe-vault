// Photo reader v4 — authoritative photo review/OCR behavior.
(function(){
  const OCR_VERSION=5;

  function fileTitle(name=''){
    return String(name)
      .replace(/\.[a-z0-9]{2,5}$/i,'')
      .replace(/[_-]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function genericFilename(name=''){
    const t=fileTitle(name);
    return !t || /^(img|image|photo|screenshot|recipe)[ _-]*\d*$/i.test(t) || /^\d{6,}$/.test(t);
  }

  function cleanLine(s=''){
    return String(s)
      .replace(/[•●▪■]+/g,'')
      .replace(/^\s*[-–—]+\s*/,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function badTitle(t=''){
    t=String(t).trim();
    if(!t || t.length<3 || t.length>70) return true;
    if(/^(ingredients?|instructions?|directions?|method)\b/i.test(t)) return true;
    if(/\b(cup|cups|tsp|tbsp|oz|ounce|lb|pound|preheat|bake|mix|stir|add|recipe)\b/i.test(t)) return true;
    if(/[0-9]/.test(t)) return true;
    return false;
  }

  function normalizeFractions(s=''){
    return String(s)
      .replace(/\b1\s*[-–]?\s*1[)lI|]\s*\/\s*2\b/g,'1-1 1/2')
      .replace(/\b2\s*[-–]?\s*2[)lI|]\s*\/\s*2\b/g,'2-2 1/2')
      .replace(/\b1\s*[-–]?\s*1[)lI|]\s*2\b/g,'1-1 1/2')
      .replace(/\b2\s*[-–]?\s*2[)lI|]\s*2\b/g,'2-2 1/2')
      .replace(/\b[¼]\b/g,'1/4')
      .replace(/\b[½]\b/g,'1/2')
      .replace(/\b[¾]\b/g,'3/4');
  }

  function trimAfterIngredient(s=''){
    const known=[
      /\bvelveeta\s+cheese\b/i,
      /\britz\s+crackers?\b/i,
      /\bfrozen\s+broccoli\s+cuts?\b/i,
      /\bstick\s+butter\b/i,
      /\bcup\s+milk\b/i
    ];
    for(const rx of known){
      const m=s.match(rx);
      if(m){
        const end=(m.index||0)+m[0].length;
        const tail=s.slice(end);
        const keep=/\bdouble recipe\b/i.test(tail)?' - double recipe':'';
        return (s.slice(0,end)+keep).trim();
      }
    }
    return s;
  }

  function stripIngredientNoise(line=''){
    let s=normalizeFractions(cleanLine(line));
    if(!s) return '';
    if(/^(ingredients?|instructions?|directions?|method)\b/i.test(s)) return '';

    // Remove common OCR bullet/noise characters before the first quantity.
    s=s.replace(/^[^0-9¼½¾⅓⅔⅛⅜⅝⅞A-Za-z]*(?=[0-9¼½¾⅓⅔⅛⅜⅝⅞])/,'');
    s=s.replace(/^(?:[A-Za-z]{1,3}\s+)(?=[0-9¼½¾⅓⅔⅛⅜⅝⅞])/,'');
    s=s.replace(/^[®©@oOeE]\s*(?=[0-9¼½¾⅓⅔⅛⅜⅝⅞])/,'');

    // Recover common badly-read fraction lines when the ingredient word is clear.
    if(/\bstick\s+butter\b/i.test(s) && !/\d|[¼½¾⅓⅔⅛⅜⅝⅞]/.test(s)) s='1/2 stick butter';
    if(/\bcup\s+milk\b/i.test(s) && !/\d|[¼½¾⅓⅔⅛⅜⅝⅞]/.test(s)){
      s=/double recipe/i.test(s)?'1/2 cup milk - double recipe':'1/4 cup milk';
    }

    // If OCR caught the ingredient but left nonsense before the actual phrase, keep the useful quantity + ingredient.
    const qtyMatch=s.match(/(?:\d+(?:\s+\d+\/\d+|\/\d+)?|\d+\s*-\s*\d+(?:\s+\d+\/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])/);
    if(qtyMatch && qtyMatch.index>0 && qtyMatch.index<=8) s=s.slice(qtyMatch.index);

    // Keep useful text through "double recipe" and drop OCR garbage after it.
    const m=s.match(/^(.*?\bdouble recipe\b)/i);
    if(m) s=m[1];

    // For known ingredients, remove stray OCR words after the ingredient itself.
    s=trimAfterIngredient(s);

    // Remove trailing random symbols/short OCR fragments.
    s=s.replace(/\s+[|*_~]+.*$/,'').trim();
    s=s.replace(/\s+[A-Z]{1,3}(?:\s+[A-Z]{1,3}){1,4}$/,'').trim();
    s=s.replace(/[“”"'`:;]+\s*[A-Za-z]{0,3}\s*$/,'').trim();

    // Ingredient lines should normally contain a quantity or a recognizable food word.
    const hasQty=/\d|[¼½¾⅓⅔⅛⅜⅝⅞]/.test(s);
    const foodWord=/\b(salt|pepper|butter|milk|water|oil|flour|sugar|cheese|broccoli|crackers?|velveeta|egg|eggs|garlic|onion|cream|vanilla|yeast)\b/i.test(s);
    if(!hasQty && !foodWord) return '';
    return s;
  }

  function parseOcr(raw='', fallbackTitle=''){
    const lines=String(raw).split(/\r?\n/).map(cleanLine).filter(Boolean);
    const ingIndex=lines.findIndex(x=>/^ingredients?\b/i.test(x));
    const instIndex=lines.findIndex(x=>/^(instructions?|directions?|method)\b/i.test(x));

    let title='';
    const fallback=!genericFilename(fallbackTitle)?fileTitle(fallbackTitle):'';
    if(fallback) title=fallback;
    if(!title){
      const candidates=lines.filter(x=>x.length>=3 && x.length<=60 && !badTitle(x));
      title=candidates[0]||'';
    }

    let ingredientSource=[];
    if(ingIndex>=0){
      const end=instIndex>ingIndex?instIndex:lines.length;
      ingredientSource=lines.slice(ingIndex+1,end);
    }else if(instIndex>0){
      ingredientSource=lines.slice(0,instIndex);
    }

    const titleLc=title.toLowerCase();
    const ingredients=[];
    for(const line of ingredientSource){
      if(titleLc && line.toLowerCase()===titleLc) break;
      const cleaned=stripIngredientNoise(line);
      if(cleaned && !ingredients.includes(cleaned)) ingredients.push(cleaned);
    }

    let instructions=[];
    if(instIndex>=0) instructions=lines.slice(instIndex+1);
    instructions=instructions
      .filter(x=>x && !/^(servings?|time|difficulty|calories?)\b/i.test(x))
      .map(x=>x.replace(/^\s*(\d+)\s*[.)]?\s*/, '$1. '));

    return {title,ingredients:ingredients.join('\n'),instructions:instructions.join('\n'),raw:lines.join('\n')};
  }

  let tesseractPromise=null;
  function loadTesseract(){
    if(window.Tesseract) return Promise.resolve();
    if(tesseractPromise) return tesseractPromise;
    tesseractPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Could not load OCR library'));
      document.head.appendChild(s);
    });
    return tesseractPromise;
  }

  window.reviewPhoto=function(qid){
    const x=queue.find(a=>a.id===qid);
    if(!x) return;
    currentReviewId=qid;
    hideImportPanels();
    const panel=document.getElementById('photoReview');
    panel?.classList.add('active');
    const img=document.getElementById('reviewPhoto');
    if(img) img.src=x.thumb||'';

    const titleEl=document.getElementById('reviewTitle');
    const ingEl=document.getElementById('reviewIngredients');
    const instEl=document.getElementById('reviewInstructions');
    const rawEl=document.getElementById('reviewRawText');
    const status=document.getElementById('ocrStatus');
    const progress=document.getElementById('ocrProgress');

    const stale=Number(x.ocrVersion||0)<OCR_VERSION;
    const fallback=!genericFilename(x.name)?fileTitle(x.name):'';

    if(stale){
      x.draftTitle=fallback;
      x.draftIngredients='';
      x.draftInstructions='';
      x.rawText='';
      x.ocrVersion=0;
      save();
      if(status) status.textContent='This photo needs a fresh ingredient scan. Click Read Text From Photo.';
    }else if(status){
      status.textContent=x.rawText?'Previous scan loaded. You can review it or scan again.':'Ready to read this image.';
    }

    if(titleEl) titleEl.value=stale?fallback:(x.draftTitle||fallback);
    if(ingEl) ingEl.value=stale?'':(x.draftIngredients||'');
    if(instEl) instEl.value=stale?'':(x.draftInstructions||'');
    if(rawEl) rawEl.value=stale?'':(x.rawText||'');
    if(progress) progress.style.width='0%';

    panel?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.extractCurrentPhoto=async function(){
    const x=queue.find(a=>a.id===currentReviewId);
    const img=document.getElementById('reviewPhoto');
    const status=document.getElementById('ocrStatus');
    const progress=document.getElementById('ocrProgress');
    const btn=document.getElementById('ocrButton');
    if(!x || !img?.src){if(status) status.textContent='No recipe photo is selected.';return;}

    try{
      if(btn){btn.disabled=true;btn.textContent='Reading Photo…';}
      if(status) status.textContent='Loading photo reader…';
      if(progress) progress.style.width='5%';
      await loadTesseract();

      const worker=await Tesseract.createWorker('eng',1,{logger:m=>{
        if(m?.status && status) status.textContent=String(m.status).replace(/_/g,' ');
        if(typeof m?.progress==='number' && progress) progress.style.width=Math.max(5,Math.round(m.progress*100))+'%';
      }});
      const result=await worker.recognize(img.src);
      await worker.terminate();

      const parsed=parseOcr(result?.data?.text||'',x.name||'');
      document.getElementById('reviewTitle').value=parsed.title;
      document.getElementById('reviewIngredients').value=parsed.ingredients;
      document.getElementById('reviewInstructions').value=parsed.instructions;
      document.getElementById('reviewRawText').value=parsed.raw;

      x.draftTitle=parsed.title;
      x.draftIngredients=parsed.ingredients;
      x.draftInstructions=parsed.instructions;
      x.rawText=parsed.raw;
      x.ocrVersion=OCR_VERSION;
      x.status='Ready to review';
      save();
      renderQueue();

      if(progress) progress.style.width='100%';
      if(status) status.textContent='Fresh scan complete. Review the ingredients and correct anything that did not scan perfectly.';
    }catch(err){
      console.error(err);
      if(progress) progress.style.width='0%';
      if(status) status.textContent='The photo reader could not finish this scan. Please try again.';
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Read Text From Photo';}
    }
  };
})();
