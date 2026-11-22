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
  function officialRemaining(card,cycle,movements){
    if(cycle.amountDue===null||cycle.amountDue===undefined)return null;
    // Payments after this closing date are allocated against this statement for display only.
    const paid=movements.filter(m=>m.type==='payment'&&m.toAccountId===card.id&&
      m.date>cycle.cutDate&&(!cycle.dueDate||m.date<=cycle.dueDate))
      .reduce((s,m)=>s+m.amount,0);
    return Math.max(0,cycle.amountDue-paid);
  }
  function dueCandidates(card,cycles,movements,today){
    return (cycles||[]).filter(c=>c.accountId===card.id&&c.amountDue!==null&&c.amountDue!==undefined&&c.cutDate<=today)
      .map(c=>({...c,remaining:officialRemaining(card,c,movements),days:daysUntil(c.dueDate,today)}))
      .filter(c=>c.remaining>0&&c.dueDate)
      .sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  }
  function status(card,cycles,movements,today){
    const next=upcomingCut(card,cycles,today);
    const dueNow=dueCandidates(card,cycles,movements,today).find(c=>c.days>=-75)||null;
    const selected=dueNow&&dueNow.days<=14?dueNow:null;
    return {nextCut:next,payment:selected,upcomingDue:dueNow};
  }
  function unconfirmedCycleInfo(card,month,cycles=[]){const c=cut(card,month,cycles),d=due(card,month,cycles);
    return {month,cut:c,due:d,record:statementOf(card,month,cycles)};}
  return {shift,dateFor,dateValid,statementOf,cut,due,daysUntil,upcomingCut,validateCycle,validateLegacy,legacyFor,officialRemaining,dueCandidates,status,unconfirmedCycleInfo};
});