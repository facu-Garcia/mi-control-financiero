const assert=require('node:assert/strict');
const F=require('./logic.js');
const cr={id:'card',type:'credit',cutDay:20,balanceDate:'2026-11-20',initialDebt:5000,creditLimit:300000};
const deb={id:'bank',type:'debit',balanceDate:'2026-11-20',initialBalance:100000};
const savings={id:'pocket',type:'pocket',balanceDate:'2026-11-20',initialBalance:20000};
const accounts=[cr,deb,savings];
assert.equal(F.statementOf('2026-10-20',20),'2026-10');
assert.equal(F.statementOf('2026-10-21',20),'2026-11');
assert.equal(F.statementOf('2026-11-20',20),'2026-11');
assert.equal(F.statementOf('2026-11-21',20),'2026-12');
assert.equal(F.statementOf('2026-02-28',31),'2026-02');
assert.equal(F.statementOf('2028-02-29',31),'2028-02');
assert.equal(F.shiftMonth('2026-12',1),'2027-01');
assert.equal(F.monthDiff('2026-12','2027-03'),3);
const purchases=[{id:'a',type:'expense',date:'2026-10-21',accountId:'card',amount:600000,category:'Compras',months:6,description:'Laptop'},
 {id:'b',type:'expense',date:'2026-11-05',accountId:'card',amount:12500,category:'Comida',months:1,description:'Comida'},
 {id:'c',type:'expense',date:'2026-10-20',accountId:'card',amount:10000,category:'Otros',months:1,description:'Anterior'},
 {id:'d',type:'expense',date:'2026-11-21',accountId:'bank',amount:7000,category:'Transporte',months:1,description:'Uber'},
 {id:'e',type:'income',date:'2026-11-21',accountId:'bank',amount:200000,months:1},
 {id:'f',type:'transfer',date:'2026-11-21',accountId:'bank',toAccountId:'pocket',amount:10000,months:1},
 {id:'g',type:'payment',date:'2026-11-21',accountId:'bank',toAccountId:'card',amount:30000,months:1},
 {id:'h',type:'yield',date:'2026-11-21',accountId:'pocket',amount:150,months:1}];
assert.equal(F.statementCharges({...cr,cutDay:0},purchases,'2026-11').total,112500);
assert.equal(F.statementCharges(cr,purchases,'2026-11').total,112500);
assert.equal(F.statementCharges(cr,purchases,'2026-11').ordinary,12500);
assert.equal(F.statementCharges(cr,purchases,'2026-11').installments,100000);
assert.equal(F.statementCharges(cr,purchases,'2026-12').total,100000);
assert.equal(F.statementCharges(cr,purchases,'2027-05').total,0);
assert.equal(F.monthlyInstallments(accounts,purchases,'2027-04'),100000);
assert.equal(F.monthlyInstallments(accounts,purchases,'2027-05'),0);
assert.equal(F.breakdown(accounts,purchases,'2026-11').purchases,619500);
assert.equal(F.breakdown(accounts,purchases,'2026-10').purchases,10000);
assert.equal(F.breakdown(accounts,purchases,'2026-11').income,200000);
assert.equal(F.breakdown(accounts,purchases,'2026-11').bankOutflow,37000);
assert.equal(F.breakdown(accounts,purchases,'2026-11').cashChange,163150);
assert.equal(F.accountBalance(cr,purchases),5000-30000); // old purchases should not double-count as debt
assert.equal(F.accountBalance(deb,purchases),100000-7000+200000-10000-30000);
assert.equal(F.accountBalance(savings,purchases),20000+10000+150);
assert.equal(F.totals(accounts,purchases).netWorth,100000-7000+200000-10000-30000 + 20000+10000+150 -(5000-30000));
const installmentSeries=Array.from({length:6},(_,i)=>F.installmentAmount(10001,6,i));
assert.equal(installmentSeries.reduce((a,b)=>a+b),10001);
assert.deepEqual(installmentSeries,[1667,1667,1667,1667,1667,1666]);
assert.equal(F.accountBalanceAt(deb,purchases,'2026-11-20'),100000);
assert.equal(F.accountBalanceAt(deb,purchases,'2026-11-21'),100000-7000+200000-10000-30000);
const future={id:'future',type:'income',date:'2026-12-01',accountId:'bank',amount:500000};
assert.equal(F.totalsAt([deb],[future],'2026-11-22').assets,100000);
assert.equal(F.totalsAt([deb],[future],'2026-12-02').assets,600000);
assert.equal(F.totalsAt([{...deb,balanceDate:'2026-12-01'}],[],'2026-11-22').excludedAccounts,1);
console.log('✓ 26 pruebas de fechas, cortes, MSI, ahorros, saldos y flujos aprobadas');
