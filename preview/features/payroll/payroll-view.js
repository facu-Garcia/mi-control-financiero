/* Payroll screens: pure presentation, no storage or banking operations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinancePayrollViews=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 function option(v,label,selected,E){return `<option value="${E(v)}" ${selected===v?'selected':''}>${E(label)}</option>`;}
 function configForm(accounts,current,M,E){
   const debit=accounts.filter(a=>a.type==='debit');
   if(!debit.length)return '<div class="inline-note">Agrega primero una cuenta de débito para utilizar Nómina.</div>';
   const p=current||{accountId:debit[0].id,frequency:'semimonthly',day1:15,day2:31,expectedNet:0};
   return `<form id="payroll-config-form" class="form">
     <p class="help">Esta configuración es privada: se guarda en tu dispositivo y en tus respaldos cifrados, no en GitHub.</p>
     <div class="field"><label for="p-account">Cuenta de débito donde recibes tu sueldo</label>
       <select id="p-account" name="accountId" required>${debit.map(a=>option(a.id,a.name,p.accountId,E)).join('')}</select></div>
     <div class="field"><label for="p-frequency">Periodicidad</label><select id="p-frequency" name="frequency">
       ${option('semimonthly','Quincenal (dos pagos por mes)',p.frequency,E)}
       ${option('monthly','Mensual (un pago por mes)',p.frequency,E)}</select>
     </div>
     <div class="form-row"><div class="field"><label for="p-day1">Día del primer pago</label>
       <input id="p-day1" name="day1" type="number" min="1" max="31" value="${p.day1}" required></div>
       <div class="field" id="p-day2-wrap"><label for="p-day2">Día del segundo pago</label>
       <input id="p-day2" name="day2" type="number" min="1" max="31" value="${p.day2}" required>
       <small>Usa 31 para representar el último día de cada mes.</small></div></div>
     <div class="field"><label for="p-expected">Pago neto habitual por quincena o mes (MXN)</label>
       <input id="p-expected" name="expectedNet" type="number" min="0" step=".01" inputmode="decimal" value="${M(p.expectedNet)}" required>
       <small>Es una referencia. No se registra como ingreso hasta que confirmes el depósito.</small>
     </div>
     <button class="primary full" type="submit">Guardar configuración de nómina</button>
   </form>`;
 }
 function registerForm(account,profile,slot,type,kind,date,amount,M,E,types,accounts){
   const t=type||'salary';
   return `<form id="payroll-receipt-form" class="form">
     <div class="field"><label for="pr-account">Cuenta receptora</label><select id="pr-account" name="accountId" required>
       ${accounts.filter(a=>a.id===account.id).map(a=>option(a.id,a.name,account.id,E)).join('')}</select></div>
     <div class="field"><label for="pr-kind">Concepto de nómina</label><select id="pr-kind" name="kind">
       ${Object.entries(types).map(([v,label])=>option(v,label,t,E)).join('')}</select></div>
     <div class="form-row"><div class="field"><label for="pr-amount">Importe realmente recibido ($)</label>
       <input id="pr-amount" type="number" name="amount" min=".01" step=".01" required value="${M(amount??(t==='salary'?profile.expectedNet:0))}"></div>
       <div class="field"><label for="pr-date">Fecha real del depósito</label><input id="pr-date" type="date" name="date" value="${E(date)}" required></div></div>
     <div class="field"><label for="pr-note">Descripción (opcional)</label><input id="pr-note" name="description" maxlength="130" value="" placeholder="Ejemplo: quincena, fin de año, ajuste"></div>
     <p class="inline-note">Se registrará una sola vez como ingreso real, con su concepto. El importe previsto no se sumará antes de confirmar el depósito.</p>
     <button type="submit" class="primary full">Registrar ingreso recibido</button>
   </form>`;
 }
 function page(profile,accounts,movements,month,P,M,E,formatMonth){
   const account=accounts.find(a=>a.id===profile?.accountId);
   const heading=`<div class="page-head"><div><div class="eyebrow">Ingresos personales</div><h1>Nómina y prestaciones</h1></div>
     <input id="month-control" type="month" class="month-control" value="${E(month)}"></div>
     <div class="toolbar"><button type="button" class="secondary small" data-action="back-home">← Resumen</button>
       <button type="button" class="primary small" data-action="payroll-config">${profile?'⚙ Configurar':'＋ Configurar nómina'}</button></div>`;
   if(!profile||!account)return heading+`<div class="panel payroll-empty">
       <div class="payroll-icon">▤</div><h2>Elige tu cuenta de nómina</h2>
       <p>Asigna cualquier cuenta de débito, define tus fechas y el pago esperado. No se modifican tus movimientos actuales ni se publica información en GitHub.</p>
       <button class="primary" data-action="payroll-config">Configurar mi nómina</button></div>`;
   const slots=P.due(profile,month),totals=P.incomeTotals(movements,profile.accountId,month);
   const list=slots.map(s=>{const received=P.receiptFor(s,movements);
     const status=received?'Recibido':'Previsto';
     return `<div class="payroll-pay-row"><div class="payroll-circle ${received?'received':''}">${received?'✓':'▣'}</div>
       <div class="payroll-pay-copy"><b>${E(s.label)}</b><small>${E(s.date)} · ${status}</small>
         <strong>${M(received?.amount??s.expected)}</strong></div>
       ${received?'<span class="payroll-status">Registrado</span>':`<button type="button" class="secondary small" data-action="payroll-receive" data-date="${E(s.date)}" data-key="${E(s.key)}">Registrar</button>`}</div>`;
   }).join('');
   const types=Object.entries(P.TYPES).filter(([key])=>key!=='salary');
   const extra=types.map(([key,label])=>`<button type="button" class="payroll-concept" data-action="payroll-extra" data-kind="${E(key)}"><span>${E(label)}</span><span aria-hidden="true">＋</span></button>`).join('');
   const incomes=movements.filter(m=>P.isPayrollIncome(m,account.id)&&m.date.startsWith(month)).sort((a,b)=>b.date.localeCompare(a.date));
   const title=`<div class="payroll-heading"><span class="payroll-account">${E(account.name)} · Débito</span><span class="payroll-frequency">${profile.frequency==='semimonthly'?'Quincenal':'Mensual'}</span></div>`;
   return heading+title+
     `<div class="payroll-stats"><div class="payroll-stat"><small>Recibido en ${E(formatMonth(month))}</small><strong>${M(totals.total)}</strong></div>
       <div class="payroll-stat"><small>Sueldo / quincenas</small><strong>${M(totals.salary)}</strong></div>
       <div class="payroll-stat"><small>Prestaciones y extras</small><strong>${M(totals.extra)}</strong></div></div>`+
     `<div class="section-title"><h2>Calendario de pagos</h2></div><div class="panel">${list}</div>
     <div class="section-title"><h2>Prestaciones y otros ingresos</h2></div><div class="payroll-concepts">${extra}</div>
     <div class="section-title"><h2>Ingresos de nómina registrados</h2></div><div class="panel">
       ${incomes.length?incomes.map(m=>`<div class="payroll-history"><span><b>${E(P.TYPES[m.payrollKind])}</b><small>${E(m.date)} · ${E(m.description||account.name)}</small></span>
         <strong>${M(m.amount)}</strong></div>`).join(''):'<p class="help">Todavía no hay ingresos de nómina confirmados este mes.</p>'}
     </div>
     <div class="section-title"><h2>Ingresos existentes sin clasificar</h2></div>
     <div class="panel">${movements.filter(m=>m.type==='income'&&m.accountId===account.id&&!m.payrollKind&&m.date.startsWith(month)).length?
       movements.filter(m=>m.type==='income'&&m.accountId===account.id&&!m.payrollKind&&m.date.startsWith(month)).map(m=>
       `<div class="payroll-history"><span><b>${E(m.description||'Ingreso')}</b><small>${E(m.date)} · ${M(m.amount)}</small></span>
       <button type="button" class="secondary small" data-action="payroll-classify" data-id="${E(m.id)}">Clasificar</button></div>`).join(''):
       '<p class="help">No hay ingresos sin clasificar en esta cuenta durante el mes seleccionado.</p>'}</div>
     <p class="footnote">Los pagos esperados no se suman al saldo ni al patrimonio. El fondo de ahorro solo se registrará cuando realmente lo recibas; descontarlo del sueldo y volverlo a registrar podría duplicar ingresos.</p>`;
 }

 function classifyForm(m,profile,P,M,E){
   const slots=P.due(profile,m.date.slice(0,7));
   return `<form id="payroll-classify-form" class="form">
     <div class="panel"><b>Ingreso existente</b><p class="help">${E(m.date)} · ${E(m.description||'Sin descripción')}</p>
       <strong>${M(m.amount)}</strong></div>
     <div class="field"><label for="pc-kind">¿Qué concepto fue?</label><select id="pc-kind" name="kind">
       ${Object.entries(P.TYPES).map(([type,name])=>option(type,name,'salary',E)).join('')}</select></div>
     <div class="field" id="pc-slot-wrap"><label for="pc-slot">Quincena relacionada (opcional)</label><select id="pc-slot" name="slot">
       ${option('','Sin quincena específica', '',E)}
       ${slots.map(s=>option(s.key,s.label+' · '+s.date,'',E)).join('')}</select>
       <small>Selecciona una quincena únicamente si corresponde a este pago.</small></div>
     <p class="inline-note">Solo se añadirá una clasificación al ingreso que ya existe. No se creará otro depósito ni cambiará el saldo.</p>
     <button type="submit" class="primary full">Clasificar ingreso sin duplicarlo</button>
   </form>`;
 }
 return {page,configForm,registerForm,classifyForm};
});