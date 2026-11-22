/* Credit-card cycles and imported historical MSI commitments.
   Amounts are integer centavos. These informational records never change the ledger. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FinanceBilling=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  function shift(month,step=1){
    const [y,m]=month.split('-').map(Number),d=new Date(y,m-1+step,1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function dateFor(month,day){
    if(!/^\d{4}-\d{2}$/.test(month)||!Number.isInteger(day)||day<1||day>31)return '';
    const [y,m]=month.split('-').map(Number);
    return month+'-'+String(Math.min(day,new Date(y,m,0).getDate())).padStart(2,'0');
  }
  const dateValid=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(new Date(x+'T12:00:00').getTime())&&new Date(x+'T12:00:00').toISOString().slice(0,10)===x;
  function statementOf(card,month,cycles=[]){return (cycles||[]).find(c=>c.accountId===card.id&&c.month===month)||null;}
  function cut(card,month,cycles=[]){
    const record=statementOf(card,month,cycles);
    if(record?.cutDate)return {date:record.cutDate,official:true};
    return {date:dateFor(month,Number(card.cutDay||0)),official:false};
  }
  function due(card,month,cycles=[]){
    const record=statementOf(card,month,cycles);
    if(record?.dueDate)return {date:record.dueDate,official:true};
    const cutDate=cut(card,month,cycles).date;
    if(!card.dueDay||!cutDate)return {date:'',official:false};
    // A dueDay before or equal to the cut day is in the following month.
    const dueMonth=Number(card.dueDay)<=Number(cutDate.slice(-2))?shift(month,1):month;
    return {date:dateFor(dueMonth,Number(card.dueDay)),official:false};
  }
  function daysUntil(date,today){return date?Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000):null;}
  function upcomingCut(card,cycles,today){
    const month=today.slice(0,7);
    for(let i=0;i<5;i++){const m=shift(month,i),v=cut(card,m,cycles);if(v.date&&v.date>=today)return {month:m,...v,days:daysUntil(v.date,today)};}
    return null;
  }
  // The opening debt belongs to the financial month in which the card's
  // baseline was recorded. This is a display obligation, never a new expense.
  function initialMonth(card){return String(card.balanceDate||'').slice(0,7);}
  function effectiveCycle(card,month,cycles=[]){
    const saved=statementOf(card,month,cycles);
    if(saved){
      const baseline=month===initialMonth(card);
      return {...saved,amountDue:saved.amountDue==null&&baseline?(card.initialDebt||0):saved.amountDue,
        source:saved.source||(baseline?'initialDebt':'bank')};
    }
    if(card.type!=='credit'||month!==initialMonth(card)||!(card.initialDebt>0))return null;
    const closing=cut(card,month,cycles).date;
    return {id:card.id+'|'+month,accountId:card.id,month,
      cutDate:closing||card.balanceDate,dueDate:due(card,month,cycles).date||'',
      amountDue:card.initialDebt,source:'initialDebt',estimated:true};
  }
  function effectiveCycles(card,cycles=[]){
    const existing=cycles.filter(c=>c.accountId===card.id);
    const base=effectiveCycle(card,initialMonth(card),cycles);
    return base&&!existing.some(c=>c.month===base.month)?[...existing,base]:existing.map(c=>c.month===base?.month?base:c);
  }
  function monthPayment(card,month,cycles,movements,legacy=[],F=null){
    const cycle=effectiveCycle(card,month,cycles);
    if(cycle&&cycle.amountDue!=null){
      return {amount:officialRemaining(card,cycle,movements,effectiveCycles(card,cycles)),
        kind:cycle.estimated?'initial':'recorded',cycle};
    }
    const estimated=F?F.statementCharges(card,movements,month,cycles,legacy).total:0;
    return {amount:estimated,kind:'estimate',cycle:null};
  }
  function paymentSummary(card,month,cycles,movements,legacy=[],F=null){
    const all=effectiveCycles(card,cycles);
    const open=all.filter(c=>c.month<=month&&c.amountDue!=null)
      .reduce((sum,c)=>sum+Math.max(0,officialRemaining(card,c,movements,all)),0);
    const thisMonth=all.some(c=>c.month===month);
    const estimate=!thisMonth&&F?F.statementCharges(card,movements,month,cycles,legacy).total:0;
    return {confirmed:open,estimated:estimate,total:open+estimate};
  }
  function validateCycle(c,accounts){
    if(!accounts.some(a=>a.id===c.accountId&&a.type==='credit'))throw Error('Selecciona una tarjeta de crédito.');
    if(!/^\d{4}-\d{2}$/.test(c.month)||c.month!==new Date(c.month+'-01T12:00:00Z').toISOString().slice(0,7))throw Error('Mes del corte inválido.');
    if(!dateValid(c.cutDate)||c.cutDate.slice(0,7)!==c.month)throw Error('El corte real debe estar dentro del mes indicado.');
    if(c.dueDate&&(!dateValid(c.dueDate)||c.dueDate<c.cutDate))throw Error('La fecha de pago debe ser igual o posterior al corte.');
    if(c.amountDue!==null&&(!Number.isSafeInteger(c.amountDue)||c.amountDue<0||c.amountDue>1e15))throw Error('El pago oficial debe ser un monto válido.');
    return c;
  }
  function validateLegacy(item,accounts){
    if(!accounts.some(a=>a.id===item.accountId&&a.type==='credit'))throw Error('El compromiso debe pertenecer a una tarjeta de crédito.');
    if(!/^\d{4}-\d{2}$/.test(item.startMonth)||!/^\d{4}-\d{2}$/.test(item.endMonth)||item.endMonth<item.startMonth)
      throw Error('Selecciona un intervalo de meses válido.');
    if(!Number.isSafeInteger(item.amount)||item.amount<=0||item.amount>1e15)throw Error('La mensualidad debe ser mayor que cero.');
    if(typeof item.label!=='string'||item.label.length>100)throw Error('Descripción inválida.');
    return item;
  }
  function legacyFor(accountId,month,records=[]){
    return (records||[]).filter(r=>r.accountId===accountId&&r.startMonth<=month&&r.endMonth>=month)
      .reduce((s,r)=>s+r.amount,0);
  }
  // Each card payment is allocated to at most one cycle. Explicit references win;
  // unlinked historical payments are assigned oldest-first, after card baseline date.
  function allocations(card,cycles,movements){
    const list=effectiveCycles(card,cycles).filter(c=>c.accountId===card.id&&c.amountDue!==null&&c.amountDue!==undefined)
      .sort((a,b)=>a.cutDate.localeCompare(b.cutDate));
    const left=new Map(list.map(c=>[c.id,c.amountDue]));
    const paid=new Map(list.map(c=>[c.id,0]));
    const linked=movements.filter(m=>m.type==='payment'&&m.toAccountId===card.id&&
      m.date>card.balanceDate&&Number.isSafeInteger(m.amount)&&m.amount>0)
      .sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
    for(const m of linked){
      const eligible=list.filter(c=>c.cutDate<m.date||((c.source==='initialDebt'||c.estimated)&&c.month===initialMonth(card)));
      if(!eligible.length)continue;
      let balance=m.amount;
      const priorities=m.paymentCycleId?
        eligible.filter(c=>c.id===m.paymentCycleId):
        eligible;
      for(const c of priorities){
        if(balance<=0)break;
        const applied=Math.min(balance,Math.max(0,left.get(c.id)||0));
        left.set(c.id,(left.get(c.id)||0)-applied);
        paid.set(c.id,(paid.get(c.id)||0)+applied);
        balance-=applied;
      }
    }
    return {left,paid};
  }
  function officialRemaining(card,cycle,movements,cycles=[cycle]){
    if(cycle.amountDue===null||cycle.amountDue===undefined)return null;
    return allocations(card,cycles,movements).left.get(cycle.id)??cycle.amountDue;
  }
  function cycleStatus(card,cycle,cycles,movements,today){
    const balance=officialRemaining(card,cycle,movements,cycles);
    const days=daysUntil(cycle.dueDate,today);
    const paid=cycle.amountDue===null?0:cycle.amountDue-balance;
    const label=balance===null?'Monto por registrar':balance===0?'Pagado':paid>0?'Pago parcial':days!==null&&days<0?'Vencido':cycle.cutDate>today?'Próximo corte':'Pendiente';
    return {remaining:balance,paid,days,label};
  }
  function currentPayable(card,cycles,movements,today){
    const all=effectiveCycles(card,cycles);
    const eligible=all.filter(c=>c.accountId===card.id&&c.month<=today.slice(0,7)&&c.amountDue!==null&&c.amountDue!==undefined)
      .sort((a,b)=>a.cutDate.localeCompare(b.cutDate));
    const outstanding=eligible.find(c=>officialRemaining(card,c,movements,all)>0);
    const recent=eligible.filter(c=>daysUntil(c.cutDate,today)<=75).at(-1);
    const cycle=outstanding||recent||null;
    return cycle?{cycle,...cycleStatus(card,cycle,all,movements,today)}:null;
  }
  function dueCandidates(card,cycles,movements,today){
    const all=effectiveCycles(card,cycles);
    return all.filter(c=>c.accountId===card.id&&c.amountDue!==null&&c.amountDue!==undefined&&c.month<=today.slice(0,7))
      .map(c=>({...c,...cycleStatus(card,c,all,movements,today)}))
      .filter(c=>c.remaining>0&&c.dueDate)
      .sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  }
  function status(card,cycles,movements,today){
    const next=upcomingCut(card,cycles,today);
    const payable=currentPayable(card,cycles,movements,today);
    const due=payable?.cycle?{...payable.cycle,remaining:payable.remaining,days:payable.days}:null;
    return {nextCut:next,payment:due,upcomingDue:due};
  }
  function baselineCycle(card,month,cutDate,dueDate){
    // The user explicitly says the baseline debt is the full payment for this month.
    // No movement is created, and total credit debt remains unchanged.
    const amount=Number(card.initialDebt)||0;
    return {id:card.id+'|'+month,accountId:card.id,month,cutDate,dueDate:dueDate||'',
      amountDue:amount,source:'initialDebt',baselineReferenceDate:card.balanceDate};
  }
  function unconfirmedCycleInfo(card,month,cycles=[]){const c=cut(card,month,cycles),d=due(card,month,cycles);
    return {month,cut:c,due:d,record:effectiveCycle(card,month,cycles)};}
  return {shift,dateFor,dateValid,statementOf,cut,due,daysUntil,upcomingCut,validateCycle,validateLegacy,legacyFor,initialMonth,effectiveCycle,effectiveCycles,monthPayment,paymentSummary,officialRemaining,dueCandidates,status,allocations,cycleStatus,currentPayable,baselineCycle,unconfirmedCycleInfo};
});