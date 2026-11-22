/* Financial rules are kept separate from the UI so they can be tested. All money is integer MXN cents. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.Finance = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function monthOf(date) { return String(date).slice(0, 7); }
  function shiftMonth(month, offset) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function monthDiff(first, later) {
    const [fy, fm] = first.split('-').map(Number), [ly, lm] = later.split('-').map(Number);
    return (ly - fy) * 12 + lm - fm;
  }
  function statementOf(date, cutDay) {
    const [y, m, d] = date.split('-').map(Number);
    const cutoff = Math.min(Number(cutDay) || 31, new Date(y, m, 0).getDate());
    const current = `${y}-${String(m).padStart(2, '0')}`;
    return d <= cutoff ? current : shiftMonth(current, 1);
  }
  function accountById(accounts, id) { return accounts.find(a => a.id === id); }
  function debitOrCreditImpact(account, mv) {
    if (mv.date <= account.balanceDate) return 0; // baseline is end-of-day snapshot
    if (account.type === 'credit') {
      if (mv.type === 'expense' && mv.accountId === account.id) return mv.amount;
      if (mv.type === 'payment' && mv.toAccountId === account.id) return -mv.amount;
      return 0;
    }
    if (mv.type === 'expense' && mv.accountId === account.id) return -mv.amount;
    if ((mv.type === 'income' || mv.type === 'yield') && mv.accountId === account.id) return mv.amount;
    if ((mv.type === 'transfer' || mv.type === 'payment') && mv.accountId === account.id) return -mv.amount;
    if (mv.type === 'transfer' && mv.toAccountId === account.id) return mv.amount;
    return 0;
  }
  function accountBalance(account, movements) {
    const baseline = account.type === 'credit' ? (account.initialDebt || 0) : (account.initialBalance || 0);
    return baseline + movements.reduce((sum, m) => sum + debitOrCreditImpact(account, m), 0);
  }
  function totals(accounts, movements) {
    const assets = accounts.filter(a => a.type !== 'credit').reduce((s, a) => s + accountBalance(a, movements), 0);
    const debts = accounts.filter(a => a.type === 'credit').reduce((s, a) => s + accountBalance(a, movements), 0);
    const saved = accounts.filter(a => a.type === 'saving' || a.type === 'pocket').reduce((s, a) => s + accountBalance(a, movements), 0);
    return {assets, debts, saved, netWorth: assets - debts};
  }
  function monthlyPurchaseMonth(movement, account) {
    return account && account.type === 'credit' ? statementOf(movement.date, account.cutDay) : monthOf(movement.date);
  }
  function installmentAmount(amount, months, installmentIndex) {
    if (!Number.isInteger(months) || months < 1 || installmentIndex < 0 || installmentIndex >= months) return 0;
    const base = Math.floor(amount / months), extra = amount % months;
    return base + (installmentIndex < extra ? 1 : 0);
  }
  function breakdown(accounts, movements, month) {
    const byCat = {};
    let purchases = 0, income = 0, yields = 0, bankOutflow = 0, cardPayments = 0;
    for (const mv of movements) {
      const acc = accountById(accounts, mv.accountId);
      const calendar = monthOf(mv.date) === month;
      if (mv.type === 'expense') {
        if (monthlyPurchaseMonth(mv, acc) === month) {
          purchases += mv.amount;
          const key = mv.category || 'Otros';
          byCat[key] = (byCat[key] || 0) + mv.amount;
        }
        if (calendar && acc && acc.type !== 'credit') bankOutflow += mv.amount;
      }
      if (mv.type === 'income' && calendar) income += mv.amount;
      if (mv.type === 'yield' && calendar) yields += mv.amount;
      if (mv.type === 'payment' && calendar) { bankOutflow += mv.amount; cardPayments += mv.amount; }
    }
    return {purchases, income, yields, bankOutflow, cardPayments, cashChange: income + yields - bankOutflow, byCat};
  }
  function statementCharges(card, movements, month) {
    if (card.type !== 'credit' || !Number.isInteger(card.cutDay) || card.cutDay < 1) return {ordinary: 0, installments: 0, total: 0, entries: []};
    let ordinary = 0, installments = 0;
    const entries = [];
    for (const mv of movements) {
      if (mv.type !== 'expense' || mv.accountId !== card.id) continue;
      const start = statementOf(mv.date, card.cutDay);
      const n = Math.max(1, Number(mv.months) || 1);
      const index = monthDiff(start, month);
      if (n === 1 && index === 0) {
        ordinary += mv.amount;
        entries.push({id: mv.id, note: mv.description || mv.category, amount: mv.amount, installment: null});
      } else if (n > 1 && index >= 0 && index < n) {
        const amount = installmentAmount(mv.amount, n, index);
        installments += amount;
        entries.push({id: mv.id, note: mv.description || mv.category, amount, installment: `${index + 1}/${n}`});
      }
    }
    return {ordinary, installments, total: ordinary + installments, entries};
  }
  function monthlyInstallments(accounts, movements, month) {
    return accounts.filter(a=>a.type==='credit').reduce((sum,card)=>sum+statementCharges(card,movements,month).installments,0);
  }
  function reportForMonth(accounts, movements, settings, month) {
    const b = breakdown(accounts, movements, month);
    const cardStatements = accounts.filter(a=>a.type==='credit').map(card=>({cardId:card.id,cardName:card.name,cutDay:card.cutDay,...statementCharges(card,movements,month)}));
    const included = movements.filter(m => m.type==='expense'
      ? monthlyPurchaseMonth(m, accountById(accounts,m.accountId)) === month
      : monthOf(m.date)===month);
    return {schemaVersion:1,kind:'monthly-report',month,generatedAt:new Date().toISOString(),plannedMonthlySalary:settings.salary || 0,summary:b,accounts:accounts.map(a=>({id:a.id,name:a.name,type:a.type,balance:accountBalance(a,movements)})),cardStatements,monthlyInstallments:monthlyInstallments(accounts,movements,month),futureInstallments:Array.from({length:6},(_,i)=>({month:shiftMonth(month,i+1),amount:monthlyInstallments(accounts,movements,shiftMonth(month,i+1))})),movements:included.map(m=>({...m,financialMonth:m.type==='expense'?monthlyPurchaseMonth(m,accountById(accounts,m.accountId)):monthOf(m.date)}))};
  }
  return {monthOf,shiftMonth,monthDiff,statementOf,accountById,accountBalance,totals,installmentAmount,breakdown,statementCharges,monthlyInstallments,monthlyPurchaseMonth,reportForMonth};
});
