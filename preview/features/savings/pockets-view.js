/* Savings dialogs and subaccount detail, pure markup. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinancePocketsViews=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 function form(account,record,available,money,esc){
  return `<form id="pocket-form" class="form"><p class="help">La cajita estará dentro de <b>${esc(account.name)}</b>. No será una cuenta bancaria adicional.</p>
    <div class="field"><label>Nombre de cajita</label><input name="name" maxlength="80" required value="${esc(record?.name||'')}" placeholder="Mi ahorro, emergencias, vacaciones"></div>
    <div class="field"><label>Dinero que deseas reservar ahora ($)</label><input name="openingBalance" type="number" min="0" step=".01" required value="${money(record?.openingBalance||0)}" ${record?'readonly':''}>
    <small>Disponible sin asignar: ${money(available)}. Este importe ya está incluido en el saldo de ${esc(account.name)}; no genera un ingreso.</small></div>
    <button class="primary full" type="submit">Guardar cajita</button></form>`;
 }
 function moveForm(account,pockets,move,P,esc,money){
  const opts=[{id:'',name:'Saldo disponible en la cuenta'},...pockets.map(p=>({id:p.id,name:p.name}))];
  const choices=selected=>opts.map(o=>`<option value="${esc(o.id)}" ${o.id===selected?'selected':''}>${esc(o.name)}</option>`).join('');
  return `<form id="pocket-move-form" class="form">
    <p class="help">Traslada dinero dentro de ${esc(account.name)}. La cuenta conserva el mismo saldo total.</p>
    <div class="field"><label>Desde</label><select name="fromPocketId">${choices(move?.fromPocketId||'')}</select></div>
    <div class="field"><label>Hacia</label><select name="toPocketId">${choices(move?.toPocketId||pockets[0]?.id||'')}</select></div>
    <div class="field"><label>Importe ($)</label><input name="amount" type="number" min=".01" step=".01" required></div>
    <button class="primary full" type="submit">Mover dinero</button></form>`;
 }
 function pocketDetail(account,pocket,P,moves,movements,money,esc){
  const balance=P.balance(pocket,moves,movements);
  const related=moves.filter(m=>m.fromPocketId===pocket.id||m.toPocketId===pocket.id).sort((a,b)=>b.date.localeCompare(a.date));
  return `<div class="page-head"><div><div class="eyebrow">${esc(account.name)} · Cajita</div><h1>${esc(pocket.name)}</h1></div></div>
   <div class="toolbar"><button class="secondary small" data-action="account-detail" data-id="${esc(account.id)}">← Volver a la cuenta</button></div>
   <div class="account-page-main"><div class="account-balance-label">Dinero reservado</div>
    <strong class="account-balance-number">${money(balance)}</strong><p class="help">Parte del saldo de ${esc(account.name)}; no se contabiliza como otro banco.</p></div>
   <div class="account-page-actions"><button class="primary" data-action="move-pocket" data-id="${esc(account.id)}" data-pocket="${esc(pocket.id)}">Apartar dinero</button>
     <button class="secondary" data-action="release-pocket" data-id="${esc(pocket.id)}">Retirar de la cajita</button>
     <button class="secondary" data-action="pocket-yield" data-id="${esc(pocket.id)}">Registrar rendimiento</button></div>
   <div class="section-title"><h2>Historial de movimientos internos</h2></div><div class="panel">
   ${related.length?related.map(m=>`<div class="report-line"><span>${esc(m.toPocketId===pocket.id?'Dinero apartado':'Dinero retirado')}<small class="help">${esc(m.date)}</small></span>
   <b>${m.toPocketId===pocket.id?'+':'−'}${money(m.amount)}</b></div>`).join(''):'<p class="help">Todavía no hay movimientos internos.</p>'}</div>`;
 }
 return {form,moveForm,pocketDetail};
});