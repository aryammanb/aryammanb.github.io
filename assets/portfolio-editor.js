(() => {
  'use strict';
  const {API,clean,isImageUrl}=window.PortfolioContent;
  const byId=id=>document.getElementById(id);
  let token=null,expiresAt=0,revision=0,loaded=false,dirty=false,saving=false,editor=null,draft=null,currentSlug='';
  let uploading=false,lastSelection=null,imagePosition=0;
  const status=message=>{byId('save-status').textContent=message;};
  const markDirty=()=>{dirty=true;status('Unsaved changes');};
  const pageUrl=slug=>!slug?'https://aryammanb.github.io/':['litho','sputter','fabricated'].includes(slug)?'https://aryammanb.github.io/'+slug+'/':'https://aryammanb.github.io/?page='+encodeURIComponent(slug);
  const currentPage=()=>currentSlug?draft.pages.find(page=>page.slug===currentSlug):draft;
  function stash(){if(!editor||!draft)return;const page=currentPage();page.title=byId('site-title').textContent.trim();page.html=editor.getSemanticHTML().replace(/&nbsp;|&#160;|\u00a0/g,' ');}
  function choices(){
    const select=byId('page-select');select.replaceChildren(new Option('Homepage',''));
    draft.pages.forEach(page=>select.add(new Option(page.title,page.slug)));select.value=currentSlug;
  }
  function showPage(slug){
    currentSlug=slug;const page=currentPage();byId('site-title').textContent=page.title;
    editor.clipboard.dangerouslyPasteHTML(clean(page.html),'silent');
    choices();byId('view-page').href=pageUrl(slug);
    lastSelection=null;byId('image-form').hidden=true;
  }
  async function api(action,options={}) {
    const response=await fetch(API+'/portfolio-'+action,{...options,cache:'no-store',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}});
    const data=await response.json();
    if(!response.ok){const error=new Error(data.error||'Please try again.');error.status=response.status;error.retry=response.headers.get('Retry-After');throw error;}
    return data;
  }
  function setDocument(doc) {
    draft=structuredClone(doc);draft.pages??=[];
    if(!editor){
      const Delta=Quill.import('delta');
      editor=new Quill('#body-editor',{theme:'bubble',formats:['bold','italic','underline','strike','link','list','indent','blockquote','code','header','script','image'],modules:{
        toolbar:{container:[[{header:[2,3,false]}],['bold','italic','underline','link','image'],[{list:'bullet'},{list:'ordered'}],['clean']],handlers:{image:openImageForm}},
        clipboard:{matchers:[['IMG',(node,delta)=>isImageUrl(node.getAttribute('src'))?delta:new Delta()]]},
        uploader:{mimetypes:['image/png','image/jpeg','image/webp','image/gif','image/avif'],handler(range,files){
          if(uploading||saving)return;openImageForm();imagePosition=range.index;
          const transfer=new DataTransfer();transfer.items.add(files[0]);byId('image-file').files=transfer.files;
          byId('image-status').textContent=files.length>1?'Insert one image at a time. The first image is selected.':'Image selected. Add a description if you like, then insert it.';
        }},
      }});
      editor.root.setAttribute('aria-label','Page content');
      editor.on('text-change',(_delta,_old,source)=>{if(source==='user')markDirty();});
      editor.on('selection-change',range=>{if(range)lastSelection=range;});
    }
    showPage('');
  }
  const documentValue=()=>{stash();return structuredClone(draft);};
  function lock(message='') {
    token=null;expiresAt=0;byId('unlock-panel').hidden=false;byId('editor-panel').hidden=true;
    byId('unlock-error').textContent=message;byId('pin').value='';byId('pin').focus();
  }
  byId('unlock-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=byId('unlock-button');button.disabled=true;byId('unlock-error').textContent='';
    try{
      const auth=await api('login',{method:'POST',body:JSON.stringify({pin:byId('pin').value})});
      token=auth.token;expiresAt=auth.expiresAt;byId('pin').value='';
      byId('editor-panel').hidden=false;
      if(!loaded){const latest=await api('content');revision=latest.revision;setDocument(latest.document);loaded=true;dirty=false;}
      byId('unlock-panel').hidden=true;status(dirty?'Unsaved changes':'Click text to edit. Select text to format or add a link.');
    }catch(error){token=null;byId('editor-panel').hidden=true;byId('unlock-error').textContent=error.message+(error.retry?' Wait about '+Math.ceil(Number(error.retry)/60)+' minutes.':'');}
    finally{button.disabled=false;}
  });
  byId('site-title').addEventListener('input',markDirty);
  byId('site-title').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();byId('site-title').blur();}});
  byId('page-select').addEventListener('change',event=>{stash();showPage(event.target.value);});
  function openImageForm(){
    if(saving||uploading)return;
    imagePosition=editor.getSelection()?.index??lastSelection?.index??Math.max(0,editor.getLength()-1);
    byId('image-form').hidden=false;byId('add-page-form').hidden=true;byId('image-status').textContent='';byId('image-file').focus();
  }
  byId('add-image').addEventListener('click',openImageForm);
  byId('cancel-image').addEventListener('click',()=>{byId('image-form').hidden=true;byId('image-file').value='';byId('image-alt').value='';});
  byId('image-form').addEventListener('submit',async event=>{
    event.preventDefault();if(uploading||saving)return;
    if(!token||Date.now()>=expiresAt){lock('Your session expired. Unlock again to upload the image.');return;}
    const file=byId('image-file').files[0];if(!file)return;
    if(file.size>5*1024*1024){byId('image-status').textContent='Choose an image smaller than 5 MB.';return;}
    const alt=byId('image-alt').value.trim();
    uploading=true;byId('image-status').textContent='Uploading…';
    const controls=['save-button','page-select','add-page','add-image','logout-button','insert-image','cancel-image','image-file','image-alt'];
    controls.forEach(id=>{byId(id).disabled=true;});editor.enable(false);
    try{
      const response=await fetch(API+'/portfolio-image',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream',Authorization:'Bearer '+token},body:file,signal:AbortSignal.timeout(60000)});
      const data=await response.json();if(!response.ok){const error=new Error(data.error||'Image upload failed. Please try again.');error.status=response.status;throw error;}
      editor.enable(true);let index=Math.min(imagePosition,Math.max(0,editor.getLength()-1));
      if(index>0&&editor.getText(index-1,1)!=='\n'){editor.insertText(index,'\n','user');index++;}
      editor.insertEmbed(index,'image',data.url,'user');
      const [image]=editor.getLeaf(index);if(image?.domNode?.tagName==='IMG')image.domNode.setAttribute('alt',alt);
      editor.update('user');editor.insertText(index+1,'\n','user');editor.setSelection(index+2,0,'silent');
      byId('image-form').hidden=true;byId('image-file').value='';byId('image-alt').value='';markDirty();status('Image added. Save changes to publish it.');
      requestAnimationFrame(()=>image?.domNode?.scrollIntoView({block:'nearest'}));
    }catch(error){byId('image-status').textContent=error.name==='TimeoutError'?'Upload timed out. Please try again.':error.message;if(error.status===401)lock('Your session expired. Unlock again to upload.');}
    finally{uploading=false;editor.enable(true);controls.forEach(id=>{byId(id).disabled=false;});}
  });
  byId('add-page').addEventListener('click',()=>{byId('add-page-form').hidden=false;byId('new-page-title').focus();});
  byId('cancel-page').addEventListener('click',()=>{byId('add-page-form').hidden=true;byId('new-page-title').value='';});
  byId('add-page-form').addEventListener('submit',event=>{
    event.preventDefault();const title=byId('new-page-title').value.trim();if(!title)return;
    if(draft.pages.length>=30){status('The editor supports up to 30 pages.');return;}
    stash();let base=title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50).replace(/-$/,'')||'page';
    if(['edit','assets','api','index','404'].includes(base))base+='-page';
    let slug=base,suffix=2;while(draft.pages.some(page=>page.slug===slug))slug=base+'-'+suffix++;
    draft.pages.push({slug,title,html:'<p><br></p>'});
    const template=document.createElement('template');template.innerHTML=clean(draft.html);
    let heading=[...template.content.querySelectorAll('h2')].find(node=>node.textContent.trim()==='Pages');
    if(!heading){heading=document.createElement('h2');heading.textContent='Pages';template.content.append(heading);}
    let list=heading.nextElementSibling;if(!list||list.tagName!=='UL'){list=document.createElement('ul');heading.after(list);}
    const item=document.createElement('li');const link=document.createElement('a');link.href=pageUrl(slug);link.textContent=title;item.append(link);list.append(item);draft.html=template.innerHTML;
    byId('add-page-form').hidden=true;byId('new-page-title').value='';showPage(slug);markDirty();
  });
  byId('save-button').addEventListener('click',async()=>{
    if(saving||uploading)return;
    if(!token||Date.now()>=expiresAt){lock('Your session expired. Unlock again; your unsaved edits stay in this tab.');return;}
    if(!byId('site-title').textContent.trim()){status('Please enter a page title.');return;}
    saving=true;byId('save-button').disabled=true;status('Saving…');const snapshot=documentValue();
    try{
      const saved=await api('content',{method:'PUT',body:JSON.stringify({document:snapshot,revision})});revision=saved.revision;
      dirty=JSON.stringify(documentValue())!==JSON.stringify(snapshot);
      status(dirty?'Saved. You have more unsaved changes.':'Saved — your changes are live on aryammanb.github.io.');
    }catch(error){status(error.message);if(error.status===401)lock(error.message+' Your unsaved changes stay in this tab.');}
    finally{saving=false;byId('save-button').disabled=false;}
  });
  byId('logout-button').addEventListener('click',async()=>{
    if(dirty&&!confirm('Lock the editor? Your unsaved changes will stay in this tab.'))return;
    try{await api('logout',{method:'POST'});}catch{}
    lock();
  });
  addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();if(token)byId('save-button').click();}});
})();
