(function(){
  function fixImportLayout(){
    const section=document.getElementById('import');
    const layout=section?.querySelector('.import-layout');
    const photo=document.getElementById('photoReview');
    const website=document.getElementById('websiteReview');
    if(!section || !layout) return;

    // Keep the review sections outside the two top panels so they can use the full content width.
    if(photo && photo.parentElement!==section){
      photo.classList.add('amy-full-review');
      section.appendChild(photo);
    }
    if(website && website.parentElement!==section){
      website.classList.add('amy-full-review');
      section.appendChild(website);
    }
  }

  const style=document.createElement('style');
  style.id='amy-import-layout-v3';
  style.textContent=`
    #import{width:100%;max-width:none}
    #import .import-layout{
      display:grid !important;
      grid-template-columns:1fr !important;
      width:100% !important;
      gap:20px !important;
    }
    #import .import-layout>.panel{
      width:100% !important;
      max-width:none !important;
      min-width:0 !important;
    }
    #import .queue-item{
      width:100% !important;
      min-width:0 !important;
      padding:14px 16px !important;
    }
    #import .queue-text{min-width:160px}
    #import .amy-full-review{
      width:100% !important;
      max-width:none !important;
      margin-top:20px !important;
      background:#fff;
      border:1px solid var(--line);
      border-radius:24px;
      padding:26px;
      box-shadow:var(--shadow);
    }
    #import .amy-full-review.active{display:block !important}
    #import .amy-full-review .review-grid{
      width:100% !important;
      grid-template-columns:minmax(360px,.8fr) minmax(0,1.2fr) !important;
      gap:30px !important;
    }
    #import .amy-full-review .field input,
    #import .amy-full-review .field textarea,
    #import .amy-full-review .field select{width:100% !important;max-width:none !important}
    #import .amy-full-review .review-image-wrap{min-height:420px}
    #import .amy-full-review .review-image-wrap img{max-height:720px}

    @media (min-width:1100px){
      .shell{max-width:none !important;width:100% !important;padding-left:30px !important;padding-right:30px !important}
      .layout{grid-template-columns:220px minmax(0,1fr) !important;gap:26px !important}
      main{width:100% !important;max-width:none !important}
      #import .panel{padding:28px !important}
      #import .import-options{grid-template-columns:repeat(4,minmax(0,1fr)) !important}
    }

    @media (max-width:1099px){
      #import .amy-full-review .review-grid{grid-template-columns:1fr !important}
    }

    @media (max-width:780px){
      #import .import-options{grid-template-columns:1fr !important}
      #import .amy-full-review{padding:18px !important;border-radius:20px !important}
      #import .queue-item{flex-wrap:wrap}
    }
  `;
  document.head.appendChild(style);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',fixImportLayout);
  }else{
    fixImportLayout();
  }

  // Re-run after dynamic review panels are created.
  const observer=new MutationObserver(()=>fixImportLayout());
  const importSection=document.getElementById('import');
  if(importSection) observer.observe(importSection,{childList:true,subtree:true});

  // Make sure clicking Review always relocates the photo review before showing it.
  const originalReviewPhoto=window.reviewPhoto;
  if(typeof originalReviewPhoto==='function'){
    window.reviewPhoto=function(qid){
      fixImportLayout();
      originalReviewPhoto(qid);
      fixImportLayout();
      const photo=document.getElementById('photoReview');
      if(photo){photo.classList.add('amy-full-review','active');photo.scrollIntoView({behavior:'smooth',block:'start'});}
    };
  }
})();
