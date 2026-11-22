const assert=require('node:assert/strict');
const {changeMovement}=require('./storage.js');

// Simulated IndexedDB transaction: writes are staged until commit and discarded on abort.
function fakeDatabase(initial=[],options={}){
  const data=new Map(initial.map(x=>[x.id,structuredClone(x)]));
  const audit=new Map();
  let transactionCount=0;
  return {data,audit,get transactionCount(){return transactionCount;},
    transaction(names,mode){
      assert.deepEqual(names,['movements','audits']);assert.equal(mode,'readwrite');
      transactionCount++;
      let aborted=false;
      const operations=[];
      const tx={error:null,onabort:null,onerror:null,oncomplete:null,
        abort(){if(aborted)return;aborted=true;queueMicrotask(()=>tx.onabort?.());},
        objectStore(name){
          if(!['movements','audits'].includes(name))throw Error('Unexpected object store');
          const source=name==='movements'?data:audit;
          return {
            get(id){
              const req={result:undefined,onsuccess:null,onerror:null};
              queueMicrotask(()=>{
                if(aborted)return;
                req.result=source.has(id)?structuredClone(source.get(id)):undefined;
                req.onsuccess?.();
                queueMicrotask(()=>{
                  if(aborted)return;
                  if(options.failWrites){tx.error=Error('Simulated disk error');tx.abort();return;}
                  for(const op of operations)op();
                  tx.oncomplete?.();
                });
              });
              return req;
            },
            put(value){operations.push(()=>source.set(value.id,structuredClone(value)));},
            delete(id){operations.push(()=>source.delete(id));}
          };
        }
      };
      return tx;
    }
  };
}
(async()=>{
  const original={id:'tx-1',type:'expense',amount:100,date:'2026-11-21'};
  const updated={...original,amount:200};
  const db=fakeDatabase([original]);
  await changeMovement(db,{before:original,after:updated,auditId:'audit-1',date:'2026-11-22T00:00:00.000Z'});
  assert.equal(db.transactionCount,1,'one transaction per edit');
  assert.equal(db.data.get(original.id).amount,200);
  assert.equal(db.audit.get('audit-1').before.amount,100);
  assert.equal(db.audit.get('audit-1').after.amount,200);
  await changeMovement(db,{before:updated,after:null,auditId:'audit-2',date:'2026-11-22T01:00:00.000Z'});
  assert.equal(db.data.has(original.id),false);
  assert.equal(db.audit.get('audit-2').after,null);
  const created={id:'tx-2',amount:999};
  await changeMovement(db,{after:created});
  assert.equal(db.data.get(created.id).amount,999);
  assert.equal(db.audit.size,2,'new transactions have no before-image audit entry');
  await assert.rejects(()=>changeMovement(db,{after:{id:'tx-2',amount:42}}),/Ya existe/);
  assert.equal(db.data.get('tx-2').amount,999);
  await assert.rejects(()=>changeMovement(db,{before:original,after:updated,auditId:'audit-conflict',date:'2026-11-22'}),/cambió/);
  assert.equal(db.audit.has('audit-conflict'),false);
  const blocked=fakeDatabase([original],{failWrites:true});
  await assert.rejects(()=>changeMovement(blocked,{before:original,after:updated,auditId:'not-committed',date:'2026-11-22'}),/Simulated disk error/);
  assert.deepEqual(blocked.data.get('tx-1'),original);
  assert.equal(blocked.audit.size,0,'audit and movement both rolled back');
  await assert.rejects(()=>changeMovement(blocked,{before:original,after:{id:'other'},auditId:'bad',date:'2026-11-22'}),/inválido/);
  console.log('✓ Movimiento/auditoría atómicos: edición, alta, baja, conflictos y rollback');
})().catch(error=>{console.error(error);process.exitCode=1;});
