/* Formularios de cuentas y movimientos: vista y controladores aislados de app.js.
 * No modifica esquema IndexedDB ni reglas de saldos/MSI. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FinanceTransactionForms=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  function create(deps){
    if(!deps||typeof deps.getState!=='function')throw Error('El controlador de formularios necesita getState.');
    const {getState,option,field,localDate,val,id,cents,accountTypes,txNames,cats,
      Cards,CardImages,Billing,F,openModal,closeModal,notify,save,remove,getAccount,
      money,enhanceAccountPickers,modalInner}=deps;
  function accountForm(existing=null,preferredType='debit'){
    const state=getState();
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
      if(existing&&(aNew.balanceDate!==existing.balanceDate||
        (type==='credit'?aNew.initialDebt!==existing.initialDebt:aNew.initialBalance!==existing.initialBalance))&&
        (state.movements.some(m=>m.accountId===existing.id||m.toAccountId===existing.id)||
          state.billingCycles.some(c=>c.accountId===existing.id)||state.pockets.some(p=>p.parentAccountId===existing.id))){
        if(!confirm('Estás modificando el saldo o fecha inicial de una cuenta con movimientos o compromisos. Esto recalculará saldos y pagos históricos. Exporta antes un respaldo. ¿Confirmas el cambio?'))return;
      }
      if(type==='credit'&&(!Number.isInteger(aNew.cutDay)||aNew.cutDay<0||aNew.cutDay>31||!Number.isInteger(aNew.dueDay)||aNew.dueDay<0||aNew.dueDay>31))throw Error('El día de corte y pago debe ser del 1 al 31, o vacío si está pendiente.');
      await save('accounts',aNew);closeModal();notify('Cuenta guardada');
    }catch(err){notify(err.message||'No se pudo guardar');}});
    if(existing)document.getElementById('delete-account-btn').addEventListener('click',async()=>{
      if(state.movements.some(m=>m.accountId===existing.id||m.toAccountId===existing.id)){notify('Elimina primero los movimientos vinculados a esta cuenta.');return;}
      if(state.pockets.some(p=>p.parentAccountId===existing.id)){notify('Esta cuenta contiene cajitas. Retira primero el dinero y administra sus cajitas antes de eliminar la cuenta.');return;}
      if(state.budgets.some(b=>b.accountId===existing.id)||state.recurrences.some(r=>r.accountId===existing.id)||
        state.reconciliations.some(r=>r.accountId===existing.id)){
        notify('Esta cuenta tiene presupuestos, suscripciones o conciliaciones. Revisa y retira esas referencias antes de eliminarla.');return;
      }
      if(state.payrollProfiles.some(p=>p.accountId===existing.id)){notify('Esta cuenta tiene una nómina configurada. Cambia primero la cuenta de nómina.');return;}
      if(state.billingCycles.some(c=>c.accountId===existing.id)||state.legacyInstallments.some(r=>r.accountId===existing.id)){notify('Esta tarjeta tiene cortes o mensualidades anteriores configuradas. Elimínalos desde Cortes y mensualidades antes de borrar la cuenta.');return;}
      if(confirm('¿Eliminar esta cuenta?')){await remove('accounts',existing.id);closeModal();notify('Cuenta eliminada');}
    });
  }
  function movementForm(preferredAccountId='',preferredType='expense',existing=null,preferredDestination=''){
    const state=getState();
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
      const available=Billing.effectiveCycles(card,state.billingCycles).filter(c=>c.amountDue!==null)
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
      if(type==='payment'&&f.elements.paymentCycleId.value&&!dest)throw Error('Elige una tarjeta.');
      if(type==='payment'&&f.elements.paymentCycleId.value&&!Billing.effectiveCycles(dest,state.billingCycles).some(c=>c.id===f.elements.paymentCycleId.value))throw Error('El corte seleccionado no corresponde a esa tarjeta.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(f.elements.date.value))throw Error('Fecha inválida.');
      if(type==='payment'&&(!dest||dest.type!=='credit'||source.type==='credit'))throw Error('Elige una cuenta y una tarjeta de crédito.');
      if(type==='transfer'&&(!dest||dest.id===source.id||source.type==='credit'||dest.type==='credit'))throw Error('Elige dos cuentas distintas de dinero o ahorro.');
      const months=type==='expense'&&source.type==='credit'?Number(f.elements.months.value):1;
      const movement={...(existing||{}),id:existing?.id||id(),type,date:f.elements.date.value,accountId,toAccountId:(type==='payment'||type==='transfer')?toAccountId:'',amount,category:type==='expense'?f.elements.category.value:type==='income'?'Ingresos':type==='yield'?'Rendimientos':'',description:f.elements.description.value.trim(),months,paymentCycleId:type==='payment'?f.elements.paymentCycleId.value:'',pocketId:type==='yield'?String(existing?.pocketId||''):'',payrollKind:type==='income'?String(existing?.payrollKind||''):'',payrollKey:type==='income'?String(existing?.payrollKey||''):'',createdAt:existing?.createdAt||new Date().toISOString()};
      if(existing){await save('audits',{id:id(),movementId:existing.id,date:new Date().toISOString(),before:existing,after:movement});}
      await save('movements',movement);closeModal();notify(existing?'Movimiento actualizado':'Movimiento registrado');
    }catch(err){notify(err.message||'No se pudo registrar el movimiento');}});
  }


    return {accountForm,movementForm};
  }
  return {create};
});
