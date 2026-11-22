/* Interactive reports without remote chart libraries. HTML is built from escaped local data only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinanceReportView=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const colors=['#50d8c0','#75aafb','#e7b669','#c2a0f3','#f28a9d','#71c5d9','#a1d89d','#e8a3cf','#e8cc91','#90b7c7','#9aa7c4'];
const fmt=m=>String(m).slice(5,7)+'/'+String(m).slice(2,4);
const n=x=>Number(x||0);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const escDefault=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function svgBars(rows,M,E,mode){
 const width=640,height=220,top=18,bottom=186,left=52,right=615,plotH=bottom-top;
 const series=mode==='credit'?[['debts','#f4a1ab'],['payments','#73b6f7']]:[['income','#50d8c0'],['purchases','#75aafb']];
 const max=Math.max(1,...rows.flatMap(r=>series.map(([k])=>Math.max(0,n(r[k])))));
 const tick=Array.from({length:5},(_,i)=>{const y=bottom-plotH*i/4;return '<line x1="'+left+'" x2="'+right+'" y1="'+y+'" y2="'+y+'" class="fr-gridline"/>'+
   '<text x="'+(left-6)+'" y="'+(y+4)+'" text-anchor="end" class="fr-axis">'+E(Math.round(max*i/400)/100>=1000?Math.round(max*i/400000)+'k':Math.round(max*i/400)/100+'')+'</text>';}).join('');
 const step=(right-left)/Math.max(1,rows.length),barWidth=Math.max(7,Math.min(20,step*.22));
 const bars=rows.map((r,i)=>series.map(([key,color],k)=>{
   if(r[key]==null)return '';
   const value=Math.max(0,n(r[key])),bh=plotH*value/max;
   const x=left+step*i+step/2+(k===0?-barWidth-2:2);
   return '<rect x="'+x.toFixed(2)+'" y="'+(bottom-bh).toFixed(2)+'" width="'+barWidth.toFixed(2)+'" height="'+Math.max(0,bh).toFixed(2)+'" rx="3" fill="'+color+'"><title>'+E(fmt(r.month)+' · '+key+': '+M(value))+'</title></rect>';
 }).join('')+'<text x="'+(left+step*i+step/2).toFixed(2)+'" y="208" text-anchor="middle" class="fr-axis">'+E(fmt(r.month))+'</text>').join('');
 return '<div class="fr-chart-scroll"><svg class="fr-chart" role="img" aria-label="Comparación mensual de '+(mode==='credit'?'deuda total y pagos de tarjeta':'ingresos y compras')+'" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet">'+tick+bars+'</svg></div>'+
 '<div class="fr-legend">'+series.map(([k,color])=>'<span><i class="fr-dot" style="background:'+color+'"></i>'+E(({income:'Ingresos',purchases:'Compras',debts:'Deuda al cierre',payments:'Pagos registrados'})[k])+'</span>').join('')+'</div>';
}
function svgLines(rows,M,E,metric){
 const valid=rows.filter(r=>r.netWorth!==null),width=640,height=230,left=50,right=615,top=18,bottom=180;
 if(!valid.length)return '<div class="fr-empty">No hay saldos históricos completos. Las cuentas necesitan una fecha de saldo inicial anterior al periodo consultado.</div>';
 const keys=['assets','debts','netWorth'];
 const enabled=metric==='all'?keys:[metric];
 const values=valid.flatMap(r=>enabled.map(k=>n(r[k])));
 const low=Math.min(0,...values),high=Math.max(1,...values),span=high-low,step=(right-left)/Math.max(1,rows.length-1);
 const ticks=Array.from({length:5},(_,i)=>{const y=bottom-(bottom-top)*i/4;return '<line x1="'+left+'" x2="'+right+'" y1="'+y+'" y2="'+y+'" class="fr-gridline"/><text x="45" y="'+(y+4)+'" text-anchor="end" class="fr-axis">'+E(String(Math.round((low+span*i/4)/100)))+'</text>';}).join('');
 const line=enabled.map((key,i)=>{
   const coords=rows.map((r,j)=>r[key]==null?null:[left+j*step,bottom-(bottom-top)*(r[key]-low)/span]);
   let d='',open=false;
   for(const point of coords){if(!point){open=false;continue;}d+=(open?' L ':' M ')+point.map(v=>v.toFixed(2)).join(' ');open=true;}
   const color=key==='assets'?'#51d8bf':key==='debts'?'#ef9b9e':'#76b9f8';
   const points=coords.filter(Boolean).map(([x,y])=>'<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="3.5" fill="'+color+'"/>').join('');
   return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linecap="round"/>'+points;
 }).join('');
 const axis=rows.map((r,i)=>'<text x="'+(left+i*step).toFixed(2)+'" y="208" text-anchor="middle" class="fr-axis">'+E(fmt(r.month))+'</text>').join('');
 return '<svg class="fr-chart" role="img" aria-label="Evolución histórica de saldos con datos disponibles" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet">'+ticks+line+axis+'</svg>'+
 '<div class="fr-legend">'+enabled.map(k=>'<span><i class="fr-dot" style="background:'+({assets:'#51d8bf',debts:'#ef9b9e',netWorth:'#76b9f8'}[k])+'"></i>'+E(({assets:'Dinero registrado',debts:'Deuda',netWorth:'Patrimonio neto'})[k])+'</span>').join('')+'</div>';
}
function render(data,{esc:E=escDefault,money:M,monthName,accounts=[],tab='flow',range=6,focus='',category='',metric='all'}){
 const selected=data.rows.find(r=>r.month===focus)||data.current;
 const tabs=[['flow','Flujo'],['categories','Gastos'],['wealth','Patrimonio'],['credit','Crédito']];
 const buttonGroup='<div class="fr-tabs" role="group" aria-label="Tipos de informe">'+tabs.map(([id,label])=>'<button type="button" class="fr-tab" data-action="report-tab" data-kind="'+id+'" aria-selected="'+(tab===id)+'">'+label+'</button>').join('')+'</div>';
 const periods='<div class="fr-periods" role="group" aria-label="Seleccionar mes de detalle">'+data.rows.map(r=>'<button type="button" class="fr-period" data-action="report-focus" data-month="'+E(r.month)+'" aria-pressed="'+(selected.month===r.month)+'">'+E(fmt(r.month))+'</button>').join('')+'</div>';
 const summary=(items)=>'<div class="fr-summary">'+items.map(([name,value])=>'<div><small>'+E(name)+'</small><strong>'+M(value)+'</strong></div>').join('')+'</div>';
 const panel=(title,desc,body)=>'<section class="fr-panel"><h2>'+E(title)+'</h2>'+(desc?'<p>'+E(desc)+'</p>':'')+body+'</section>';
 let content='';
 if(tab==='flow'){
   const any=data.rows.some(r=>r.income||r.purchases);
   content=panel('Ingresos frente a compras','Barras comparativas en la misma escala, sin sumar pagos ni transferencias como compras.',
     summary([['Ingresos del periodo',data.totalIncome],['Compras del periodo',data.totalPurchases]])+
     (any?svgBars(data.rows,M,E,'flow'):'<div class="fr-empty">Todavía no existen ingresos o compras registrados en este intervalo.</div>')+
     periods+'<div class="fr-detail"><b>'+E(monthName(selected.month))+'</b><div>Ingresos: '+M(selected.income)+' · Compras: '+M(selected.purchases)+'</div>'+
     '<small>La diferencia no equivale al cambio de efectivo: las compras con crédito pueden pagarse en otro mes.</small></div>');
 }else if(tab==='categories'){
   const total=data.monthPurchases;
   const stops=[];let start=0;
   data.categories.forEach((x,i)=>{const stop=start+x.amount/Math.max(1,total)*100;stops.push(colors[i%colors.length]+' '+start+'% '+stop+'%');start=stop;});
   const donut='<div class="fr-category-split"><div class="fr-donut" role="img" aria-label="Distribución de compras por categoría" style="background:conic-gradient('+E(stops.join(','))+')"><div class="fr-donut-inner"><small>Compras</small><b>'+M(total)+'</b></div></div><p class="fr-category-note">Selecciona una categoría para revisar sus movimientos del mes.</p></div>';
   const choices='<div class="fr-cat-list">'+data.categories.map((x,i)=>'<button type="button" class="fr-click" data-action="report-category" data-category="'+E(x.name)+'" aria-pressed="'+(category===x.name)+'"><i class="fr-dot" style="background:'+colors[i%colors.length]+'"></i><b>'+E(x.name)+' · '+x.percent+'%</b><small>'+M(x.amount)+'</small></button>').join('')+'</div>';
   const items=category?data.items.filter(m=>(m.category||'Otros')===category):[];
   const tx=category?panel('Movimientos · '+category,'Compras asignadas al mes financiero seleccionado.',
     items.length?'<div class="fr-transactions">'+items.map(m=>'<div class="fr-transaction"><span><b>'+E(m.description||m.category||'Gasto')+'</b><small>'+E(m.date)+' · '+E(accounts.find(a=>a.id===m.accountId)?.name||'Cuenta')+'</small></span><strong>'+M(m.amount)+'</strong></div>').join('')+'</div>':'<p class="fr-empty">No hay movimientos en esa categoría.</p>'):'';
   content=panel('Distribución de compras','Incluye compras atribuidas al mes financiero; no pagos de tarjeta.',
     total?donut+choices:'<div class="fr-empty">No hay gastos registrados en este mes. Prueba con otro periodo.</div>')+tx;
 }else if(tab==='wealth'){
   const valid=data.rows.filter(r=>r.netWorth!==null);
   const metricChoices=[['all','Todos'],['assets','Dinero'],['debts','Deuda'],['netWorth','Patrimonio']];
   const toggle='<div class="fr-tabs" role="group" aria-label="Series del patrimonio">'+metricChoices.map(([key,name])=>'<button class="fr-tab" data-action="report-metric" data-metric="'+key+'" aria-selected="'+(metric===key)+'">'+name+'</button>').join('')+'</div>';
   content=panel('Evolución del patrimonio','Saldos históricos calculados desde cada fecha inicial. No se estiman los meses anteriores.',
     toggle+svgLines(data.rows,M,E,metric)+periods+
     (selected.netWorth===null?'<div class="fr-empty">Sin instantánea histórica completa para '+E(monthName(selected.month))+'.</div>':
       summary([['Dinero registrado',selected.assets],['Deuda total',selected.debts],['Patrimonio neto',selected.netWorth]])+
       '<p class="fr-note">Datos al '+E(selected.asOf)+(selected.partial?' · periodo todavía en curso':'')+'.</p>'))+
     (valid.length<2?'<p class="fr-note">Se necesitan al menos dos periodos con saldos verificables para comparar una tendencia.</p>':'');
 }else{
   const hasCards=data.cards.length>0;
   const any=data.rows.some(r=>r.debts!=null||r.payments>0);
   const current=data.cards.map(card=>'<div class="fr-card-row"><span><b>'+E(card.name)+'</b><small>Pagos del mes: '+M(card.payments)+'</small></span><strong>'+(
     card.balance===null?'Sin saldo actual':M(card.balance))+'</strong></div>').join('');
   content=panel('Deuda de tarjetas y pagos','La deuda es un saldo al cierre; los pagos son operaciones del mes. No son magnitudes acumulables.',
      hasCards?((any?svgBars(data.rows,M,E,'credit'):'<div class="fr-empty">No hay saldos históricos suficientes.</div>')+
       periods+(selected.debts==null?'<div class="fr-empty">No existe saldo histórico completo para este mes.</div>':
       summary([['Deuda al cierre',selected.debts],['Pagos registrados',selected.payments]]))):
       '<div class="fr-empty">El filtro seleccionado no incluye tarjetas de crédito. Selecciona «Todas las cuentas» o una tarjeta.</div>')+
      (hasCards?panel('Tarjetas incluidas','Saldos registrados hoy y pagos del mes seleccionado.',current):'');
 }
 const first='<div class="fr-head"><div class="eyebrow">Análisis con datos registrados</div><h1>Mis informes</h1></div>'+
    '<div class="fr-filters"><div class="fr-filter-label">Mes de referencia<input id="month-control" aria-label="Cambiar mes del informe" class="fr-select" type="month" value="'+E(data.month)+'"></div>'+
    '<div class="fr-filter-label">Cuenta o tarjeta<select id="report-account" aria-label="Filtrar informes por cuenta" class="fr-select"><option value="all">Todas las cuentas</option>'+
    accounts.map(a=>'<option value="'+E(a.id)+'" '+(data.accountId===a.id?'selected':'')+'>'+E(a.name)+'</option>').join('')+'</select></div>'+
    '<div class="fr-filter-label">Intervalo<select id="report-range" aria-label="Meses a comparar" class="fr-select">'+[3,6,12].map(x=>'<option value="'+x+'" '+(x===range?'selected':'')+'>'+x+' meses</option>').join('')+'</select></div></div>';
 return first+buttonGroup+(data.selectedIsFuture?'<div class="fr-empty">El mes seleccionado está en el futuro. No existen movimientos confirmados para ese periodo.</div>':'')+
 content+'<p class="fr-note">Las cifras provienen de movimientos guardados en este dispositivo. No se consideran ingresos futuros, cargos sin confirmar ni transferencias entre cuentas como ingresos o gastos nuevos.</p>'+
 '<div class="toolbar"><button class="secondary small" data-action="open-planning">Planear mi mes</button>'+
 '<button class="secondary small" data-action="export-report">Exportar informe JSON</button>'+
 '<button class="secondary small" data-action="export-csv">Exportar CSV</button></div>';
}
return {render,svgBars,svgLines};
});