(function(){
  function removeQueuedRecipe(qid){
    const item=queue.find(x=>x.id===qid);
    if(!item) return;
    const label=item.type==='website'?(item.host||item.name):item.name;
    if(!confirm(`Remove "${label}" from the import queue?`)) return;
    queue=queue.filter(x=>x.id!==qid);
    if(currentReviewId===qid) clearPhotoReview();
    if(currentWebsiteReviewId===qid) clearWebsiteReview();
    save();
    renderQueue();
  }
  window.removeQueuedRecipe=removeQueuedRecipe;

  window.renderQueue=function(){
    const el=document.getElementById('queueList');
    if(!el) return;
    if(!queue.length){
      el.innerHTML='<div class="empty"><strong>Queue is empty</strong>Add photos or website links and they\'ll appear here.</div>';
      return;
    }
    el.innerHTML=queue.map(x=>`<div class="queue-item">
      <div class="queue-thumb">${x.thumb?`<img src="${x.thumb}" alt="">`:x.type==='website'?'↗':'▧'}</div>
      <div class="queue-text"><strong>${escapeHtml(x.type==='website'?(x.host||x.name):x.name)}</strong><span>${x.type==='website'?escapeHtml(x.name):'Photo / screenshot'}</span></div>
      ${x.type==='photo'?`<button type="button" class="queue-review-btn" onclick="reviewPhoto('${x.id}')">Review</button>`:''}
      ${x.type==='website'?`<button type="button" class="queue-review-btn website" onclick="reviewWebsite('${x.id}')">Review / Import</button>`:''}
      <button type="button" class="queue-review-btn" style="background:#fff;color:#7b3f68;border:1px solid #d9c6d0" onclick="removeQueuedRecipe('${x.id}')">Remove</button>
      <span class="status ${x.type==='website'?'green':''}">${escapeHtml(x.status)}</span>
    </div>`).join('');
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{ if(document.getElementById('import')?.classList.contains('active')) renderQueue(); });
  }else if(document.getElementById('import')?.classList.contains('active')){
    renderQueue();
  }

  const storage=document.createElement('script');
  storage.src='./storage-fix-v1.js?v=20260819-2031';
  storage.onload=()=>{
    const details=document.createElement('script');
    details.src='./recipe-details-v1.js?v=20260819-2031';
    details.onload=()=>{
      const photoEdit=document.createElement('script');
      photoEdit.src='./recipe-photo-edit-v1.js?v=20260819-2031';
      photoEdit.onload=()=>{
        const persistence=document.createElement('script');
        persistence.src='./persistence-v2.js?v=20260819-2031';
        persistence.onload=()=>{
          const finalEdit=document.createElement('script');
          finalEdit.src='./recipe-edit-v2.js?v=20260819-2031';
          document.body.appendChild(finalEdit);
        };
        document.body.appendChild(persistence);
      };
      document.body.appendChild(photoEdit);
    };
    document.body.appendChild(details);
  };
  document.body.appendChild(storage);
})();
