/* Reusable mobile account picker, progressive enhancement over native <select>.
 * Keeps original select as source of truth for forms, filters, and change events.
 * No financial amounts or sensitive account details are sent anywhere.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinanceAccountPicker=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const accountFields=new Set(['accountId','toAccountId']);
 function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}
 function typeLabel(account){return ({debit:'Débito',credit:'Crédito',saving:'Ahorro',pocket:'Cajita',cash:'Efectivo'})[account?.type]||'Cuenta';}
 function accountOf(value,accounts){return (accounts||[]).find(a=>a.id===value);}
 function thumbnail(account){
   if(!account)return '<span class="ap-neutral-icon" aria-hidden="true">▦</span>';
   const cards=typeof window!=='undefined'?window.FinanceCards:null;
   if(cards?.isCard?.(account))return `<span class="ap-card-mini">${cards.render(account)}</span>`;
   const symbol=account.type==='pocket'?'◇':account.type==='saving'?'▱':'▣';
   return `<span class="ap-neutral-icon" aria-hidden="true">${symbol}</span>`;
 }
 function optionMarkup(option,accounts,selected){
   const account=accountOf(option.value,accounts);
   const name=account?.name||option.label||'Todas las cuentas';
   const secondary=account
     ?[account.institution||'',typeLabel(account)].filter(Boolean).join(' · ')
     :option.value==='all'?'Resumen de todas tus cuentas':'Opción de selección';
   return `<button type="button" class="ap-choice ${option.value===selected?'is-selected':''}" data-value="${esc(option.value)}" aria-pressed="${option.value===selected}">
       ${thumbnail(account)}<span class="ap-choice-copy"><b>${esc(name)}</b><small>${esc(secondary)}</small></span>
       <span class="ap-check" aria-hidden="true">${option.value===selected?'✓':''}</span>
     </button>`;
 }
 function selectedLabel(select,accounts){
   const choice=Array.from(select.options).find(o=>o.value===select.value);
   const account=accountOf(select.value,accounts);
   const name=account?.name||choice?.label||'Seleccionar cuenta';
   return `<span class="ap-trigger-content">${thumbnail(account)}<span class="ap-choice-copy"><b>${esc(name)}</b><small>${account?esc(typeLabel(account)):esc(select.value==='all'?'Todas las cuentas':'Seleccionar')}</small></span></span><span class="ap-chevron" aria-hidden="true">⌄</span>`;
 }
 function enhance(root,accounts){
   if(typeof document==='undefined'||!root)return;
   for(const select of root.querySelectorAll('select')){
     if(!accountFields.has(select.name)&&select.id!=='insight-account')continue;
     const parent=select.parentElement;
     if(!parent||select.disabled)continue;
     let trigger=select.nextElementSibling;
     if(!trigger?.classList.contains('ap-trigger')){
       trigger=document.createElement('button');
       trigger.type='button';trigger.className='ap-trigger';
       const label=parent.querySelector('label')?.textContent||'Elegir cuenta o tarjeta';
       trigger.setAttribute('aria-label',label);
       trigger.setAttribute('aria-haspopup','dialog');
       select.insertAdjacentElement('afterend',trigger);
       select.classList.add('ap-native');
       trigger.addEventListener('click',()=>show(select,trigger,accounts));
       select.addEventListener('change',()=>{trigger.innerHTML=selectedLabel(select,accounts);});
     }
     trigger.innerHTML=selectedLabel(select,accounts);
     trigger.disabled=select.disabled||!select.options.length;
   }
 }
 function show(select,trigger,accounts){
   if(typeof document==='undefined')return;
   const optionList=Array.from(select.options).filter(o=>!o.disabled&&o.value!=='');
   if(!optionList.length)return;
   const label=trigger.getAttribute('aria-label')||'Elige una cuenta';
   const dlg=document.createElement('dialog');
   dlg.className='ap-dialog';
   dlg.setAttribute('aria-label',label);
   dlg.innerHTML=`<div class="ap-shell"><div class="ap-head"><div><small>MI CONTROL FINANCIERO</small><h2>${esc(label)}</h2></div><button type="button" class="ap-close" aria-label="Cerrar">×</button></div>
     <div class="ap-search-wrap"><span aria-hidden="true">⌕</span><input class="ap-search" type="search" placeholder="Buscar por banco o nombre" aria-label="Buscar una cuenta"></div>
     <div class="ap-options" role="group" aria-label="Cuentas disponibles"></div>
     <p class="ap-footer">Tus cuentas se muestran solo en este dispositivo. Selecciona para continuar.</p></div>`;
   const holder=dlg.querySelector('.ap-options'),search=dlg.querySelector('.ap-search');
   function draw(){
     const q=search.value.trim().toLocaleLowerCase('es');
     const matching=optionList.filter(o=>{
       const a=accountOf(o.value,accounts);
       return [o.label,a?.name,a?.institution,typeLabel(a)].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(q);
     });
     holder.innerHTML=matching.length?matching.map(o=>optionMarkup(o,accounts,select.value)).join(''):
       '<p class="ap-empty">No se encontraron tarjetas o cuentas.</p>';
   }
   function finish(){if(dlg.open)dlg.close();}
   dlg.querySelector('.ap-close').addEventListener('click',finish);
   dlg.addEventListener('click',e=>{if(e.target===dlg)finish();});
   dlg.addEventListener('close',()=>{dlg.remove();if(trigger.isConnected)trigger.focus({preventScroll:true});});
   dlg.addEventListener('keydown',e=>{
     if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
     const buttons=Array.from(holder.querySelectorAll('.ap-choice'));
     if(!buttons.length)return;
     e.preventDefault();
     const i=buttons.indexOf(document.activeElement);
     const next=(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
     buttons[next].focus();
   });
   holder.addEventListener('click',e=>{
     const target=e.target.closest('.ap-choice');if(!target)return;
     const next=target.dataset.value;
     if(!optionList.some(o=>o.value===next))return;
     select.value=next;
     select.dispatchEvent(new Event('change',{bubbles:true}));
     if(trigger.isConnected)trigger.innerHTML=selectedLabel(select,accounts);
     finish();
   });
   search.addEventListener('input',draw);
   draw();
   document.body.appendChild(dlg);
   try{dlg.showModal();search.focus();}catch(e){dlg.remove();throw e;}
 }
 return {enhance,optionMarkup,selectedLabel,typeLabel,accountOf};
});