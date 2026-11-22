const assert=require('node:assert/strict');
const {openDatabase}=require('./storage.js');
async function run(){
  await assert.rejects(()=>openDatabase('finanzas',2,{engine:{},timeoutMs:20}),/no está disponible/);
  let closed=false,versionChange;
  const engine={open(name,version){
    assert.equal(name,'finanzas');assert.equal(version,2);
    const req={result:{objectStoreNames:{contains:()=>true},close(){closed=true;}}};
    queueMicrotask(()=>req.onsuccess());
    versionChange=()=>req.result.onversionchange();
    return req;
  }};
  const db=await openDatabase('finanzas',2,{engine,timeoutMs:100});
  assert.ok(db); versionChange();assert.equal(closed,true);
  let blocked=false;
  const blockedEngine={open(){const req={};queueMicrotask(()=>req.onblocked());return req;}};
  await assert.rejects(()=>openDatabase('finanzas',2,{engine:blockedEngine,timeoutMs:20,onBlocked:()=>blocked=true}),/bloqueado/);
  assert.equal(blocked,true);
  let closedLate=false;
  const lateEngine={open(){
    const req={result:{objectStoreNames:{contains:()=>true},close(){closedLate=true;}}};
    setTimeout(()=>req.onsuccess(),40);
    return req;
  }};
  await assert.rejects(()=>openDatabase('finanzas',2,{engine:lateEngine,timeoutMs:10}),/no respondió/);
  await new Promise(resolve=>setTimeout(resolve,70));assert.equal(closedLate,true);
  console.log('✓ IndexedDB: sin acceso, listo, cambio de versión, bloqueo y respuesta tardía');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
