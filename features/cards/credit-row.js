/* Single compact credit account row for Home and Accounts. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinanceCreditRow=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 function render(card,ctx){
  const {B,F,cycles,movements,today,esc:E,money:M,bankIcon}=ctx;
  const debt=F.accountBalance(card,movements);
  const current=B.currentPayable(card,cycles,movements,today);
  const cycle=current?.cycle,cut=B.upcomingCut(card,cycles,today);
  const amount=cycle?.amountDue===null||cycle?.amountDue===undefined?null:current.remaining;
  const due=cycle?.dueDate||'';
  const message=amount===null?'Pago del corte por indicar':amount===0?'Corte pagado':(current.label==='Pago parcial'?'Pago parcial pendiente':'Pago del corte');
  return `<div class="credit-compact"><div class="credit-compact-head">
     ${bankIcon(card)}<div class="credit-compact-name"><b>${E(card.name)}</b><small>Deuda total estimada</small></div>
     <strong>${M(debt)}</strong></div>
     <div class="credit-compact-foot"><div><small>${E(message)}</small><b>${amount===null?'Sin monto confirmado':M(amount)}</b></div>
     <div><small>Fecha límite</small><b>${E(due||'Por confirmar')}</b></div>
     <div><small>Próximo corte</small><b>${E(cut?.date||'Por configurar')}</b></div></div>
     <div class="credit-compact-actions"><button type="button" class="secondary small" data-action="account-detail" data-id="${E(card.id)}">Ver detalle</button>
      <button type="button" class="primary small" data-action="pay-card" data-id="${E(card.id)}">Registrar pago</button></div>
    </div>`;
 }
 return {render};
});