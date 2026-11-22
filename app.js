/* Mi Control Financiero - offline-first PWA. No credentials or bank account numbers. */
(() => {
  'use strict';
  const F = window.Finance;
  const CSV = window.FinanceCSV;
  const G = window.FinanceDrive;
  const BackupModel = window.FinanceBackupModel;
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
  function snapshot(){return BackupModel.capture(state);}
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
  async function commitMovement(after,before=null){
    await S.changeMovement(db,{after,before,auditId:before?id():'',date:before?new Date().toISOString():''});
    await reload();afterChange();
  }
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
    const cards=state.accounts.filter(a=>a.type==='credit');const charges=cards.reduce((s,a)=>s+Billing.paymentSummary(a,selectedMonth,state.billingCycles,state.movements,state.legacyInstallments,F).total,0);
    main.innerHTML=header('Tu dinero','Resumen general')+`<button type="button" class="hero hero-click" data-action="open-insight" data-kind="wealth"><div class="hero-label">Patrimonio neto estimado</div><div class="hero-value">${money(t.netWorth)}</div><div class="hero-sub">Saldos disponibles + ahorros − deuda de tarjetas</div><div class="hero-bottom"><div class="hero-mini">Dinero y ahorros<b>${money(t.assets)}</b></div><div class="hero-mini">Deuda en tarjetas<b>${money(t.debts)}</b></div></div></button>
    <div class="two-col" style="margin-top:12px"><button type="button" class="stat stat-click" data-action="open-insight" data-kind="income"><div class="k">Ingresos recibidos este mes</div><div class="v positive">${money(b.income)}</div><div class="hint">Salario previsto: ${money(projectedSalary())}</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="purchases"><div class="k">Compras del mes financiero</div><div class="v">${money(b.purchases)}</div><div class="hint">Tarjetas según fecha de corte</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="savings"><div class="k">Ahorros en cajitas y cuentas</div><div class="v sky">${money(t.saved+Pockets.totalAllocated(state.pockets,state.pocketMoves,state.movements))}</div><div class="hint">Incluidos en tu dinero total</div></button><button type="button" class="stat stat-click" data-action="open-insight" data-kind="statements"><div class="k">Pagos de tarjetas pendientes</div><div class="v gold">${money(charges)}</div><div class="hint">Cortes pendientes y MSI estimadas del mes</div></button></div>
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
      const currentMonth=form.elements.month.value;
      const record=Billing.effectiveCycle(card,currentMonth,state.billingCycles);
      form.elements.cutDate.value=record?.cutDate||Billing.cut(card,currentMonth,[]).date||'';
      form.elements.dueDate.value=record?.dueDate||Billing.due(card,currentMonth,[]).date||'';
      form.elements.amountDue.value=record?.amountDue==null?'':val(record.amountDue);
    };
    form.elements.month.addEventListener('change',refresh);
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      try{
        const f=e.currentTarget,key=card.id+'|'+f.elements.month.value,amount=f.elements.amountDue.value.trim();
        const record={id:key,accountId:card.id,month:f.elements.month.value,
          cutDate:f.elements.cutDate.value,dueDate:f.elements.dueDate.value,
          amountDue:amount===''?null:cents(amount),source:f.elements.month.value===Billing.initialMonth(card)?'initialDebt':'bank'};
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
        await commitMovement(updated,m);closeModal();notify('Ingreso clasificado sin volver a sumarlo.');
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
    const today=localDate();
    const expected=F.accountBalance(a,state.movements.filter(m=>m.date<=today));
    const history=state.reconciliations.filter(r=>r.accountId===a.id).sort((x,y)=>y.date.localeCompare(x.date)||String(y.createdAt||'').localeCompare(String(x.createdAt||''))).slice(0,20);
    const historyMarkup=history.length?'<div class="section-title"><h2>Últimas conciliaciones</h2></div><div class="panel">'+history.map(r=>{
      const current=F.accountBalance(a,state.movements.filter(m=>m.date<=r.date));
      const outdated=current!==r.expected;
      return '<div class="report-line"><span><b>'+esc(shortDate(r.date))+'</b><br><small>Banco: '+money(r.actual)+' · Calculado entonces: '+money(r.expected)+'</small>'
        +(r.note?'<br><small>'+esc(r.note)+'</small>':'')
        +(outdated?'<br><small class="warning-text">Revisar: el histórico de movimientos cambió. Saldo recalculado: '+money(current)+'</small>':'')
        +'</span><b class="'+(r.difference?'negative':'positive')+'">'+(r.difference>0?'+':'')+money(r.difference)+'</b></div>';
    }).join('')+'</div>':'<p class="help">Todavía no has registrado conciliaciones para esta cuenta.</p>';
    openModal('Conciliación bancaria',Forms.reconcileForm(a,expected,money,val,esc,today)+historyMarkup);
    document.querySelector('#reconcile-form [name="date"]').addEventListener('change',e=>{
      const day=e.target.value;
      const text=document.getElementById('reconcile-expected');
      if(text)text.textContent=day<a.balanceDate?'Anterior a la fecha base':money(F.accountBalance(a,state.movements.filter(m=>m.date<=day)));
      // La cifra bancaria nunca se infiere: debe capturarse para la fecha elegida.
      document.querySelector('#reconcile-form [name="actual"]').value='';
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
    main.innerHTML=Dash.render(insightKind,{accounts:state.accounts,movements:state.movements,month:selectedMonth,accountId:insightAccount,recurrences:state.recurrences,cycles:state.billingCycles,legacy:state.legacyInstallments,pockets:state.pockets,pocketMoves:state.pocketMoves,P:Pockets,B:Billing,F,I:Insight,esc,money,monthName});
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
  // Los formularios complejos se administran en un controlador independiente.
  const formController=window.FinanceTransactionForms.create({
    getState:()=>state,option,field,localDate,val,id,cents,accountTypes,txNames,cats,
    Cards,CardImages,Billing,F,openModal,closeModal,notify,save,remove,commitMovement,getAccount,
    money,enhanceAccountPickers,modalInner
  });
  function accountForm(existing=null,preferredType='debit'){
    return formController.accountForm(existing,preferredType);
  }
  function movementForm(preferredAccountId='',preferredType='expense',existing=null,preferredDestination=''){
    return formController.movementForm(preferredAccountId,preferredType,existing,preferredDestination);
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
  function budgetSpend(b){return state.movements.filter(m=>m.type==='expense'&&!(m.autoGenerated&&!m.confirmed)&&m.category===b.category&&(b.accountId==='all'||m.accountId===b.accountId)&&F.monthlyPurchaseMonth(m,getAccount(m.accountId),state.billingCycles)===selectedMonth).reduce((sum,m)=>sum+m.amount,0);}
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
  async function showDriveHistory(){
    if(!drive?.ready){notify('Conecta primero Google Drive desde Ajustes.');return;}
    try{
      const rows=await drive.listHistory();
      openModal('Historial de respaldos cifrados',`
        <p class="help">Drive guarda una copia cifrada diaria cuando se reemplaza el respaldo principal. Las versiones anteriores permanecen disponibles hasta que tú las elimines. No se restaurará nada sin tu aprobación.</p>
        <div class="stack">${rows.length?rows.slice(0,100).map(row=>`
          <div class="report-line"><span>${esc(row.name.replace('mi-control-financiero-historial-','').replace('.enc.json',''))}
          <small class="help">Copia privada cifrada</small></span>
          <button class="secondary small" data-action="restore-drive-history" data-id="${esc(row.id)}">Revisar</button></div>
        `).join(''):'<p class="help">Aún no existen versiones anteriores. La primera se generará antes de reemplazar el respaldo principal.</p>'}</div>
        <div class="toolbar"><button class="secondary small" data-action="export-backup">Exportar copia local</button>
          <button class="secondary small" data-action="drive-history">Actualizar lista</button></div>`);
    }catch(err){notify('No se pudo consultar el historial: '+(err?.message||err));}
  }
  async function restoreDriveHistory(fileId){
    if(!drive?.ready){notify('Reconecta Google Drive antes de restaurar.');return;}
    if(!confirm('Antes de consultar esta copia anterior, se descargará un respaldo de los datos actuales. Consérvalo en un lugar privado. ¿Continuar?'))return;
    exportBackup();
    try{
      const raw=await drive.readHistory(fileId);
      const data=validatedBackup(raw);
      const same=G.snapshotsEqual(snapshot(),raw);
      if(same){notify('Esta copia ya coincide con tus datos actuales.');return;}
      if(!confirm(`Copia cifrada: ${data.accounts.length} cuentas y ${data.movements.length} movimientos. Restaurarla REEMPLAZARÁ los datos actuales. Antes exporta un respaldo JSON desde Ajustes. ¿Revisaste tu copia local?`))return;
      if(!confirm('Última confirmación: se reemplazará todo el contenido local con este historial. ¿Continuar?'))return;
      // Replacing all stores is atomic. Upload of this state is still a separate
      // operation, so a failed Drive upload leaves it safely on this device.
      await replaceBackup(data);closeModal();await reload();drive.markChanged();
      notify('Historial restaurado localmente. Verifica el estado de Drive para confirmar la sincronización.');
    }catch(err){notify('No se restauró el historial: '+(err?.message||err));}
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
      <div class="divider"></div><h2>Google Drive cifrado</h2><p class="help">Estado: <b id="drive-status">${esc(cloudStatus())}</b>. Los cambios se sincronizan mientras la sesión de Google esté autorizada y haya conexión. Drive no sustituye copias de respaldo independientes.</p><p class="help"><a href="https://console.cloud.google.com/auth/overview/personal" target="_blank" rel="noopener noreferrer">Crear acceso gratuito en Google (Personal Mode)</a> · <a href="https://github.com/facu-Garcia/mi-control-financiero/blob/main/docs/GOOGLE_DRIVE.md" target="_blank" rel="noopener noreferrer">Ver instrucciones detalladas</a></p><form id="drive-form" class="form">${field('ID de cliente OAuth de Google','clientId','text',drive?.clientId||'','Lo creas en Google Cloud; es público y no es una contraseña.','autocomplete="off"')}${field('Contraseña de cifrado (mín. 12 caracteres)','passphrase','password','','No se guarda: la necesitarás para recuperar tus datos.','minlength="12" autocomplete="off"')}<button type="submit" class="primary full">Conectar / recuperar Google Drive</button><p id="drive-feedback" class="drive-feedback" role="status" aria-live="polite" ${driveInitError?'data-error="true"':''} ${driveInitError?'':'hidden'}>${esc(driveInitError)}</p></form><div class="toolbar"><button class="secondary small" data-action="drive-sync">Sincronizar ahora</button><button class="secondary small" data-action="drive-reconnect">Reconectar</button><button class="secondary small" data-action="drive-history">Historial de copias</button></div><div class="inline-note">Una PWA no puede sincronizarse mientras permanece cerrada. Si Google cierra la sesión, debes volver a autorizar. Nunca subas tus archivos privados a GitHub.</div><div class="divider"></div><div class="help">Versión 0.9.2 · MXN · Uso personal</div>`);
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
  function validatedBackup(x){return BackupModel.validate(x,{Cards,Payroll,Billing,Pockets,F,Rec,accountTypes,txNames});}
  function replaceBackup(x){return BackupModel.replace(db,x);}
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
      case 'confirm-tx':{const m=state.movements.find(x=>x.id===target.dataset.id);if(m?.autoGenerated&&!m.confirmed){if(confirm('¿Confirmas que el banco ya cobró este importe? Se aplicará al saldo.')){await commitMovement({...m,confirmed:true},m);notify('Cargo confirmado');}}break;}
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
      case 'remove-tx':if(state.movements.find(m=>m.id===target.dataset.id)?.type==='debtAdjustment'){notify('Edita o elimina la mensualidad anterior vinculada para actualizar la deuda.');break;}if(confirm('¿Eliminar este movimiento? Se recalcularán saldos y reportes.')){const old=state.movements.find(m=>m.id===target.dataset.id);if(old){await commitMovement(null,old);notify('Movimiento eliminado');}else notify('Movimiento no encontrado; actualiza la lista.');}break;
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
      case 'drive-history':await showDriveHistory();break;
      case 'restore-drive-history':await restoreDriveHistory(target.dataset.id);break;
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
      if(!window.Finance||!window.FinanceBackupModel||!window.FinanceCSV||!window.FinanceStorage||!window.FinanceCards||!window.FinanceCardImages||!window.FinanceAccountPicker||!window.FinancePayroll||!window.FinancePayrollViews||!window.FinanceBilling||!window.FinanceBillingViews||!window.FinancePockets||!window.FinancePocketsViews||!window.FinanceAccountPage||!window.FinanceCreditRow){
        const missing=['Finance','FinanceBackupModel','FinanceCSV','FinanceStorage','FinanceCards','FinanceCardImages','FinanceAccountPicker','FinancePayroll','FinancePayrollViews','FinanceBilling','FinanceBillingViews','FinancePockets','FinancePocketsViews','FinanceAccountPage','FinanceCreditRow'].filter(name=>!window[name]).join(', ');
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
