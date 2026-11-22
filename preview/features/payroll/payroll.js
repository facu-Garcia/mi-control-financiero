/* Private payroll domain model. No employer, amount, or payroll flag is hardcoded.
 * Expected paydays are informational; only confirmed income movements change balances.
 */
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.FinancePayroll=m;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const TYPES=Object.freeze({
    salary:'Sueldo / quincena',
    savingsFund:'Fondo de ahorro',
    christmasBonus:'Aguinaldo',
    vacationPremium:'Prima vacacional',
    profitSharing:'Utilidades (PTU)',
    bonus:'Bono o incentivo',
    other:'Otro ingreso de nómina'
  });
  const FREQUENCIES=Object.freeze({semimonthly:'Quincenal (dos fechas al mes)',monthly:'Mensual'});
  const dayOf=(month,day)=>{const [y,m]=month.split('-').map(Number);return month+'-'+String(Math.min(Number(day),new Date(y,m,0).getDate())).padStart(2,'0');};
  function validate(profile,accounts){
    const a=accounts.find(a=>a.id===profile.accountId);
    if(!a||a.type!=='debit')throw Error('La cuenta de nómina debe ser de débito.');
    if(profile.id!==a.id)throw Error('El identificador de nómina no coincide con la cuenta.');
    if(!Object.hasOwn(FREQUENCIES,profile.frequency))throw Error('Periodicidad de nómina inválida.');
    for(const value of [profile.day1,profile.day2]){
      if(!Number.isInteger(value)||value<1||value>31)throw Error('Los días de pago deben estar entre 1 y 31.');
    }
    if(profile.frequency==='semimonthly'&&profile.day1>=profile.day2)throw Error('La primera fecha debe ser anterior a la segunda.');
    if(!Number.isSafeInteger(profile.expectedNet)||profile.expectedNet<0||profile.expectedNet>1e15)throw Error('Importe esperado inválido.');
    return profile;
  }
  function due(profile,month){
    if(!/^\d{4}-\d{2}$/.test(month))throw Error('Mes inválido.');
    const nums=profile.frequency==='monthly'?[profile.day1]:[profile.day1,profile.day2];
    return nums.map((day,i)=>({date:dayOf(month,day),key:profile.id+'|'+month+'|'+(i+1),
      sequence:i+1,expected:profile.expectedNet,label:profile.frequency==='monthly'?'Pago mensual':(i===0?'Primera quincena':'Segunda quincena')}));
  }
  function isPayrollIncome(m,accountId){return m.type==='income'&&m.accountId===accountId&&Object.hasOwn(TYPES,m.payrollKind);}
  function receiptFor(slot,movements){return movements.find(m=>m.type==='income'&&m.payrollKind==='salary'&&m.payrollKey===slot.key)||null;}
  function receiptExists(key,movements,excludeId=''){return !!key&&movements.some(m=>m.id!==excludeId&&m.type==='income'&&m.payrollKey===key);}
  function incomeTotals(movements,accountId,month){
    const result=Object.fromEntries(Object.keys(TYPES).map(t=>[t,0]));
    for(const m of movements){if(isPayrollIncome(m,accountId)&&m.date.startsWith(month))result[m.payrollKind]+=m.amount;}
    return {byType:result,total:Object.values(result).reduce((a,b)=>a+b,0),salary:result.salary,extra:Object.values(result).reduce((a,b)=>a+b,0)-result.salary};
  }
  return {TYPES,FREQUENCIES,validate,due,receiptFor,receiptExists,incomeTotals,isPayrollIncome,dayOf};
});