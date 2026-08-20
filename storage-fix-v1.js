// Storage fix: free removed queue photos before writing recipes and report quota failures.
(function(){
  const RECIPE_KEY_FIXED='amysRecipeVault_recipes_v1';
  const QUEUE_KEY_FIXED='amysRecipeVault_queue_v1';

  window.save=function(){
    let queueSaved=false;
    let recipesSaved=false;
    try{
      // IMPORTANT: queue first. When a reviewed photo is saved, this removes the
      // large queued image from localStorage before the same image is stored in recipes.
      localStorage.setItem(QUEUE_KEY_FIXED,JSON.stringify(queue));
      queueSaved=true;
      localStorage.setItem(RECIPE_KEY_FIXED,JSON.stringify(recipes));
      recipesSaved=true;
    }catch(err){
      console.error('Amy Recipe Vault save failed',err);
      // A failed recipe write must never leave an old reviewed item stuck in the queue.
      if(!queueSaved){
        try{localStorage.setItem(QUEUE_KEY_FIXED,JSON.stringify(queue));queueSaved=true}catch(e){}
      }
      if(!recipesSaved){
        const msg='This recipe could not be saved because the browser storage is full. The app will reduce large photos before saving. Please try the save again.';
        setTimeout(()=>alert(msg),0);
      }
    }
    try{updateStats()}catch(e){}
    return queueSaved&&recipesSaved;
  };

  // On load, make sure current in-memory state reflects whatever was persisted.
  window.__amyStorageFixLoaded=true;
})();
