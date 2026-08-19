window.removeQueuedRecipe=function(qid){
  const item=queue.find(x=>x.id===qid);
  if(!item) return;
  const label=item.type==='website'?(item.host||item.name):item.name;
  const ok=confirm(`Remove ${label} from the import queue?`);
  if(!ok) return;
  queue=queue.filter(x=>x.id!==qid);
  if(currentReviewId===qid){
    currentReviewId=null;
    document.getElementById('photoReview')?.classList.remove('active');
  }
  if(currentWebsiteReviewId===qid){
    currentWebsiteReviewId=null;
    document.getElementById('websiteReview')?.classList.remove('active');
  }
  save();
  renderQueue();
};

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
    <button type="button" onclick="removeQueuedRecipe('${x.id}')" style="border:1px solid #d8c3cd;background:#fff;color:#7a3f66;border-radius:10px;padding:7px 10px;font:inherit;font-size:12px;font-weight:800;cursor:pointer">Remove</button>
    <span class="status ${x.type==='website'?'green':''}">${escapeHtml(x.status)}</span>
  </div>`).join('');
};

renderQueue();
