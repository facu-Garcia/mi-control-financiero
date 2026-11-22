const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
global.crypto=webcrypto;
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true,writable:true});
const Drive=require('./drive-sync.js');
const Backup=require('./features/backup/backup-model.js');
const F=require('./logic.js');
const B=require('./features/cards/billing.js');
const P=require('./features/savings/pockets.js');
const Payroll=require('./features/payroll/payroll.js');
const Rec=require('./features/finance/recurring.js');
const Cards=require('./card-designs.js');
const accountTypes={debit:1,credit:1,cash:1,saving:1,pocket:1};
const txNames={expense:1,income:1,transfer:1,payment:1,yield:1,debtAdjustment:1};
const deps={F,Billing:B,Pockets:P,Payroll,Rec,Cards,accountTypes,txNames};
(async()=>{
  const empty={accounts:[],movements:[],budgets:[],recurrences:[],reconciliations:[],audits:[],
    payrollProfiles:[],billingCycles:[],legacyInstallments:[],pockets:[],pocketMoves:[],
    settings:{id:'preferences',salary:0,savingsTarget:0}};
  const snap=Backup.capture(empty);
  assert.equal(snap.kind,'complete-backup');
  assert.equal(snap.schemaVersion,6);
  assert.deepEqual(Backup.validate(snap,deps).accounts,[]);
  assert.equal(Backup.STORES.length,12);
  const before=structuredClone(snap);
  before.movements.push({id:'tx1'});
  assert.equal(Drive.snapshotsEqual(snap,before),false);
  const password='frase-privada-de-prueba-super-segura';
  const sealed=await Drive.encrypt(snap,password);
  const mock=Object.create(Drive.DriveSync.prototype);
  mock.ready=true;mock.password=password;mock.token='dummy';
  mock.listHistory=async()=>[];
  let backupCount=0,backupName='',archived=null;
  mock.createEncryptedFile=async(name,encrypted)=>{
    backupCount++;backupName=name;archived=encrypted;return {id:'archive-123'};
  };
  assert.equal(await mock.archivePrevious(sealed),true);
  assert.equal(backupCount,1);
  assert.match(backupName,/^mi-control-financiero-historial-\d{4}-\d{2}-\d{2}\.enc\.json$/);
  assert.deepEqual(await Drive.decrypt(archived,password),snap);
  mock.listHistory=async()=>[{id:'archive-123',name:backupName}];
  assert.equal(await mock.archivePrevious(sealed),false);
  assert.equal(backupCount,1);
  // Conflict overwrite must archive a distinct revision even on the same day.
  mock.forceArchive=true;
  assert.equal(await mock.archivePrevious(sealed),true);
  assert.equal(backupCount,2);
  assert.match(backupName,/mi-control-financiero-historial-.*-/);
  mock.forceArchive=false;
  mock.request=async()=>archived;
  assert.deepEqual(await mock.readHistory('archive-123'),snap);
  await assert.rejects(()=>mock.readHistory('untrusted-file'),/no existe/);
  // Simulate safe overwrites. The archive must be created BEFORE PATCH.
  const order=[];
  const active=Object.create(Drive.DriveSync.prototype);
  active.ready=true;active.token='dummy';active.password=password;
  active.dirty=true;active.running=false;active.fileId='main';
  active.remoteRevision=sealed.revision;active.getData=()=>snap;
  active.notify=()=>{};active.schedule=()=>{};
  active.readCloud=async()=>sealed;
  active.archivePrevious=async()=>{order.push('archive');return true;};
  active.request=async(url,options)=>{
    assert.equal(options.method,'PATCH');
    order.push('upload');return {};
  };
  await active.sync();
  assert.deepEqual(order,['archive','upload']);
  assert.equal(active.dirty,false);
  assert.equal(active.ready,true);
  // Archive errors must NEVER overwrite the current encrypted cloud file.
  active.remoteRevision=sealed.revision;active.dirty=true;
  const errors=[];active.notify=x=>errors.push(x);
  active.archivePrevious=async()=>{throw Error('No hubo copia preventiva');};
  await assert.rejects(()=>active.sync(),/No hubo copia preventiva/);
  assert.equal(order.length,2);
  assert.equal(active.ready,false);
  assert.equal(active.dirty,true);
  console.log('✓ Respaldo: validación independiente, historial cifrado, recuperación y bloqueo al fallar el archivado');
})().catch(err=>{console.error(err);process.exitCode=1});
