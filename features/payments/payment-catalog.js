/* Catálogo visual seguro. Plantillas informativas: no generan cargos ni importes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinancePaymentCatalog=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const templates=Object.freeze([
    {id:'netflix',name:'Netflix',kind:'subscription',serviceType:'Video y series',category:'Suscripciones',iconId:'netflix'},
    {id:'spotify',name:'Spotify',kind:'subscription',serviceType:'Música',category:'Suscripciones',iconId:'spotify'},
    {id:'disney',name:'Disney+',kind:'subscription',serviceType:'Video y entretenimiento',category:'Suscripciones',iconId:'disney'},
    {id:'metro',name:'Metro',kind:'frequent',serviceType:'Transporte',category:'Transporte',iconId:'metro'},
    {id:'metrobus',name:'Metrobús',kind:'frequent',serviceType:'Transporte',category:'Transporte',iconId:'metrobus'},
    {id:'suburbano',name:'Suburbano',kind:'frequent',serviceType:'Transporte',category:'Transporte',iconId:'suburbano'}
  ]);
  const icons=Object.freeze({
    netflix:{bg:'#211319',color:'#e50914',label:'N',src:'./assets/payments/netflix.svg'},
    spotify:{bg:'#153324',color:'#1ed760',label:'S',src:'./assets/payments/spotify.svg'},
    disney:{bg:'#102957',color:'#fff',label:'D+',src:'./assets/payments/disney.svg'},
    metro:{bg:'#cb531a',color:'#fff',label:'M',src:'./assets/payments/metro.svg'},
    metrobus:{bg:'#a02a41',color:'#fff',label:'MB',src:'./assets/payments/metrobus.svg'},
    suburbano:{bg:'#16457b',color:'#fff',label:'S',src:'./assets/payments/suburbano.svg'},
    bus:{bg:'#1e4857',color:'#fff',label:'🚌'},
    train:{bg:'#213b67',color:'#fff',label:'🚆'},
    food:{bg:'#4c3232',color:'#fff',label:'🍽'},
    coffee:{bg:'#523b31',color:'#fff',label:'☕'},
    movie:{bg:'#3c274f',color:'#fff',label:'🎬'},
    music:{bg:'#263b50',color:'#fff',label:'♫'},
    gym:{bg:'#35452c',color:'#fff',label:'🏋'},
    home:{bg:'#334458',color:'#fff',label:'⌂'},
    book:{bg:'#473b51',color:'#fff',label:'▤'},
    card:{bg:'#26455b',color:'#fff',label:'▣'}
  });
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  function inferIcon(rule){
    if(rule?.iconId&&Object.hasOwn(icons,rule.iconId))return rule.iconId;
    const value=normalize(rule?.name);
    return templates.find(x=>normalize(x.name)===value)?.iconId || (rule?.kind==='frequent'?'bus':'card');
  }
  function kind(rule){
    if(rule?.kind==='frequent'||rule?.frequency==='on-demand')return 'frequent';
    if(rule?.kind==='subscription')return 'subscription';
    if(rule?.kind==='scheduled')return 'scheduled';
    if(rule?.category==='Suscripciones'||templates.some(x=>x.kind==='subscription'&&normalize(x.name)===normalize(rule?.name)))return 'subscription';
    return 'scheduled';
  }
  function suggested(list,tab){
    const existing=new Set((list||[]).filter(r=>kind(r)===tab).map(r=>normalize(r.name)));
    return templates.filter(t=>t.kind===tab&&!existing.has(normalize(t.name)));
  }
  function safeImage(s){
    return typeof s==='string'&&s.length<=140000&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(s);
  }
  function iconMarkup(iconId,imageData,name,esc){
    const id=Object.hasOwn(icons,iconId)?iconId:'card',info=icons[id];
    if(safeImage(imageData))return '<span class="pay-logo pay-logo-custom"><img src="'+esc(imageData)+'" alt="" loading="lazy"></span>';
    return '<span class="pay-logo" style="--logo-bg:'+info.bg+';--logo-color:'+info.color+'">'+
      (info.src?'<img src="'+info.src+'" alt="" loading="lazy">':'<span>'+esc(info.label)+'</span>')+'</span>';
  }
  return {templates,icons,normalize,inferIcon,kind,suggested,safeImage,iconMarkup};
});
