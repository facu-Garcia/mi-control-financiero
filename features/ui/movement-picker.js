/* Selectores táctiles de movimiento y categoría: mejora progresiva, el select nativo guarda el valor. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinanceMovementPicker=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const types={
    expense:{icon:'↗',hint:'Compra o salida de dinero',tone:'expense'},
    income:{icon:'↙',hint:'Dinero que realmente recibiste',tone:'income'},
    transfer:{icon:'⇄',hint:'Mover dinero entre mis cuentas',tone:'transfer'},
    payment:{icon:'✓',hint:'Registrar abono a tarjeta',tone:'payment'},
    yield:{icon:'✧',hint:'Rendimiento recibido',tone:'yield'}
  };
  const categories={
    'Comida':{icon:'🍽️',hint:'Comidas, café y restaurantes'},
    'Supermercado':{icon:'🛒',hint:'Despensa y artículos del hogar'},
    'Transporte':{icon:'🚇',hint:'Pasajes, gasolina y movilidad'},
    'Vivienda':{icon:'🏠',hint:'Renta y mantenimiento'},
    'Servicios':{icon:'⚡',hint:'Agua, luz, telefonía e internet'},
    'Entretenimiento':{icon:'🎬',hint:'Diversión y actividades'},
    'Salud':{icon:'✚',hint:'Consultas, farmacia y cuidado'},
    'Compras':{icon:'🛍️',hint:'Ropa, artículos y accesorios'},
    'Suscripciones':{icon:'↻',hint:'Servicios y membresías periódicas'},
    'Educación':{icon:'📚',hint:'Cursos, libros y formación'},
    'Otros':{icon:'◈',hint:'Gastos sin otra categoría'}
  };
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  function meta(kind,value){return (kind==='type'?types:categories)[value]||{icon:'◈',hint:'Seleccionar opción',tone:'other'};}
  function selectedMarkup(select,kind){
    const option=Array.from(select.options).find(o=>o.value===select.value);
    const data=meta(kind,select.value);
    return '<span class="mp-trigger-icon mp-tone-'+escape(data.tone||'category')+'" aria-hidden="true">'+escape(data.icon)+'</span>'+
      '<span class="mp-trigger-text"><b>'+escape(option?.textContent||'Elegir')+'</b><small>'+escape(data.hint)+'</small></span>'+
      '<span class="mp-chevron" aria-hidden="true">⌄</span>';
  }
  function optionMarkup(option,kind,selected){
    const data=meta(kind,option.value);
    const active=selected===option.value;
    return '<button type="button" class="mp-option'+(active?' is-selected':'')+'" data-value="'+escape(option.value)+'" aria-pressed="'+active+'">'+
      '<span class="mp-choice-icon mp-tone-'+escape(data.tone||'category')+'" aria-hidden="true">'+escape(data.icon)+'</span>'+
      '<span class="mp-choice-copy"><b>'+escape(option.textContent)+'</b><small>'+escape(data.hint)+'</small></span>'+
      '<span class="mp-choice-check" aria-hidden="true">'+(active?'✓':'')+'</span></button>';
  }
  function open(select,trigger,kind){
    if(typeof document==='undefined')return;
    const options=Array.from(select.options).filter(o=>!o.disabled&&o.value);
    if(!options.length)return;
    const dialog=document.createElement('dialog');
    dialog.className='mp-dialog';
    const title=kind==='type'?'¿Qué movimiento vas a registrar?':'¿En qué categoría fue el gasto?';
    dialog.setAttribute('aria-label',title);
    dialog.innerHTML='<div class="mp-sheet"><div class="mp-sheet-head"><div><small>MI CONTROL FINANCIERO</small><h2>'+escape(title)+'</h2></div>'+
      '<button type="button" class="mp-dismiss" aria-label="Cerrar selector">×</button></div>'+
      '<div class="mp-options" role="group" aria-label="'+escape(kind==='type'?'Tipos de movimiento':'Categorías de gasto')+'">'+
      options.map(o=>optionMarkup(o,kind,select.value)).join('')+'</div>'+
      '<p class="mp-footnote">Selecciona una opción para continuar.</p></div>';
    const list=dialog.querySelector('.mp-options');
    const close=()=>{if(dialog.open)dialog.close();};
    dialog.querySelector('.mp-dismiss').addEventListener('click',close);
    dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
    dialog.addEventListener('close',()=>{dialog.remove();if(trigger.isConnected)trigger.focus({preventScroll:true});});
    dialog.addEventListener('keydown',event=>{
      if(!['ArrowUp','ArrowDown'].includes(event.key))return;
      const buttons=Array.from(list.querySelectorAll('.mp-option'));
      const i=buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();
    });
    list.addEventListener('click',event=>{
      const choice=event.target.closest('.mp-option');
      if(!choice||!options.some(o=>o.value===choice.dataset.value))return;
      select.value=choice.dataset.value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      close();
    });
    document.body.appendChild(dialog);
    try{dialog.showModal();(list.querySelector('.is-selected')||list.querySelector('.mp-option'))?.focus();}
    catch(e){dialog.remove();throw e;}
  }
  function enhance(form){
    if(typeof document==='undefined'||!form)return;
    for(const [id,kind] of [['m-type','type'],['m-cat','category']]){
      const select=form.querySelector('#'+id);
      if(!select)continue;
      let trigger=select.nextElementSibling;
      if(!trigger?.classList.contains('mp-trigger')){
        trigger=document.createElement('button');
        trigger.type='button';
        trigger.className='mp-trigger';
        trigger.setAttribute('aria-haspopup','dialog');
        trigger.setAttribute('aria-label',kind==='type'?'Elegir tipo de movimiento':'Elegir categoría del gasto');
        select.insertAdjacentElement('afterend',trigger);
        select.classList.add('mp-native');
        trigger.addEventListener('click',()=>open(select,trigger,kind));
        select.addEventListener('change',()=>{trigger.innerHTML=selectedMarkup(select,kind);});
      }
      trigger.innerHTML=selectedMarkup(select,kind);
    }
  }
  return {enhance,optionMarkup,selectedMarkup,meta};
});