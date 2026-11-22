/* Read-only interactive dashboard, separated from app.js. */
(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.FinanceDashboard=v;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const definitions={wealth:['Patrimonio neto','Dinero, ahorros y deudas'],income:['Ingresos recibidos','Entradas registradas'],purchases:['Compras del mes','Categorías y tarjetas'],savings:['Ahorros y cajitas','Distribución de saldos'],statements:['Cargos de tarjetas','Cortes y MSI']};
  const palette=['#48d8c1','#70aef9','#f7be6c','#b69cfa','#ff8293','#7bd2ef'];
  function bars(items,format,escape){
    const max=Math.max(1,...items.map(x=>Math.max(0,x.value)));
    return items.length?`<div class="viz-bars">${items.map((x,i)=>`<div class="viz-item"><span class="viz-label">${escape(x.name)}</span><div class="viz-track"><div class="viz-fill" style="width:${Math.max(0,x.value)*100/max}%;background:${palette[i%palette.length]}"></div></div><b>${format(x.value)}</b></div>`).join('')}</div>`:'<p class="help">No hay datos para mostrar.</p>';
  }
  function line(items,format,escape){
    if(!items.length)return '';
    const vals=items.map(x=>x.value),min=Math.min(0,...vals),max=Math.max(1,...vals),span=Math.max(1,max-min);
    const coords=items.map((x,i)=>[8+84*i/Math.max(1,items.length-1),88-76*(x.value-min)/span]);
    return `<div class="viz-line"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Evolución de los últimos seis meses"><polyline points="${coords.map(p=>p.map(x=>x.toFixed(2)).join(',')).join(' ')}" stroke="#48d8c1" fill="none" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg><div class="viz-axis">${items.map(x=>`<div><small>${escape(x.name)}</small><b>${format(x.value)}</b></div>`).join('')}</div></div>`;
  }
  function render(kind,opt){
    const {accounts,movements,month,accountId,F,I,esc:E,money:M,monthName}=opt;
    const chosen=accountId==='all'?accounts:accounts.filter(a=>a.id===accountId);
    const ids=new Set(chosen.map(a=>a.id));
    const active=movements.filter(m=>I.active(m)&&(accountId==='all'||ids.has(m.accountId)||ids.has(m.toAccountId)));
    const b=F.breakdown(chosen,active,month),t=F.totals(chosen,active);
    const series=I.monthlySeries(F,chosen,active,month,6);
    const plot=(title,content)=>`<section class="panel viz-section"><h2>${title}</h2>${content}</section>`;
    const months=series.map(x=>({name:monthName(x.month).split(' ')[0].slice(0,3),value:kind==='income'?x.income:x.purchases}));
    let body='';
    if(kind==='wealth'){
      const wealth=series.filter(x=>x.net!==null).map(x=>({name:monthName(x.month).split(' ')[0].slice(0,3),value:x.net}));
      body=plot('Patrimonio estimado: '+M(t.netWorth),line(wealth,M,E))+plot('Distribución de dinero',bars(chosen.filter(a=>a.type!=='credit').map(a=>({name:a.name,value:F.accountBalance(a,active)})),M,E));
    }else if(kind==='income'){
      body=plot('Ingresos del mes: '+M(b.income),bars(months,M,E))+plot('Por cuenta',bars(chosen.map(a=>({name:a.name,value:active.filter(m=>m.type==='income'&&m.date.slice(0,7)===month&&m.accountId===a.id).reduce((s,m)=>s+m.amount,0)})).filter(x=>x.value),M,E));
    }else if(kind==='purchases'){
      body=plot('Compras atribuidas: '+M(b.purchases),bars(months,M,E))+plot('Por categoría',bars(Object.entries(b.byCat).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value),M,E));
    }else if(kind==='savings'){
      const savings=chosen.filter(a=>a.type==='saving'||a.type==='pocket').map(a=>({name:a.name,value:F.accountBalance(a,active)}));
      body=plot('Ahorro total: '+M(savings.reduce((s,a)=>s+a.value,0)),bars(savings,M,E))+'<p class="footnote">Transferir entre tus cuentas no es un gasto ni un ingreso.</p>';
    }else{
      const credit=chosen.filter(a=>a.type==='credit'),charges=credit.map(a=>({name:a.name,value:F.statementCharges(a,active,month).total}));
      const future=Array.from({length:6},(_,i)=>{const m=F.shiftMonth(month,i+1);return {name:monthName(m),value:F.monthlyInstallments(credit,active,m)}});
      body=plot('Cargos del corte: '+M(charges.reduce((s,a)=>s+a.value,0)),bars(charges,M,E))+plot('Mensualidades futuras',bars(future,M,E))+'<p class="footnote">Los cargos estimados no equivalen necesariamente al pago exigible por el banco.</p>';
    }
    const def=definitions[kind]||definitions.wealth;
    return `<div class="page-head"><div><div class="eyebrow">${E(def[1])}</div><h1>${E(def[0])}</h1></div><input id="month-control" type="month" class="month-control" value="${E(month)}" aria-label="Mes del informe"></div>
    <div class="toolbar"><button class="secondary small" data-action="back-home">← Volver al resumen</button><select id="insight-account" aria-label="Filtrar por cuenta"><option value="all">Todas las cuentas</option>${accounts.map(a=>`<option value="${E(a.id)}" ${accountId===a.id?'selected':''}>${E(a.name)}</option>`).join('')}</select></div>${body}`;
  }
  return {render,definitions,bars,line};
});