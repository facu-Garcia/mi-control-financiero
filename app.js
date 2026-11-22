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
  const Payroll = window.FinancePayroll;
  const PayrollViews = window.FinancePayrollViews;
  const Billing = window.FinanceBilling;
  const BillingViews = window.FinanceBillingViews;
  const Pockets = window.FinancePockets;
  const PocketViews = window.FinancePocketsViews;
  const AccountPage = window.FinanceAccountPage;
  const CreditRow = window.FinanceCreditRow;
  const DB_NAME = 'mi-control-financiero-db';
  const DB_VERSION = 6;
  const accountTypes = {debit:'Cuenta de débito',credit:'Tarjeta de crédito',cash:'Efectivo',saving:'Ahorro',pocket:'Cajita / apartado'};
  const typeIcons = {debit:'▤',credit:'▰',cash:'▣',saving:'◇',pocket:'⬡'};
  const txNames = {expense:'Gasto',income:'Ingreso',transfer:'Transferencia',payment:'Pago de tarjeta',yield:'Rendimiento',debtAdjustment:'Ajuste de deuda anterior'};
  const txIcons = {expense:'↗',income:'↙',transfer:'⇄',payment:'✓',yield:'✧',debtAdjustment:'≋'};
  const categoryIcons={Comida:'🍽',Supermercado:'🛒',Transporte:'🚇',Vivienda:'⌂',Servicios:'⚡',Entretenimiento:'◈',Salud:'✚',Compras:'🛍',Suscripciones:'↻',Educación:'▤',Otros:'○'};
  const bankThemes={inbursa:{color:'#2775ac',label:'INBURSA'},'mercado pago':{color:'#00a6ec',label:'MP'},nu:{color:'#8233ad',label:'nu'},nub:{color:'#8233ad',label:'nu'},bbva:{color:'#115b9e',label:'BBVA'},revolut:{color:'#171a20',label:'R'}};
  const cats = ['Comida','Supermercado','Transporte','Vivienda','Servicios','Entretenimiento','Salud','Compras','Suscripciones','Educación','Otros'];
  const main = document.getElementById('main');
  const modal = document.getElementById('modal');
  const modalInner = document.getElementById('modal-inner');
  const toastNode = document.getElementById('toast');
  let db;
  let state = {accounts:[],movements:[],budgets:[],recurrences:[],reconciliations:[],audits:[],payrollProfiles:[],billingCycles:[],legacyInstallments:[],pockets:[],pocketMoves:[],settings:{salary:0,savingsTarget:0}};
  let drive;
  let driveInitError = '';
  let localInitError = '';
  let localInitStatus = 'iniciando';
  let localInitTask;
  let generatingDue=false;
  let page = 'home', selectedMonth = localDate().slice(0,7), filter = 'all', selectedAccount = null, insightKind='wealth', insightAccount='all', selectedPayrollAccount='', selectedBillingCard='', selectedPocket='';

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
  function snapshot(){return {schemaVersion:6,kind:'complete-backup',currency:'MXN',accounts:state.accounts,movements:state.movements,budgets:state.budgets,recurrences:state.recurrences,reconciliations:state.reconciliations,audits:state.audits,payrollProfiles:state.payrollProfiles,billingCycles:state.billingCycles,legacyInstallments:state.legacyInstallments,pockets:state.pockets,pocketMoves:state.pocketMoves,settings:state.settings};}
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
  async function reload(){const [accounts,movements,budgets,settings,recurrences,reconciliations,audits,payrollProfiles,billingCycles,legacyInstallments,pockets,pocketMoves]=await Promise.all([request('accounts','getAll'),request('movements','getAll'),request('budgets','getAll'),request('settings','get','preferences'),request('recurrences','getAll'),request('reconciliations','getAll'),request('audits','getAll'),request('payrollProfiles','getAll'),request('billingCycles','getAll'),request('legacyInstallments','getAll'),request('pockets','getAll'),request('pocketMoves','getAll')]);state={accounts,movements,budgets,recurrences,reconciliations,audits,payrollProfiles,billingCycles,legacyInstallments,pockets,pocketMoves,settings:settings||{id:'preferences',salary:0,savingsTarget:0}};render();}
  async function save(store,entry){await mutate(store,'put',entry);await reload();afterChange();}
  async function remove(store,identifier){await mutate(store,'delete',identifier);await reload();afterChange();}
  function header(title,detail=''){return `<div class="page-head"><div><div class="eyebrow">${esc(detail||'Tu centro financiero')}</div><h1>${esc(title)}</h1></div><input id="month-control" aria-label="Mes del reporte" type="month" class="month-control" value="${esc(selectedMonth)}"></div>`;}
  function sectionTitle(t,action='',label=''){return `<div class="section-title"><h2>${esc(t)}</h2>${action?`<button class="text-btn" data-action="${esc(action)}">${esc(label||'Ver más')}</button>`:''}</div>`;}
  function blank(message,button=''){return `<div class="empty"><span class="symbol">◈</span>${esc(message)}${button?`<div style="margin-top:14px"><button class="secondary small" data-action="${esc(button)}">${button==='add-account'?'Agregar mi primera cuenta':'Registrar movimiento'}</button></div>`:''}</div>`;}
  // Presentación independiente en card-designs.js; la lógica de saldos sigue en logic.js.
  function cardTile(a){return Cards.render(a);}
  function creditCards(rows){
    return rows.map(a=>CreditRow.render(a,{F,B:Billing,cycles:state.billingCycles,movements:state.movements,
      today:localDate(),esc,money,bankIcon:(card)=>{const t=badgeFor(card);return '<div class="account-icon brand-icon" style="--bank:'+esc(t.color)+'">'+esc(t.label.slice(0,3))+'</div>';}})).join('');
  }
  function accountList(accs,clickable=true){return accs.length?accs.map(a=>{
    const balance=F.accountBalance(a,state.movements),credit=a.type==='credit',theme=badgeFor(a);
    const missing=credit&&(a.cutDay===0||a.creditLimit===0);
    return `<div class="account-row"><div class="account-icon brand-icon" style="--bank:${esc(theme.color)}">${esc(theme.label.slice(0,3))}</div><div class="row-body"><div class="row-title">${esc(a.name)} <span class="mini-type">${credit?'Crédito':a.type==='debit'?'Débito':accountTypes[a.type]}</span></div><div class="row-sub">${esc(a.institution||accountTypes[a.type])}${missing?' · <span class="warning-text">Configuración pendiente</span>':''}</div></div><div class="row-amount ${credit?'negative':''}">${money(balance)}<small>${credit?'Deuda estimada':'Saldo estimado'}</small></div>${clickable?`<button class="iconbtn" data-action="account-detail" data-id="${esc(a.id)}" aria-label="Detalle de cuenta">›</button>`:''}</div>`;
  }).join(''):blank('Todavía no hay cuentas registradas.','add-account');}
  function monthlyTx(){return sortTx(state.movements.filter(m=>m.type==='expense'?F.monthlyPurchaseMonth(m,getAccount(m.accountId),state.billingCycles)===selectedMonth:F.monthOf(m.date)===selectedMonth));}
  function txList(items,removeButtons=false){return items.length?items.map(m=>{
    const origin=getAccount(m.accountId),dest=getAccount(m.toAccountId);
    const name=m.description||(m.type==='expense'?m.category:txNames[m.type]);
    let sub=`${shortDate(m.date)} · ${esc(origin?.name||'Cuenta eliminada')} · ${esc(txNames[m.type])}`;
    if(dest)sub+=` → ${esc(dest.name)}`;
    if(m.type==='income'&&Payroll.TYPES[m.payrollKind])sub+=` · ${esc(Payroll.TYPES[m.payrollKind])}`;
    if(m.type==='expense'&&origin?.type==='credit')sub+=` · Corte ${esc(monthName(F.statementOf(m.date,origin.cutDay,state.billingCycles,origin.id)))}`;
    if(m.type==='expense'&&Number(m.months)>1)sub+=` · ${m.months} MSI`;
    const cls=m.type==='income'||m.type==='yield'?'positive':m.type==='expense'?'negative':'';
    const sym=m.type==='expense'?(categoryIcons[m.category]||'🛍'):(txIcons[m.type]||'⇄');
    return `<div class="tx-row"><div class="tx-icon tx-${esc(m.type)}" aria-hidden="true">${sym}</div><div class="row-body"><div class="row-title">${esc(name)}</div><div class="row-sub">${sub}</div></div><div class="row-amount ${cls}">${m.type==='income'||m.type==='yield'?'+':m.type==='expense'?'-':''}${money(m.amount)}<small>${m.autoGenerated&&!m.confirmed?'<span class="rec-badge">Pendiente</span>':esc(txNames[m.type])}</small></div>${removeButtons?`<div class="toolbar"><button class="iconbtn" data-action="edit-tx" data-id="${esc(m.id)}" aria-label="Editar movimiento">✎</button>${m.autoGenerated&&!m.confirmed?`<button class="iconbtn" data-action="confirm-tx" data-id="${esc(m.id)}" aria-label="Confirmar cargo">✓</button>`:''}<button class="iconbtn" data-action="remove-tx" data-id="${esc(m.id)}" aria-label="Eliminar movimiento">×</button></div>`:''}</div>`;
  }).join(''):blank('No hay movimientos para este periodo.','add-movement');}
  function renderHome(){
    const t=F.totals(state.accounts,state.movements),b=F.breakdown(state.accounts,state.movements,selectedMonth,state.billingCycles),tx=monthlyTx();
    const power=Insight.spendingPower(F,state.accounts,state.movements,state.recurrences,localDate(),Pockets.totalAllocated(state.pockets,state.pocketMoves,state.movements));const warnings=Insight.baselineWarnings(state.accounts,state.movements);
    const cards=state.accounts.filter(a=>a.type==='credit');const charges=cards.reduce((s,a)=>s+F.statementCharges(a,state.movements,selectedMonth,state.billingCycles,state.legacyInstallments).total,0);
    main.innerHTML=header('Tu dinero','Resumen general')+`<button type="button" class="hero hero-click" data-action="open-insight" data-kind="wealth"><div class="hero-label">Patrimonio neto estimado</div><div class="hero-value">${money(t.netWorth)}</div><div class="hero-sub">Saldos disponibles + ahorros − deuda de tarjetas</div><div class="hero-bottom"><div class="hero-mini">Dinero y ahorros<b>${money(t.assets)}</b></div><div class="hero-mini">Deuda en tarjetas<b>${money(t.debts)}</b></div></div></button>
    <div class="two-col" style="margin-top:12px"><button type="button" class="stat stat-click" data-action="open-insight" data-kind="income"><div class="k">Ingresos recibidos este mes</div><div class="v positive">${money(b.income)}</div><div class="hint">Salario previsto: ${money(projectedSalary())}</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="purchases"><div class="k">Compras del mes financiero</div><div class="v">${money(b.purchases)}</div><div class="hint">Tarjetas según fecha de corte</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="savings"><div class="k">Ahorros en cajitas y cuentas</div><div class="v sky">${money(t.saved+Pockets.totalAllocated(state.pockets,state.pocketMoves,state.movements))}</div><div class="hint">Incluidos en tu dinero total</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="statements"><div class="k">Cargos de tarjetas en el corte</div><div class="v gold">${money(charges)}</div><div class="hint">Incluye mensualidades MSI estimadas</div></button></div>
    <button type="button" class="spendable-strip" data-action="open-insight" data-kind="wealth" aria-label="Ver estimación de dinero disponible y patrimonio"><span class="spendable-strip-copy"><span class="spendable-kicker">Estimación para gastar</span><strong>${money(power.spendable)}</strong><small>Descontando deuda y compromisos conocidos · ver detalle</small></span><span class="spendable-arrow" aria-hidden="true">›</span></button>${warnings.length?`<div class="inline-note">Atención: ${warnings.length} cuenta(s) tienen movimientos con fecha igual o anterior a su saldo base. Se muestran en el histórico pero no alteran el saldo. Revisa la fecha base y el saldo inicial.</div>`:''}
     ${sectionTitle('Dinero y ahorros','goto-accounts','Ver cuentas')}
     <div class="panel">${accountList(state.accounts.filter(a=>a.type!=='credit').slice(0,4))}</div>
     ${sectionTitle('Tarjetas de crédito','goto-accounts','Ver tarjetas')}
     ${creditCards(cards.slice(0,3))}
    ${sectionTitle('Movimientos del periodo','goto-movements','Ver todos')}<div class="panel">${txList(tx.slice(0,5))}</div>
    <p class="footnote">El saldo es una estimación basada en los saldos iniciales y movimientos registrados. Los cargos del corte no equivalen necesariamente al pago exigible por el banco.</p>`;
  }
  function renderAccounts(){
    const assets=state.accounts.filter(a=>a.type!=='credit'),cards=state.accounts.filter(a=>a.type==='credit');
    main.innerHTML=header('Bancos y tarjetas','Todas tus cuentas')+`<div class="toolbar"><button class="primary small" data-action="add-account">＋ Agregar cuenta o tarjeta</button><button class="secondary small" data-action="import-accounts">⇧ Importar cuentas CSV</button><button class="secondary small" data-action="open-payroll">▤ Nómina</button></div>
      ${sectionTitle('Tus tarjetas visuales')}<div class="card-gallery">${state.accounts.filter(a=>['debit','credit'].includes(a.type)).map(a=>`<button class="card-button" data-action="account-detail" data-id="${esc(a.id)}">${cardTile(a)}<span class="card-button-caption"><span>${esc(a.name)}</span><span>${a.type==='credit'?'CRÉDITO':'DÉBITO'}</span></span></button>`).join('')||blank('Agrega tarjetas o importa tu CSV para mostrarlas aquí.')}</div>
      ${sectionTitle('Dinero, efectivo y cajitas')}<div class="panel">${accountList(assets)}</div><p class="help">Abre una cuenta de débito para organizar sus cajitas internas. Las cuentas de ahorro antiguas se conservan sin cambios.</p>
      ${sectionTitle('Tarjetas de crédito')}${cards.length?creditCards(cards):blank('Agrega tus tarjetas para controlar cortes, saldos y MSI.')}
      <p class="footnote">Cada cuenta parte de un saldo inicial al cierre de la fecha que elijas. Solo se aplican a ese saldo los movimientos posteriores; los anteriores pueden servir para el historial sin duplicar dinero.</p>`;
  }
  function renderMovements(){
    const tx=monthlyTx().filter(m=>filter==='all'||m.type===filter);
    main.innerHTML=header('Tus movimientos','Historial por mes financiero')+`<div class="toolbar"><button class="secondary small" data-action="import-movements">⇧ Importar movimientos CSV</button><button class="secondary small" data-action="open-payroll">Nómina</button><button class="secondary small" data-action="show-audits">Historial de ediciones</button><button class="secondary small" data-action="open-recurring">Suscripciones</button></div><div class="pills">${[['all','Todos'],['expense','Gastos'],['income','Ingresos'],['payment','Pagos'],['transfer','Transferencias'],['yield','Rendimientos']].map(([v,label])=>`<button class="pill ${filter===v?'sel':''}" data-action="filter" data-filter="${v}">${label}</button>`).join('')}</div><div class="panel">${txList(tx,true)}</div><p class="footnote">Las compras de crédito se agrupan por el mes de corte. Transferencias, pagos y movimientos de débito se muestran por su fecha real.</p>`;
  }
  function renderReports(){
    const b=F.breakdown(state.accounts,state.movements,selectedMonth,state.billingCycles),catsList=Object.entries(b.byCat).sort((a,c)=>c[1]-a[1]);
    const cards=state.accounts.filter(a=>a.type==='credit');
    const expected=Insight.forecast(F,state.accounts,state.movements,state.recurrences,projectedSalary(),selectedMonth,state.billingCycles,state.legacyInstallments);
    const stmt=cards.map(a=>({a,s:F.statementCharges(a,state.movements,selectedMonth,state.billingCycles,state.legacyInstallments)}));
    const future=Array.from({length:6},(_,i)=>{const month=F.shiftMonth(selectedMonth,i+1);return {month,value:F.monthlyInstallments(state.accounts,state.movements,month,state.billingCycles,state.legacyInstallments)};});
    main.innerHTML=header('Informe mensual','Análisis detallado')+`<div class="two-col"><div class="stat"><div class="k">Ingreso efectivamente recibido</div><div class="v positive">${money(b.income)}</div></div><div class="stat"><div class="k">Compras atribuibles al mes</div><div class="v negative">${money(b.purchases)}</div></div><div class="stat"><div class="k">Salidas bancarias de efectivo</div><div class="v">${money(b.bankOutflow)}</div><div class="hint">Compras débito + pagos de tarjeta</div></div><div class="stat"><div class="k">Rendimientos registrados</div><div class="v sky">${money(b.yields)}</div></div></div>
    ${renderDonut(b)}
    ${sectionTitle('¿En qué gastaste?')}<div class="panel">${catsList.length?catsList.map(([name,amount])=>`<div class="baritem"><div class="baritem-row"><span>${esc(name)}</span><b>${money(amount)}</b></div><div class="progress"><div style="width:${b.purchases?Math.min(100,100*amount/b.purchases):0}%"></div></div></div>`).join(''):blank('Todavía no hay gastos registrados en este mes.')}</div>
    ${sectionTitle('Cargos por tarjeta en el corte')}<div class="panel">${stmt.length?stmt.map(({a,s})=>`<div class="report-line"><span><b>${esc(a.name)}</b><br><span class="help">${esc('Corte habitual día '+a.cutDay)} · Ordinarios ${money(s.ordinary)} · MSI ${money(s.installments)}</span></span><b>${money(s.total)}</b></div>`).join(''):blank('Aún no has agregado tarjetas de crédito.')}</div>
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

  function projectedSalary(){
    const p=state.payrollProfiles[0];
    return p&&p.expectedNet>0?p.expectedNet*(p.frequency==='semimonthly'?2:1):(state.settings.salary||0);
  }
  function currentPayroll(){
    return state.payrollProfiles.find(p=>p.accountId===selectedPayrollAccount)||
      state.payrollProfiles[0]||null;
  }

  function billingDetail(cardId){
    const card=getAccount(cardId);
    if(!card||card.type!=='credit')return;
    selectedBillingCard=cardId;
    page='billing';
    main.innerHTML=BillingViews.detail(card,state.billingCycles,state.legacyInstallments,state.movements,
      selectedMonth,localDate(),Billing,F,money,esc);
    window.scrollTo(0,0);
  }
  function renderBilling(){
    const card=getAccount(selectedBillingCard);
    if(!card||card.type!=='credit'){navigate('accounts');return;}
    main.innerHTML=BillingViews.detail(card,state.billingCycles,state.legacyInstallments,state.movements,
      selectedMonth,localDate(),Billing,F,money,esc);
  }
  function cycleForm(cardId,month=selectedMonth){
    const card=getAccount(cardId);
    if(!card||card.type!=='credit')return;
    const old=Billing.statementOf(card,month,state.billingCycles);
    const selectedMonthBefore=old?.month||month;
    openModal('Estado de cuenta y fechas reales',BillingViews.form(card,old,Billing,val,esc,selectedMonthBefore));
    const form=document.getElementById('billing-cycle-form');
    const refresh=()=>{
      const newMonth=form.elements.month.value,record=Billing.statementOf(card,newMonth,state.billingCycles);
      form.elements.cutDate.value=record?.cutDate||Billing.cut(card,newMonth,[]).date||'';
      form.elements.dueDate.value=record?.dueDate||Billing.due(card,newMonth,[]).date||'';
      form.elements.amountDue.value=record?.amountDue===null||record?.amountDue===undefined?'':val(record.amountDue);
      form.elements.useInitialDebt.checked=record?.source==='initialDebt';
    };
    form.elements.month.addEventListener('change',refresh);
    form.elements.useInitialDebt.addEventListener('change',()=>{
      if(form.elements.useInitialDebt.checked){
        if(!card.initialDebt){form.elements.useInitialDebt.checked=false;notify('La deuda inicial de esta tarjeta es cero.');return;}
        form.elements.amountDue.value=val(card.initialDebt);
      }else{
        const c=Billing.statementOf(card,form.elements.month.value,state.billingCycles);
        form.elements.amountDue.value=c?.source==='initialDebt'?'':c?.amountDue==null?'':val(c.amountDue);
      }
    });
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      try{
        const f=e.currentTarget,key=card.id+'|'+f.elements.month.value,amount=f.elements.amountDue.value.trim();
        const record={id:key,accountId:card.id,month:f.elements.month.value,
          cutDate:f.elements.cutDate.value,dueDate:f.elements.dueDate.value,
          amountDue:amount===''?null:cents(amount),source:f.elements.useInitialDebt.checked?'initialDebt':'bank'};
        Billing.validateCycle(record,state.accounts);
        await save('billingCycles',record);
        closeModal();billingDetail(card.id);
        notify('Fecha de corte y estado de cuenta guardados para ese mes.');
      }catch(error){notify(error.message);}
    });
  }
  function legacyForm(cardId,existing=null){
    const card=getAccount(cardId);if(!card||card.type!=='credit')return;
    openModal(existing?'Editar MSI anteriores':'Registrar MSI que ya venías pagando',
      BillingViews.legacyForm(card,existing,Billing,val,esc,selectedMonth));
    document.getElementById('legacy-installment-form').addEventListener('submit',async e=>{
      e.preventDefault();try{
        const f=e.currentTarget;
        const record={id:existing?.id||id(),accountId:card.id,label:f.elements.label.value.trim(),
          amount:cents(f.elements.amount.value),startMonth:f.elements.startMonth.value,endMonth:f.elements.endMonth.value,
          includedInDebt:f.elements.includedInDebt.value==='yes'};
        Billing.validateLegacy(record,state.accounts);
        if(state.legacyInstallments.some(v=>v.id!==record.id&&v.accountId===card.id&&v.label===record.label&&v.amount===record.amount&&v.startMonth===record.startMonth&&v.endMonth===record.endMonth))
          throw Error('Esa mensualidad ya fue registrada.');
        const adjustmentId='legacy-debt-'+record.id,total=record.amount*(F.monthDiff(record.startMonth,record.endMonth)+1);
        if(!Number.isSafeInteger(total)||total>1e15)throw Error('La deuda agregada es demasiado grande.');
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(['legacyInstallments','movements'],'readwrite');
          tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
          tx.objectStore('legacyInstallments').put(record);
          if(record.includedInDebt)tx.objectStore('movements').delete(adjustmentId);
          else tx.objectStore('movements').put({id:adjustmentId,type:'debtAdjustment',
            accountId:card.id,toAccountId:'',date:card.balanceDate,category:'',description:'MSI anterior: '+record.label,
            amount:total,months:1,legacyId:record.id,createdAt:new Date().toISOString()});
        });
        await reload();afterChange();closeModal();billingDetail(card.id);
        notify(record.includedInDebt?'MSI planificadas sin duplicar la deuda.':'MSI y ajuste de deuda registrados una sola vez.');
      }catch(error){notify(error?.message||'No se pudo guardar la mensualidad.');}
    });
  }
  function renderPayroll(){
    const profile=currentPayroll();
    main.innerHTML=PayrollViews.page(profile,state.accounts,state.movements,selectedMonth,Payroll,money,esc,monthName);
  }
  function payrollConfig(){
    const current=currentPayroll();
    const debit=state.accounts.filter(a=>a.type==='debit');
    if(!debit.length){notify('Primero registra una cuenta de débito para asignarle la nómina.');return;}
    openModal('Configurar cuenta de nómina',PayrollViews.configForm(state.accounts,current,val,esc));
    const form=document.getElementById('payroll-config-form');
    if(!form)return;
    function updateCadence(){
      const monthly=form.elements.frequency.value==='monthly';
      document.getElementById('p-day2-wrap').hidden=monthly;
      form.elements.day2.required=!monthly;
    }
    form.elements.frequency.addEventListener('change',updateCadence);
    updateCadence();
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      try{
        const f=e.currentTarget,accountId=f.elements.accountId.value;
        const previous=state.payrollProfiles.find(p=>p.accountId===accountId);
        const value={id:accountId,accountId,
          frequency:f.elements.frequency.value,day1:Number(f.elements.day1.value),
          day2:f.elements.frequency.value==='monthly'?31:Number(f.elements.day2.value),
          expectedNet:cents(f.elements.expectedNet.value),
          createdAt:previous?.createdAt||current?.createdAt||new Date().toISOString()};
        Payroll.validate(value,state.accounts);
        if(state.payrollProfiles.some(p=>p.accountId!==accountId)&&!previous){
          if(!confirm('Ya hay otra cuenta configurada para nómina. Se conservarán los ingresos existentes, pero se reemplazará su calendario. ¿Continuar?'))return;
        }
        await new Promise((resolve,reject)=>{
          const tx=db.transaction('payrollProfiles','readwrite');
          tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('No se pudo guardar nómina'));
          const store=tx.objectStore('payrollProfiles');
          for(const p of state.payrollProfiles)if(p.id!==accountId)store.delete(p.id);
          store.put(value);
        });
        selectedPayrollAccount=accountId;
        closeModal();await reload();afterChange();navigate('payroll');
        notify('Configuración de nómina guardada localmente.');
      }catch(error){notify(error?.message||'No se pudo guardar la configuración.');}
    });
  }
  function payrollReceive(payload={}){
    const profile=currentPayroll();
    const account=getAccount(profile?.accountId);
    if(!profile||!account){notify('Configura primero tu cuenta de nómina.');return;}
    const kind=Object.hasOwn(Payroll.TYPES,payload.kind)?payload.kind:'salary';
    const key=kind==='salary'?String(payload.key||''):'';
    if(key&&Payroll.receiptExists(key,state.movements)){notify('Esta quincena ya fue registrada. Puedes editar el movimiento existente.');return;}
    const today=localDate();
    const proposedDate=payload.date&&payload.date<=today?payload.date:today;
    openModal('Registrar ingreso de nómina',PayrollViews.registerForm(account,profile,null,kind,kind,proposedDate,
      kind==='salary'?profile.expectedNet:0,val,esc,Payroll.TYPES,state.accounts));
    const form=document.getElementById('payroll-receipt-form');
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      try{
        const f=event.currentTarget,chosenKind=f.elements.kind.value,
          accountId=f.elements.accountId.value,date=f.elements.date.value,amount=cents(f.elements.amount.value);
        if(!Object.hasOwn(Payroll.TYPES,chosenKind))throw Error('Selecciona un concepto de nómina válido.');
        if(!state.accounts.some(a=>a.id===accountId&&a.type==='debit'))throw Error('Elige una cuenta de débito.');
        if(!Number.isSafeInteger(amount)||amount<=0)throw Error('El depósito debe ser mayor que cero.');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>localDate())throw Error('Selecciona una fecha válida que no esté en el futuro.');
        const recipient=getAccount(accountId);
        if(date<=recipient.balanceDate){
          throw Error('El ingreso es anterior o igual a la fecha de saldo inicial. Si ya estaba incluido en ese saldo, no lo registres dos veces; revisa la fecha base.');
        }
        const payrollKey=chosenKind==='salary'?key:'';
        if(payrollKey&&Payroll.receiptExists(payrollKey,state.movements))throw Error('Ese pago de nómina ya está registrado.');
        if(state.movements.some(m=>m.type==='income'&&m.accountId===accountId&&m.date===date&&m.amount===amount&&!m.payrollKind)){
          throw Error('Ya existe un ingreso por el mismo importe en esta cuenta y fecha. Ve a Nómina y clasifica el movimiento existente para evitar duplicarlo.');
        }
        const movement={id:id(),type:'income',date,accountId,toAccountId:'',amount,
          category:'Ingresos',description:f.elements.description.value.trim()||Payroll.TYPES[chosenKind],
          months:1,payrollKind:chosenKind,payrollKey,createdAt:new Date().toISOString()};
        await save('movements',movement);
        closeModal();notify('Ingreso de nómina registrado y agregado al saldo de la cuenta.');
      }catch(error){notify(error?.message||'No se pudo registrar el ingreso.');}
    });
  }

  function payrollClassify(movementId){
    const profile=currentPayroll(),m=state.movements.find(m=>m.id===movementId);
    if(!profile||!m||m.type!=='income'||m.accountId!==profile.accountId||m.payrollKind){
      notify('Selecciona un ingreso existente de la cuenta de nómina.');return;
    }
    openModal('Clasificar ingreso existente',PayrollViews.classifyForm(m,profile,Payroll,money,esc));
    const f=document.getElementById('payroll-classify-form');
    f.elements.kind.addEventListener('change',()=>{
      document.getElementById('pc-slot-wrap').hidden=f.elements.kind.value!=='salary';
    });
    f.addEventListener('submit',async e=>{
      e.preventDefault();
      try{
        const kind=f.elements.kind.value,key=kind==='salary'?f.elements.slot.value:'';
        if(!Object.hasOwn(Payroll.TYPES,kind))throw Error('Concepto de nómina inválido.');
        if(key&&!Payroll.due(profile,m.date.slice(0,7)).some(s=>s.key===key))throw Error('Quincena inválida.');
        if(key&&Payroll.receiptExists(key,state.movements,m.id))throw Error('La quincena ya tiene un ingreso registrado.');
        const updated={...m,payrollKind:kind,payrollKey:key};
        await save('audits',{id:id(),movementId:m.id,date:new Date().toISOString(),before:m,after:updated});
        await save('movements',updated);closeModal();notify('Ingreso clasificado sin volver a sumarlo.');
      }catch(error){notify(error.message||'No se pudo clasificar el ingreso.');}
    });
  }
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
    main.innerHTML=Dash.render(insightKind,{accounts:state.accounts,movements:state.movements,month:selectedMonth,accountId:insightAccount,recurrences:state.recurrences,cycles:state.billingCycles,legacy:state.legacyInstallments,pockets:state.pockets,pocketMoves:state.pocketMoves,P:Pockets,F,I:Insight,esc,money,monthName});
    enhanceAccountPickers(main);
  }
  function render(){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    if(page==='home')renderHome();else if(page==='accounts')renderAccounts();else if(page==='payroll')renderPayroll();else if(page==='billing')renderBilling();else if(page==='account')renderAccountPage();else if(page==='pocket')renderPocketPage();else if(page==='movements')renderMovements();else if(page==='budgets')renderBudgets();else if(page==='insight')renderInsight();else if(page==='recurrences')renderRecurrences();else renderReports();
    enhanceAccountPickers(main);
  }
  function navigate(p){page=p;filter='all';render();window.scrollTo(0,0);}
  function openModal(title,body){modalInner.innerHTML=`<div class="modal-body"><div class="modal-head"><h2>${esc(title)}</h2><button class="close" data-action="close" aria-label="Cerrar">×</button></div><p id="dialog-notice" class="dialog-notice" role="status" aria-live="polite" hidden></p>${body}</div>`;if(!modal.open)modal.showModal();enhanceAccountPickers(modalInner);}
  function closeModal(){if(modal.open)modal.close();}
  const option=(v,label,selected)=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(label)}</option>`;
  function field(label,name,type='text',value='',hint='',extra=''){return `<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><input id="f-${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}>${hint?`<small>${esc(hint)}</small>`:''}</div>`;}
  function accountForm(existing=null,preferredType='debit'){
    const a=existing||{name:'',institution:'',type:preferredType,balanceDate:localDate(-1),initialBalance:0,initialDebt:0,creditLimit:0,cutDay:0,dueDay:0,cardStyle:'auto',cardImage:''};
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
      if(state.pockets.some(p=>p.parentAccountId===existing.id)){notify('Esta cuenta contiene cajitas. Retira primero el dinero y administra sus cajitas antes de eliminar la cuenta.');return;}
      if(state.payrollProfiles.some(p=>p.accountId===existing.id)){notify('Esta cuenta tiene una nómina configurada. Cambia primero la cuenta de nómina.');return;}
      if(state.billingCycles.some(c=>c.accountId===existing.id)||state.legacyInstallments.some(r=>r.accountId===existing.id)){notify('Esta tarjeta tiene cortes o mensualidades anteriores configuradas. Elimínalos desde Cortes y mensualidades antes de borrar la cuenta.');return;}
      if(confirm('¿Eliminar esta cuenta?')){await remove('accounts',existing.id);closeModal();notify('Cuenta eliminada');}
    });
  }
  function movementForm(preferredAccountId='',preferredType='expense',existing=null,preferredDestination=''){
    if(!state.accounts.length){notify('Primero agrega al menos una cuenta.');accountForm();return;}
    const targetOptions=state.accounts.filter(a=>a.type!=='credit');
    openModal(existing?'Editar movimiento':'Registrar movimiento',`<form id="movement-form" class="form">
      <div class="field"><label for="m-type">Tipo de movimiento</label><select name="type" id="m-type">${Object.entries(txNames).filter(([v])=>v!=='debtAdjustment').map(([v,l])=>option(v,l,'expense')).join('')}</select></div>
      <div class="form-row">${field('Importe ($)','amount','number','','','required min="0.01" step="0.01" inputmode="decimal"')}${field('Fecha','date','date',localDate(),'','required')}</div>
      <div id="m-payment-shortcuts" class="toolbar" hidden>
        <button type="button" class="secondary small" data-payment-preset="total">Toda la deuda</button>
        <button type="button" class="secondary small" data-payment-preset="statement">Pago oficial del corte</button>
        <small class="help" id="m-payment-note">El importe se puede modificar.</small>
      </div>
      <div class="field"><label for="m-from" id="m-from-label">Cuenta o tarjeta utilizada</label><select name="accountId" id="m-from"></select></div>
      <div class="field" id="m-to-row" hidden><label for="m-to">Cuenta de destino</label><select name="toAccountId" id="m-to"></select></div>
      <div class="field" id="m-cycle-row" hidden><label for="m-cycle">Aplicar pago al corte</label>
         <select id="m-cycle" name="paymentCycleId"><option value="">Asignar al más antiguo pendiente</option></select>
         <small>Si pagas toda la deuda, se distribuirá entre los cortes pendientes sin repetir pagos.</small></div>
      <div class="field" id="m-cat-row"><label for="m-cat">Categoría</label><select name="category" id="m-cat">${cats.map(c=>option(c,c,'Otros')).join('')}</select></div>
      <div class="field" id="m-msi-row" hidden><label for="m-msi">¿Cuántas mensualidades?</label><select name="months" id="m-msi">${[1,2,3,4,5,6,9,12,18,24,36,48].map(n=>option(String(n),n===1?'Pago normal (sin MSI)':`${n} meses sin intereses`,'1')).join('')}</select><small>Registra el importe total de la compra, no una sola mensualidad.</small></div>
      ${field('Descripción (opcional)','description','text','','Ejemplo: supermercado, renta, audífonos.','maxlength="130"')}
      <div class="inline-note" id="m-help">Las compras de crédito se asignan al mes del corte. Un pago a la tarjeta no se cuenta nuevamente como gasto.</div>
      <div class="modal-footer"><button type="button" class="secondary" data-action="close">Cancelar</button><button type="submit" class="primary">Guardar movimiento</button></div></form>`);
    const f=document.getElementById('movement-form');
    function opts(list){return list.map(a=>option(a.id,`${a.name} · ${accountTypes[a.type]}`,'')).join('');}
    let paymentAutoFill=true;
    f.elements.amount.addEventListener('input',()=>{paymentAutoFill=false;});
    function refreshPaymentCycles(){
      const card=getAccount(f.elements.toAccountId.value),row=document.getElementById('m-cycle-row');
      row.hidden=f.elements.type.value!=='payment'||card?.type!=='credit';
      if(row.hidden)return;
      const available=state.billingCycles.filter(c=>c.accountId===card.id&&c.amountDue!==null)
        .sort((a,b)=>a.cutDate.localeCompare(b.cutDate));
      f.elements.paymentCycleId.innerHTML='<option value="">Asignar al más antiguo pendiente</option>'+
        available.map(c=>option(c.id,c.month+' · '+money(c.amountDue),existing?.paymentCycleId||'')).join('');
    }
    function fillCardPayment(){
      if(f.elements.type.value!=='payment'||!paymentAutoFill)return;
      const card=getAccount(f.elements.toAccountId.value);
      if(card?.type==='credit'){
        const debt=Math.max(0,F.accountBalance(card,state.movements));
        f.elements.amount.value=debt>0?val(debt):'';
      }
    }
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
      const preferred=existing?.toAccountId||preferredDestination;
      if([...f.elements.toAccountId.options].some(o=>o.value===preferred))f.elements.toAccountId.value=preferred;
      document.getElementById('m-payment-shortcuts').hidden=type!=='payment';
      if(type==='payment'){fillCardPayment();refreshPaymentCycles();}
      document.getElementById('m-from-label').textContent=type==='income'||type==='yield'?'Cuenta que recibe el dinero':type==='expense'?'Cuenta o tarjeta utilizada':'Cuenta de origen';
      document.getElementById('m-help').textContent=type==='transfer'?'Una transferencia entre tus cuentas no es un gasto ni un ingreso.':type==='payment'?'Un pago reduce el dinero de origen y la deuda de la tarjeta, sin duplicar el gasto.':type==='yield'?'Registra el rendimiento depositado. No es lo mismo que transferir dinero a una cajita.':type==='income'?'El salario configurado es un presupuesto; registra aquí cada ingreso que efectivamente recibas.':'Las compras de crédito se asignan al mes del corte. Si eliges MSI, escribe el importe total de la compra.';
      refreshMsi();
      enhanceAccountPickers(modalInner);
    }
    function refreshMsi(){const src=getAccount(f.elements.accountId.value);document.getElementById('m-msi-row').hidden=!(f.elements.type.value==='expense'&&src?.type==='credit');}
    f.elements.type.addEventListener('change',refreshType);
    f.elements.accountId.addEventListener('change',refreshMsi);
    f.elements.toAccountId.addEventListener('change',()=>{fillCardPayment();refreshPaymentCycles();});
    document.getElementById('m-payment-shortcuts').addEventListener('click',event=>{
      const button=event.target.closest('[data-payment-preset]');if(!button)return;
      const card=getAccount(f.elements.toAccountId.value);
      if(card?.type!=='credit')return;
      if(button.dataset.paymentPreset==='total'){
        const debt=Math.max(0,F.accountBalance(card,state.movements));
        if(debt<=0){notify('No se registra deuda pendiente en esta tarjeta.');return;}
        f.elements.amount.value=val(debt);
        f.elements.paymentCycleId.value='';
        document.getElementById('m-payment-note').textContent='Toda la deuda estimada registrada.';
      }else{
        const upcoming=Billing.dueCandidates(card,state.billingCycles,state.movements,localDate()).find(x=>x.days>=-75);
        if(!upcoming){notify('Primero registra el pago oficial desde Cortes y mensualidades de esta tarjeta.');return;}
        f.elements.amount.value=val(upcoming.remaining);
        f.elements.paymentCycleId.value=upcoming.id;
        document.getElementById('m-payment-note').textContent='Monto restante estimado del corte '+upcoming.month+'. Verifica el importe en el banco.';
      }
      paymentAutoFill=false;
    });
    f.elements.type.value=existing?.type||preferredType;
    refreshType();
    if(existing){paymentAutoFill=false;f.elements.amount.value=val(existing.amount);f.elements.date.value=existing.date;f.elements.category.value=existing.category||'Otros';f.elements.description.value=existing.description||'';f.elements.months.value=String(existing.months||1);if(existing.toAccountId)f.elements.toAccountId.value=existing.toAccountId;}
    f.addEventListener('submit',async e=>{e.preventDefault();try{
      const type=f.elements.type.value,accountId=f.elements.accountId.value,toAccountId=f.elements.toAccountId.value;
      const source=getAccount(accountId),dest=getAccount(toAccountId),amount=cents(f.elements.amount.value);
      if(!source)throw Error('Elige una cuenta de origen.');
      if(!Number.isSafeInteger(amount)||amount<=0)throw Error('El importe debe ser mayor a cero.');
       if(existing?.type==='debtAdjustment')throw Error('Los ajustes de MSI se modifican desde Cortes y mensualidades.');
      if(existing?.pocketId){
        const p=state.pockets.find(p=>p.id===existing.pocketId);
        if(!p||type!=='yield'||accountId!==p.parentAccountId||f.elements.date.value<p.createdDate||f.elements.date.value<=source.balanceDate)
          throw Error('Un rendimiento de cajita debe permanecer vinculado a su cuenta y conservar una fecha válida.');
      }
      if(existing?.autoGenerated&&type!=='expense')throw Error('Un cargo recurrente debe mantenerse como gasto.');
      if(type==='payment'&&f.elements.paymentCycleId.value&&!state.billingCycles.some(c=>c.id===f.elements.paymentCycleId.value&&c.accountId===toAccountId))throw Error('El corte seleccionado no corresponde a esa tarjeta.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(f.elements.date.value))throw Error('Fecha inválida.');
      if(type==='payment'&&(!dest||dest.type!=='credit'||source.type==='credit'))throw Error('Elige una cuenta y una tarjeta de crédito.');
      if(type==='transfer'&&(!dest||dest.id===source.id||source.type==='credit'||dest.type==='credit'))throw Error('Elige dos cuentas distintas de dinero o ahorro.');
      const months=type==='expense'&&source.type==='credit'?Number(f.elements.months.value):1;
      const movement={...(existing||{}),id:existing?.id||id(),type,date:f.elements.date.value,accountId,toAccountId:(type==='payment'||type==='transfer')?toAccountId:'',amount,category:type==='expense'?f.elements.category.value:type==='income'?'Ingresos':type==='yield'?'Rendimientos':'',description:f.elements.description.value.trim(),months,paymentCycleId:type==='payment'?f.elements.paymentCycleId.value:'',pocketId:type==='yield'?String(existing?.pocketId||''):'',payrollKind:type==='income'?String(existing?.payrollKind||''):'',payrollKey:type==='income'?String(existing?.payrollKey||''):'',createdAt:existing?.createdAt||new Date().toISOString()};
      if(existing){await save('audits',{id:id(),movementId:existing.id,date:new Date().toISOString(),before:existing,after:movement});}
      await save('movements',movement);closeModal();notify(existing?'Movimiento actualizado':'Movimiento registrado');
    }catch(err){notify(err.message||'No se pudo registrar el movimiento');}});
  }

  function renderAccountPage(){
    const a=getAccount(selectedAccount);if(!a){navigate('accounts');return;}
    main.innerHTML=AccountPage.render(a,{F,B:Billing,P:Pockets,accounts:state.accounts,tx:state.movements,movements:state.movements,
      cycles:state.billingCycles,legacy:state.legacyInstallments,pockets:state.pockets,pocketMoves:state.pocketMoves,
      today:localDate(),month:selectedMonth,esc,money,
      cardRender:card=>Cards.isCard(card)?Cards.render(card):'',
      txRender:list=>txList(list,true)});
  }
  function accountDetail(aid){if(!getAccount(aid))return;closeModal();selectedAccount=aid;navigate('account');}
  function renderPocketPage(){
    const p=state.pockets.find(p=>p.id===selectedPocket),a=getAccount(p?.parentAccountId);
    if(!p||!a){navigate('accounts');return;}
    main.innerHTML=PocketViews.pocketDetail(a,p,Pockets,state.pocketMoves,state.movements,money,esc);
  }
  function pocketForm(parentId){
    const a=getAccount(parentId);
    if(!Pockets.eligible(a)){notify('Selecciona una cuenta bancaria de débito o ahorro.');return;}
    const available=Pockets.available(a,F.accountBalance(a,state.movements),state.pockets,state.pocketMoves,state.movements);
    if(available<0){notify('Las cajitas superan el saldo disponible. Revísalas antes de continuar.');return;}
    openModal('Crear cajita en '+a.name,PocketViews.form(a,null,available,val,esc));
    document.getElementById('pocket-form').addEventListener('submit',async e=>{
      e.preventDefault();try{
        const f=e.currentTarget,openingBalance=cents(f.elements.openingBalance.value);
        const p={id:id(),parentAccountId:a.id,name:f.elements.name.value.trim(),openingBalance,createdDate:localDate(),createdAt:new Date().toISOString()};
        Pockets.validatePocket(p,state.accounts);
        if(openingBalance>available)throw Error('No puedes reservar más dinero del disponible en la cuenta.');
        await save('pockets',p);closeModal();accountDetail(a.id);notify('Cajita creada dentro de la cuenta, sin duplicar patrimonio.');
      }catch(error){notify(error.message);}
    });
  }
  function pocketMoveForm(parentId,preferredPocket='',reverse=false){
    const a=getAccount(parentId),list=state.pockets.filter(p=>p.parentAccountId===parentId);
    if(!a||!list.length){notify('Primero crea una cajita en esta cuenta.');return;}
    const preferred={fromPocketId:reverse?preferredPocket:'',toPocketId:reverse?'':(preferredPocket||list[0].id)};
    openModal('Mover dinero dentro de '+a.name,PocketViews.moveForm(a,list,preferred,Pockets,esc,val));
    document.getElementById('pocket-move-form').addEventListener('submit',async e=>{
      e.preventDefault();try{
        const f=e.currentTarget,record={id:id(),parentAccountId:a.id,fromPocketId:f.elements.fromPocketId.value,
          toPocketId:f.elements.toPocketId.value,amount:cents(f.elements.amount.value),date:localDate()};
        Pockets.validateMove(record,state.accounts,state.pockets,state.pocketMoves,state.movements,F.accountBalance(a,state.movements));
        await save('pocketMoves',record);closeModal();
        if(preferredPocket){selectedPocket=preferredPocket;navigate('pocket');}else accountDetail(a.id);
        notify('Dinero redistribuido sin modificar el saldo bancario.');
      }catch(error){notify(error.message);}
    });
  }
  function pocketYieldForm(pocketId){
    const pocket=state.pockets.find(p=>p.id===pocketId),a=getAccount(pocket?.parentAccountId);
    if(!pocket||!a)return;
    openModal('Rendimiento recibido',`<form class="form" id="pocket-yield-form">
      <p class="help">Registra solo intereses realmente depositados en la cuenta.</p>
      ${field('Rendimiento ($)','amount','number','','','min="0.01" required step="0.01"')}
      ${field('Fecha del abono','date','date',localDate(),'','required')}
      <button type="submit" class="primary full">Registrar rendimiento</button></form>`);
    document.getElementById('pocket-yield-form').addEventListener('submit',async e=>{
      e.preventDefault();try{
        const f=e.currentTarget,amount=cents(f.elements.amount.value),date=f.elements.date.value;
        if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Importe inválido.');
        if(date<=a.balanceDate)throw Error('La fecha debe ser posterior al saldo inicial para no duplicar dinero.');
        if(date<pocket.createdDate)throw Error('La fecha del rendimiento no puede ser anterior a la creación de la cajita.');
        if(date>localDate())throw Error('No puedes registrar un rendimiento que todavía no se ha depositado.');
        await save('movements',{id:id(),type:'yield',date,accountId:a.id,toAccountId:'',amount,months:1,
          category:'Rendimientos',description:'Rendimiento de '+pocket.name,pocketId:pocket.id,createdAt:new Date().toISOString()});
        closeModal();selectedPocket=pocket.id;navigate('pocket');notify('Rendimiento sumado a la cuenta y cajita.');
      }catch(err){notify(err.message);}
    });
  }
  function budgetSpend(b){return state.movements.filter(m=>m.type==='expense'&&m.category===b.category&&(b.accountId==='all'||m.accountId===b.accountId)&&F.monthlyPurchaseMonth(m,getAccount(m.accountId),state.billingCycles)===selectedMonth).reduce((sum,m)=>sum+m.amount,0);}
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
      <div class="divider"></div><h2>Google Drive cifrado</h2><p class="help">Estado: <b id="drive-status">${esc(cloudStatus())}</b>. Los cambios se sincronizan mientras la sesión de Google esté autorizada y haya conexión. Drive no sustituye copias de respaldo independientes.</p><p class="help"><a href="https://console.cloud.google.com/auth/overview/personal" target="_blank" rel="noopener noreferrer">Crear acceso gratuito en Google (Personal Mode)</a> · <a href="https://github.com/facu-Garcia/mi-control-financiero/blob/main/docs/GOOGLE_DRIVE.md" target="_blank" rel="noopener noreferrer">Ver instrucciones detalladas</a></p><form id="drive-form" class="form">${field('ID de cliente OAuth de Google','clientId','text',drive?.clientId||'','Lo creas en Google Cloud; es público y no es una contraseña.','autocomplete="off"')}${field('Contraseña de cifrado (mín. 12 caracteres)','passphrase','password','','No se guarda: la necesitarás para recuperar tus datos.','minlength="12" autocomplete="off"')}<button type="submit" class="primary full">Conectar / recuperar Google Drive</button><p id="drive-feedback" class="drive-feedback" role="status" aria-live="polite" ${driveInitError?'data-error="true"':''} ${driveInitError?'':'hidden'}>${esc(driveInitError)}</p></form><div class="toolbar"><button class="secondary small" data-action="drive-sync">Sincronizar ahora</button><button class="secondary small" data-action="drive-reconnect">Reconectar</button></div><div class="inline-note">Una PWA no puede sincronizarse mientras permanece cerrada. Si Google cierra la sesión, debes volver a autorizar. Nunca subas tus archivos privados a GitHub.</div><div class="divider"></div><div class="help">Versión 0.7.2 · MXN · Uso personal</div>`);
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
  function exportReport(){const payload={...F.reportForMonth(state.accounts,state.movements,{...state.settings,salary:projectedSalary()},selectedMonth,state.billingCycles,state.legacyInstallments),officialStatements:state.billingCycles.filter(c=>c.month===selectedMonth),legacyCommitments:state.legacyInstallments.filter(r=>r.startMonth<=selectedMonth&&r.endMonth>=selectedMonth),payroll:state.payrollProfiles.length?{accountName:getAccount(state.payrollProfiles[0].accountId)?.name||'',totals:Payroll.incomeTotals(state.movements,state.payrollProfiles[0].accountId,selectedMonth)}:null,budgets:state.budgets.map(b=>({...b,accountName:b.accountId==='all'?'Todas las cuentas':getAccount(b.accountId)?.name||'',spent:budgetSpend(b)}))};downloadFile(`mi-informe-${selectedMonth}.json`,JSON.stringify(payload,null,2),'application/json');notify('Informe mensual exportado');}
  function exportCsv(){const r=F.reportForMonth(state.accounts,state.movements,state.settings,selectedMonth,state.billingCycles,state.legacyInstallments);const rows=[['fecha','mes_financiero','tipo','cuenta_origen','cuenta_destino','categoria','descripcion','importe_MXN','meses_MSI','concepto_nomina']];
    for(const m of r.movements)rows.push([m.date,m.financialMonth,m.type,getAccount(m.accountId)?.name||'',getAccount(m.toAccountId)?.name||'',m.category||'',m.description||'',val(m.amount),m.months||1,Payroll.TYPES[m.payrollKind]||'']);
    const csv='\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');downloadFile(`mis-movimientos-${selectedMonth}.csv`,csv,'text/csv;charset=utf-8');notify('CSV exportado');}
  function validatedBackup(x){
    if(!x||x.kind!=='complete-backup'||![1,2,3,4,5,6].includes(x.schemaVersion)||!Array.isArray(x.accounts)||!Array.isArray(x.movements)||!x.settings||x.accounts.length>1000||x.movements.length>100000)throw Error('El archivo no es un respaldo compatible.');
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
        autoGenerated:m.autoGenerated===true,confirmed:m.confirmed===true,
         payrollKind:m.type==='income'&&Object.hasOwn(Payroll.TYPES,m.payrollKind)?m.payrollKind:'',
         payrollKey:m.type==='income'&&Object.hasOwn(Payroll.TYPES,m.payrollKind)?String(m.payrollKey||'').slice(0,120):'',
        pocketId:m.type==='yield'?String(m.pocketId||'').slice(0,100):'',
        paymentCycleId:m.type==='payment'?String(m.paymentCycleId||'').slice(0,100):'',
        legacyId:m.type==='debtAdjustment'?String(m.legacyId||'').slice(0,100):''};
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
    const rawPayroll=Array.isArray(x.payrollProfiles)?x.payrollProfiles:[];
    if(rawPayroll.length>10)throw Error('Demasiadas cuentas de nómina.');
    const payrollProfiles=rawPayroll.map(p=>{
      const profile={id:String(p.id||''),accountId:String(p.accountId||''),frequency:String(p.frequency||''),
        day1:Number(p.day1),day2:Number(p.day2),expectedNet:p.expectedNet,
        createdAt:String(p.createdAt||'').slice(0,40)};
      Payroll.validate(profile,accounts);
      return profile;
    });
    if(new Set(payrollProfiles.map(p=>p.accountId)).size!==payrollProfiles.length)throw Error('Hay cuentas de nómina duplicadas.');
    if(payrollProfiles.length>1)throw Error('El respaldo contiene más de una cuenta de nómina principal.');
    const payrollKeys=new Set();
    for(const m of movements){
      if(!m.payrollKey)continue;
      if(payrollKeys.has(m.payrollKey))throw Error('Hay pagos de nómina duplicados.');
      payrollKeys.add(m.payrollKey);
    }
    const rawCycles=Array.isArray(x.billingCycles)?x.billingCycles:[];
    if(rawCycles.length>10000)throw Error('Demasiados estados de cuenta.');
    const billingCycles=rawCycles.map(c=>{
      const amount=c.amountDue===null||c.amountDue===undefined?null:c.amountDue;
      const value={id:String(c.id||''),accountId:String(c.accountId||''),month:String(c.month||''),
        cutDate:String(c.cutDate||''),dueDate:String(c.dueDate||''),amountDue:amount,
        source:c.source==='initialDebt'?'initialDebt':'bank'};
      if(!validId(value.id)||value.id!==value.accountId+'|'+value.month)throw Error('Identificador de corte inválido.');
      Billing.validateCycle(value,accounts);return value;
    });
    if(new Set(billingCycles.map(c=>c.id)).size!==billingCycles.length)throw Error('Cortes duplicados.');
    const rawOld=Array.isArray(x.legacyInstallments)?x.legacyInstallments:[];
    if(rawOld.length>10000)throw Error('Demasiados compromisos anteriores.');
    const legacyInstallments=rawOld.map(r=>{
      const value={id:String(r.id||''),accountId:String(r.accountId||''),label:String(r.label||''),
        amount:r.amount,startMonth:String(r.startMonth||''),endMonth:String(r.endMonth||''),
        includedInDebt:r.includedInDebt!==false};
      if(!validId(value.id))throw Error('Identificador de MSI inválido.');
      Billing.validateLegacy(value,accounts);return value;
    });
    if(new Set(legacyInstallments.map(x=>x.id)).size!==legacyInstallments.length)throw Error('MSI anteriores duplicadas.');
    const rawPockets=Array.isArray(x.pockets)?x.pockets:[];
    const rawMoves=Array.isArray(x.pocketMoves)?x.pocketMoves:[];
    if(rawPockets.length>10000||rawMoves.length>100000)throw Error('Demasiados movimientos o cajitas.');
    const pockets=rawPockets.map(p=>{
      const value={id:String(p.id||''),parentAccountId:String(p.parentAccountId||''),name:String(p.name||''),
        openingBalance:p.openingBalance,createdDate:String(p.createdDate||''),createdAt:String(p.createdAt||'')};
      Pockets.validatePocket(value,accounts);if(!validDate(value.createdDate))throw Error('Fecha de cajita inválida.');
      return value;
    });
    const pocketMoves=rawMoves.map(m=>{
      const value={id:String(m.id||''),parentAccountId:String(m.parentAccountId||''),
        fromPocketId:String(m.fromPocketId||''),toPocketId:String(m.toPocketId||''),
        amount:m.amount,date:String(m.date||'')};
      if(!validId(value.id)||!validMoney(value.amount)||value.amount<=0||!validDate(value.date))throw Error('Movimiento de cajita inválido.');
      return value;
    });
    if(new Set(pocketMoves.map(m=>m.id)).size!==pocketMoves.length)throw Error('Movimientos de cajita duplicados.');
    for(const m of movements){
      if(m.pocketId&&!pockets.some(p=>p.id===m.pocketId&&p.parentAccountId===m.accountId))throw Error('Rendimiento vinculado a cajita inexistente.');
      if(m.paymentCycleId&&!billingCycles.some(c=>c.id===m.paymentCycleId&&c.accountId===m.toAccountId))throw Error('Pago vinculado a corte inexistente.');
      if(m.type==='debtAdjustment'&&(!m.legacyId||!legacyInstallments.some(r=>r.id===m.legacyId&&r.accountId===m.accountId)))throw Error('Ajuste de deuda sin mensualidad asociada.');
    }
    Pockets.validateSnapshot(accounts,pockets,pocketMoves,movements,F);
    return {accounts,movements,budgets,recurrences,reconciliations,audits,payrollProfiles,billingCycles,legacyInstallments,pockets,pocketMoves,settings:{id:'preferences',salary,savingsTarget:target}};
  }
  async function replaceBackup(x){return new Promise((resolve,reject)=>{const tx=db.transaction(['accounts','movements','settings','budgets','recurrences','reconciliations','audits','payrollProfiles','billingCycles','legacyInstallments','pockets','pocketMoves'],'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Importación cancelada'));
    for(const storeName of ['accounts','movements','settings','budgets','recurrences','reconciliations','audits','payrollProfiles','billingCycles','legacyInstallments','pockets','pocketMoves'])tx.objectStore(storeName).clear();
    x.accounts.forEach(a=>tx.objectStore('accounts').put(a));x.movements.forEach(m=>tx.objectStore('movements').put(m));(x.budgets||[]).forEach(b=>tx.objectStore('budgets').put(b));(x.recurrences||[]).forEach(r=>tx.objectStore('recurrences').put(r));(x.reconciliations||[]).forEach(r=>tx.objectStore('reconciliations').put(r));(x.audits||[]).forEach(a=>tx.objectStore('audits').put(a));(x.payrollProfiles||[]).forEach(p=>tx.objectStore('payrollProfiles').put(p));(x.billingCycles||[]).forEach(c=>tx.objectStore('billingCycles').put(c));(x.legacyInstallments||[]).forEach(r=>tx.objectStore('legacyInstallments').put(r));(x.pockets||[]).forEach(p=>tx.objectStore('pockets').put(p));(x.pocketMoves||[]).forEach(m=>tx.objectStore('pocketMoves').put(m));tx.objectStore('settings').put(x.settings);
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
      case 'billing-detail':closeModal();billingDetail(target.dataset.id);break;
      case 'edit-billing-cycle':cycleForm(target.dataset.id,target.dataset.month||selectedMonth);break;
      case 'delete-billing-cycle':{const c=state.billingCycles.find(x=>x.id===target.dataset.id);
        if(c&&state.movements.some(m=>m.paymentCycleId===c.id)){notify('Este corte tiene pagos vinculados. Edita primero esos pagos para retirar su vinculación.');break;}
        if(c&&confirm('¿Eliminar el dato oficial de este corte? Se volverá a usar la fecha estimada.')){await remove('billingCycles',c.id);billingDetail(c.accountId);}break;}
      case 'add-legacy':legacyForm(target.dataset.id);break;
      case 'edit-legacy':{const row=state.legacyInstallments.find(x=>x.id===target.dataset.id);if(row)legacyForm(row.accountId,row);break;}
      case 'delete-legacy':{const row=state.legacyInstallments.find(x=>x.id===target.dataset.id);
        if(row&&confirm('¿Eliminar las mensualidades y su ajuste de deuda asociado, si existe?')){
          await new Promise((resolve,reject)=>{const tx=db.transaction(['legacyInstallments','movements'],'readwrite');
            tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
            tx.objectStore('legacyInstallments').delete(row.id);tx.objectStore('movements').delete('legacy-debt-'+row.id);});
          await reload();afterChange();billingDetail(row.accountId);
        }break;}
      case 'back-accounts':navigate('accounts');break;
      case 'open-payroll':navigate('payroll');break;
      case 'payroll-config':payrollConfig();break;
      case 'payroll-receive':payrollReceive({date:target.dataset.date,key:target.dataset.key,kind:'salary'});break;
      case 'payroll-extra':payrollReceive({kind:target.dataset.kind});break;
      case 'payroll-classify':payrollClassify(target.dataset.id);break;
      case 'open-insight':insightKind=target.dataset.kind||'wealth';insightAccount='all';navigate('insight');break;
      case 'back-home':navigate('home');break;
      case 'open-recurring':navigate('recurrences');break;
      case 'show-audits':showAudits();break;
      case 'add-rec':recurrenceForm();break;
      case 'edit-rec':recurrenceForm(state.recurrences.find(r=>r.id===target.dataset.id));break;
      case 'toggle-rec':{const r=state.recurrences.find(x=>x.id===target.dataset.id);if(r){await save('recurrences',{...r,paused:!r.paused});notify(r.paused?'Pago recurrente activado':'Pago recurrente pausado');}break;}
      case 'account-move':{const a=getAccount(target.dataset.id);closeModal();movementForm(a?.type==='credit'||a?.type==='debit'?a.id:'','expense');break;}
      case 'pay-card':{const a=getAccount(target.dataset.id);closeModal();movementForm('','payment',null,a?.id||'');break;}
      case 'back-account':accountDetail(target.dataset.id);break;
      case 'savings-create':{const a=state.accounts.find(a=>a.type==='debit');if(a)pocketForm(a.id);else accountForm(null,'debit');break;}
      case 'savings-transfer':{const p=state.pockets[0];if(p){pocketMoveForm(p.parentAccountId,p.id);break;}const account=getAccount(target.dataset.id)||state.accounts.find(a=>a.type==='saving'||a.type==='pocket');
        if(!account){notify('Primero crea una cuenta de ahorro o cajita.');accountForm(null,'pocket');break;}
        movementForm('','transfer',null,account.id);break;}
      case 'savings-yield':{const p=state.pockets[0];if(p){pocketYieldForm(p.id);break;}const a=getAccount(target.dataset.id)||state.accounts.find(a=>a.type==='saving'||a.type==='pocket');
        if(!a){notify('Primero crea una cuenta de ahorro o cajita.');accountForm(null,'pocket');break;}
        movementForm(a.id,'yield');break;}
      case 'reconcile':{const acc=target.dataset.id;closeModal();reconcileForm(acc);break;}
      case 'edit-tx':{const m=state.movements.find(x=>x.id===target.dataset.id);if(m?.type==='debtAdjustment'){notify('Edita la mensualidad anterior desde Cortes y mensualidades.');break;}if(m){closeModal();movementForm(m.accountId,m.type,m);}break;}
      case 'confirm-tx':{const m=state.movements.find(x=>x.id===target.dataset.id);if(m?.autoGenerated&&!m.confirmed){if(confirm('¿Confirmas que el banco ya cobró este importe? Se aplicará al saldo.')){await save('audits',{id:id(),movementId:m.id,date:new Date().toISOString(),before:m,after:{...m,confirmed:true}});await save('movements',{...m,confirmed:true});notify('Cargo confirmado');}}break;}
      case 'account-detail':accountDetail(target.dataset.id);break;
      case 'back-accounts':closeModal();navigate('accounts');break;
      case 'edit-account':{const a=getAccount(target.dataset.id);if(a)accountForm(a);break;}
      case 'new-pocket':pocketForm(target.dataset.id);break;
      case 'pocket-detail':selectedPocket=target.dataset.id;navigate('pocket');break;
      case 'move-pocket':pocketMoveForm(target.dataset.id,target.dataset.pocket||'');break;
      case 'release-pocket':{const p=state.pockets.find(p=>p.id===target.dataset.id);if(p)pocketMoveForm(p.parentAccountId,p.id,true);break;}
      case 'pocket-yield':pocketYieldForm(target.dataset.id);break;
      case 'pocket-new-from-insight':{const a=state.accounts.find(a=>a.type==='debit');if(a)pocketForm(a.id);else notify('Primero registra una cuenta bancaria de débito.');break;}
      case 'pocket-move-from-insight':{const p=state.pockets[0];if(p)pocketMoveForm(p.parentAccountId,p.id);else notify('Primero crea una cajita dentro de una cuenta.');break;}
      case 'pocket-yield-from-insight':{const p=state.pockets[0];if(p)pocketYieldForm(p.id);else notify('Primero crea una cajita dentro de una cuenta.');break;}
      case 'remove-tx':if(state.movements.find(m=>m.id===target.dataset.id)?.type==='debtAdjustment'){notify('Edita o elimina la mensualidad anterior vinculada para actualizar la deuda.');break;}if(confirm('¿Eliminar este movimiento? Se recalcularán saldos y reportes.')){const old=state.movements.find(m=>m.id===target.dataset.id);if(old)await save('audits',{id:id(),movementId:old.id,date:new Date().toISOString(),before:old,after:null});await remove('movements',target.dataset.id);notify('Movimiento eliminado');}break;
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
      if(!window.Finance||!window.FinanceCSV||!window.FinanceStorage||!window.FinanceCards||!window.FinanceCardImages||!window.FinanceAccountPicker||!window.FinancePayroll||!window.FinancePayrollViews||!window.FinanceBilling||!window.FinanceBillingViews||!window.FinancePockets||!window.FinancePocketsViews||!window.FinanceAccountPage||!window.FinanceCreditRow){
        const missing=['Finance','FinanceCSV','FinanceStorage','FinanceCards','FinanceCardImages','FinanceAccountPicker','FinancePayroll','FinancePayrollViews','FinanceBilling','FinanceBillingViews','FinancePockets','FinancePocketsViews','FinanceAccountPage','FinanceCreditRow'].filter(name=>!window[name]).join(', ');
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
