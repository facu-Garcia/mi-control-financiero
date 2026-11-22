/* Apertura segura de IndexedDB, sin borrar información. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FinanceStorage=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const stores=['accounts','movements','settings','budgets','recurrences','reconciliations','audits','payrollProfiles','billingCycles','legacyInstallments','pockets','pocketMoves'];
  function openDatabase(name,version,options={}){
    return new Promise((resolve,reject)=>{
      let ended=false,blocked=false,request,timer;
      const done=(err,database)=>{
        if(ended){if(database?.close)database.close();return;}
        ended=true;clearTimeout(timer);
        if(err)reject(err);else resolve(database);
      };
      const engine=options.engine||(typeof indexedDB==='undefined'?null:indexedDB);
      if(!engine||typeof engine.open!=='function'){
        done(Error('IndexedDB no está disponible en este navegador. Abre la dirección HTTPS en Chrome normal, no en modo incógnito.'));
        return;
      }
      try{
        request=engine.open(name,version);
        request.onblocked=()=>{
          blocked=true;
          options.onBlocked?.();
        };
        request.onupgradeneeded=()=>{
          try{
            const database=request.result;
            for(const store of stores){
              if(!database.objectStoreNames.contains(store))database.createObjectStore(store,{keyPath:'id'});
            }
          }catch(error){
            try{request.transaction?.abort();}catch{}
            done(Error('No se pudo actualizar el esquema local: '+(error?.message||error)));
          }
        };
        request.onerror=()=>done(Error('IndexedDB rechazó la apertura: '+(request.error?.message||request.error?.name||'error desconocido')));
        request.onsuccess=()=>{
          const database=request.result;
          database.onversionchange=()=>{
            database.close();
            options.onVersionChange?.();
          };
          done(null,database);
        };
        timer=setTimeout(()=>{
          done(Error(blocked
            ?'IndexedDB está bloqueado por otra pestaña o versión de la PWA. Cierra las demás ventanas de Mi Control Financiero y vuelve a intentarlo, sin borrar datos.'
            :'IndexedDB no respondió. Puede estar bloqueado por otra pestaña, la configuración de privacidad o un fallo del navegador. Cierra otras ventanas y vuelve a intentarlo.'));
        },options.timeoutMs??12000);
      }catch(error){
        done(Error('No fue posible iniciar IndexedDB: '+(error?.message||String(error))));
      }
    });
  }
  // Movimiento e historial se guardan juntos, sin auditorías huérfanas.
  function changeMovement(database,{before=null,after=null,auditId='',date=''}){
    const movementId=before?.id||after?.id;
    if(typeof movementId!=='string'||!movementId||before&&after&&before.id!==after.id)
      return Promise.reject(Error('Movimiento inválido para guardar.'));
    if(before&&(typeof auditId!=='string'||!auditId||typeof date!=='string'||!date))
      return Promise.reject(Error('Faltan datos de auditoría.'));
    return new Promise((resolve,reject)=>{
      let tx,reason=null;
      try{
        tx=database.transaction(['movements','audits'],'readwrite');
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(reason||tx.error||Error('Error al guardar movimiento.'));
        tx.onabort=()=>reject(reason||tx.error||Error('Operación financiera cancelada.'));
        const movements=tx.objectStore('movements');
        const req=movements.get(movementId);
        req.onsuccess=()=>{
          try{
            const stored=req.result;
            if(before&&JSON.stringify(stored)!==JSON.stringify(before))
              throw Error('El movimiento cambió desde que lo abriste. Vuelve a cargar antes de editarlo.');
            if(!before&&stored!==undefined)
              throw Error('Ya existe otro movimiento con ese identificador.');
            if(after)movements.put(after);else movements.delete(movementId);
            if(before)tx.objectStore('audits').put({id:auditId,movementId,date,before,after});
          }catch(error){reason=error;try{tx.abort();}catch{reject(error);}}
        };
      }catch(error){try{tx?.abort();}catch{}reject(error);}
    });
  }
  return {openDatabase,changeMovement};
});
