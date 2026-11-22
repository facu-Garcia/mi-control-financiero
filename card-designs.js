/* Card view component: brand-specific appearance lives in cards/banks/*.css.
 * No real card number, CVV or bank credentials are rendered or stored. */
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
  function isCard(account){return !!account&&['debit','credit'].includes(account.type);}
  function render(account){
    if(!isCard(account))return '';
    const bank=institution(account.institution||account.name),style=styleOf(account.cardStyle);
    const credit=account.type==='credit',name=String(account.name||'Mi tarjeta').slice(0,70);
    const custom=safePicture(account.cardImage),kind=credit?'CRÉDITO':'DÉBITO',mark=titleFor(bank,account);
    const scheme=bank==='mercado-pago'?(credit?'visa':'mastercard'):
      bank==='nu'||bank==='revolut'?'mastercard':
      bank==='bbva'||bank==='inbursa'?'visa':'generic';
    const brandIcon=bank==='inbursa'?'<span class="fc-brand-icon fc-brand-icon--inbursa"><i></i><i></i><i></i><i></i></span>':
      bank==='mercado-pago'?'<span class="fc-brand-icon fc-brand-icon--mp"><i></i><i></i></span>':'';
    const network=scheme==='mastercard'?'<span class="fc-network fc-network--mc" aria-hidden="true"><i></i><i></i></span>':
      scheme==='visa'?'<span class="fc-network fc-network--visa" aria-hidden="true">VISA</span>':
      '<span class="fc-network fc-network--generic" aria-hidden="true"></span>';
    return `<div class="finance-card finance-card--${bank} finance-card--${style} finance-card--${credit?'credit':'debit'} ${custom?'finance-card--photo':''}" role="img" aria-label="${esc(name)}, ${kind}">
      ${custom?`<img class="fc-photo" src="${custom}" alt="" loading="lazy">`:''}
      <span class="fc-art" aria-hidden="true">
        <span class="fc-art__mp-word">MER<br>CA<br>DO<br>PAGO</span>
        <span class="fc-art__bbva-a"></span>
        <span class="fc-art__inbursa-arc"></span>
      </span>
      <span class="fc-brand" aria-hidden="true">${brandIcon}<span class="fc-brand-name">${esc(mark)}</span></span>
      <span class="fc-chip" aria-hidden="true"><i></i><b></b></span>
      <span class="fc-contactless" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="fc-type">${kind}</span>${network}
      <span class="fc-card-label" aria-hidden="true">${esc(name)}</span>
    </div>`;
  }
  function selector(value='auto'){
    return `<div class="field"><label for="f-cardStyle">Apariencia de tarjeta</label><select id="f-cardStyle" name="cardStyle">${STYLES.map(v=>`<option value="${v}" ${styleOf(value)===v?'selected':''}>${LABELS[v]}</option>`).join('')}</select><small>Los diseños viven en CSS independiente por banco; también puedes subir una imagen.</small></div>`;
  }
  return {STYLES,LABELS,styleOf,institution,titleFor,render,selector,safePicture,isCard,esc};
});