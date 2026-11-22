/* Presentación del calendario y cálculo de capacidad, sin efectos de escritura. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FinancePlanningView=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const labels={'recurring':'Pago fijo','card-payment':'Pago de tarjeta','card-cut':'Fecha de corte','payroll':'Nómina'};
  const categories={'recurring':'expense','card-payment':'expense','card-cut':'info','payroll':'income'};
  function render(events,capacity,month,{esc:E,money:M,monthName}){
    const dates=new Map();
    for(const e of events){
      if(!dates.has(e.date))dates.set(e.date,[]);
      dates.get(e.date).push(e);
    }
    const days=[...dates.keys()].sort();
    const today=capacity.today;
    const eventLabel=e=>e.status==='paid'?'Pagado':e.status==='recorded'?'Registrado':e.status==='pending'?'Pendiente de confirmar':e.status==='confirmed'?'Fecha o importe confirmado':'Estimado';
    const list=days.length?days.map(day=>{
      const expired=day<today;
      return '<section class="planning-day"><h3>'+E(day.split('-').reverse().join('/'))+(expired?' · Anterior':'')+'</h3>'+
        dates.get(day).map(e=>{
          const color=categories[e.kind]||'info';
          const amount=e.amount>0?M(e.amount):'Sin importe';
          const hint=e.detail?' · '+E(e.detail):'';
          return '<div class="planning-entry planning-'+color+'"><div class="planning-entry-copy"><b>'+E(e.title)+'</b>'+
            '<small>'+E(labels[e.kind]||'Evento')+' · '+E(eventLabel(e))+hint+'</small></div><strong>'+amount+'</strong></div>';
        }).join('')+'</section>';
    }).join(''):'<div class="empty">No hay eventos previstos para este mes. Configura tus cortes, nómina o pagos fijos para verlos aquí.</div>';
    const warn=capacity.warnings.length?'<div class="inline-note" role="status">'+capacity.warnings.map(x=>'<p>'+E(x)+'</p>').join('')+'</div>':'';
    return '<div class="page-head"><div><div class="eyebrow">Proyección informativa</div><h1>Calendario financiero</h1></div>'+
      '<input id="month-control" type="month" class="month-control" value="'+E(month)+'" aria-label="Mes del calendario"></div>'+
      '<div class="planning-actions"><button class="secondary small" type="button" data-action="back-home">← Resumen</button>'+
      '<button class="secondary small" type="button" data-action="goto-reports">Ver informes</button></div>'+
      '<div class="panel"><div class="section-title"><h2>Capacidad de pago</h2></div>'+
      '<div class="planning-capacity"><small>Disponible estimado próximos '+capacity.days+' días</small>'+
      '<strong class="'+(capacity.shortfall?'negative':'positive')+'">'+M(capacity.available)+'</strong>'+
      (capacity.shortfall?'<small class="warning-text">Compromisos superiores al dinero sin apartar por '+M(capacity.shortfall)+'</small>':'')+'</div>'+
      '<div class="report-line"><span>Dinero en débito y efectivo (hoy)</span><b>'+M(capacity.liquid)+'</b></div>'+
      '<div class="report-line"><span>Cajitas reservadas</span><b>−'+M(capacity.reservedPockets)+'</b></div>'+
      '<div class="report-line"><span>Pagos de tarjeta hasta '+E(capacity.end)+'</span><b>−'+M(capacity.cardsDue)+'</b></div>'+
      '<div class="report-line"><span>Pagos fijos y pendientes</span><b>−'+M(capacity.recurringDue)+'</b></div>'+
      '<p class="footnote">El cálculo no añade sueldos futuros ni cuenta dos veces compras a crédito como pagos. El saldo se estima con movimientos registrados hasta hoy y no sustituye la información bancaria.</p>'+
      warn+'</div>'+
      '<div class="section-title"><h2>Eventos · '+E(monthName(month))+'</h2></div>'+
      '<div class="planning-events">'+list+'</div>'+
      '<p class="footnote">Las fechas habituales y los importes proyectados son orientativos. Para evitar pagos atrasados, confirma fechas y montos contra los estados de cuenta oficiales. Los eventos no crean operaciones ni modifican saldos.</p>';
  }
  return {render};
});
