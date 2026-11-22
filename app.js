/* Mi Control Financiero - offline-first PWA. No credentials or bank account numbers. */
(() => {
  'use strict';
  const F = window.Finance;
  const CSV = window.FinanceCSV;
  const G = window.FinanceDrive;
  const S = window.FinanceStorage;
  const Cards = window.FinanceCards;
  const CardImages = window.FinanceCardImages;
  const Rec = window.FinanceRecurring;
  const Insight = window.FinanceInsights;
  const Dash = window.FinanceDashboard;
  const Forms = window.FinanceForms;
  const AccountPicker = window.FinanceAccountPicker;
  const DB_NAME = 'mi-control-financiero-db';
  const DB_VERSION = 3;
  const accountTypes = {debit:'Cuenta de débito',credit:'Tarjeta de crédito',cash:'Efectivo',saving:'Ahorro',pocket:'Cajita / apartado'};
  const typeIcons = {debit:'▤',credit:'▰',cash:'▣',saving:'◇',pocket:'⬡'};
  const txNames = {expense:'Gasto',income:'Ingreso',transfer:'Transferencia',payment:'Pago de tarjeta',yield:'Rendimiento'};
  const txIcons = {expense:'↗',income:'↙',transfer:'⇄',payment:'✓',yield:'✧'};
  const categoryIcons={Comida:'🍽',Supermercado:'🛒',Transporte:'🚇',Vivienda:'⌂',Servicios:'⚡',Entretenimiento:'◈',Salud:'✚',Compras:'🛍',Suscripciones:'↻',Educación:'▤',Otros:'○'};
  const bankThemes={inbursa:{color:'#2775ac',label:'INBURSA'},'mercado pago':{color:'#00a6ec',label:'MP'},nu:{color:'#8233ad',label:'nu'},nub:{color:'#8233ad',label:'nu'},bbva:{color:'#115b9e',label:'BBVA'},revolut:{color:'#171a20',label:'R'}};
  const cats = ['Comida','Supermercado','Transporte','Vivienda','Servicios','Entretenimiento','Salud','Compras','Suscripciones','Educación','Otros'];
  const main = document.getElementById('main');
  const modal = document.getElementById('modal');
  const modalInner = document.getElementById('modal-inner');
  const toastNode = document.getElementById('toast');
  let db;
  let state = {accounts:[],movements:[],budgets:[],recurrences:[],reconciliations:[],audits:[],settings:{salary:0,savingsTarget:0}};
  let drive;
  let driveInitError = '';
  let localInitError = '';
  let localInitStatus = 'iniciando';
  let localInitTask;
  let generatingDue=false;
  let page = 'home', selectedMonth = localDate().slice(0,7), filter = 'all', selectedAccount = null, insightKind='wealth', insightAccount='all';

  function localDate(offset=0){const d=new Date(); d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function id(){return (crypto.randomUUID ? crypto.randomUUID() : 'id-'+Date.now()+'-'+Math.random().toString(36).slice(2));}
  function esc(s){return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function money(c){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2}).format((Number(c)||0)/100);}
  function cents(s){const n=Number(s);return Number.isFinite(n)?Math.round(n*100):NaN;}
  function val(c){return ((Number(c)||0)/100).toFixed(2);}
  function monthName(m){const [y,mo]=m.split('-').map(Number);return new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1));}
  function shortDate(s){const [y,m,d]=s.split('-');return `${d}/${m}/${y}`;}
  function getAccount(aid){return F.accountById(state.accounts,aid);}
  function badgeFor(a){const t=bankThemes[String(a.institution||'').toLowerCase().trim()]||{color:'#395e79',label:(a.institution||a.name||'CT').slice(0,2).toUpperCase()};return t;}
  function cloudStatus(){return drive?.status||(driveInitError?'No disponible':'Sin configurar');}
  function snapshot(){return {schemaVersion:3,kind:'complete-backup',currency:'MXN',accounts:state.accounts,movements:state.movements,budgets:state.budgets,recurrences:state.recurrences,reconciliations:state.reconciliations,audits:state.audits,settings:state.settings};}
  function afterChange(){drive?.markChanged();}
  function sortTx(list){return [...list].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));}
  function notify(msg){
    const message=String(msg||'Ocurrió un error.');
    toastNode.textContent=message;toastNode.classList.add('show');
    clearTimeout(notify.timer);notify.timer=setTimeout(()=>toastNode.classList.remove('show'),4500);
    // Las notificaciones fuera de <dialog> pueden quedar detrás de su capa superior.
    const notice=modal.open?document.getElementById('dialog-notice'):null;
    if(notice){notice.textContent=message;notice.hidden=false;notice.scrollIntoView({block:'nearest',behavior:'auto'});}
  }
  function request(store,method,arg){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly');const req=tx.objectStore(store)[method](arg);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  function mutate(store,kind,entry){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);const target=tx.objectStore(store);if(kind==='put')target.put(entry);else if(kind==='delete')target.delete(entry);});}
  function storageMessage(){
    if(localInitStatus==='listo'&&db)return 'Base de datos local lista. Tus registros permanecen en este dispositivo.';
    if(localInitStatus==='iniciando')return 'Abriendo almacenamiento local…';
    return localInitError||'Almacenamiento local pendiente de comprobar.';
  }
  function refreshStorageMessage(){
    const node=document.getElementById('storage-diagnostic');
    if(node)node.textContent=storageMessage();
  }
  function openDb(){
    if(!S?.openDatabase)throw Error('No se cargó el módulo de almacenamiento. Recarga la aplicación desde Chrome.');
    return S.openDatabase(DB_NAME,DB_VERSION,{
      onBlocked:()=>{
        localInitStatus='bloqueado';
        localInitError='Otra pestaña o versión mantiene abierta la base de datos. Cierra otras pestañas de esta PWA sin borrar los datos.';
        refreshStorageMessage();
      },
      onVersionChange:()=>{
        db=null;localInitStatus='requiere-recarga';
        localInitError='La base de datos necesita actualizarse. Cierra las otras pestañas y vuelve a entrar.';
        refreshStorageMessage();
      }
    });
  }
  async function retryLocal(){
    if(localInitStatus==='listo'&&db){notify('Almacenamiento local disponible.');return;}
    if(localInitStatus==='iniciando'&&localInitTask)await localInitTask;
    if(localInitStatus!=='listo'||!db){localInitTask=init();await localInitTask;}
    if(localInitStatus!=='listo'||!db)throw Error(localInitError||'No se pudo abrir IndexedDB.');
    notify('Base de datos local recuperada. Ya puedes intentar conectar Google Drive.');
  }
  async function reload(){const [accounts,movements,budgets,settings,recurrences,reconciliations,audits]=await Promise.all([request('accounts','getAll'),request('movements','getAll'),request('budgets','getAll'),request('settings','get','preferences'),request('recurrences','getAll'),request('reconciliations','getAll'),request('audits','getAll')]);state={accounts,movements,budgets,recurrences,reconciliations,audits,settings:settings||{id:'preferences',salary:0,savingsTarget:0}};render();}
  async function save(store,entry){await mutate(store,'put',entry);await reload();afterChange();}
  async function remove(store,identifier){await mutate(store,'delete',identifier);await reload();afterChange();}
  function header(title,detail=''){return `<div class="page-head"><div><div class="eyebrow">${esc(detail||'Tu centro financiero')}</div><h1>${esc(title)}</h1></div><input id="month-control" aria-label="Mes del reporte" type="month" class="month-control" value="${esc(selectedMonth)}"></div>`;}
  function sectionTitle(t,action='',label=''){return `<div class="section-title"><h2>${esc(t)}</h2>${action?`<button class="text-btn" data-action="${esc(action)}">${esc(label||'Ver más')}</button>`:''}</div>`;}
  function blank(message,button=''){return `<div class="empty"><span class="symbol">◈</span>${esc(message)}${button?`<div style="margin-top:14px"><button class="secondary small" data-action="${esc(button)}">${button==='add-account'?'Agregar mi primera cuenta':'Registrar movimiento'}</button></div>`:''}</div>`;}
  // Presentación independiente en card-designs.js; la lógica de saldos sigue en logic.js.
  function cardTile(a){return Cards.render(a);}
  function accountList(accs,clickable=true){return accs.length?accs.map(a=>{
    const balance=F.accountBalance(a,state.movements),credit=a.type==='credit',theme=badgeFor(a);
    const missing=credit&&(a.cutDay===0||a.creditLimit===0);
    return `<div class="account-row"><div class="account-icon brand-icon" style="--bank:${esc(theme.color)}">${esc(theme.label.slice(0,3))}</div><div class="row-body"><div class="row-title">${esc(a.name)} <span class="mini-type">${credit?'Crédito':a.type==='debit'?'Débito':accountTypes[a.type]}</span></div><div class="row-sub">${esc(a.institution||accountTypes[a.type])}${missing?' · <span class="warning-text">Configuración pendiente</span>':''}</div></div><div class="row-amount ${credit?'negative':''}">${money(balance)}<small>${credit?'Deuda estimada':'Saldo estimado'}</small></div>${clickable?`<button class="iconbtn" data-action="account-detail" data-id="${esc(a.id)}" aria-label="Detalle de cuenta">›</button>`:''}</div>`;
  }).join(''):blank('Todavía no hay cuentas registradas.','add-account');}
  function monthlyTx(){return sortTx(state.movements.filter(m=>m.type==='expense'?F.monthlyPurchaseMonth(m,getAccount(m.accountId))===selectedMonth:F.monthOf(m.date)===selectedMonth));}
  function txList(items,removeButtons=false){return items.length?items.map(m=>{
    const origin=getAccount(m.accountId),dest=getAccount(m.toAccountId);
    const name=m.description||(m.type==='expense'?m.category:txNames[m.type]);
    let sub=`${shortDate(m.date)} · ${esc(origin?.name||'Cuenta eliminada')} · ${esc(txNames[m.type])}`;
    if(dest)sub+=` → ${esc(dest.name)}`;
    if(m.type==='expense'&&origin?.type==='credit')sub+=` · Corte ${esc(monthName(F.statementOf(m.date,origin.cutDay)))}`;
    if(m.type==='expense'&&Number(m.months)>1)sub+=` · ${m.months} MSI`;
    const cls=m.type==='income'||m.type==='yield'?'positive':m.type==='expense'?'negative':'';
    const sym=m.type==='expense'?(categoryIcons[m.category]||'🛍'):(txIcons[m.type]||'⇄');
    return `<div class="tx-row"><div class="tx-icon tx-${esc(m.type)}" aria-hidden="true">${sym}</div><div class="row-body"><div class="row-title">${esc(name)}</div><div class="row-sub">${sub}</div></div><div class="row-amount ${cls}">${m.type==='income'||m.type==='yield'?'+':m.type==='expense'?'-':''}${money(m.amount)}<small>${m.autoGenerated&&!m.confirmed?'<span class="rec-badge">Pendiente</span>':esc(txNames[m.type])}</small></div>${removeButtons?`<div class="toolbar"><button class="iconbtn" data-action="edit-tx" data-id="${esc(m.id)}" aria-label="Editar movimiento">✎</button>${m.autoGenerated&&!m.confirmed?`<button class="iconbtn" data-action="confirm-tx" data-id="${esc(m.id)}" aria-label="Confirmar cargo">✓</button>`:''}<button class="iconbtn" data-action="remove-tx" data-id="${esc(m.id)}" aria-label="Eliminar movimiento">×</button></div>`:''}</div>`;
  }).join(''):blank('No hay movimientos para este periodo.','add-movement');}
  function renderHome(){
    const t=F.totals(state.accounts,state.movements),b=F.breakdown(state.accounts,state.movements,selectedMonth),tx=monthlyTx();
    const power=Insight.spendingPower(F,state.accounts,state.movements,state.recurrences);const warnings=Insight.baselineWarnings(state.accounts,state.movements);
    const cards=state.accounts.filter(a=>a.type==='credit');const charges=cards.reduce((s,a)=>s+F.statementCharges(a,state.movements,selectedMonth).total,0);
    main.innerHTML=header('Tu dinero','Resumen general')+`<button type="button" class="hero hero-click" data-action="open-insight" data-kind="wealth"><div class="hero-label">Patrimonio neto estimado</div><div class="hero-value">${money(t.netWorth)}</div><div class="hero-sub">Saldos disponibles + ahorros − deuda de tarjetas</div><div class="hero-bottom"><div class="hero-mini">Dinero y ahorros<b>${money(t.assets)}</b></div><div class="hero-mini">Deuda en tarjetas<b>${money(t.debts)}</b></div></div></button>
    <div class="two-col" style="margin-top:12px"><button type="button" class="stat stat-click" data-action="open-insight" data-kind="income"><div class="k">Ingresos recibidos este mes</div><div class="v positive">${money(b.income)}</div><div class="hint">Salario previsto: ${money(state.settings.salary||0)}</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="purchases"><div class="k">Compras del mes financiero</div><div class="v">${money(b.purchases)}</div><div class="hint">Tarjetas según fecha de corte</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="savings"><div class="k">Ahorros en cajitas y cuentas</div><div class="v sky">${money(t.saved)}</div><div class="hint">Incluidos en tu dinero total</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="statements"><div class="k">Cargos de tarjetas en el corte</div><div class="v gold">${money(charges)}</div><div class="hint">Incluye mensualidades MSI estimadas</div></button></div>
    <button type="button" class="spendable-strip" data-action="open-insight" data-kind="wealth" aria-label="Ver estimación de dinero disponible y patrimonio"><span class="spendable-strip-copy"><span class="spendable-kicker">Estimación para gastar</span><strong>${money(power.spendable)}</strong><small>Descontando deuda y compromisos conocidos · ver detalle</small></span><span class="spendable-arrow" aria-hidden="true">›</span></button>${warnings.length?`<div class="inline-note">Atención: ${warnings.length} cuenta(s) tienen movimientos con fecha igual o anterior a su saldo base. Se muestran en el histórico pero no alteran el saldo. Revisa la fecha base y el saldo inicial.</div>`:''}${sectionTitle('Mis cuentas','goto-accounts','Ver todas')}<div class="panel">${accountList(state.accounts.slice(0,5))}</div>
    ${sectionTitle('Movimientos del periodo','goto-movements','Ver todos')}<div class="panel">${txList(tx.slice(0,5))}</div>
    <p class="footnote">El saldo es una estimación basada en los saldos iniciales y movimientos registrados. Los cargos del corte no equivalen necesariamente al pago exigible por el banco.</p>`;
  }
  function renderAccounts(){
    const assets=state.accounts.filter(a=>a.type!=='credit'),cards=state.accounts.filter(a=>a.type==='credit');
    main.innerHTML=header('Bancos y tarjetas','Todas tus cuentas')+`<div class="toolbar"><button class="primary small" data-action="add-account">＋ Agregar cuenta o tarjeta</button><button class="secondary small" data-action="import-accounts">⇧ Importar cuentas CSV</button></div>
      ${sectionTitle('Tus tarjetas visuales')}<div class="card-gallery">${state.accounts.filter(a=>['debit','credit'].includes(a.type)).map(a=>`<button class="card-button" data-action="account-detail" data-id="${esc(a.id)}">${cardTile(a)}<span class="card-button-caption"><span>${esc(a.name)}</span><span>${a.type==='credit'?'CRÉDITO':'DÉBITO'}</span></span></button>`).join('')||blank('Agrega tarjetas o importa tu CSV para mostrarlas aquí.')}</div>
      ${sectionTitle('Dinero, efectivo y cajitas')}<div class="panel">${accountList(assets)}</div>
      ${sectionTitle('Tarjetas de crédito')}<div class="panel">${cards.length?accountList(cards):blank('Agrega tus tarjetas para controlar cortes, saldos y MSI.')}</div>
      <p class="footnote">Cada cuenta parte de un saldo inicial al cierre de la fecha que elijas. Solo se aplican a ese saldo los movimientos posteriores; los anteriores pueden servir para el historial sin duplicar dinero.</p>`;
  }
  function renderMovements(){
    const tx=monthlyTx().filter(m=>filter==='all'||m.type===filter);
    main.innerHTML=header('Tus movimientos','Historial por mes financiero')+`<div class="toolbar"><button class="secondary small" data-action="import-movements">⇧ Importar movimientos CSV</button><button class="secondary small" data-action="show-audits">Historial de ediciones</button><button class="secondary small" data-action="open-recurring">Suscripciones</button></div><div class="pills">${[['all','Todos'],['expense','Gastos'],['income','Ingresos'],['payment','Pagos'],['transfer','Transferencias'],['yield','Rendimientos']].map(([v,label])=>`<button class="pill ${filter===v?'sel':''}" data-action="filter" data-filter="${v}">${label}</button>`).join('')}</div><div class="panel">${txList(tx,true)}</div><p class="footnote">Las compras de crédito se agrupan por el mes de corte. Transferencias, pagos y movimientos de débito se muestran por su fecha real.</p>`;
  }
  function renderReports(){
    const b=F.breakdown(state.accounts,state.movements,selectedMonth),catsList=Object.entries(b.byCat).sort((a,c)=>c[1]-a[1]);
    const cards=state.accounts.filter(a=>a.type==='credit');
    const expected=Insight.forecast(F,state.accounts,state.movements,state.recurrences,state.settings.salary||0,selectedMonth);
    const stmt=cards.map(a=>({a,s:F.statementCharges(a,state.movements,selectedMonth)}));
    const future=Array.from({length:6},(_,i)=>{const month=F.shiftMonth(selectedMonth,i+1);return {month,value:F.monthlyInstallments(state.accounts,state.movements,month)};});
    main.innerHTML=header('Informe mensual','Análisis detallado')+`<div class="two-col"><div class="stat"><div class="k">Ingreso efectivamente recibido</div><div class="v positive">${money(b.income)}</div></div><div class="stat"><div class="k">Compras atribuibles al mes</div><div class="v negative">${money(b.purchases)}</div></div><div class="stat"><div class="k">Salidas bancarias de efectivo</div><div class="v">${money(b.bankOutflow)}</div><div class="hint">Compras débito + pagos de tarjeta</div></div><div class="stat"><div class="k">Rendimientos registrados</div><div class="v sky">${money(b.yields)}</div></div></div>
    ${renderDonut(b)}
    ${sectionTitle('¿En qué gastaste?')}<div class="panel">${catsList.length?catsList.map(([name,amount])=>`<div class="baritem"><div class="baritem-row"><span>${esc(name)}</span><b>${money(amount)}</b></div><div class="progress"><div style="width:${b.purchases?Math.min(100,100*amount/b.purchases):0}%"></div></div></div>`).join(''):blank('Todavía no hay gastos registrados en este mes.')}</div>
    ${sectionTitle('Cargos por tarjeta en el corte')}<div class="panel">${stmt.length?stmt.map(({a,s})=>`<div class="report-line"><span><b>${esc(a.name)}</b><br><span class="help">${esc('Corte día '+a.cutDay)} · Ordinarios ${money(s.ordinary)} · MSI ${money(s.installments)}</span></span><b>${money(s.total)}</b></div>`).join(''):blank('Aún no has agregado tarjetas de crédito.')}</div>
    ${cards.some(a=>!a.cutDay)?`<div class="inline-note">Hay tarjetas sin día de corte configurado. Sus cargos del estado de cuenta no se proyectan hasta que lo registres; las compras se muestran temporalmente por mes calendario.</div>`:''}
    <p class="footnote">Los cargos del corte son una proyección a partir de tus compras registradas. No sustituyen el estado de cuenta oficial: no incluyen automáticamente saldo previo, comisiones, ajustes, devoluciones ni intereses.</p>
    ${sectionTitle('MSI comprometidos: próximos 6 meses')}<div class="panel">${future.map(x=>`<div class="report-line"><span>${esc(monthName(x.month))}</span><b>${money(x.value)}</b></div>`).join('')}</div>
    ${sectionTitle('Flujo de efectivo del calendario')}<div class="panel"><div class="report-line"><span>Ingresos y rendimientos recibidos</span><b class="positive">${money(b.income+b.yields)}</b></div><div class="report-line"><span>Compras de débito / efectivo</span><b>${money(b.bankOutflow-b.cardPayments)}</b></div><div class="report-line"><span>Pagos a tarjetas</span><b>${money(b.cardPayments)}</b></div><div class="report-line"><span><b>Flujo neto registrado</b></span><b class="${b.cashChange>=0?'positive':'negative'}">${money(b.cashChange)}</b></div></div>
    <div class="section-title"><h2>Compromisos y proyección orientativa</h2></div>
    <div class="panel">
      <div class="report-line"><span>Nómina mensual prevista</span><b>${money(expected.incomePlan)}</b></div>
      <div class="report-line"><span>Ingresos ya registrados</span><b>${money(expected.incomeReceived)}</b></div>
      <div class="report-line"><span>Suscripciones pendientes</span><b>${money(expected.scheduled)}</b></div>
      <div class="report-line"><span>MSI estimadas en el corte</span><b>${money(expected.msi)}</b></div>
      <p class="footnote">Indicadores orientativos, no saldo disponible ni monto oficial por pagar. Pueden existir gastos aún no registrados.</p>
    </div>
    ${renderBudgetSummary()}
    <div class="toolbar"><button class="primary small" data-action="export-report">Exportar informe JSON</button><button class="secondary small" data-action="export-csv">Exportar CSV</button></div>
    <div class="inline-note">El gasto de una compra a MSI se registra íntegro en el mes financiero de la compra; los cargos a pagar se distribuyen en los meses de corte futuros. Por eso "compras" y "cargos de tarjetas" son indicadores distintos.</div>`;
  }

  // Dedicated recurring-payment workflow: no subscription changes alter confirmed balances.
  function renderRecurrences(){
    main.innerHTML=Forms.recurringPage(state.recurrences,state.movements,getAccount,money,esc,selectedMonth);
  }
  function recurrenceForm(existing=null){
    if(!state.accounts.length){notify('Primero registra alguna cuenta.');return;}
    openModal(existing?'Editar pago recurrente':'Nueva suscripción',Forms.recurringForm(state.accounts,existing,val,esc,localDate()));
    document.getElementById('rec-form').addEventListener('submit',async e=>{
      e.preventDefault();
      try{
        const f=e.currentTarget;
        const r={id:existing?.id||id(),name:f.elements.name.value.trim(),amount:cents(f.elements.amount.value),
          accountId:f.elements.accountId.value,day:Number(f.elements.day.value),category:f.elements.category.value,
          startDate:f.elements.startDate.value,endDate:f.elements.endDate.value,paused:existing?.paused||false,frequency:'monthly'};
        Rec.validate(r,state.accounts);
        await save('recurrences',r);
        await generateDueEntries();
        closeModal();navigate('recurrences');notify('Suscripción guardada. Los cargos vencidos se preparan pendientes de confirmar.');
      }catch(error){notify(error.message);}
    });
  }
  async function generateDueEntries(){
    if(!db||generatingDue)return 0;
    generatingDue=true;
    try{
      const newItems=Rec.generate(state.recurrences,state.movements,localDate(),24)
        .filter(m=>state.accounts.some(a=>a.id===m.accountId));
      if(!newItems.length)return 0;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('movements','readwrite');
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Error al generar cargos'));
        for(const m of newItems)tx.objectStore('movements').put(m);
      });
      await reload();afterChange();return newItems.length;
    }finally{generatingDue=false;}
  }

  function showAudits(){
    const entries=[...state.audits].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,60);
    openModal('Historial de modificaciones',`<div class="panel">${entries.length?entries.map(a=>`<div class="report-line"><span>${esc(a.date.slice(0,16).replace('T',' '))}<br><small>${esc(a.before?.description||a.after?.description||'Movimiento')} · ${esc(getAccount(a.after?.accountId||a.before?.accountId)?.name||'Cuenta')}</small></span><b>${a.after?money(a.after.amount):'-'}</b></div>`).join(''):'<p class="help">Todavía no hay cambios registrados.</p>'}</div><p class="footnote">El historial se incluye en los respaldos cifrados.</p>`);
  }
  function reconcileForm(accountId){
    const a=getAccount(accountId);
    if(!a)return;
    const expected=F.accountBalance(a,state.movements);
    openModal('Conciliación bancaria',Forms.reconcileForm(a,expected,money,val,esc,localDate()));
    document.querySelector('#reconcile-form [name="date"]').addEventListener('change',e=>{
      const day=e.target.value;
      const text=document.getElementById('reconcile-expected');
      if(text)text.textContent=day<a.balanceDate?'Anterior a la fecha base':money(F.accountBalance(a,state.movements.filter(m=>m.date<=day)));
    });
    document.getElementById('reconcile-form').addEventListener('submit',async e=>{
      e.preventDefault();try{
        const f=e.currentTarget,actual=cents(f.elements.actual.value),checkDate=f.elements.date.value;
        if(!Number.isSafeInteger(actual))throw Error('Saldo real inválido.');
        if(checkDate<a.balanceDate)throw Error('No puedes conciliar una fecha anterior al saldo inicial de esta cuenta.');
        if(checkDate>localDate())throw Error('La fecha de conciliación no puede estar en el futuro.');
        const expectedAtDate=F.accountBalance(a,state.movements.filter(m=>m.date<=checkDate));
        await save('reconciliations',{id:id(),accountId:a.id,date:checkDate,expected:expectedAtDate,actual,difference:actual-expectedAtDate,note:f.elements.note.value.trim(),createdAt:new Date().toISOString()});
        closeModal();notify('Comparación guardada sin modificar tu saldo.');
      }catch(err){notify(err.message);}
    });
  }
  function enhanceAccountPickers(root){if(AccountPicker?.enhance)AccountPicker.enhance(root,state.accounts);}
  function renderInsight(){
    main.innerHTML=Dash.render(insightKind,{accounts:state.accounts,movements:state.movements,month:selectedMonth,accountId:insightAccount,recurrences:state.recurrences,F,I:Insight,esc,money,monthName});
    enhanceAccountPickers(main);
  }
  function render(){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    if(page==='home')renderHome();else if(page==='accounts')renderAccounts();else if(page==='movements')renderMovements();else if(page==='budgets')renderBudgets();else if(page==='insight')renderInsight();else if(page==='recurrences')renderRecurrences();else renderReports();
    enhanceAccountPickers(main);
  }
  function navigate(p){page=p;filter='all';render();window.scrollTo(0,0);}
  function openModal(title,body){modalInner.innerHTML=`<div class="modal-body"><div class="modal-head"><h2>${esc(title)}</h2><button class="close" data-action="close" aria-label="Cerrar">×</button></div><p id="dialog-notice" class="dialog-notice" role="status" aria-live="polite" hidden></p>${body}</div>`;if(!modal.open)modal.showModal();enhanceAccountPickers(modalInner);}
  function closeModal(){if(modal.open)modal.close();}
  const option=(v,label,selected)=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(label)}</option>`;
  function field(label,name,type='text',value='',hint='',extra=''){return `<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><input id="f-${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}>${hint?`<small>${esc(hint)}</small>`:''}</div>`;}
  function accountForm(existing=null){
    const a=existing||{name:'',institution:'',type:'debit',balanceDate:localDate(-1),initialBalance:0,initialDebt:0,creditLimit:0,cutDay:0,dueDay:0,cardStyle:'auto',cardImage:''};
    let selectedImage=Cards.safePicture(a.cardImage);
    openModal(existing?'Editar cuenta':'Nueva cuenta o tarjeta',`<form id="account-form" class="form">
      ${field('Nombre visible','name','text',a.name,'Ejemplo: Mercado Pago, BBVA Nómina, Nu Cajita','required maxlength="70"')}
      ${field('Institución (opcional)','institution','text',a.institution,'No introduzcas números de tarjeta o cuenta.','maxlength="70"')}
      <div class="field"><label for="f-type">Tipo de cuenta</label><select name="type" id="f-type" ${existing?'disabled':''}>${Object.entries(accountTypes).map(([v,l])=>option(v,l,a.type)).join('')}</select></div>
      <div id="card-visual-editor">
         <div class="section-title"><h2>Diseño de la tarjeta</h2></div>
         <div class="card-editor-preview" id="card-preview"></div>
         ${Cards.selector(a.cardStyle)}
         <div class="field"><label for="card-photo-input">Imagen de fondo personalizada (opcional)</label><input id="card-photo-input" type="file" accept="image/jpeg,image/png,image/webp"><small>La imagen se comprime y guarda en tus datos privados; no se publica en GitHub. No subas fotos con números completos, CVV, vencimiento o datos privados visibles.</small></div>
         <div class="card-image-actions"><button type="button" class="secondary small" id="card-photo-clear">Quitar imagen personalizada</button></div>
       </div>
       <div id="asset-fields">${field('Saldo al cierre de la fecha base ($)','initialBalance','number',val(a.initialBalance),'Los movimientos anteriores a esta fecha serán solo históricos.','step="0.01" required')}</div>
      <div id="credit-fields">${field('Deuda inicial al cierre de la fecha base ($)','initialDebt','number',val(a.initialDebt),'Incluye compras existentes antes de registrar movimientos.','min="0" step="0.01"')}
        <div class="form-row">${field('Límite de crédito ($)','creditLimit','number',val(a.creditLimit),'','min="0" step="0.01"')}${field('Día de corte','cutDay','number',a.cutDay||'','Si aún no lo conoces, déjalo vacío.','min="1" max="31"')}</div>
        ${field('Día habitual de pago (informativo)','dueDay','number',a.dueDay||'','Confirma en el banco el vencimiento exacto de cada corte.','min="1" max="31"')}</div>
      ${field('Fecha de saldo inicial (al cierre del día)','balanceDate','date',a.balanceDate,'Por defecto ayer: así los movimientos de hoy sí actualizan el saldo.','required')}
      <div class="inline-note">No registres números completos de tarjetas, contraseñas, NIP ni CVV. Los saldos se calculan desde esta fecha base.</div>
      <div class="modal-footer"><button type="button" class="secondary" data-action="close">Cancelar</button><button class="primary" type="submit">${existing?'Guardar cambios':'Agregar cuenta'}</button></div>
      ${existing?'<button type="button" class="linklike danger-text" id="delete-account-btn">Eliminar esta cuenta</button>':''}
    </form>`);
    const f=document.getElementById('account-form');
    const toggle=()=>{const credit=(existing?.type||f.elements.type.value)==='credit';document.getElementById('asset-fields').hidden=credit;document.getElementById('credit-fields').hidden=!credit;};
    const paintCard=()=>{
      const kind=existing?.type||f.elements.type.value;
      const isCard=kind==='debit'||kind==='credit';
      document.getElementById('card-visual-editor').hidden=!isCard;
      if(isCard)document.getElementById('card-preview').innerHTML=Cards.render({
        ...a,name:f.elements.name.value.trim()||'Mi tarjeta',
        institution:f.elements.institution.value.trim(),
        type:kind,cardStyle:f.elements.cardStyle.value,cardImage:selectedImage
      });
    };
    f.elements.type.addEventListener('change',()=>{toggle();paintCard();});
    f.elements.institution.addEventListener('input',paintCard);
    f.elements.name.addEventListener('input',paintCard);
    f.elements.cardStyle.addEventListener('change',paintCard);
    const imageInput=document.getElementById('card-photo-input');
    imageInput.addEventListener('change',async()=>{
      if(!imageInput.files?.[0])return;
      imageInput.disabled=true;
      try{selectedImage=await CardImages.prepare(imageInput.files[0]);paintCard();notify('Imagen preparada. Guarda la cuenta para aplicarla.');}
      catch(error){notify(error?.message||'No se pudo procesar la imagen.');}
      finally{imageInput.disabled=false;imageInput.value='';}
    });
    document.getElementById('card-photo-clear').addEventListener('click',()=>{selectedImage='';paintCard();notify('Imagen retirada de la vista previa. Guarda los cambios.');});
    toggle();paintCard();
    f.addEventListener('submit',async e=>{e.preventDefault();try{
      const type=existing?.type||f.elements.type.value,base=f.elements.balanceDate.value;
      if(!base)throw Error('Selecciona la fecha del saldo inicial.');
      const aNew={id:existing?.id||id(),name:f.elements.name.value.trim(),institution:f.elements.institution.value.trim(),type,balanceDate:base,
        initialBalance:cents(f.elements.initialBalance.value),initialDebt:cents(f.elements.initialDebt.value),creditLimit:cents(f.elements.creditLimit.value),cutDay:Number(f.elements.cutDay.value||0),dueDay:Number(f.elements.dueDay.value||0),
         cardStyle:(type==='credit'||type==='debit')?Cards.styleOf(f.elements.cardStyle.value):'auto',
         cardImage:(type==='credit'||type==='debit')?selectedImage:'',
         createdAt:existing?.createdAt||new Date().toISOString()};
      if(!aNew.name)throw Error('Escribe el nombre de la cuenta.');
      if([aNew.initialBalance,aNew.initialDebt,aNew.creditLimit].some(x=>!Number.isSafeInteger(x)))throw Error('Ingresa montos válidos.');
      if(type==='credit'&&(!Number.isInteger(aNew.cutDay)||aNew.cutDay<0||aNew.cutDay>31||!Number.isInteger(aNew.dueDay)||aNew.dueDay<0||aNew.dueDay>31))throw Error('El día de corte y pago debe ser del 1 al 31, o vacío si está pendiente.');
      await save('accounts',aNew);closeModal();notify('Cuenta guardada');
    }catch(err){notify(err.message||'No se pudo guardar');}});
    if(existing)document.getElementById('delete-account-btn').addEventListener('click',async()=>{
      if(state.movements.some(m=>m.accountId===existing.id||m.toAccountId===existing.id)){notify('Elimina primero los movimientos vinculados a esta cuenta.');return;}
      if(confirm('¿Eliminar esta cuenta?')){await remove('accounts',existing.id);closeModal();notify('Cuenta eliminada');}
    });
  }
  function movementForm(preferredAccountId='',preferredType='expense',existing=null){
    if(!state.accounts.length){notify('Primero agrega al menos una cuenta.');accountForm();return;}
    const targetOptions=state.accounts.filter(a=>a.type!=='credit');
    openModal(existing?'Editar movimiento':'Registrar movimiento',`<form id="movement-form" class="form">
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
      const selected=existing?.accountId||preferredAccountId||old;
      if(sources.some(a=>a.id===selected))f.elements.accountId.value=selected;
      const needsTo=type==='payment'||type==='transfer';
      document.getElementById('m-to-row').hidden=!needsTo;
      document.getElementById('m-cat-row').hidden=type!=='expense';
      f.elements.toAccountId.innerHTML=opts(type==='payment'?state.accounts.filter(a=>a.type==='credit'):targetOptions);
      document.getElementById('m-from-label').textContent=type==='income'||type==='yield'?'Cuenta que recibe el dinero':type==='expense'?'Cuenta o tarjeta utilizada':'Cuenta de origen';
      document.getElementById('m-help').textContent=type==='transfer'?'Una transferencia entre tus cuentas no es un gasto ni un ingreso.':type==='payment'?'Un pago reduce el dinero de origen y la deuda de la tarjeta, sin duplicar el gasto.':type==='yield'?'Registra el rendimiento depositado. No es lo mismo que transferir dinero a una cajita.':type==='income'?'El salario configurado es un presupuesto; registra aquí cada ingreso que efectivamente recibas.':'Las compras de crédito se asignan al mes del corte. Si eliges MSI, escribe el importe total de la compra.';
      refreshMsi();
      enhanceAccountPickers(modalInner);
    }
    function refreshMsi(){const src=getAccount(f.elements.accountId.value);document.getElementById('m-msi-row').hidden=!(f.elements.type.value==='expense'&&src?.type==='credit');}
    f.elements.type.addEventListener('change',refreshType);
    f.elements.accountId.addEventListener('change',refreshMsi);
    f.elements.type.value=existing?.type||preferredType;
    refreshType();
    if(existing){f.elements.amount.value=val(existing.amount);f.elements.date.value=existing.date;f.elements.category.value=existing.category||'Otros';f.elements.description.value=existing.description||'';f.elements.months.value=String(existing.months||1);if(existing.toAccountId)f.elements.toAccountId.value=existing.toAccountId;}
    f.addEventListener('submit',async e=>{e.preventDefault();try{
      const type=f.elements.type.value,accountId=f.elements.accountId.value,toAccountId=f.elements.toAccountId.value;
      const source=getAccount(accountId),dest=getAccount(toAccountId),amount=cents(f.elements.amount.value);
      if(!source)throw Error('Elige una cuenta de origen.');
      if(!Number.isSafeInteger(amount)||amount<=0)throw Error('El importe debe ser mayor a cero.');
       if(existing?.autoGenerated&&type!=='expense')throw Error('Un cargo recurrente debe mantenerse como gasto.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(f.elements.date.value))throw Error('Fecha inválida.');
      if(type==='payment'&&(!dest||dest.type!=='credit'||source.type==='credit'))throw Error('Elige una cuenta y una tarjeta de crédito.');
      if(type==='transfer'&&(!dest||dest.id===source.id||source.type==='credit'||dest.type==='credit'))throw Error('Elige dos cuentas distintas de dinero o ahorro.');
      const months=type==='expense'&&source.type==='credit'?Number(f.elements.months.value):1;
      const movement={...(existing||{}),id:existing?.id||id(),type,date:f.elements.date.value,accountId,toAccountId:(type==='payment'||type==='transfer')?toAccountId:'',amount,category:type==='expense'?f.elements.category.value:type==='income'?'Ingresos':type==='yield'?'Rendimientos':'',description:f.elements.description.value.trim(),months,createdAt:existing?.createdAt||new Date().toISOString()};
      if(existing){await save('audits',{id:id(),movementId:existing.id,date:new Date().toISOString(),before:existing,after:movement});}
      await save('movements',movement);closeModal();notify(existing?'Movimiento actualizado':'Movimiento registrado');
    }catch(err){notify(err.message||'No se pudo registrar el movimiento');}});
  }
  function accountDetail(aid){
    const a=getAccount(aid);if(!a)return;
    const balance=F.accountBalance(a,state.movements),tx=sortTx(state.movements.filter(m=>m.accountId===aid||m.toAccountId===aid)).slice(0,12);
    const card=a.type==='credit';const breakdown=card?F.statementCharges(a,state.movements,selectedMonth):null;
    openModal(a.name,`${Cards.isCard(a)?'<div class="card-editor-preview" style="margin-bottom:16px">'+Cards.render(a)+'</div>':''}<div class="panel"><div class="eyebrow">${card?'Deuda estimada':'Saldo disponible estimado'}</div><div class="summary-figure">${money(balance)}</div><div class="help">Saldo base al cierre del ${shortDate(a.balanceDate)}: ${money(card?a.initialDebt:a.initialBalance)}</div>
      ${state.reconciliations.filter(r=>r.accountId===a.id).length?`<div class="report-line"><span>Última conciliación<br><small>${esc(state.reconciliations.filter(r=>r.accountId===a.id).sort((x,y)=>y.date.localeCompare(x.date))[0].date)}</small></span><b>${money(state.reconciliations.filter(r=>r.accountId===a.id).sort((x,y)=>y.date.localeCompare(x.date))[0].difference)} de diferencia</b></div>`:''}${card?`<div class="divider"></div><div class="report-line"><span>Límite de crédito</span><b>${money(a.creditLimit)}</b></div><div class="report-line"><span>Disponible aproximado</span><b>${a.creditLimit?money(a.creditLimit-balance):'Por configurar'}</b></div><div class="report-line"><span>Día de corte</span><b>${a.cutDay?esc(a.cutDay):'Por configurar'}</b></div><div class="report-line"><span>Día habitual de pago</span><b>${a.dueDay?esc(a.dueDay):'Por configurar'}</b></div><div class="report-line"><span>Cargos estimados del corte de ${esc(monthName(selectedMonth))}</span><b>${money(breakdown.total)}</b></div>`:''}</div>
      ${sectionTitle('Movimientos relacionados')}<div class="panel">${txList(tx,true)}</div><div class="toolbar"><button class="secondary small" id="edit-account-btn">Editar cuenta / saldo inicial</button><button class="secondary small" data-action="account-move" data-id="${esc(a.id)}">Registrar movimiento</button><button class="secondary small" data-action="reconcile" data-id="${esc(a.id)}">Conciliar saldo</button></div>
      <p class="footnote">Las compras anteriores a la fecha base aparecen en el historial, pero no modifican el saldo actual.</p>`);
    document.getElementById('edit-account-btn').addEventListener('click',()=>accountForm(a));
  }
  function budgetSpend(b){return state.movements.filter(m=>m.type==='expense'&&m.category===b.category&&(b.accountId==='all'||m.accountId===b.accountId)&&F.monthlyPurchaseMonth(m,getAccount(m.accountId))===selectedMonth).reduce((sum,m)=>sum+m.amount,0);}
  function renderBudgetSummary(){const rows=state.budgets.map(b=>({...b,spent:budgetSpend(b)}));return `${sectionTitle('Tus límites mensuales','goto-budgets','Administrar')}<div class="panel">${rows.length?rows.slice(0,5).map(b=>`<div class="baritem"><div class="baritem-row"><span>${esc(categoryIcons[b.category]||'◈')} ${esc(b.category)} · ${esc(b.accountId==='all'?'Todas':getAccount(b.accountId)?.name||'Cuenta')}</span><b class="${b.spent>b.limit?'negative':''}">${money(b.spent)} / ${money(b.limit)}</b></div><div class="progress"><div class="${b.spent>b.limit?'over-budget':''}" style="width:${Math.min(100,100*b.spent/b.limit)}%"></div></div></div>`).join(''):blank('Configura límites para cada categoría, tarjeta o cuenta.')}</div>`;}
  function renderBudgets(){main.innerHTML=header('Presupuestos','Límites por tarjeta y categoría')+`<div class="toolbar"><button class="primary small" data-action="add-budget">＋ Agregar límite</button></div>${renderBudgetSummary()}${sectionTitle('Administrar límites')}<div class="panel">${state.budgets.length?state.budgets.map(b=>`<div class="report-line"><span>${esc(b.category)} · ${esc(b.accountId==='all'?'Todas las cuentas':getAccount(b.accountId)?.name||'Cuenta eliminada')}<br><span class="help">${money(b.limit)} por mes · Consumido ${money(budgetSpend(b))}</span></span><button class="iconbtn" data-action="remove-budget" data-id="${esc(b.id)}" aria-label="Eliminar límite">×</button></div>`).join(''):blank('Aún no hay límites para administrar.')}</div><p class="footnote">Los límites se aplican al mes financiero: las compras de crédito van al corte correspondiente, mientras las de débito se asignan al mes calendario. Los límites no afectan tus saldos.</p>`;}
  function budgetForm(){openModal('Nuevo límite mensual',`<form id="budget-form" class="form"><div class="field"><label for="b-account">Cuenta / tarjeta</label><select id="b-account" name="accountId">${option('all','Todas las cuentas','all')}${state.accounts.map(a=>option(a.id,a.name,'')).join('')}</select></div><div class="field"><label for="b-cat">Categoría</label><select id="b-cat" name="category">${cats.map(c=>option(c,c,'Comida')).join('')}</select></div>${field('Límite mensual ($)','limit','number','','','min="0.01" required step="0.01"')}<div class="modal-footer"><button type="button" class="secondary" data-action="close">Cancelar</button><button class="primary" type="submit">Guardar</button></div></form>`);
    document.getElementById('budget-form').addEventListener('submit',async e=>{e.preventDefault();try{const f=e.target;const limit=cents(f.elements.limit.value);if(!Number.isSafeInteger(limit)||limit<=0)throw Error('El límite debe ser positivo.');const accountId=f.elements.accountId.value,category=f.elements.category.value;const found=state.budgets.find(b=>b.accountId===accountId&&b.category===category);await save('budgets',{id:found?.id||id(),accountId,category,limit});closeModal();notify('Límite guardado');}catch(err){notify(err.message);}});
  }
  function renderDonut(b){const entries=Object.entries(b.byCat).filter(x=>x[1]>0).sort((a,c)=>c[1]-a[1]);if(!entries.length)return '';
    const colors=['#69b5fa','#52dec0','#ffc977','#b48dfa','#fb8d99','#78d9f4','#e2b676','#3fcf9e','#a1bddf','#bd9ba9'];let current=0;
    const stops=entries.map((e,i)=>{const start=current;current+=e[1]/b.purchases*100;return `${colors[i%colors.length]} ${start.toFixed(2)}% ${current.toFixed(2)}%`;});
    return `${sectionTitle('Distribución visual')}<div class="panel chart-panel"><div class="donut" style="background:conic-gradient(${stops.join(',')})"><div class="donut-center"><small>Compras</small><b>${money(b.purchases)}</b></div></div><div class="donut-legend">${entries.map((e,i)=>`<div><span class="legend-dot" style="background:${colors[i%colors.length]}"></span><span>${esc(categoryIcons[e[0]]||'◈')} ${esc(e[0])}</span><b>${(100*e[1]/b.purchases).toFixed(1)}%</b></div>`).join('')}</div></div>`;
  }
  async function importCsv(file,kind){if(!file)return;if(file.size>5*1024*1024){notify('CSV demasiado grande (máximo 5 MB).');return;}
    try{
      const text=await file.text();const parsed=kind==='accounts'?CSV.accounts(text,state.accounts,localDate(-1)):CSV.movements(text,state.accounts,state.movements);
      if(!parsed.items.length){notify(`No hay nuevos registros. ${parsed.skipped} duplicados omitidos.`);return;}
      const label=kind==='accounts'?'cuentas':'movimientos';if(!confirm(`Archivo: ${esc(file.name)}\nSe importarán ${parsed.items.length} ${label}; se omitirán ${parsed.skipped} repetidos.\nNo se eliminará información existente. ¿Continuar?`))return;
      await new Promise((resolve,reject)=>{const tx=db.transaction(kind,'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('Importación cancelada'));tx.onerror=()=>reject(tx.error);for(const record of parsed.items)tx.objectStore(kind).put(record);});
      await reload();afterChange();notify(`Importados ${parsed.items.length} ${label}.`);
    }catch(err){notify(err.message||'No se pudo importar el CSV');}
  }
  function ensureDrive(){
    if(drive)return drive;
    const Driver=window.FinanceDrive?.DriveSync;
    if(typeof Driver!=='function'){
      driveInitError='El módulo de Google Drive no se cargó. Comprueba que estés conectado a internet y recarga la página en Chrome.';
      throw Error(driveInitError);
    }
    try{
      const instance=new Driver({
        getData:snapshot,
        restore:async data=>{const x=validatedBackup(data);await replaceBackup(x);await reload();},
        onStatus:status=>{
          const node=document.getElementById('drive-status');if(node)node.textContent=status;
          const chip=document.getElementById('cloud-chip');
          if(chip)chip.textContent=status.startsWith('Sincronizado')?'☁ Guardado':status.startsWith('Desconectado')?'☁ Sin conectar':'☁ Pendiente';
        }
      });
      drive=instance;driveInitError='';
      return drive;
    }catch(err){
      driveInitError='No se pudo iniciar Google Drive: '+(err?.message||'error desconocido')+'. Recarga la PWA desde Chrome.';
      document.getElementById('cloud-chip').textContent='☁ No disponible';
      throw Error(driveInitError);
    }
  }
  async function startDrive(clientId,passphrase){
    const feedback=document.getElementById('drive-feedback');
    const connectButton=document.querySelector('#drive-form button[type="submit"]');
    const show=(message,isError=false)=>{
      if(feedback){feedback.textContent=message;feedback.hidden=false;feedback.setAttribute('data-error',String(isError));}
    };
    if(connectButton){connectButton.disabled=true;connectButton.textContent='Conectando con Google…';}
    show('Solicitando autorización de Google. Si no aparece una ventana, abre este sitio directamente en Chrome.');
    try{
    if(localInitStatus!=='listo'||!db)throw Error('Google Drive necesita que primero funcione el almacenamiento local. '+storageMessage()+' Pulsa «Comprobar almacenamiento» en Ajustes.');
    const connection=ensureDrive();
    const result=await connection.connect(clientId,passphrase);
    if(result.status==='conflict'){
      const restore=confirm(`Drive tiene un respaldo del ${new Date(result.updatedAt).toLocaleString('es-MX')} diferente a los datos del celular.\nACEPTAR: recuperar el respaldo de Drive y REEMPLAZAR los datos locales.\nCANCELAR: conservar datos locales y dejar la sincronización pausada.`);
      if(restore){if(confirm('Se reemplazarán los datos locales. Recomendamos exportar un respaldo JSON primero. ¿Confirmas la restauración?')){await drive.acceptCloud(result.remote);notify('Datos recuperados de Google Drive');}}else{
        const push=confirm('Se conservarán tus datos locales. ¿Quieres reemplazar el respaldo de Drive con estos datos locales? ESTA ACCIÓN NO SE PUEDE DESHACER.');
        if(push){await drive.useLocal();notify('Respaldo de Drive reemplazado');}
      }
    }else notify(result.status==='created'?'Respaldo cifrado creado en Drive':'Drive conectado. Datos sincronizados.');
    const node=document.getElementById('drive-status');if(node)node.textContent=cloudStatus();
    show(result.status==='conflict'?'Existen diferencias entre el dispositivo y Drive. Revisa tu elección antes de sincronizar.':'Conexión realizada. Verifica que el estado diga Sincronizado.');
  }catch(err){
    const message=err?.message||'Falló la conexión con Google Drive.';
    show('No se pudo conectar: '+message,true);notify(message);
  }finally{
    if(connectButton){connectButton.disabled=false;connectButton.textContent='Conectar / recuperar Google Drive';}
  }}
  function settingsModal(){
    openModal('Configuración y respaldos',`<form id="settings-form" class="form">
      ${field('Ingreso mensual previsto ($)','salary','number',val(state.settings.salary||0),'Úsalo como referencia: los ingresos reales se registran como movimientos.','min="0" step="0.01"')}
      ${field('Meta de ahorro mensual ($)','savingsTarget','number',val(state.settings.savingsTarget||0),'Esta cifra es una meta, no un saldo de cuenta.','min="0" step="0.01"')}
      <button type="submit" class="primary full">Guardar preferencias</button></form>
      <div class="divider"></div><div class="section-title"><h2>Seguridad y archivos</h2></div>
      <div class="stack"><button class="secondary full" data-action="import-accounts">Importar cuentas CSV</button><button class="secondary full" data-action="import-movements">Importar movimientos CSV</button><button class="secondary full" data-action="sample-accounts">Descargar plantilla de cuentas</button><button class="secondary full" data-action="export-accounts">Exportar mis cuentas CSV (sin imágenes)</button><button class="secondary full" data-action="sample-movements">Descargar plantilla de movimientos</button><button class="secondary full" data-action="export-backup">Exportar respaldo completo JSON</button><button class="secondary full" data-action="import-backup">Restaurar respaldo JSON</button><button class="secondary full" data-action="request-persistence">Solicitar almacenamiento persistente</button></div>
      <div class="inline-note" style="margin-top:14px">Los datos están guardados en este navegador, no en GitHub. El respaldo JSON de esta versión <b>no está cifrado</b>: guárdalo en un sitio privado y protegido. No subas respaldos ni estados de cuenta a un repositorio público.</div>
      <div class="divider"></div><h2>Almacenamiento local</h2><p id="storage-diagnostic" class="help" role="status">${esc(storageMessage())}</p><button type="button" class="secondary full" data-action="storage-retry">Comprobar almacenamiento sin borrar datos</button>
      <div class="divider"></div><h2>Google Drive cifrado</h2><p class="help">Estado: <b id="drive-status">${esc(cloudStatus())}</b>. Los cambios se sincronizan mientras la sesión de Google esté autorizada y haya conexión. Drive no sustituye copias de respaldo independientes.</p><p class="help"><a href="https://console.cloud.google.com/auth/overview/personal" target="_blank" rel="noopener noreferrer">Crear acceso gratuito en Google (Personal Mode)</a> · <a href="https://github.com/facu-Garcia/mi-control-financiero/blob/main/docs/GOOGLE_DRIVE.md" target="_blank" rel="noopener noreferrer">Ver instrucciones detalladas</a></p><form id="drive-form" class="form">${field('ID de cliente OAuth de Google','clientId','text',drive?.clientId||'','Lo creas en Google Cloud; es público y no es una contraseña.','autocomplete="off"')}${field('Contraseña de cifrado (mín. 12 caracteres)','passphrase','password','','No se guarda: la necesitarás para recuperar tus datos.','minlength="12" autocomplete="off"')}<button type="submit" class="primary full">Conectar / recuperar Google Drive</button><p id="drive-feedback" class="drive-feedback" role="status" aria-live="polite" ${driveInitError?'data-error="true"':''} ${driveInitError?'':'hidden'}>${esc(driveInitError)}</p></form><div class="toolbar"><button class="secondary small" data-action="drive-sync">Sincronizar ahora</button><button class="secondary small" data-action="drive-reconnect">Reconectar</button></div><div class="inline-note">Una PWA no puede sincronizarse mientras permanece cerrada. Si Google cierra la sesión, debes volver a autorizar. Nunca subas tus archivos privados a GitHub.</div><div class="divider"></div><div class="help">Versión 0.4.2 · MXN · Uso personal</div>`);
    document.getElementById('drive-form').addEventListener('submit',async e=>{e.preventDefault();await startDrive(e.currentTarget.elements.clientId.value,e.currentTarget.elements.passphrase.value);});
    document.getElementById('settings-form').addEventListener('submit',async e=>{e.preventDefault();try{
      const f=e.currentTarget,salary=cents(f.elements.salary.value),savingsTarget=cents(f.elements.savingsTarget.value);
      if(!Number.isSafeInteger(salary)||salary<0||!Number.isSafeInteger(savingsTarget)||savingsTarget<0)throw Error('Ingresa cifras válidas.');
      await save('settings',{id:'preferences',salary,savingsTarget});closeModal();notify('Preferencias guardadas');
    }catch(err){notify(err.message);}});
  }
  function downloadFile(name,contents,mime){const file=new Blob([contents],{type:mime});const href=URL.createObjectURL(file);const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),5000);}
  function exportAccountsCsv(){
    const headers=['nombre','institucion','tipo','fecha_saldo','saldo_inicial','deuda_inicial','limite_credito','dia_corte','dia_pago','diseno'];
    const rows=state.accounts.map(a=>({
      nombre:a.name,institucion:a.institution||'',tipo:a.type,
      fecha_saldo:a.balanceDate,saldo_inicial:val(a.initialBalance),deuda_inicial:val(a.initialDebt),
      limite_credito:val(a.creditLimit),dia_corte:a.cutDay||'',dia_pago:a.dueDay||'',diseno:Cards.styleOf(a.cardStyle)
    }));
    downloadFile('mis-cuentas-'+localDate()+'.csv',CSV.format(rows,headers),'text/csv;charset=utf-8');
    notify('Cuentas exportadas. Las imágenes personalizadas quedan en el respaldo JSON.');
  }
  function exportBackup(){const payload={...snapshot(),exportedAt:new Date().toISOString()};downloadFile(`mis-finanzas-respaldo-${localDate()}.json`,JSON.stringify(payload,null,2),'application/json');notify('Respaldo exportado. Guárdalo en un lugar privado.');}
  function exportReport(){const payload={...F.reportForMonth(state.accounts,state.movements,state.settings,selectedMonth),budgets:state.budgets.map(b=>({...b,accountName:b.accountId==='all'?'Todas las cuentas':getAccount(b.accountId)?.name||'',spent:budgetSpend(b)}))};downloadFile(`mi-informe-${selectedMonth}.json`,JSON.stringify(payload,null,2),'application/json');notify('Informe mensual exportado');}
  function exportCsv(){const r=F.reportForMonth(state.accounts,state.movements,state.settings,selectedMonth);const rows=[['fecha','mes_financiero','tipo','cuenta_origen','cuenta_destino','categoria','descripcion','importe_MXN','meses_MSI']];
    for(const m of r.movements)rows.push([m.date,m.financialMonth,m.type,getAccount(m.accountId)?.name||'',getAccount(m.toAccountId)?.name||'',m.category||'',m.description||'',val(m.amount),m.months||1]);
    const csv='\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');downloadFile(`mis-movimientos-${selectedMonth}.csv`,csv,'text/csv;charset=utf-8');notify('CSV exportado');}
  function validatedBackup(x){
    if(!x||x.kind!=='complete-backup'||![1,2,3].includes(x.schemaVersion)||!Array.isArray(x.accounts)||!Array.isArray(x.movements)||!x.settings||x.accounts.length>1000||x.movements.length>100000)throw Error('El archivo no es un respaldo compatible.');
    const validId=s=>typeof s==='string'&&s.length>0&&s.length<=100;
    const validMoney=v=>Number.isSafeInteger(v)&&Math.abs(v)<=1e15;
    const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
    const accounts=x.accounts.map(a=>{
      if(!validId(a.id)||!Object.hasOwn(accountTypes,a.type)||typeof a.name!=='string'||a.name.length>90||!validDate(a.balanceDate)||!validMoney(a.initialBalance)||!validMoney(a.initialDebt)||!validMoney(a.creditLimit)||!Number.isInteger(a.cutDay)||a.cutDay<0||a.cutDay>31||!Number.isInteger(a.dueDay)||a.dueDay<0||a.dueDay>31)throw Error('El respaldo contiene una cuenta inválida.');
      return {id:a.id,name:a.name,institution:String(a.institution||'').slice(0,90),type:a.type,balanceDate:a.balanceDate,initialBalance:a.initialBalance,initialDebt:a.initialDebt,creditLimit:a.creditLimit,cutDay:a.cutDay,dueDay:a.dueDay,
         cardStyle:Cards.styleOf(a.cardStyle),cardImage:Cards.safePicture(a.cardImage),createdAt:String(a.createdAt||'')};
    });
    const idMap=new Map(accounts.map(a=>[a.id,a]));if(idMap.size!==accounts.length)throw Error('Hay cuentas duplicadas.');
    const movements=x.movements.map(m=>{
      if(!validId(m.id)||!Object.hasOwn(txNames,m.type)||!validDate(m.date)||!validId(m.accountId)||!idMap.has(m.accountId)||!validMoney(m.amount)||m.amount<=0||!Number.isInteger(m.months)||m.months<1||m.months>120||typeof m.description!=='string'||m.description.length>200||typeof m.category!=='string'||m.category.length>100)throw Error('El respaldo contiene movimientos inválidos.');
      const dst=String(m.toAccountId||'');if((m.type==='transfer'||m.type==='payment')&&!idMap.has(dst))throw Error('Hay movimientos con destino inexistente.');
      return {id:m.id,type:m.type,date:m.date,accountId:m.accountId,toAccountId:dst,amount:m.amount,months:m.months,category:m.category,description:m.description,createdAt:String(m.createdAt||''),
        recurrenceId:String(m.recurrenceId||'').slice(0,100),recurrenceMonth:String(m.recurrenceMonth||'').slice(0,7),
        autoGenerated:m.autoGenerated===true,confirmed:m.confirmed===true};
    });
    if(new Set(movements.map(m=>m.id)).size!==movements.length)throw Error('Hay movimientos duplicados.');
    const salary=x.settings.salary||0,target=x.settings.savingsTarget||0;
    if(!validMoney(salary)||!validMoney(target)||salary<0||target<0)throw Error('Las preferencias son inválidas.');
    const rawBudgets=Array.isArray(x.budgets)?x.budgets:[];
    if(rawBudgets.length>2000)throw Error('Demasiados presupuestos.');
    const budgets=rawBudgets.map(b=>{if(!validId(b.id)||!validMoney(b.limit)||b.limit<=0||!validId(b.category)||!(b.accountId==='all'||idMap.has(b.accountId)))throw Error('Presupuesto inválido.');return {id:b.id,category:b.category,accountId:b.accountId,limit:b.limit};});
    const rawRec=Array.isArray(x.recurrences)?x.recurrences:[];
    if(rawRec.length>3000)throw Error('Demasiadas suscripciones.');
    const recurrences=rawRec.map(r=>{const value={
      id:String(r.id||''),name:String(r.name||'').slice(0,80),amount:r.amount,accountId:String(r.accountId||''),
      day:Number(r.day),category:String(r.category||'Suscripciones').slice(0,100),frequency:'monthly',paused:r.paused===true,
      startDate:String(r.startDate||''),endDate:String(r.endDate||'')
    };if(!validId(value.id)||!idMap.has(value.accountId))throw Error('Suscripción con cuenta inválida.');Rec.validate(value,accounts);return value;});
    const rawRecs=Array.isArray(x.reconciliations)?x.reconciliations:[];
    if(rawRecs.length>20000)throw Error('Demasiadas conciliaciones.');
    const reconciliations=rawRecs.map(r=>{if(!validId(r.id)||!idMap.has(r.accountId)||!validMoney(r.actual)||!validMoney(r.expected)||!validDate(r.date))throw Error('Conciliación inválida.');
      return {id:r.id,accountId:r.accountId,date:r.date,actual:r.actual,expected:r.expected,difference:r.actual-r.expected,note:String(r.note||'').slice(0,150),createdAt:String(r.createdAt||'')};
    });
    const rawAudits=Array.isArray(x.audits)?x.audits:[];
    if(rawAudits.length>20000)throw Error('Demasiadas entradas de historial.');
    const audits=rawAudits.map(a=>{if(!validId(a.id)||!validId(a.movementId))throw Error('Auditoría inválida.');return {id:a.id,movementId:a.movementId,date:String(a.date||'').slice(0,40),before:a.before||null,after:a.after||null};});
    return {accounts,movements,budgets,recurrences,reconciliations,audits,settings:{id:'preferences',salary,savingsTarget:target}};
  }
  async function replaceBackup(x){return new Promise((resolve,reject)=>{const tx=db.transaction(['accounts','movements','settings','budgets','recurrences','reconciliations','audits'],'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Importación cancelada'));
    for(const storeName of ['accounts','movements','settings','budgets','recurrences','reconciliations','audits'])tx.objectStore(storeName).clear();
    x.accounts.forEach(a=>tx.objectStore('accounts').put(a));x.movements.forEach(m=>tx.objectStore('movements').put(m));(x.budgets||[]).forEach(b=>tx.objectStore('budgets').put(b));(x.recurrences||[]).forEach(r=>tx.objectStore('recurrences').put(r));(x.reconciliations||[]).forEach(r=>tx.objectStore('reconciliations').put(r));(x.audits||[]).forEach(a=>tx.objectStore('audits').put(a));tx.objectStore('settings').put(x.settings);
  });}
  async function importBackupFile(file){if(!file)return;if(file.size>15*1024*1024){notify('Archivo demasiado grande (máximo 15 MB).');return;}
    try{const x=validatedBackup(JSON.parse(await file.text()));
      const ok=confirm(`Este respaldo tiene ${x.accounts.length} cuentas y ${x.movements.length} movimientos. RESTAURARLO REEMPLAZARÁ TODOS LOS DATOS ACTUALES en este navegador. Antes exporta un respaldo actual. ¿Continuar?`);
      if(!ok)return;
      await replaceBackup(x);closeModal();await reload();afterChange();notify('Respaldo restaurado correctamente');
    }catch(err){notify(err.message||'No se pudo importar el archivo');}
  }
  async function askPersist(){if(!navigator.storage?.persist){notify('Este navegador no ofrece la opción de persistencia.');return;}
    try{const allowed=await navigator.storage.persist();notify(allowed?'Almacenamiento persistente concedido':'El navegador no concedió persistencia. Conserva tus respaldos.');}catch{notify('No se pudo solicitar persistencia');}}
  document.body.addEventListener('change',e=>{if(e.target.id==='insight-account'){insightAccount=e.target.value;renderInsight();}});
  document.body.addEventListener('click',async e=>{
    const nav=e.target.closest('[data-page]');if(nav){navigate(nav.dataset.page);return;}
    const target=e.target.closest('[data-action]');if(!target)return;
    const action=target.dataset.action;
    try{switch(action){case 'close':closeModal();break;
      case 'add-account':accountForm();break;case 'add-movement':movementForm();break;
      case 'open-insight':insightKind=target.dataset.kind||'wealth';insightAccount='all';navigate('insight');break;
      case 'back-home':navigate('home');break;
      case 'open-recurring':navigate('recurrences');break;
      case 'show-audits':showAudits();break;
      case 'add-rec':recurrenceForm();break;
      case 'edit-rec':recurrenceForm(state.recurrences.find(r=>r.id===target.dataset.id));break;
      case 'toggle-rec':{const r=state.recurrences.find(x=>x.id===target.dataset.id);if(r){await save('recurrences',{...r,paused:!r.paused});notify(r.paused?'Pago recurrente activado':'Pago recurrente pausado');}break;}
      case 'account-move':{const a=getAccount(target.dataset.id);closeModal();movementForm(a?.id||'','expense');break;}
      case 'reconcile':{const acc=target.dataset.id;closeModal();reconcileForm(acc);break;}
      case 'edit-tx':{const m=state.movements.find(x=>x.id===target.dataset.id);if(m){closeModal();movementForm(m.accountId,m.type,m);}break;}
      case 'confirm-tx':{const m=state.movements.find(x=>x.id===target.dataset.id);if(m?.autoGenerated&&!m.confirmed){if(confirm('¿Confirmas que el banco ya cobró este importe? Se aplicará al saldo.')){await save('audits',{id:id(),movementId:m.id,date:new Date().toISOString(),before:m,after:{...m,confirmed:true}});await save('movements',{...m,confirmed:true});notify('Cargo confirmado');}}break;}
      case 'account-detail':accountDetail(target.dataset.id);break;
      case 'remove-tx':if(confirm('¿Eliminar este movimiento? Se recalcularán saldos y reportes.')){const old=state.movements.find(m=>m.id===target.dataset.id);if(old)await save('audits',{id:id(),movementId:old.id,date:new Date().toISOString(),before:old,after:null});await remove('movements',target.dataset.id);notify('Movimiento eliminado');}break;
      case 'goto-accounts':navigate('accounts');break;case 'goto-movements':navigate('movements');break;case 'goto-budgets':navigate('budgets');break;
      case 'filter':filter=target.dataset.filter;render();break;
      case 'export-backup':exportBackup();break;case 'export-report':exportReport();break;case 'export-csv':exportCsv();break;
      case 'import-backup':document.getElementById('import-file').click();break;
      case 'import-accounts':document.getElementById('import-accounts-file').click();break;
      case 'export-accounts':exportAccountsCsv();break;
      case 'import-movements':document.getElementById('import-movements-file').click();break;
      case 'sample-accounts':downloadFile('plantilla-cuentas.csv',CSV.format([],['nombre','institucion','tipo','fecha_saldo','saldo_inicial','deuda_inicial','limite_credito','dia_corte','dia_pago','diseno']),'text/csv;charset=utf-8');break;
      case 'sample-movements':downloadFile('plantilla-movimientos.csv',CSV.format([],['fecha','tipo','cuenta','cuenta_destino','categoria','descripcion','importe_MXN','meses_MSI','referencia']),'text/csv;charset=utf-8');break;
      case 'add-budget':budgetForm();break;case 'remove-budget':if(confirm('¿Eliminar este límite?')){await remove('budgets',target.dataset.id);}break;
      case 'drive-sync':if(!drive?.ready)notify('Conecta Google Drive desde Ajustes.');else {drive.dirty=true;await drive.sync();}break;
      case 'drive-reconnect':settingsModal();notify('Escribe nuevamente la contraseña de cifrado para reconectar.');break;
      case 'request-persistence':await askPersist();break;
      case 'storage-retry':await retryLocal();refreshStorageMessage();break;
    }}catch(err){notify(err.message||'Ocurrió un error');}
  });
  document.getElementById('fab-add').addEventListener('click',()=>movementForm());
  document.getElementById('btn-settings').addEventListener('click',settingsModal);
  document.getElementById('import-accounts-file').addEventListener('change',async e=>{await importCsv(e.target.files?.[0],'accounts');e.target.value='';});
  document.getElementById('import-movements-file').addEventListener('change',async e=>{await importCsv(e.target.files?.[0],'movements');e.target.value='';});
  document.getElementById('import-file').addEventListener('change',async e=>{await importBackupFile(e.target.files?.[0]);e.target.value='';});
  document.getElementById('modal').addEventListener('click',e=>{if(e.target===modal)closeModal();});
  main.addEventListener('change',e=>{if(e.target.id==='month-control'&&/^\d{4}-\d{2}$/.test(e.target.value)){selectedMonth=e.target.value;render();}});
  async function init(){
    localInitStatus='iniciando';localInitError='';refreshStorageMessage();
    try{
      if(!window.Finance||!window.FinanceCSV||!window.FinanceStorage||!window.FinanceCards||!window.FinanceCardImages||!window.FinanceAccountPicker){
        const missing=['Finance','FinanceCSV','FinanceStorage','FinanceCards','FinanceCardImages','FinanceAccountPicker'].filter(name=>!window[name]).join(', ');
        throw Error('No se cargaron los archivos: '+missing+'. Reabre la aplicación en Chrome y actualiza la página.');
      }
      if(!db)db=await openDb();
      await reload();
      try{await generateDueEntries();}catch(err){console.warn('Suscripciones: no se pudieron generar cargos pendientes',err);}
      localInitStatus='listo';localInitError='';refreshStorageMessage();
      document.getElementById('fab-add').disabled=false;
    }catch(err){
      localInitStatus='error';
      localInitError='La base local no inició: '+(err?.message||'error desconocido');
      main.innerHTML=`<div class="panel"><h2>No se pudo iniciar la aplicación</h2><p>No se han borrado los datos. Revisa el diagnóstico de Ajustes y cierra otras pestañas de la PWA antes de reintentar.</p><p class="help">${esc(localInitError)}</p></div>`;
      document.getElementById('fab-add').disabled=true;
      document.getElementById('cloud-chip').textContent='☁ Pendiente';
      refreshStorageMessage();
      return;
    }
    // Google Drive es opcional y no debe bloquear la base local.
    try{ensureDrive();}catch(err){console.warn('Google Drive no disponible:',err?.message||err);}
    if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&localInitStatus==='listo')generateDueEntries().catch(e=>console.warn('Cargo programado pendiente:',e));
  });
  setInterval(()=>{if(!document.hidden&&localInitStatus==='listo')generateDueEntries().catch(()=>{});},60000);
  localInitTask=init();
})();
