/* CSV helpers used by importers. No user data or credentials. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.FinanceCSV = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function parse(text) {
    const source = String(text || '').replace(/^\uFEFF/, '');
    const firstLine = source.split(/\r?\n/,1)[0] || '';
    const delimiter = (firstLine.match(/;/g)||[]).length > (firstLine.match(/,/g)||[]).length ? ';' : ',';
    const rows=[]; let row=[],cell='',quoted=false;
    for(let i=0;i<source.length;i++){
      const char=source[i];
      if(char==='"'){
        if(quoted && source[i+1]==='"'){cell+='"';i++;}
        else if(!quoted && cell.trim()){throw Error('Comillas fuera de lugar en el CSV.');}
        else quoted=!quoted;
      } else if(char===delimiter&&!quoted){row.push(cell.trim());cell='';}
      else if((char==='\r'||char==='\n')&&!quoted){if(char==='\r'&&source[i+1]==='\n')i++;row.push(cell.trim());cell='';if(row.some(v=>v!==''))rows.push(row);row=[];}
      else cell+=char;
    }
    if(quoted)throw Error('El CSV tiene comillas sin cerrar.');
    row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row);
    if(!rows.length)throw Error('El CSV está vacío.');
    if(rows.length>10001)throw Error('Importa hasta 10,000 filas por archivo.');
    const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/[\s-]+/g,'_');
    const headers=rows.shift().map(normalize);
    if(new Set(headers).size!==headers.length)throw Error('El CSV contiene encabezados duplicados.');
    return rows.map((cells,i)=>{
      if(cells.length!==headers.length)throw Error(`La fila ${i+2} tiene ${cells.length} columnas; se esperaban ${headers.length}.`);
      const record={};headers.forEach((h,j)=>record[h]=cells[j]);return record;
    });
  }
  function format(rows,headers){
    return '\uFEFF'+[headers,...rows.map(row=>headers.map(h=>row[h]??''))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  }
  function amount(value){
    const raw=String(value??'').trim().replace(/\s/g,'').replace(/\$/g,'');
    if(!raw) return 0;
    let number=raw;
    if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(raw))number=raw.replace(/,/g,'');
    else if(/^\d+(,\d{1,2})$/.test(raw))number=raw.replace(',','.');
    if(!/^-?\d+(\.\d{1,2})?$/.test(number))throw Error('Importe inválido: '+raw);
    const cents=Math.round(Number(number)*100);
    if(!Number.isSafeInteger(cents)||Math.abs(cents)>1e15)throw Error('Importe fuera de rango.');
    return cents;
  }
  function clean(s){return String(s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');}
  function type(s){const map={debito:'debit',debit:'debit',credito:'credit',credit:'credit',efectivo:'cash',cash:'cash',ahorro:'saving',saving:'saving',cajita:'pocket',apartado:'pocket',pocket:'pocket'};return map[clean(s)]||'';}
  function txType(s){const map={gasto:'expense',expense:'expense',ingreso:'income',income:'income',transferencia:'transfer',transfer:'transfer',pago:'payment',pago_tarjeta:'payment',payment:'payment',rendimiento:'yield',yield:'yield'};return map[clean(s).replace(/\s+/g,'_')]||'';}
  function day(v){if(String(v||'').trim()==='')return 0;const n=Number(v);if(!Number.isInteger(n)||n<1||n>31)throw Error('Día de corte/pago inválido.');return n;}
  function date(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
  function accounts(text,existing=[],baseline='2026-01-01'){
    const items=parse(text);if(!items.length)throw Error('No se encontraron cuentas en el CSV.');
    if(!items[0].nombre||!Object.hasOwn(items[0],'tipo'))throw Error('Se necesitan las columnas nombre y tipo.');
    const unique=new Set(existing.map(a=>clean(a.name)+'|'+a.type+'|'+clean(a.institution)));
    const now=new Date().toISOString();const imported=[];let skipped=0;
    items.forEach((r,i)=>{
      const row=i+2;const t=type(r.tipo),name=String(r.nombre||'').trim(),institution=String(r.institucion||'').trim();
      if(!t||!name||name.length>70||institution.length>70)throw Error(`Fila ${row}: cuenta, institución o tipo inválidos.`);
      const key=clean(name)+'|'+t+'|'+clean(institution);
      if(unique.has(key)){skipped++;return;}
      const base=r.fecha_saldo||baseline;if(!date(base))throw Error(`Fila ${row}: fecha_saldo debe ser AAAA-MM-DD.`);
      const start=amount(r.saldo_inicial||'0'),debt=amount(r.deuda_inicial||'0'),limit=amount(r.limite_credito||'0');
      if(debt<0||limit<0)throw Error(`Fila ${row}: deuda o límite negativos.`);
      const a={id:'csv-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+i),name,institution,type:t,balanceDate:base,initialBalance:t==='credit'?0:start,initialDebt:t==='credit'?debt:0,creditLimit:t==='credit'?limit:0,cutDay:day(r.dia_corte),dueDay:day(r.dia_pago),createdAt:now};
      imported.push(a);unique.add(key);
    });
    return {items:imported,skipped,total:items.length};
  }
  function movements(text,accounts,existing=[]){
    const rows=parse(text);if(!rows.length)throw Error('No hay movimientos en el archivo.');
    for(const h of ['fecha','tipo','importe_mxn'])if(!Object.hasOwn(rows[0],h))throw Error('Falta la columna '+h+'.');
    if(!Object.hasOwn(rows[0],'cuenta')&&!Object.hasOwn(rows[0],'cuenta_origen'))throw Error('Falta la columna cuenta o cuenta_origen.');
    const byId=new Map(accounts.map(a=>[a.id,a]));
    function find(s){const q=clean(s);return byId.get(s)||accounts.find(a=>clean(a.name)===q);}
    const known=new Set(existing.map(m=>m.id));const imported=[];let skipped=0;
    rows.forEach((r,i)=>{
      const row=i+2,t=txType(r.tipo),accountName=r.cuenta||r.cuenta_origen,from=find(accountName),to=find(r.cuenta_destino);
      if(!date(r.fecha)||!t||!from)throw Error(`Fila ${row}: revisa fecha (AAAA-MM-DD), tipo y cuenta.`);
      const n=amount(r.importe_mxn);if(n<=0)throw Error(`Fila ${row}: el importe debe ser positivo.`);
      if((t==='payment'||t==='transfer')&&!to)throw Error(`Fila ${row}: falta cuenta_destino válida.`);
      if(t==='transfer'&&(from.type==='credit'||to.type==='credit'||from.id===to.id))throw Error(`Fila ${row}: transferencia entre cuentas inválida.`);
      if(t==='payment'&&(from.type==='credit'||to.type!=='credit'))throw Error(`Fila ${row}: pago de tarjeta inválido.`);
      if((t==='income'||t==='yield')&&from.type==='credit')throw Error(`Fila ${row}: los ingresos no pueden ir a una tarjeta de crédito.`);
      const months=Number(r.meses_msi||1);
      if(!Number.isInteger(months)||months<1||months>120||(months>1&&(t!=='expense'||from.type!=='credit')))throw Error(`Fila ${row}: meses MSI inválidos.`);
      const ref=String(r.referencia||'').trim();const ident=ref?`csv-ref:${ref}`:`csv-row:${clean(accountName)}:${r.fecha}:${r.tipo}:${r.importe_mxn}:${i+2}:${String(r.descripcion||'').slice(0,80)}`;
      if(known.has(ident)){skipped++;return;}known.add(ident);
      imported.push({id:ident,type:t,date:r.fecha,accountId:from.id,toAccountId:to?.id||'',amount:n,months,category:t==='expense'?String(r.categoria||'Otros').slice(0,100):'',description:String(r.descripcion||'').slice(0,200),createdAt:new Date().toISOString()});
    });
    return {items:imported,skipped,total:rows.length};
  }
  return {parse,format,amount,accounts,movements,clean,date};
});
