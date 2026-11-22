/* Presentational card domain: bank identity, CSS themes, safe HTML. No real PAN/CVV. */
(function(root,factory){
  const m=factory();
  if(typeof module==='object'&&module.exports)module.exports=m;
  else root.FinanceCards=m;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const STYLES=['auto','classic','dark','gradient','light'];
  const LABELS={auto:'Diseño del banco',classic:'Clásico',dark:'Oscuro',gradient:'Degradado',light:'Claro'};
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function safePicture(v){return typeof v==='string'&&v.length<=260000&&/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(v)?v:'';}
  function institution(raw){
    const s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(s.includes('mercado pago'))return 'mercado-pago';
    if(s==='nu'||s==='nub'||s.includes('nubank'))return 'nu';
    if(s.includes('inbursa'))return 'inbursa';
    if(s.includes('bbva'))return 'bbva';
    if(s.includes('revolut'))return 'revolut';
    if(s.includes('bdesa'))return 'bdesa';
    return 'general';
  }
  function titleFor(key,account){
    return ({'mercado-pago':'mercado pago',nu:'nu',inbursa:'INBURSA',bbva:'BBVA',revolut:'Revolut',bdesa:'BDESA',general:String(account?.institution||'MI TARJETA').slice(0,22).toUpperCase()})[key];
  }
  function styleOf(value){return STYLES.includes(value)?value:'auto';}
  function isCard(account){return account&&['debit','credit'].includes(account.type);}
  function render(account){
    if(!isCard(account))return '';
    const key=institution(account.institution||account.name);
    const style=styleOf(account.cardStyle);
    const credit=account.type==='credit';
    const custom=safePicture(account.cardImage);
    const typeLabel=credit?'CRÉDITO':'DÉBITO';
    const name=String(account.name||'Mi tarjeta').slice(0,70);
    const mark=titleFor(key,account);
    return `<div class="finance-card finance-card--${key} finance-card--${style} ${credit?'finance-card--credit':'finance-card--debit'} ${custom?'finance-card--photo':''}" aria-label="${esc(name)} · ${typeLabel}">
      ${custom?`<img class="finance-card__photo" src="${custom}" alt="" loading="lazy">`:''}
      <span class="finance-card__pattern" aria-hidden="true"></span>
      <span class="finance-card__top"><span class="finance-card__brand">${esc(mark)}</span><span class="finance-card__kind">${typeLabel}</span></span>
      <span class="finance-card__middle" aria-hidden="true"><span class="finance-card__chip"><i></i></span><span class="finance-card__nfc">)))</span></span>
      <span class="finance-card__bottom"><span class="finance-card__name">${esc(name)}</span><span class="finance-card__network">◉◉</span></span>
    </div>`;
  }
  function selector(value='auto'){
    return `<div class="field"><label for="f-cardStyle">Apariencia de tarjeta</label><select id="f-cardStyle" name="cardStyle">${STYLES.map(v=>`<option value="${v}" ${styleOf(value)===v?'selected':''}>${LABELS[v]}</option>`).join('')}</select><small>Diseños ilustrativos en CSS; puedes modificarlos sin cambiar tus saldos.</small></div>`;
  }
  return {STYLES,LABELS,styleOf,institution,titleFor,render,selector,safePicture,isCard,esc};
});
