/* View-only forms and monthly alerts for credit-card statements.
   The issuer's actual cycle wins over estimates. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinanceBillingViews=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 function options(cards,selected,E){return cards.map(a=>`<option value="${E(a.id)}" ${a.id===selected?'selected':''}>${E(a.name)}</option>`).join('');}
 function moneyRow(label,value,M){return `<div class="report-line"><span>${label}</span><b>${M(value)}</b></div>`;}
 function notice(v){return v?.official?'Confirmado':'Estimado';}
 function alert(card,cycles,movements,today,B,M,E){
   const status=B.status(card,cycles,movements,today);
   const upcoming=status.nextCut,dued=status.upcomingDue;
   const chip=(v,isDue=false)=>{if(!v?.date)return `<div class="billing-chip">${isDue?'Fecha límite':'Corte'} por configurar</div>`;
     return `<div class="billing-chip"><span>${isDue?'Pago':'Corte'}: <b>${E(v.date)}</b></span>
       <small>${v.official?'Fecha confirmada':'Fecha aproximada'} · ${v.days===0?'Hoy':v.days>0?'En '+v.days+' días':Math.abs(v.days)+' días de atraso'}</small></div>`;
   };
   const dueDetails=dued?`<div class="billing-amount"><small>Pago del estado de cuenta ${E(dued.month)}</small>
       <strong>${M(dued.remaining)}</strong><span>${dued.days<0?'Vencido hace '+Math.abs(dued.days)+' días':dued.days===0?'Vence hoy':'Quedan '+dued.days+' días'}</span></div>`:
     '<div class="billing-amount"><small>Pago de corte confirmado</small><strong>Sin confirmar</strong><span>Registra el estado de cuenta del banco</span></div>';
   return `<div class="billing-alert"><div class="billing-alert-head"><b>${E(card.name)}</b><button type="button" class="secondary small" data-action="billing-detail" data-id="${E(card.id)}">Ver cortes</button></div>
     <div class="billing-pills">${chip(upcoming)}${dued?`<div class="billing-chip"><span>Límite de pago: <b>${E(dued.dueDate)}</b></span><small>Fecha confirmada</small></div>`:''}</div>
     ${dueDetails}</div>`;
 }
 function alertList(cards,cycles,movements,today,B,M,E,compact=true){
   const list=cards.map(a=>({card:a,st:B.status(a,cycles,movements,today)}));
   list.sort((a,b)=>{const da=a.st.upcomingDue?.dueDate||a.st.nextCut?.date||'9999',db=b.st.upcomingDue?.dueDate||b.st.nextCut?.date||'9999';return da.localeCompare(db)});
   return `<div class="billing-alerts">${list.map(a=>alert(a.card,cycles,movements,today,B,M,E)).join('')}</div>`;
 }
 function form(card,cycle,B,M,E,month){
   const p=cycle||B.effectiveCycle(card,month,[]);
   const baseline=month===B.initialMonth(card);
   const cutDefault=p?.cutDate||B.cut(card,month,[]).date||'';
   const dueDefault=p?.dueDate||B.due(card,month,[]).date||'';
   const amount=p?.amountDue==null?(baseline?card.initialDebt:null):p.amountDue;
   return `<form id="billing-cycle-form" class="form">
     <div class="field"><label for="bc-month">Mes del corte</label><input id="bc-month" name="month" type="month" value="${E(month)}" required></div>
     <div class="form-row"><div class="field"><label for="bc-cut">Fecha de corte</label><input id="bc-cut" name="cutDate" type="date" required value="${E(cutDefault)}"></div>
       <div class="field"><label for="bc-due">Fecha límite de pago</label><input id="bc-due" name="dueDate" type="date" value="${E(dueDefault)}"></div></div>
     <div class="field"><label for="bc-amount">Monto a pagar de este corte ($)</label>
       <input id="bc-amount" name="amountDue" type="number" step=".01" min="0" value="${amount==null?'':M(amount)}" placeholder="Por registrar"></div>
     <p class="help">Las fechas propuestas se basan en la configuración habitual de la tarjeta. Puedes corregirlas según tu banco. La deuda inicial aparece automáticamente en su primer mes; modificar este importe no vuelve a sumar deuda.</p>
     <button class="primary full" type="submit">Guardar fechas y pago del corte</button></form>`;
 }
 function legacyForm(card,record,B,M,E,month){
   const r=record||{};
   return `<form id="legacy-installment-form" class="form">
     <div class="field"><label for="legacy-label">Concepto</label><input id="legacy-label" name="label" maxlength="100" required value="${E(r.label||'Mensualidades anteriores')}" placeholder="Compras anteriores · sin detalle"></div>
     <div class="field"><label for="legacy-amount">Cuánto se paga cada mes ($)</label><input id="legacy-amount" name="amount" type="number" min=".01" step=".01" required value="${r.amount?M(r.amount):''}"></div>
     <div class="form-row"><div class="field"><label for="legacy-start">Primer mes pendiente</label><input id="legacy-start" name="startMonth" type="month" value="${E(r.startMonth||month)}" required></div>
       <div class="field"><label for="legacy-end">Último mes pendiente</label><input id="legacy-end" name="endMonth" type="month" value="${E(r.endMonth||month)}" required></div></div>
     <div class="field"><label>¿Esas mensualidades ya están incluidas en la deuda total registrada?</label>
       <select name="includedInDebt"><option value="yes" ${r.includedInDebt!==false?'selected':''}>Sí, ya forman parte de mi deuda</option>
       <option value="no" ${r.includedInDebt===false?'selected':''}>No, todavía faltan por sumar a mi deuda</option></select>
     </div>
     <p class="inline-note">Si eliges que todavía faltan, se crea un ajuste contable por todas las mensualidades pendientes. No se registra ninguna compra antigua y no se volverá a sumar al calcular cada mes.</p>
     <p class="inline-note">Es un compromiso de compras antiguas, no una nueva compra ni una deuda adicional. Ya debe estar incluido en la deuda inicial actual de la tarjeta. No dupliques mensualidades que también hayas registrado como compras a MSI.</p>
     <button class="primary full" type="submit">Guardar compromiso</button></form>`;
 }
 function detail(card,cycles,legacy,movements,month,today,B,F,M,E){
   const allCycles=B.effectiveCycles(card,cycles).sort((a,b)=>b.month.localeCompare(a.month));
   const commitments=legacy.filter(r=>r.accountId===card.id).sort((a,b)=>a.startMonth.localeCompare(b.startMonth));
   const reference=B.unconfirmedCycleInfo(card,month,cycles);
   const estimated=F.statementCharges(card,movements,month,cycles,legacy);
   const payment=B.monthPayment(card,month,cycles,movements,legacy,F);
   const history=allCycles.map(c=>{
     const amount=B.monthPayment(card,c.month,cycles,movements,legacy,F);
     const estimatedDates=c.estimated;
     return `<article class="billing-history-item">
       <div class="billing-history-top">
         <div class="billing-history-title"><b>${E(c.month)}</b>
           <small>${estimatedDates?'Automático · saldo inicial':'Corte registrado'}</small></div>
         <strong>${M(amount.amount)}</strong>
       </div>
       <div class="billing-history-dates">
         <span><small>Corte</small><b>${E(c.cutDate||'Por configurar')}</b></span>
         <span><small>Fecha límite</small><b>${E(c.dueDate||B.due(card,c.month,cycles).date||'Por configurar')}</b></span>
       </div>
       <div class="billing-history-footer">
         <span>${E(B.cycleStatus(card,c,allCycles,movements,today).label)}</span>
         <button class="secondary small" data-action="edit-billing-cycle" data-id="${E(card.id)}" data-month="${E(c.month)}">Editar</button>
         ${c.estimated?'':`<button class="iconbtn billing-delete" data-action="delete-billing-cycle" data-id="${E(c.id)}" aria-label="Eliminar corte ${E(c.month)}">×</button>`}
       </div>
     </article>`;
   }).join('');
   return `<div class="page-head"><div><div class="eyebrow">Control de crédito</div><h1>${E(card.name)}</h1></div>
      <input id="month-control" type="month" class="month-control" value="${E(month)}"></div>
     <div class="toolbar"><button type="button" class="secondary small" data-action="back-account" data-id="${E(card.id)}">← Tarjeta</button>
       <button type="button" class="primary small" data-action="edit-billing-cycle" data-id="${E(card.id)}" data-month="${E(month)}">Editar corte</button></div>
     <section class="panel billing-summary">
       <div class="eyebrow">Pago del corte · ${E(month)}</div>
       <strong class="billing-hero-amount">${M(payment.amount)}</strong>
       <div class="billing-history-dates">
         <span><small>Fecha de corte</small><b>${E(reference.cut.date||'Por configurar')}</b><small>${reference.cut.official?'Registrada':'Estimada'}</small></span>
         <span><small>Fecha límite</small><b>${E(reference.due.date||'Por configurar')}</b><small>${reference.due.official?'Registrada':'Estimada'}</small></span>
       </div>
       <p class="help">${payment.kind==='estimate'?'Importe orientativo calculado con tus compras y mensualidades registradas.':payment.kind==='initial'?'Corresponde a la deuda inicial registrada para este mes.':'Importe registrado para este corte, descontando los pagos aplicados.'}</p>
       ${estimated.installments>0?`<div class="billing-mini-note">MSI previstas para este corte: <b>${M(estimated.installments)}</b> (informativo; no se suman otra vez)</div>`:''}
     </section>
     <div class="section-title"><h2>Historial de cortes</h2></div>
     <div class="billing-history-list">${history||'<div class="panel"><p class="help">Aún no tienes cortes registrados. Puedes agregar el primero con Editar corte.</p></div>'}</div>
     <div class="section-title"><h2>MSI de compras anteriores</h2><button class="text-btn" data-action="add-legacy" data-id="${E(card.id)}">＋ Agregar</button></div>
     <div class="panel billing-legacy-list">${commitments.length?commitments.map(r=>`<div class="billing-legacy-row">
       <div><b>${E(r.label)}</b><small>${E(r.startMonth)} a ${E(r.endMonth)}</small></div>
       <strong>${M(r.amount)}/mes</strong>
       <div class="billing-history-footer"><button class="secondary small" data-action="edit-legacy" data-id="${E(r.id)}">Editar</button>
         <button class="iconbtn billing-delete" data-action="delete-legacy" data-id="${E(r.id)}" aria-label="Eliminar mensualidad">×</button></div>
       </div>`).join(''):'<p class="help">Registra las mensualidades que ya venías pagando sin capturar compras antiguas.</p>'}</div>
     <p class="footnote">Los pagos del corte y los MSI permiten planificar tus compromisos. No se duplican como gastos ni ingresos.</p>`;
 }
 return {options,alert,alertList,form,legacyForm,detail};
});