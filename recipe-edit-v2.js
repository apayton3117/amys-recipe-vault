// Final saved-recipe presentation + full edit controls.
(function(){
  function ensureStyles(){
    if(document.getElementById('amy-recipe-edit-v2-styles')) return;
    const s=document.createElement('style');
    s.id='amy-recipe-edit-v2-styles';
    s.textContent=`
      #detailCard .detail-cover{
        width:100% !important;
        height:auto !important;
        min-height:0 !important;
        aspect-ratio:3 / 2 !important;
        background:#f7f1ee !important;
        position:relative !important;
        display:grid !important;
        place-items:center !important;
        overflow:hidden !important;
      }
      #detailCard .detail-cover img{
        width:100% !important;
        height:100% !important;
        object-fit:contain !important;
        object-position:center center !important;
        display:block !important;
      }
      .recipe-heading-row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:4px}
      .recipe-heading-row h2{margin:0 !important}
      .edit-recipe-btn{white-space:nowrap}
      .recipe-edit-overlay{position:fixed;inset:0;background:rgba(48,37,43,.48);z-index:1000;display:grid;place-items:center;padding:24px;overflow:auto}
      .recipe-edit-modal{width:min(920px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid var(--line);border-radius:24px;box-shadow:0 28px 80px rgba(48,37,43,.28);padding:24px}
      .recipe-edit-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
      .recipe-edit-modal-head h3{font-family:Georgia,serif;font-size:28px;color:#493942;margin:0}
      .recipe-edit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .recipe-edit-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:18px}
      .recipe-edit-modal textarea{min-height:150px}
      @media(max-width:700px){
        #detailCard .detail-cover{aspect-ratio:3 / 2 !important}
        .recipe-edit-grid{grid-template-columns:1fr}
        .recipe-edit-overlay{padding:10px}
        .recipe-edit-modal{padding:18px;border-radius:20px}
      }
    `;
    document.head.appendChild(s);
  }

  function escAttr(v=''){
    return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function addEditButton(rid){
    const r=recipes.find(x=>x.id===rid);
    const body=document.querySelector('#detailCard .detail-body');
    if(!r || !body || body.querySelector('.edit-recipe-btn')) return;
    const h2=body.querySelector('h2');
    if(!h2) return;
    const row=document.createElement('div');
    row.className='recipe-heading-row';
    h2.parentNode.insertBefore(row,h2);
    row.appendChild(h2);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='btn btn-soft edit-recipe-btn';
    btn.textContent='✎ Edit Recipe';
    btn.onclick=()=>window.editSavedRecipe(rid);
    row.appendChild(btn);
  }

  window.editSavedRecipe=function(rid){
    ensureStyles();
    const r=recipes.find(x=>x.id===rid); if(!r) return;
    document.querySelector('.recipe-edit-overlay')?.remove();
    const overlay=document.createElement('div');
    overlay.className='recipe-edit-overlay';
    overlay.innerHTML=`
      <div class="recipe-edit-modal" role="dialog" aria-modal="true" aria-label="Edit recipe">
        <div class="recipe-edit-modal-head">
          <h3>Edit Recipe</h3>
          <button type="button" class="btn btn-soft" id="closeRecipeEdit">Close</button>
        </div>
        <div class="recipe-edit-grid">
          <div class="field"><label>Recipe name</label><input id="editRecipeTitle" value="${escAttr(r.title||'')}"></div>
          <div class="field"><label>Status</label><select id="editRecipeStatus">
            <option value="saved" ${r.status==='saved'?'selected':''}>Saved — haven't made it</option>
            <option value="tested" ${r.status==='tested'?'selected':''}>Tested & good</option>
            <option value="favorite" ${r.favorite||r.status==='favorite'?'selected':''}>Favorite</option>
          </select></div>
          <div class="field"><label>Prep time</label><input id="editRecipePrep" value="${escAttr(r.prepTime||'')}"></div>
          <div class="field"><label>Cook time</label><input id="editRecipeCook" value="${escAttr(r.cookTime||'')}"></div>
          <div class="field"><label>Total time</label><input id="editRecipeTotal" value="${escAttr(r.totalTime||'')}"></div>
          <div class="field"><label>Tags</label><input id="editRecipeTags" value="${escAttr((r.tags||[]).join(', '))}"></div>
        </div>
        <div class="field"><label>Ingredients</label><textarea id="editRecipeIngredients">${escapeHtml(r.ingredients||'')}</textarea></div>
        <div class="field"><label>Instructions</label><textarea id="editRecipeInstructions">${escapeHtml(r.instructions||'')}</textarea></div>
        <div class="field"><label>Notes</label><textarea id="editRecipeNotes">${escapeHtml(r.notes||'')}</textarea></div>
        <div class="field"><label>Source / URL</label><input id="editRecipeSource" value="${escAttr(r.source||'')}"></div>
        <div class="recipe-edit-actions">
          <button type="button" class="btn btn-soft" id="cancelRecipeEdit">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveRecipeEdit">Save Changes</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('#closeRecipeEdit').onclick=close;
    overlay.querySelector('#cancelRecipeEdit').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay) close()});
    overlay.querySelector('#saveRecipeEdit').onclick=()=>{
      const title=overlay.querySelector('#editRecipeTitle').value.trim();
      if(!title) return alert('Recipe name cannot be blank.');
      const status=overlay.querySelector('#editRecipeStatus').value;
      r.title=title;
      r.status=status==='favorite'?'saved':status;
      r.favorite=status==='favorite';
      r.prepTime=overlay.querySelector('#editRecipePrep').value.trim();
      r.cookTime=overlay.querySelector('#editRecipeCook').value.trim();
      r.totalTime=overlay.querySelector('#editRecipeTotal').value.trim();
      r.tags=overlay.querySelector('#editRecipeTags').value.split(',').map(x=>x.trim()).filter(Boolean);
      r.ingredients=overlay.querySelector('#editRecipeIngredients').value.trim();
      r.instructions=overlay.querySelector('#editRecipeInstructions').value.trim();
      r.notes=overlay.querySelector('#editRecipeNotes').value.trim();
      r.source=overlay.querySelector('#editRecipeSource').value.trim();
      const ok=save();
      if(ok===false) return;
      close();
      renderRecipes();
      window.openRecipe(rid);
    };
  };

  function install(){
    ensureStyles();
    if(typeof window.openRecipe!=='function' || window.openRecipe.__fullEditWrapped) return false;
    const original=window.openRecipe;
    const wrapped=function(rid){
      original(rid);
      setTimeout(()=>addEditButton(rid),0);
    };
    wrapped.__fullEditWrapped=true;
    window.openRecipe=wrapped;
    return true;
  }
  if(!install()){
    const timer=setInterval(()=>{if(install()) clearInterval(timer)},50);
    setTimeout(()=>clearInterval(timer),10000);
  }
})();
