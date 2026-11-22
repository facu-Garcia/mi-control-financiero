/* Mi Control Financiero - offline-first PWA. No credentials or bank account numbers. */
(() => {
  'use strict';
  const F = window.Finance;
  const DB_NAME = 'mi-control-financiero-db';
  const DB_VERSION = 1;
  const accountTypes = {debit:'Cuenta de débito',credit:'Tarjeta de crédito',cash:'Efectivo',saving:'Ahorro',pocket:'Cajita / apartado'};
  const typeIcons = {debit:'▤',credit:'▰',cash:'▣',saving:'◇',pocket:'⬡'};
  const txNames = {expense:'Gasto',income:'Ingreso',transfer:'Transferencia',payment:'Pago de tarjeta',yield:'Rendimiento'};
  const txIcons = {expense:'↗',income:'↙',transfer:'⇄',payment:'✓',yield:'✧'};
  const cats = ['Comida','Supermercado','Transporte','Vivienda','Servicios','Entretenimiento','Salud','Compras','Suscripciones','Educación','Otros'];
  const main = document.getElementById('main');
  const modal = document.getElementById('modal');
  const modalInner = document.getElementById('modal-inner');
  const toastNode = document.getElementById('toast');
  let db;
  let state = {accounts:[],movements:[],settings:{salary:0,savingsTarget:0}};
  let page = 'home', selectedMonth = localDate().slice(0,7), filter = 'all', selectedAccount = null;

  function localDate(offset=0){const d=new Date(); d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function id(){return (crypto.randomUUID ? crypto.randomUUID() : 'id-'+Date.now()+'-'+Math.random().toString(36).slice(2));}
  function esc(s){return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function money(c){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2}).format((Number(c)||0)/100);}
  function cents(s){const n=Number(s);return Number.isFinite(n)?Math.round(n*100):NaN;}
  function val(c){return ((Number(c)||0)/100).toFixed(2);}
  function monthName(m){const [y,mo]=m.split('-').map(Number);return new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1));}
  function shortDate(s){const [y,m,d]=s.split('-');return `${d}/${m}/${y}`;}
  function getAccount(aid){return F.accountById(state.accounts,aid);}
  function sortTx(list){return [...list].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));}
  function notify(msg){toastNode.textContent=msg;toastNode.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toastNode.classList.remove('show'),3500);}
  function request(store,method,arg){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly');const req=tx.objectStore(store)[method](arg);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  function mutate(store,kind,entry){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);const target=tx.objectStore(store);if(kind==='put')target.put(entry);else if(kind==='delete')target.delete(entry);});}
  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;for(const s of ['accounts','movements','settings'])if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function reload(){const [accounts,movements,settings]=await Promise.all([request('accounts','getAll'),request('movements','getAll'),request('settings','get','preferences')]);state={accounts,movements,settings:settings||{id:'preferences',salary:0,savingsTarget:0}};render();}
  async function save(store,entry){await mutate(store,'put',entry);await reload();}
  async function remove(store,identifier){await mutate(store,'delete',identifier);await reload();}
  function header(title,detail=''){return `<div class="page-head"><div><div class="eyebrow">${esc(detail||'Tu centro financiero')}</div><h1>${esc(title)}</h1></div><input id="month-control" aria-label="Mes del reporte" type="month" class="month-control" value="${esc(selectedMonth)}"></div>`;}
  function sectionTitle(t,action='',label=''){return `<div class="section-title"><h2>${esc(t)}</h2>${action?`<button class="text-btn" data-action="${esc(action)}">${esc(label||'Ver más')}</button>`:''}</div>`;}
  function blank(message,button=''){return `<div class="empty"><span class="symbol">◈</span>${esc(message)}${button?`<div style="margin-top:14px"><button class="secondary small" data-action="${esc(button)}">${button==='add-account'?'Agregar mi primera cuenta':'Registrar movimiento'}</button></div>`:''}</div>`;}
  function accountList(accs,clickable=true){return accs.length?accs.map(a=>{
    const balance=F.accountBalance(a,state.movements),credit=a.type==='credit';
    return `<div class="account-row"><div class="account-icon ${esc(a.type)}">${typeIcons[a.type]||'▤'}</div><div class="row-body"><div class="row-title">${esc(a.name)}</div><div class="row-sub">${esc(a.institution||accountTypes[a.type])} · ${esc(accountTypes[a.type])}</div></div><div class="row-amount ${credit?'negative':''}">${money(balance)}<small>${credit?'Deuda estimada':'Saldo estimado'}</small></div>${clickable?`<button class="iconbtn" data-action="account-detail" data-id="${esc(a.id)}" aria-label="Detalle de cuenta" style="width:31px;height:31px;font-size:16px">›</button>`:''}</div>`;
  }).join(''):blank('Todavía no hay cuentas registradas.','add-account');}
  function monthlyTx(){return sortTx(state.movements.filter(m=>m.type==='expense'?F.monthlyPurchaseMonth(m,getAccount(m.accountId))===selectedMonth:F.monthOf(m.date)===selectedMonth));}
  function txList(items,removeButtons=false){return items.length?items.map(m=>{
    const origin=getAccount(m.accountId), dest=getAccount(m.toAccountId);
    const name=m.description||(m.type==='expense'?m.category:txNames[m.type]);
    let sub=`${shortDate(m.date)} · ${esc(origin?.name||'Cuenta eliminada')}`;
    if(dest)sub+=` → ${esc(dest.name)}`;
    if(m.type==='expense'&&origin?.type==='credit')sub+=` · Corte ${esc(monthName(F.statementOf(m.date,origin.cutDay)))}`;
    if(m.type==='expense'&&Number(m.months)>1)sub+=` · ${m.months} MSI`;
    const cls=m.type==='income'||m.type==='yield'?'positive':m.type==='expense'?'negative':'';
    return `<div class="tx-row"><div class="tx-icon">${txIcons[m.type]||'⇄'}</div><div class="row-body"><div class="row-title">${esc(name)}</div><div class="row-sub">${sub}</div></div><div class="row-amount ${cls}">${m.type==='income'||m.type==='yield'?'+':m.type==='expense'?'-':''}${money(m.amount)}<small>${esc(txNames[m.type])}</small></div>${removeButtons?`<button class="iconbtn" data-action="remove-tx" data-id="${esc(m.id)}" title="Eliminar movimiento" aria-label="Eliminar movimiento" style="width:29px;height:29px;font-size:15px">×</button>`:''}</div>`;
  }).join(''):blank('No hay movimientos para este periodo.','add-movement');}
  function renderHome(){
    const t=F.totals(state.accounts,state.movements),b=F.breakdown(state.accounts,state.movements,selectedMonth),tx=monthlyTx();
    const cards=state.accounts.filter(a=>a.type==='credit');const charges=cards.reduce((s,a)=>s+F.statementCharges(a,state.movements,selectedMonth).total,0);
    main.innerHTML=header('Tu dinero','Resumen general')+`<div class="hero"><div class="hero-label">Patrimonio neto estimado</div><div class="hero-value">${money(t.netWorth)}</div><div class="hero-sub">Saldos disponibles + ahorros − deuda de tarjetas</div><div class="hero-bottom"><div class="hero-mini">Dinero y ahorros<b>${money(t.assets)}</b></div><div class="hero-mini">Deuda en tarjetas<b>${money(t.debts)}</b></div></div></div>
    <div class="two-col" style="margin-top:12px"><div class="stat"><div class="k">Ingresos recibidos este mes</div><div class="v positive">${money(b.income)}</div><div class="hint">Salario previsto: ${money(state.settings.salary||0)}</div></div><div class="stat"><div class="k">Compras del mes financiero</div><div class="v">${money(b.purchases)}</div><div class="hint">Tarjetas según fecha de corte</div></div><div class="stat"><div class="k">Ahorros en cajitas y cuentas</div><div class="v sky">${money(t.saved)}</div><div class="hint">Incluidos en tu dinero total</div></div><div class="stat"><div class="k">Cargos de tarjetas en el corte</div><div class="v gold">${money(charges)}</div><div class="hint">Incluye mensualidades MSI estimadas</div></div></div>
    ${sectionTitle('Mis cuentas','goto-accounts','Ver todas')}<div class="panel">${accountList(state.accounts.slice(0,5))}</div>
    ${sectionTitle('Movimientos del periodo','goto-movements','Ver todos')}<div class="panel">${txList(tx.slice(0,5))}</div>
    <p class="footnote">El saldo es una estimación basada en los saldos iniciales y movimientos registrados. Los cargos del corte no equivalen necesariamente al pago exigible por el banco.</p>`;
  }
  function renderAccounts(){
    const assets=state.accounts.filter(a=>a.type!=='credit'),cards=state.accounts.filter(a=>a.type==='credit');
    main.innerHTML=header('Bancos y tarjetas','Todas tus cuentas')+`<div class="toolbar"><button class="primary small" data-action="add-account">＋ Agregar cuenta o tarjeta</button></div>
      ${sectionTitle('Dinero, efectivo y cajitas')}<div class="panel">${accountList(assets)}</div>
      ${sectionTitle('Tarjetas de crédito')}<div class="panel">${cards.length?accountList(cards):blank('Agrega tus tarjetas para controlar cortes, saldos y MSI.')}</div>
      <p class="footnote">Cada cuenta parte de un saldo inicial al cierre de la fecha que elijas. Solo se aplican a ese saldo los movimientos posteriores; los anteriores pueden servir para el historial sin duplicar dinero.</p>`;
  }
  function renderMovements(){
    const tx=monthlyTx().filter(m=>filter==='all'||m.type===filter);
    main.innerHTML=header('Tus movimientos','Historial por mes financiero')+`<div class="pills">${[['all','Todos'],['expense','Gastos'],['income','Ingresos'],['payment','Pagos'],['transfer','Transferencias'],['yield','Rendimientos']].map(([v,label])=>`<button class="pill ${filter===v?'sel':''}" data-action="filter" data-filter="${v}">${label}</button>`).join('')}</div><div class="panel">${txList(tx,true)}</div><p class="footnote">Las compras de crédito se agrupan por el mes de corte. Transferencias, pagos y movimientos de débito se muestran por su fecha real.</p>`;
  }
  function renderReports(){
    const b=F.breakdown(state.accounts,state.movements,selectedMonth),catsList=Object.entries(b.byCat).sort((a,c)=>c[1]-a[1]);
    const cards=state.accounts.filter(a=>a.type==='credit');
    const stmt=cards.map(a=>({a,s:F.statementCharges(a,state.movements,selectedMonth)}));
    const future=Array.from({length:6},(_,i)=>{const month=F.shiftMonth(selectedMonth,i+1);return {month,value:F.monthlyInstallments(state.accounts,state.movements,month)};});
    main.innerHTML=header('Informe mensual','Análisis detallado')+`<div class="two-col"><div class="stat"><div class="k">Ingreso efectivamente recibido</div><div class="v positive">${money(b.income)}</div></div><div class="stat"><div class="k">Compras atribuibles al mes</div><div class="v negative">${money(b.purchases)}</div></div><div class="stat"><div class="k">Salidas bancarias de efectivo</div><div class="v">${money(b.bankOutflow)}</div><div class="hint">Compras débito + pagos de tarjeta</div></div><div class="stat"><div class="k">Rendimientos registrados</div><div class="v sky">${money(b.yields)}</div></div></div>
    ${sectionTitle('¿En qué gastaste?')}<div class="panel">${catsList.length?catsList.map(([name,amount])=>`<div class="baritem"><div class="baritem-row"><span>${esc(name)}</span><b>${money(amount)}</b></div><div class="progress"><div style="width:${b.purchases?Math.min(100,100*amount/b.purchases):0}%"></div></div></div>`).join(''):blank('Todavía no hay gastos registrados en este mes.')}</div>
    ${sectionTitle('Cargos por tarjeta en el corte')}<div class="panel">${stmt.length?stmt.map(({a,s})=>`<div class="report-line"><span><b>${esc(a.name)}</b><br><span class="help">${esc('Corte día '+a.cutDay)} · Ordinarios ${money(s.ordinary)} · MSI ${money(s.installments)}</span></span><b>${money(s.total)}</b></div>`).join(''):blank('Aún no has agregado tarjetas de crédito.')}</div>
    <p class="footnote">Los cargos del corte son una proyección a partir de tus compras registradas. No sustituyen el estado de cuenta oficial: no incluyen automáticamente saldo previo, comisiones, ajustes, devoluciones ni intereses.</p>
    ${sectionTitle('MSI comprometidos: próximos 6 meses')}<div class="panel">${future.map(x=>`<div class="report-line"><span>${esc(monthName(x.month))}</span><b>${money(x.value)}</b></div>`).join('')}</div>
    ${sectionTitle('Flujo de efectivo del calendario')}<div class="panel"><div class="report-line"><span>Ingresos y rendimientos recibidos</span><b class="positive">${money(b.income+b.yields)}</b></div><div class="report-line"><span>Compras de débito / efectivo</span><b>${money(b.bankOutflow-b.cardPayments)}</b></div><div class="report-line"><span>Pagos a tarjetas</span><b>${money(b.cardPayments)}</b></div><div class="report-line"><span><b>Flujo neto registrado</b></span><b class="${b.cashChange>=0?'positive':'negative'}">${money(b.cashChange)}</b></div></div>
    <div class="toolbar"><button class="primary small" data-action="export-report">Exportar informe JSON</button><button class="secondary small" data-action="export-csv">Exportar CSV</button></div>
    <div class="inline-note">El gasto de una compra a MSI se registra íntegro en el mes financiero de la compra; los cargos a pagar se distribuyen en los meses de corte futuros. Por eso "compras" y "cargos de tarjetas" son indicadores distintos.</div>`;
  }
  function render(){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    if(page==='home')renderHome();else if(page==='accounts')renderAccounts();else if(page==='movements')renderMovements();else renderReports();}
  function navigate(p){page=p;filter='all';render();window.scrollTo(0,0);}
  function openModal(title,body){modalInner.innerHTML=`<div class="modal-body"><div class="modal-head"><h2>${esc(title)}</h2><button class="close" data-action="close" aria-label="Cerrar">×</button></div>${body}</div>`;if(!modal.open)modal.showModal();}
  function closeModal(){if(modal.open)modal.close();}
  const option=(v,label,selected)=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(label)}</option>`;
  function field(label,name,type='text',value='',hint='',extra=''){return `<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><input id="f-${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}>${hint?`<small>${esc(hint)}</small>`:''}</div>`;}
  function accountForm(existing=null){
    const a=existing||{name:'',institution:'',type:'debit',balanceDate:localDate(-1),initialBalance:0,initialDebt:0,creditLimit:0,cutDay:20,dueDay:10};
    openModal(existing?'Editar cuenta':'Nueva cuenta o tarjeta',`<form id="account-form" class="form">
      ${field('Nombre visible','name','text',a.name,'Ejemplo: Mercado Pago, BBVA Nómina, Nu Cajita','required maxlength="70"')}
      ${field('Institución (opcional)','institution','text',a.institution,'No introduzcas números de tarjeta o cuenta.','maxlength="70"')}
      <div class="field"><label for="f-type">Tipo de cuenta</label><select name="type" id="f-type" ${existing?'disabled':''}>${Object.entries(accountTypes).map(([v,l])=>option(v,l,a.type)).join('')}</select></div>
      <div id="asset-fields">${field('Saldo al cierre de la fecha base ($)','initialBalance','number',val(a.initialBalance),'Los movimientos anteriores a esta fecha serán solo históricos.','step="0.01" required')}</div>
      <div id="credit-fields">${field('Deuda inicial al cierre de la fecha base ($)','initialDebt','number',val(a.initialDebt),'Incluye compras existentes antes de registrar movimientos.','min="0" step="0.01"')}
        <div class="form-row">${field('Límite de crédito ($)','creditLimit','number',val(a.creditLimit),'','min="0" step="0.01"')}${field('Día de corte','cutDay','number',a.cutDay,'','min="1" max="31"')}</div>
        ${field('Día habitual de pago (informativo)','dueDay','number',a.dueDay,'Confirma en el banco el vencimiento exacto de cada corte.','min="1" max="31"')}</div>
      ${field('Fecha de saldo inicial (al cierre del día)','balanceDate','date',a.balanceDate,'Por defecto ayer: así los movimientos de hoy sí actualizan el saldo.','required')}
      <div class="inline-note">No registres números completos de tarjetas, contraseñas, NIP ni CVV. Los saldos se calculan desde esta fecha base.</div>
      <div class="modal-footer"><button type="button" class="secondary" data-action="close">Cancelar</button><button class="primary" type="submit">${existing?'Guardar cambios':'Agregar cuenta'}</button></div>
      ${existing?'<button type="button" class="linklike danger-text" id="delete-account-btn">Eliminar esta cuenta</button>':''}
    </form>`);
    const f=document.getElementById('account-form');
    const toggle=()=>{const credit=(existing?.type||f.elements.type.value)==='credit';document.getElementById('asset-fields').hidden=credit;document.getElementById('credit-fields').hidden=!credit;};
    f.elements.type.addEventListener('change',toggle);toggle();
    f.addEventListener('submit',async e=>{e.preventDefault();try{
      const type=existing?.type||f.elements.type.value,base=f.elements.balanceDate.value;
      if(!base)throw Error('Selecciona la fecha del saldo inicial.');
      const aNew={id:existing?.id||id(),name:f.elements.name.value.trim(),institution:f.elements.institution.value.trim(),type,balanceDate:base,
        initialBalance:cents(f.elements.initialBalance.value),initialDebt:cents(f.elements.initialDebt.value),creditLimit:cents(f.elements.creditLimit.value),cutDay:Number(f.elements.cutDay.value),dueDay:Number(f.elements.dueDay.value),createdAt:existing?.createdAt||new Date().toISOString()};
      if(!aNew.name)throw Error('Escribe el nombre de la cuenta.');
      if([aNew.initialBalance,aNew.initialDebt,aNew.creditLimit].some(x=>!Number.isSafeInteger(x)))throw Error('Ingresa montos válidos.');
      if(type==='credit'&&(!Number.isInteger(aNew.cutDay)||aNew.cutDay<1||aNew.cutDay>31||!Number.isInteger(aNew.dueDay)||aNew.dueDay<1||aNew.dueDay>31))throw Error('El día de corte y pago debe ser del 1 al 31.');
      await save('accounts',aNew);closeModal();notify('Cuenta guardada');
    }catch(err){notify(err.message||'No se pudo guardar');}});
    if(existing)document.getElementById('delete-account-btn').addEventListener('click',async()=>{
      if(state.movements.some(m=>m.accountId===existing.id||m.toAccountId===existing.id)){notify('Elimina primero los movimientos vinculados a esta cuenta.');return;}
      if(confirm('¿Eliminar esta cuenta?')){await remove('accounts',existing.id);closeModal();notify('Cuenta eliminada');}
    });
  }
  function movementForm(){
    if(!state.accounts.length){notify('Primero agrega al menos una cuenta.');accountForm();return;}
    const targetOptions=state.accounts.filter(a=>a.type!=='credit');
    openModal('Registrar movimiento',`<form id="movement-form" class="form">
      <div class="field"><label for="m-type">Tipo de movimiento</label><select name="type" id="m-type">${Object.entries(txNames).map(([v,l])=>option(v,l,'expense')).join('')}</select></div>
      <div class="form-row">${field('Importe ($)','amount','number','','','required min="0.01" step="0.01" inputmode="decimal"')}${field('Fecha','date','date',localDate(),'','required')}</div>
      <div class="field"><label for="m-from" id="m-from-label">Cuenta o tarjeta utilizada</label><select name="accountId" id="m-from"></select></div>
      <div class="field" id="m-to-row" hidden><label for="m-to">Cuenta de destino</label><select name="toAccountId" id="m-to"></select></div>
      <div class="field" id="m-cat-row"><label for="m-cat">Categoría</label><select name="category" id="m-cat">${cats.map(c=>option(c,c,'Otros')).join('')}</select></div>
      <div class="field" id="m-msi-row" hidden><label for="m-msi">¿Cuántas mensualidades?</label><select name="months" id="m-msi">${[1,2,3,4,5,6,9,12,18,24,36,48].map(n=>option(String(n),n===1?'Pago normal (sin MSI)':`${n} meses sin intereses`,'1')).join('')}</select><small>Registra el importe total de la compra, no una sola mensualidad.</small></div>
      ${field('Descripción (opcional)','description','text','','Ejemplo: supermercado, renta, audífonos.','maxlength="130"')}
      <div class="inline-note" id="m-help">Las compras de crédito se asignan al mes del corte. Un pago a la tarjeta no se cuenta nuevamente como gasto.</div>
      <div class="modal-footer"><button type="button" class="secondary" data-action="close">Cancelar</button><button type="submit" class="primary">Guardar movimiento</button></div></form>`);
    const f=document.getElementById('movement-form');
    function opts(list){return list.map(a=>option(a.id,`${a.name} · ${accountTypes[a.type]}`,'')).join('');}
    function refreshType(){
      const type=f.elements.type.value;
      const sources=(type==='income'||type==='yield'||type==='payment'||type==='transfer')?targetOptions:state.accounts;
      const old=f.elements.accountId.value;
      f.elements.accountId.innerHTML=opts(sources);
      if(sources.some(a=>a.id===old))f.elements.accountId.value=old;
      const needsTo=type==='payment'||type==='transfer';
      document.getElementById('m-to-row').hidden=!needsTo;
      document.getElementById('m-cat-row').hidden=type!=='expense';
      f.elements.toAccountId.innerHTML=opts(type==='payment'?state.accounts.filter(a=>a.type==='credit'):targetOptions);
      document.getElementById('m-from-label').textContent=type==='income'||type==='yield'?'Cuenta que recibe el dinero':type==='expense'?'Cuenta o tarjeta utilizada':'Cuenta de origen';
      document.getElementById('m-help').textContent=type==='transfer'?'Una transferencia entre tus cuentas no es un gasto ni un ingreso.':type==='payment'?'Un pago reduce el dinero de origen y la deuda de la tarjeta, sin duplicar el gasto.':type==='yield'?'Registra el rendimiento depositado. No es lo mismo que transferir dinero a una cajita.':type==='income'?'El salario configurado es un presupuesto; registra aquí cada ingreso que efectivamente recibas.':'Las compras de crédito se asignan al mes del corte. Si eliges MSI, escribe el importe total de la compra.';
      refreshMsi();
    }
    function refreshMsi(){const src=getAccount(f.elements.accountId.value);document.getElementById('m-msi-row').hidden=!(f.elements.type.value==='expense'&&src?.type==='credit');}
    f.elements.type.addEventListener('change',refreshType);
    f.elements.accountId.addEventListener('change',refreshMsi);
    refreshType();
    f.addEventListener('submit',async e=>{e.preventDefault();try{
      const type=f.elements.type.value,accountId=f.elements.accountId.value,toAccountId=f.elements.toAccountId.value;
      const source=getAccount(accountId),dest=getAccount(toAccountId),amount=cents(f.elements.amount.value);
      if(!source)throw Error('Elige una cuenta de origen.');
      if(!Number.isSafeInteger(amount)||amount<=0)throw Error('El importe debe ser mayor a cero.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(f.elements.date.value))throw Error('Fecha inválida.');
      if(type==='payment'&&(!dest||dest.type!=='credit'||source.type==='credit'))throw Error('Elige una cuenta y una tarjeta de crédito.');
      if(type==='transfer'&&(!dest||dest.id===source.id||source.type==='credit'||dest.type==='credit'))throw Error('Elige dos cuentas distintas de dinero o ahorro.');
      const months=type==='expense'&&source.type==='credit'?Number(f.elements.months.value):1;
      const movement={id:id(),type,date:f.elements.date.value,accountId,toAccountId:(type==='payment'||type==='transfer')?toAccountId:'',amount,category:type==='expense'?f.elements.category.value:type==='income'?'Ingresos':type==='yield'?'Rendimientos':'',description:f.elements.description.value.trim(),months,createdAt:new Date().toISOString()};
      await save('movements',movement);closeModal();notify('Movimiento registrado');
    }catch(err){notify(err.message||'No se pudo registrar el movimiento');}});
  }
  function accountDetail(aid){
    const a=getAccount(aid);if(!a)return;
    const balance=F.accountBalance(a,state.movements),tx=sortTx(state.movements.filter(m=>m.accountId===aid||m.toAccountId===aid)).slice(0,12);
    const card=a.type==='credit';const breakdown=card?F.statementCharges(a,state.movements,selectedMonth):null;
    openModal(a.name,`<div class="panel"><div class="eyebrow">${card?'Deuda estimada':'Saldo disponible estimado'}</div><div class="summary-figure">${money(balance)}</div><div class="help">Saldo base al cierre del ${shortDate(a.balanceDate)}: ${money(card?a.initialDebt:a.initialBalance)}</div>
      ${card?`<div class="divider"></div><div class="report-line"><span>Límite de crédito</span><b>${money(a.creditLimit)}</b></div><div class="report-line"><span>Disponible aproximado</span><b>${money(a.creditLimit-balance)}</b></div><div class="report-line"><span>Día de corte</span><b>${esc(a.cutDay)}</b></div><div class="report-line"><span>Día habitual de pago</span><b>${esc(a.dueDay)}</b></div><div class="report-line"><span>Cargos estimados del corte de ${esc(monthName(selectedMonth))}</span><b>${money(breakdown.total)}</b></div>`:''}</div>
      ${sectionTitle('Movimientos relacionados')}<div class="panel">${txList(tx)}</div><div class="toolbar"><button class="secondary small" id="edit-account-btn">Editar cuenta</button></div>
      <p class="footnote">Las compras anteriores a la fecha base aparecen en el historial, pero no modifican el saldo actual.</p>`);
    document.getElementById('edit-account-btn').addEventListener('click',()=>accountForm(a));
  }
  function settingsModal(){
    openModal('Configuración y respaldos',`<form id="settings-form" class="form">
      ${field('Ingreso mensual previsto ($)','salary','number',val(state.settings.salary||0),'Úsalo como referencia: los ingresos reales se registran como movimientos.','min="0" step="0.01"')}
      ${field('Meta de ahorro mensual ($)','savingsTarget','number',val(state.settings.savingsTarget||0),'Esta cifra es una meta, no un saldo de cuenta.','min="0" step="0.01"')}
      <button type="submit" class="primary full">Guardar preferencias</button></form>
      <div class="divider"></div><div class="section-title"><h2>Seguridad y archivos</h2></div>
      <div class="stack"><button class="secondary full" data-action="export-backup">Exportar respaldo completo JSON</button><button class="secondary full" data-action="import-backup">Restaurar respaldo JSON</button><button class="secondary full" data-action="request-persistence">Solicitar almacenamiento persistente</button></div>
      <div class="inline-note" style="margin-top:14px">Los datos están guardados en este navegador, no en GitHub. El respaldo JSON de esta versión <b>no está cifrado</b>: guárdalo en un sitio privado y protegido. No subas respaldos ni estados de cuenta a un repositorio público.</div>
      <div class="divider"></div><div class="help">Versión inicial 0.1 · MXN · Uso personal · Sin sincronización automática</div>`);
    document.getElementById('settings-form').addEventListener('submit',async e=>{e.preventDefault();try{
      const f=e.currentTarget,salary=cents(f.elements.salary.value),savingsTarget=cents(f.elements.savingsTarget.value);
      if(!Number.isSafeInteger(salary)||salary<0||!Number.isSafeInteger(savingsTarget)||savingsTarget<0)throw Error('Ingresa cifras válidas.');
      await save('settings',{id:'preferences',salary,savingsTarget});closeModal();notify('Preferencias guardadas');
    }catch(err){notify(err.message);}});
  }
  function downloadFile(name,contents,mime){const file=new Blob([contents],{type:mime});const href=URL.createObjectURL(file);const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),5000);}
  function exportBackup(){const payload={schemaVersion:1,kind:'complete-backup',exportedAt:new Date().toISOString(),currency:'MXN',accounts:state.accounts,movements:state.movements,settings:state.settings};downloadFile(`mis-finanzas-respaldo-${localDate()}.json`,JSON.stringify(payload,null,2),'application/json');notify('Respaldo exportado. Guárdalo en un lugar privado.');}
  function exportReport(){const payload=F.reportForMonth(state.accounts,state.movements,state.settings,selectedMonth);downloadFile(`mi-informe-${selectedMonth}.json`,JSON.stringify(payload,null,2),'application/json');notify('Informe mensual exportado');}
  function exportCsv(){const r=F.reportForMonth(state.accounts,state.movements,state.settings,selectedMonth);const rows=[['fecha','mes_financiero','tipo','cuenta_origen','cuenta_destino','categoria','descripcion','importe_MXN','meses_MSI']];
    for(const m of r.movements)rows.push([m.date,m.financialMonth,m.type,getAccount(m.accountId)?.name||'',getAccount(m.toAccountId)?.name||'',m.category||'',m.description||'',val(m.amount),m.months||1]);
    const csv='\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');downloadFile(`mis-movimientos-${selectedMonth}.csv`,csv,'text/csv;charset=utf-8');notify('CSV exportado');}
  function validatedBackup(x){
    if(!x||x.kind!=='complete-backup'||x.schemaVersion!==1||!Array.isArray(x.accounts)||!Array.isArray(x.movements)||!x.settings||x.accounts.length>1000||x.movements.length>100000)throw Error('El archivo no es un respaldo compatible.');
    const validId=s=>typeof s==='string'&&s.length>0&&s.length<=100;
    const validMoney=v=>Number.isSafeInteger(v)&&Math.abs(v)<=1e15;
    const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
    const accounts=x.accounts.map(a=>{
      if(!validId(a.id)||!Object.hasOwn(accountTypes,a.type)||typeof a.name!=='string'||a.name.length>90||!validDate(a.balanceDate)||!validMoney(a.initialBalance)||!validMoney(a.initialDebt)||!validMoney(a.creditLimit)||!Number.isInteger(a.cutDay)||a.cutDay<1||a.cutDay>31||!Number.isInteger(a.dueDay)||a.dueDay<1||a.dueDay>31)throw Error('El respaldo contiene una cuenta inválida.');
      return {id:a.id,name:a.name,institution:String(a.institution||'').slice(0,90),type:a.type,balanceDate:a.balanceDate,initialBalance:a.initialBalance,initialDebt:a.initialDebt,creditLimit:a.creditLimit,cutDay:a.cutDay,dueDay:a.dueDay,createdAt:String(a.createdAt||'')};
    });
    const idMap=new Map(accounts.map(a=>[a.id,a]));if(idMap.size!==accounts.length)throw Error('Hay cuentas duplicadas.');
    const movements=x.movements.map(m=>{
      if(!validId(m.id)||!Object.hasOwn(txNames,m.type)||!validDate(m.date)||!validId(m.accountId)||!idMap.has(m.accountId)||!validMoney(m.amount)||m.amount<=0||!Number.isInteger(m.months)||m.months<1||m.months>120||typeof m.description!=='string'||m.description.length>200||typeof m.category!=='string'||m.category.length>100)throw Error('El respaldo contiene movimientos inválidos.');
      const dst=String(m.toAccountId||'');if((m.type==='transfer'||m.type==='payment')&&!idMap.has(dst))throw Error('Hay movimientos con destino inexistente.');
      return {id:m.id,type:m.type,date:m.date,accountId:m.accountId,toAccountId:dst,amount:m.amount,months:m.months,category:m.category,description:m.description,createdAt:String(m.createdAt||'')};
    });
    if(new Set(movements.map(m=>m.id)).size!==movements.length)throw Error('Hay movimientos duplicados.');
    const salary=x.settings.salary||0,target=x.settings.savingsTarget||0;
    if(!validMoney(salary)||!validMoney(target)||salary<0||target<0)throw Error('Las preferencias son inválidas.');
    return {accounts,movements,settings:{id:'preferences',salary,savingsTarget:target}};
  }
  async function replaceBackup(x){return new Promise((resolve,reject)=>{const tx=db.transaction(['accounts','movements','settings'],'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Importación cancelada'));
    for(const storeName of ['accounts','movements','settings'])tx.objectStore(storeName).clear();
    x.accounts.forEach(a=>tx.objectStore('accounts').put(a));x.movements.forEach(m=>tx.objectStore('movements').put(m));tx.objectStore('settings').put(x.settings);
  });}
  async function importBackupFile(file){if(!file)return;if(file.size>15*1024*1024){notify('Archivo demasiado grande (máximo 15 MB).');return;}
    try{const x=validatedBackup(JSON.parse(await file.text()));
      const ok=confirm(`Este respaldo tiene ${x.accounts.length} cuentas y ${x.movements.length} movimientos. RESTAURARLO REEMPLAZARÁ TODOS LOS DATOS ACTUALES en este navegador. Antes exporta un respaldo actual. ¿Continuar?`);
      if(!ok)return;
      await replaceBackup(x);closeModal();await reload();notify('Respaldo restaurado correctamente');
    }catch(err){notify(err.message||'No se pudo importar el archivo');}
  }
  async function askPersist(){if(!navigator.storage?.persist){notify('Este navegador no ofrece la opción de persistencia.');return;}
    try{const allowed=await navigator.storage.persist();notify(allowed?'Almacenamiento persistente concedido':'El navegador no concedió persistencia. Conserva tus respaldos.');}catch{notify('No se pudo solicitar persistencia');}}
  document.body.addEventListener('click',async e=>{
    const nav=e.target.closest('[data-page]');if(nav){navigate(nav.dataset.page);return;}
    const target=e.target.closest('[data-action]');if(!target)return;
    const action=target.dataset.action;
    try{switch(action){case 'close':closeModal();break;
      case 'add-account':accountForm();break;case 'add-movement':movementForm();break;
      case 'account-detail':accountDetail(target.dataset.id);break;
      case 'remove-tx':if(confirm('¿Eliminar este movimiento? Se recalcularán saldos y reportes.')){await remove('movements',target.dataset.id);notify('Movimiento eliminado');}break;
      case 'goto-accounts':navigate('accounts');break;case 'goto-movements':navigate('movements');break;
      case 'filter':filter=target.dataset.filter;render();break;
      case 'export-backup':exportBackup();break;case 'export-report':exportReport();break;case 'export-csv':exportCsv();break;
      case 'import-backup':document.getElementById('import-file').click();break;
      case 'request-persistence':await askPersist();break;
    }}catch(err){notify(err.message||'Ocurrió un error');}
  });
  document.getElementById('fab-add').addEventListener('click',movementForm);
  document.getElementById('btn-settings').addEventListener('click',settingsModal);
  document.getElementById('import-file').addEventListener('change',async e=>{await importBackupFile(e.target.files?.[0]);e.target.value='';});
  document.getElementById('modal').addEventListener('click',e=>{if(e.target===modal)closeModal();});
  main.addEventListener('change',e=>{if(e.target.id==='month-control'&&/^\d{4}-\d{2}$/.test(e.target.value)){selectedMonth=e.target.value;render();}});
  async function init(){
    try{db=await openDb();await reload();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});}
    catch(err){main.innerHTML=`<div class="panel"><h2>No se pudo abrir el almacenamiento</h2><p>Activa el almacenamiento local del navegador e inténtalo de nuevo. No utilices el modo incógnito para guardar tus finanzas.</p><p class="help">${esc(err.message)}</p></div>`;document.getElementById('fab-add').disabled=true;}
  }
  init();
})();
