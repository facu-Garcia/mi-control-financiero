/* Agenda de movimientos reales, obligaciones por vencimiento y referencias opcionales. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FinancePlanningView=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const short=s=>s.split('-').reverse().join('/');
  function render(events,capacity,month,{esc:E,money:M,monthName,references=[]}){
    const title=monthName(month);
    const inMonth=capacity.paymentItems.filter(p=>p.date.slice(0,7)===month);
    const later=capacity.paymentItems.filter(p=>p.date.slice(0,7)!==month);
    const pending=capacity.recurringItems.filter(p=>p.date.slice(0,7)===month);
    const monthlyTotal=inMonth.reduce((s,p)=>s+p.amount,0)+pending.reduce((s,p)=>s+p.amount,0);
    const status=e=>e.status==='captured'?'Importe capturado (verificar con banco)':e.status==='pending'?'Pendiente de confirmar':'Estimado; verifica con el banco';
    const entry=e=>'<div class="agenda-entry"><div class="agenda-entry-copy"><b>'+E(e.title)+'</b>'+
      '<small>'+E(short(e.date))+' · '+E(status(e))+'</small>'+(e.detail?'<small>'+E(e.detail)+'</small>':'')+
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
      '<div class="planning-actions"><button class="secondary small" type="button" data-action="back-home">← Resumen</button>'+
      '<button class="secondary small" type="button" data-action="goto-reports">Ver informes</button></div>'+
      '<section class="panel agenda-panel"><div class="agenda-section-head"><h2>Movimientos registrados</h2>'+
      '<span>'+events.length+'</span></div>'+
      (events.length?events.map(event).join(''):'<p class="help">No hay movimientos efectivos registrados en '+E(title)+'. Las fechas previstas no se consideran operaciones.</p>')+'</section>'+
      '<section class="panel agenda-panel"><div class="agenda-section-head"><h2>Pagos con vencimiento en '+E(title)+'</h2></div>'+
      '<div class="agenda-total"><span>'+E(monthNote)+' · importe conocido o estimado</span><strong>'+M(monthlyTotal)+'</strong></div>'+
      (inMonth.length||pending.length?[...inMonth,...pending].sort((a,b)=>a.date.localeCompare(b.date)).map(entry).join(''):
      '<p class="help">No hay obligaciones con fecha asignada dentro de este mes. Eso no significa que no existan otras deudas.</p>')+
      '<p class="footnote">Las fechas límite se agrupan por el mes en que se paga, no por el mes del corte.</p></section>'+
      '<section class="panel agenda-panel"><div class="agenda-section-head"><h2>Próximos 30 días</h2></div>'+
      '<p class="help">Del '+E(short(capacity.today))+' al '+E(short(capacity.end))+'. Este cálculo es independiente del mes seleccionado.</p>'+
      '<div class="agenda-summary"><div><small>Disponible hoy · débito y efectivo</small><b>'+M(capacity.liquid)+'</b></div>'+
      '<div><small>Reservado en cajitas</small><b>−'+M(capacity.reservedPockets)+'</b></div>'+
      '<div><small>Tarjetas por pagar</small><b>−'+M(capacity.cardsDue)+'</b></div>'+
      '<div><small>Cargos fijos pendientes</small><b>−'+M(capacity.recurringDue)+'</b></div></div>'+
      '<div class="agenda-available"><span>Resto estimado</span><strong>'+M(capacity.available)+'</strong></div>'+
      (capacity.shortfall?'<p class="agenda-shortfall">Faltante frente a compromisos conocidos: '+M(capacity.shortfall)+'</p>':'')+
      (later.length?'<h3 class="agenda-subtitle">Pagos que vencen fuera de '+E(title)+'</h3>'+later.map(entry).join(''):'')+
      warns+'<p class="footnote">No se suman nóminas futuras ni se registran pagos automáticamente. Los saldos y fechas pueden necesitar conciliación bancaria.</p></section>'+
      refs;
  }
  return {render};
});
