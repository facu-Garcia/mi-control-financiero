const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
global.crypto=webcrypto;
const {encrypt,decrypt}=require('./drive-sync.js');
(async()=>{
  const state={kind:'complete-backup',schemaVersion:2,accounts:[{name:'Prueba',initialBalance:12345}],movements:[],budgets:[],settings:{salary:0}};
  const password='frase-de-prueba-larga-para-cifrado';
  const blob=await encrypt(state,password);
  assert.equal(blob.kind,'mcf-encrypted-drive-snapshot');
  assert.ok(!JSON.stringify(blob).includes('Prueba'));
  assert.equal((await decrypt(blob,password)).accounts[0].initialBalance,12345);
  await assert.rejects(()=>decrypt(blob,'contraseña-errónea'),/descifrar/);
  console.log('✓ Cifrado AES-GCM y recuperación local verificados');
})().catch(err=>{console.error(err);process.exitCode=1});
