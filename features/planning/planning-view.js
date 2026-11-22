/* Agenda de movimientos reales, obligaciones por vencimiento y referencias opcionales. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FinancePlanningView=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const short=s=>s.split('-').reverse().join('/');
  function render(events,capacity,month,{esc:E,money:M,monthName,references=[],monthly={payments:[],recurringItems:[],total:0,unknown:0},cycle={items:[],total:0,purchases:0},plan={budgets:[]}}){
    const title=monthName(month);
    const inMonth=monthly.payments;
    const pending=monthly.recurringItems;
    const monthlyTotal=monthly.total;
    const status=e=>e.status==='captured'?'Importe capturado (verificar con banco)':e.status==='pending'?'Pendiente de confirmar':'Estimado; verifica con el banco';
    const entry=e=>'<div class="agenda-entry"><div class="agenda-entry-copy"><b>'+E(e.title)+'</b>'+
      '<small>'+E(short(e.date))+' · '+E(status(e))+'</small>'+(e.detail?'<small>'+E(e.detail)+'</small>':'')+
      '</div><strong>'+M(e.amount)+'</strong></div>';
    const cycleEntry=e=>'<div class="agenda-entry"><div class="agenda-entry-copy"><b>'+E(e.title)+'</b>'+
      '<small>Corte: '+(e.cutDate?E(short(e.cutDate)):'sin fecha')+' · Vence: '+(e.dueDate?E(short(e.dueDate)):'fecha pendiente')+'</small>'+
      '<small>'+(e.source==='initialDebt'?'Deuda inicial de este corte; no es compra nueva':E(status(e)))+'</small>'+
      '</div><strong>'+M(e.amount)+'</strong></div>';
    const event=e=>'<div class="agenda-entry"><div class="agenda-entry-copy"><b>'+E(e.title)+'</b>'+
      '<small>'+E(short(e.date))+' · '+E(e.detail||'Movimiento registrado')+'</small></div>'+
      '<strong class="'+(['income','yield'].includes(e.kind)?'positive':'')+'">'+M(e.amount)+'</strong></div>';
    const refs=references.length?'<details class="agenda-references"><summary>Mostrar fechas de referencia ('+references.length+')</summary>'+
      '<p class="footnote">Estas fechas no indican que se haya realizado un pago o recibido un ingreso. Tampoco confirman un estado de cuenta.</p>'+
      references.map(e=>'<div class="agenda-entry"><div class="agenda-entry-copy"><b>'+E(e.title)+'</b>'+
      '<small>'+E(short(e.date))+' · '+E(e.detail)+'</small></div>'+
      (e.kind==='salary'&&e.amount>0?'<span class="agenda-estimate">'+M(e.amount)+' previsto</span>':'')+'</div>').join('')+
      '</details>':'';
    const warns=capacity.warnings.length?'<details class="agenda-references"><summary>Advertencias del cálculo ('+
      capacity.warnings.length+')</summary><div class="inline-note">'+capacity.warnings.map(w=>'<p>'+E(w)+'</p>').join('')+'</div></details>':'';
    const monthNote=month===capacity.today.slice(0,7)?'Este mes':'Mes seleccionado';
    return '<div class="agenda-head"><div class="eyebrow">Tus finanzas por fecha</div><h1>Agenda financiera</h1>'+
      '<div class="agenda-month"><strong>'+E(title.charAt(0).toUpperCase()+title.slice(1))+'</strong>'+
      '<label for="month-control">Cambiar mes</label><input id="month-control" type="month" value="'+E(month)+'" aria-label="Seleccionar mes y año"></div></div>'+
      '<div class="planning-actions"><button class="secondary small" type="button" data-action="back-home">← Inicio</button>'+
      '<button class="secondary small" type="button" data-action="goto-reports">Ver informes</button></div>'+
      '<section class="plan-overview"><div class="eyebrow">Tus compromisos del mes</div><strong>'+M(plan.totalDue||0)+'</strong><p>Pagos con vencimiento en '+E(title)+', todavía pendientes.</p></section>'+
      '<div class="plan-stats"><div><small>Ingreso recibido</small><b>'+M(plan.actualIncome||0)+'</b></div>'+
      '<div><small>Ingreso previsto</small><b>'+M(plan.expectedIncome||0)+'</b><small>No disponible todavía</small></div>'+
      '<div><small>Compras del mes financiero</small><b>'+M(plan.actualPurchases||0)+'</b></div></div>'+
      (plan.current?'<section class="panel agenda-panel"><h2>Cómo podría cerrar el mes</h2>'+
      '<div class="agenda-summary"><div><small>Dinero líquido registrado hoy</small><b>'+M(plan.liquid||0)+'</b></div>'+
      '<div><small>Reservado en cajitas</small><b>−'+M(plan.reserved||0)+'</b></div>'+
      '<div><small>Pagos pendientes del mes</small><b>−'+M(plan.totalDue||0)+'</b></div>'+
      '<div><small>Ingresos futuros estimados</small><b>+'+M(plan.expectedIncome||0)+'</b></div></div>'+
      '<div class="agenda-available"><span>Saldo proyectado orientativo</span><strong class="'+((plan.projectedClosing||0)<0?'negative':'')+'">'+M(plan.projectedClosing||0)+'</strong></div>'+
      '<p class="footnote">Escenario, no saldo bancario: no incluye compras futuras, gastos no registrados ni compromisos sin configurar.</p></section>':
      '<p class="plan-other-month">Para otros meses se muestran compromisos y registros; el saldo actual no se atribuye a otro periodo.</p>')+
      '<section class="panel agenda-panel"><div class="agenda-section-head"><h2>Presupuestos de '+E(title)+'</h2><button class="text-btn" data-action="goto-budgets">Administrar</button></div>'+
      ((plan.budgets||[]).length?plan.budgets.map(b=>'<div class="plan-budget"><div class="plan-budget-head"><b>'+E(b.category)+'</b><span>'+M(b.spent)+' / '+M(b.limit)+'</span></div>'+
      '<div class="progress"><div class="'+(b.ratio>100?'over-budget':'')+'" style="width:'+Math.min(100,b.ratio)+'%"></div></div>'+
      '<small>'+(b.ratio>100?'Excedido en '+M(b.spent-b.limit):'Restante '+M(b.remaining))+'</small></div>').join(''):
      '<p class="help">No hay límites configurados. Puedes agregarlos desde Administrar.</p>')+'</section>'+
      '<details class="panel agenda-panel plan-collapse"><summary>Movimientos registrados ('+events.length+')</summary>'+
 
      (events.length?events.map(event).join(''):'<p class="help">No hay movimientos efectivos registrados en '+E(title)+'. Las fechas previstas no se consideran operaciones.</p>')+'</details>'+
      '<details class="panel agenda-panel plan-collapse"><summary>Compras y cortes · '+E(title)+'</summary>'+
      '<div class="agenda-summary"><div><small>Compras registradas del mes financiero</small><b>'+M(cycle.purchases)+'</b></div>'+
      '<div><small>Saldo pendiente asociado a los cortes</small><b>'+M(cycle.total)+'</b></div></div>'+
      (cycle.items.length?cycle.items.map(cycleEntry).join(''):'<p class="help">No hay saldos de cortes identificados en este mes; las compras podrían no tener un importe de corte confirmado todavía.</p>')+
      '<p class="footnote">Estos compromisos se muestran por mes de corte aunque venzan después. No son nuevos gastos ni se suman dos veces a las compras registradas.</p></details>'+
      '<section class="panel agenda-panel"><div class="agenda-section-head"><h2>Pagos que vencen en '+E(title)+'</h2></div>'+
      '<div class="agenda-total"><span>'+E(monthNote)+' · importe conocido o estimado</span><strong>'+M(monthlyTotal)+'</strong></div>'+
      (inMonth.length||pending.length?[...inMonth,...pending].sort((a,b)=>a.date.localeCompare(b.date)).map(entry).join(''):
      '<p class="help">No hay obligaciones con fecha asignada dentro de este mes. Eso no significa que no existan otras deudas.</p>')+
      (monthly.unknown?'<p class="footnote">Algunas obligaciones carecen de fechas o importes confirmados y pueden no aparecer aquí.</p>':'')+
      '<p class="footnote">Las fechas límite se agrupan por el mes en que se paga, no por el mes del corte.</p></section>'+
      '<details class="panel agenda-panel plan-collapse"><summary>Capacidad de los próximos 30 días</summary>'+
      '<p class="help">Del '+E(short(capacity.today))+' al '+E(short(capacity.end))+'. Este cálculo es independiente del mes seleccionado.</p>'+
      '<div class="agenda-summary"><div><small>Disponible hoy · débito y efectivo</small><b>'+M(capacity.liquid)+'</b></div>'+
      '<div><small>Reservado en cajitas</small><b>−'+M(capacity.reservedPockets)+'</b></div>'+
      '<div><small>Tarjetas por pagar</small><b>−'+M(capacity.cardsDue)+'</b></div>'+
      '<div><small>Cargos fijos pendientes</small><b>−'+M(capacity.recurringDue)+'</b></div></div>'+
      '<div class="agenda-available"><span>Resto estimado</span><strong>'+M(capacity.available)+'</strong></div>'+
      (capacity.shortfall?'<p class="agenda-shortfall">Faltante frente a compromisos conocidos: '+M(capacity.shortfall)+'</p>':'')+
      warns+'<p class="footnote">No se suman nóminas futuras ni se registran pagos automáticamente. Los saldos y fechas pueden necesitar conciliación bancaria.</p></details>'+
      refs+'<div class="plan-actions"><button class="primary" data-action="quick-expense">＋ Registrar gasto</button><button class="secondary" data-action="goto-reports">Ver informes</button></div>';
  }
  return {render};
});
