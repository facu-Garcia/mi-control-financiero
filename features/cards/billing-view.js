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
   const p=cycle||{};
   const cutDefault=p.cutDate||B.cut(card,month,[]).date||'';
   const dueDefault=p.dueDate||B.due(card,month,[]).date||'';
   return `<form id="billing-cycle-form" class="form">
     <div class="field"><label for="bc-month">Mes del estado de cuenta</label><input id="bc-month" name="month" type="month" value="${E(month)}" required></div>
     <div class="form-row"><div class="field"><label for="bc-cut">Fecha exacta del corte</label><input id="bc-cut" name="cutDate" type="date" required value="${E(cutDefault)}"></div>
       <div class="field"><label for="bc-due">Fecha límite de pago (si ya la sabes)</label><input id="bc-due" name="dueDate" type="date" value="${E(dueDefault)}"></div></div>
     <div class="field"><label for="bc-amount">Pago oficial del estado de cuenta (opcional)</label>
       <input id="bc-amount" name="amountDue" type="number" step=".01" min="0" value="${p.amountDue===null||p.amountDue===undefined?'':M(p.amountDue)}" placeholder="Solo si ya lo confirmó el banco"></div>
     <p class="inline-note">La fecha habitual sigue como referencia. Este registro define el corte real del mes. El importe oficial reemplaza la estimación solo para el aviso de pago, no crea gastos ni modifica la deuda total.</p>
     <button class="primary full" type="submit">Guardar estado de cuenta</button></form>`;
 }
 function legacyForm(card,record,B,M,E,month){
   const r=record||{};
   return `<form id="legacy-installment-form" class="form">
     <div class="field"><label for="legacy-label">Concepto</label><input id="legacy-label" name="label" maxlength="100" required value="${E(r.label||'Mensualidades anteriores')}" placeholder="Compras anteriores · sin detalle"></div>
     <div class="field"><label for="legacy-amount">Cuánto se paga cada mes ($)</label><input id="legacy-amount" name="amount" type="number" min=".01" step=".01" required value="${r.amount?M(r.amount):''}"></div>
     <div class="form-row"><div class="field"><label for="legacy-start">Primer mes pendiente</label><input id="legacy-start" name="startMonth" type="month" value="${E(r.startMonth||month)}" required></div>
       <div class="field"><label for="legacy-end">Último mes pendiente</label><input id="legacy-end" name="endMonth" type="month" value="${E(r.endMonth||month)}" required></div></div>
     <p class="inline-note">Es un compromiso de compras antiguas, no una nueva compra ni una deuda adicional. Ya debe estar incluido en la deuda inicial actual de la tarjeta. No dupliques mensualidades que también hayas registrado como compras a MSI.</p>
     <button class="primary full" type="submit">Guardar compromiso</button></form>`;
 }
 function detail(card,cycles,legacy,movements,month,today,B,F,M,E){
   const allCycles=cycles.filter(c=>c.accountId===card.id).sort((a,b)=>b.month.localeCompare(a.month));
   const commitments=legacy.filter(r=>r.accountId===card.id).sort((a,b)=>a.startMonth.localeCompare(b.startMonth));
   const reference=B.unconfirmedCycleInfo(card,month,cycles);
   const estimate=F.statementCharges(card,movements,month,cycles,legacy);
   const official=reference.record?.amountDue;
   return `<div class="page-head"><div><div class="eyebrow">Control de crédito</div><h1>${E(card.name)}</h1></div>
      <input id="month-control" type="month" class="month-control" value="${E(month)}"></div>
     <div class="toolbar"><button type="button" class="secondary small" data-action="back-accounts">← Cuentas</button>
       <button type="button" class="primary small" data-action="edit-billing-cycle" data-id="${E(card.id)}" data-month="${E(month)}">Registrar corte</button></div>
     <div class="panel billing-summary"><h2>Estado de ${E(month)}</h2>
       <div class="report-line"><span>Fecha de corte</span><b>${E(reference.cut.date||'Sin configurar')} ${reference.cut.official?'✓':''}</b></div>
       <div class="report-line"><span>Fecha límite</span><b>${E(reference.due.date||'Sin confirmar')} ${reference.due.official?'✓':''}</b></div>
       ${moneyRow('Compras regulares y MSI estimadas',estimate.total,M)}
       ${moneyRow('Compromisos antiguos incluidos',B.legacyFor(card.id,month,legacy),M)}
       <div class="report-line"><span>Pago oficial comunicado por el banco</span><b>${official===null||official===undefined?'Sin registrar':M(official)}</b></div>
       <p class="footnote">El pago oficial debe transcribirse del banco. No se obtiene sumando automáticamente las compras estimadas.</p></div>
     <div class="section-title"><h2>Historial de cortes</h2></div><div class="panel">
       ${allCycles.length?allCycles.map(c=>`<div class="report-line"><span><b>${E(c.month)}</b><small class="help">Corte: ${E(c.cutDate)} · Pago: ${E(c.dueDate||'Sin confirmar')}</small></span>
         <div class="billing-actions"><b>${c.amountDue===null||c.amountDue===undefined?'Sin monto':M(c.amountDue)}</b>
           <button class="secondary small" data-action="edit-billing-cycle" data-id="${E(card.id)}" data-month="${E(c.month)}">Editar</button>
           <button class="secondary small" data-action="delete-billing-cycle" data-id="${E(c.id)}">×</button></div></div>`).join(''):'<p class="help">Aún no hay cortes confirmados. Se estiman con el día habitual.</p>'}</div>
     <div class="section-title"><h2>MSI de compras anteriores</h2><button class="text-btn" data-action="add-legacy" data-id="${E(card.id)}">＋ Agregar mensualidad</button></div>
     <div class="panel">${commitments.length?commitments.map(r=>`<div class="report-line"><span><b>${E(r.label)}</b><small class="help">${E(r.startMonth)} a ${E(r.endMonth)}</small></span>
       <div class="billing-actions"><b>${M(r.amount)}/mes</b><button class="secondary small" data-action="edit-legacy" data-id="${E(r.id)}">Editar</button>
       <button class="secondary small" data-action="delete-legacy" data-id="${E(r.id)}">×</button></div></div>`).join(''):
       '<p class="help">Añade una mensualidad que ya venías pagando, sin registrar compras históricas.</p>'}</div>
     <p class="footnote">Registrar un estado de cuenta o compromiso antiguo solo organiza vencimientos y proyecciones; no aumenta tu deuda ni modifica los saldos. Para corregir la deuda de partida utiliza el saldo inicial de la tarjeta.</p>`;
 }
 return {options,alert,alertList,form,legacyForm,detail};
});