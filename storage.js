/* Apertura segura de IndexedDB, sin borrar información. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FinanceStorage=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const stores=['accounts','movements','settings','budgets','recurrences','reconciliations','audits','payrollProfiles'];
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
  return {openDatabase};
});
