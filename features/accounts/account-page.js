/* Full-page account presentation; no persistence or DOM handlers. */
(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.FinanceAccountPage=v;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 function render(a,opts){
  const {F,B,P,accounts,tx,movements,cycles,legacy,pockets,pocketMoves,today,month,esc:E,money:M,
      cardRender,txRender}=opts;
  const credit=a.type==='credit',bal=F.accountBalance(a,movements),related=movements.filter(m=>m.accountId===a.id||m.toAccountId===a.id);
  const header=`<div class="account-page-head"><button type="button" class="secondary small" data-action="back-accounts">← Cuentas</button>
    <button type="button" class="secondary small" data-action="edit-account" data-id="${E(a.id)}">Editar cuenta</button></div>
    <div class="account-page-name"><div class="eyebrow">${credit?'Tarjeta de crédito':'Cuenta y ahorros'}</div>
    <h1>${E(a.name)}</h1><p>${E(a.institution||'Control financiero')}</p></div>
    ${cardRender(a)?`<div class="account-page-card">${cardRender(a)}</div>`:''}`;
  const movementsPart=`<section class="account-page-section"><div class="section-title"><h2>Movimientos</h2></div>
    <div class="panel">${txRender(related.sort((x,y)=>y.date.localeCompare(x.date)).slice(0,15))}</div></section>`;
  if(credit){
    const relevant=(cycles||[]).filter(c=>c.accountId===a.id);
    const current=B.currentPayable(a,relevant,movements,today);
    const active= current?.cycle||null;
    const next=B.upcomingCut(a,relevant,today);
    const status=active?B.cycleStatus(a,active,relevant,movements,today):null;
    const obligation=active?.amountDue!==null&&active?.amountDue!==undefined?status?.remaining:null;
    return header+`<section class="account-page-main"><div class="account-balance-label">Deuda total estimada</div>
      <strong class="account-balance-number">${M(bal)}</strong><div class="help">Incluye deuda que todavía no corresponde pagar en el corte actual</div>
      <div class="account-metrics">
        <div><small>Límite de crédito</small><b>${a.creditLimit?M(a.creditLimit):'No definido'}</b></div>
        <div><small>Crédito disponible estimado</small><b>${a.creditLimit?M(a.creditLimit-bal):'No definido'}</b></div>
      </div></section>
      <section class="account-page-section"><h2>Pago y próximo corte</h2>
      <div class="panel">
        <div class="report-line"><span>Pago del corte ${active?E(active.month):''}</span>
        <b>${obligation===null?'Por registrar':M(obligation)}</b></div>
        <div class="report-line"><span>Fecha límite</span><b>${E(active?.dueDate||'No confirmada')}</b></div>
        <div class="report-line"><span>Estado</span><b>${E(status?.label||'Sin corte confirmado')}</b></div>
        <div class="report-line"><span>Próximo corte ${next?.official?'confirmado':'estimado'}</span><b>${E(next?.date||'Sin configurar')}</b></div>
        <div class="account-page-actions"><button class="primary" data-action="pay-card" data-id="${E(a.id)}">Pagar tarjeta</button>
         <button class="secondary" data-action="billing-detail" data-id="${E(a.id)}">Administrar cortes y MSI</button></div>
        <small class="help">La deuda inicial se asigna al primer mes registrado sin crear otro cargo. Puedes corregir las fechas y el importe en Cortes y MSI.</small>
      </div></section>
      <div class="account-page-actions"><button class="secondary" data-action="account-move" data-id="${E(a.id)}">Registrar compra</button>
      <button class="secondary" data-action="reconcile" data-id="${E(a.id)}">Conciliar saldo</button></div>`+movementsPart;
  }
  const all=(pockets||[]).filter(p=>p.parentAccountId===a.id),saved=P.allocated(a.id,pockets,pocketMoves,movements);
  const available=bal-saved;
  return header+`<section class="account-page-main"><div class="account-balance-label">Saldo total en la cuenta</div>
    <strong class="account-balance-number">${M(bal)}</strong>
    <div class="account-metrics"><div><small>Disponible para utilizar</small><b>${M(available)}</b></div>
    <div><small>Reservado en cajitas</small><b>${M(saved)}</b></div></div></section>
    <section class="account-page-section"><div class="section-title"><h2>Mis cajitas</h2>
      <button class="text-btn" data-action="new-pocket" data-id="${E(a.id)}">＋ Crear</button></div>
      <div class="panel">${all.length?all.map(p=>`<div class="account-pocket-row">
         <div><b>${E(p.name)}</b><small>Dinero apartado dentro de esta cuenta</small></div>
         <strong>${M(P.balance(p,pocketMoves,movements))}</strong>
         <button class="iconbtn" data-action="pocket-detail" data-id="${E(p.id)}" aria-label="Abrir cajita">›</button>
         </div>`).join(''):'<p class="help">Todavía no tienes cajitas en esta cuenta. Crea una para separar parte de tu saldo sin duplicarlo.</p>'}</div>
       ${P.eligible(a)?`<div class="account-page-actions"><button class="primary" data-action="new-pocket" data-id="${E(a.id)}">Crear cajita</button>
       <button class="secondary" data-action="move-pocket" data-id="${E(a.id)}">Mover dinero a una cajita</button></div>`:''}
    </section><div class="account-page-actions"><button class="secondary" data-action="account-move" data-id="${E(a.id)}">Registrar movimiento</button>
      <button class="secondary" data-action="reconcile" data-id="${E(a.id)}">Conciliar saldo</button></div>`+movementsPart;
 }
 return {render};
});