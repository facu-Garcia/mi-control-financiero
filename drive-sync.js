/* Optional Google Drive encrypted snapshot sync. Local-first, no client secret. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.FinanceDrive = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const SCOPE='https://www.googleapis.com/auth/drive.appdata';
  const CLOUD_NAME='mi-control-financiero-v2.enc.json';
  const BASE='https://www.googleapis.com/drive/v3/files';
  const UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
  const iterations=310000;
  function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
  function unb64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
  function random(){return crypto.randomUUID?crypto.randomUUID():b64(crypto.getRandomValues(new Uint8Array(18)));}
  async function encrypt(value,password){
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
    const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value))));
    return {kind:'mcf-encrypted-drive-snapshot',version:1,revision:random(),updatedAt:new Date().toISOString(),salt:b64(salt),iv:b64(iv),payload:b64(ciphertext)};
  }
  async function decrypt(obj,password){
    if(obj?.kind!=='mcf-encrypted-drive-snapshot'||obj.version!==1||!obj.salt||!obj.iv||!obj.payload)throw Error('Formato de respaldo de Drive no reconocido.');
    try{
      const salt=unb64(obj.salt),iv=unb64(obj.iv),encrypted=unb64(obj.payload);
      const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
      const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
      return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,encrypted)));
    }catch{throw Error('No se pudo descifrar el respaldo. Verifica tu contraseña de cifrado.');}
  }
  // Compare ALL persisted stores, not only accounts and movements. Sorting
  // record keys avoids false conflicts caused by IndexedDB getAll order.
  const SNAPSHOT_STORES=['accounts','movements','budgets','recurrences','reconciliations','audits',
    'payrollProfiles','billingCycles','legacyInstallments','pockets','pocketMoves'];
  function stable(value){
    if(Array.isArray(value)){
      const rows=value.map(stable);
      return rows.every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&typeof x.id==='string')
        ?rows.sort((a,b)=>a.id.localeCompare(b.id)):rows;
    }
    if(value&&typeof value==='object'){
      const ordered={};
      for(const k of Object.keys(value).sort())ordered[k]=stable(value[k]);
      return ordered;
    }
    return value;
  }
  function snapshotSignature(input){
    if(!input||typeof input!=='object')throw Error('Respaldo no reconocido.');
    const payload={kind:input.kind||'',schemaVersion:input.schemaVersion||0,currency:input.currency||'MXN'};
    for(const name of SNAPSHOT_STORES)payload[name]=stable(Array.isArray(input[name])?input[name]:[]);
    payload.settings=stable(input.settings||{});
    return JSON.stringify(payload);
  }
  function snapshotsEqual(a,b){return snapshotSignature(a)===snapshotSignature(b);}
  class DriveSync {
    constructor({getData,restore,onStatus}){
      this.getData=getData;this.restore=restore;this.onStatus=onStatus;this.token='';this.password='';this.fileId=null;this.remoteRevision=null;
      this.ready=false;this.dirty=false;this.running=false;this.timer=null;this.status='Desconectado';this.clientId='';
      try{this.clientId=localStorage.getItem('mcf-drive-client-id')||'';}catch{/* El navegador puede restringir localStorage; Drive sigue funcionando por sesión. */}
      this.notify('Desconectado');window.addEventListener('online',()=>{if(this.ready&&this.dirty)this.schedule();});
    }
    notify(status){this.status=status;this.onStatus?.(status);}
    config(id){if(!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(String(id||'').trim()))throw Error('Necesitas un ID OAuth de aplicación web válido.');this.clientId=String(id).trim();try{localStorage.setItem('mcf-drive-client-id',this.clientId);}catch{/* Mantener ID sólo en memoria. */}}
    async request(url,options={}){
      if(!this.token)throw Error('Inicia sesión en Google Drive desde Ajustes.');
      const response=await fetch(url,{...options,headers:{Authorization:`Bearer ${this.token}`,...options.headers}});
      if(!response.ok){
        if(response.status===401){this.ready=false;this.notify('Sesión caducada · reconectar');}
        let message=`Google Drive respondió ${response.status}`;
        try{const j=await response.json();message=j?.error?.message||message;}catch{}
        throw Error(message);
      }
      if(response.status===204)return null;
      const result=await response.text();return result?JSON.parse(result):null;
    }
    async lookup(){
      const params=new URLSearchParams({spaces:'appDataFolder',q:`name = '${CLOUD_NAME}' and trashed = false`,fields:'nextPageToken,files(id,name,modifiedTime)',pageSize:'100'});
      const data=await this.request(`${BASE}?${params}`);
      return (data.files||[]).sort((a,b)=>String(b.modifiedTime).localeCompare(String(a.modifiedTime)))[0]||null;
    }
    async readCloud(){if(!this.fileId)return null;return this.request(`${BASE}/${encodeURIComponent(this.fileId)}?alt=media`);}
    async connect(clientId,password){
      if(!crypto?.subtle)throw Error('El cifrado necesita HTTPS y un navegador compatible.');
      this.config(clientId);
      if(typeof password!=='string'||password.length<12)throw Error('Usa una contraseña de cifrado de al menos 12 caracteres; consérvala fuera de la aplicación.');
      if(!window.google?.accounts?.oauth2)throw Error('No se pudo cargar Google Identity Services. Verifica internet y vuelve a intentar.');
      this.password=password;
      // This function is called from a user click: requestAccessToken must be initiated by user gesture.
      const token=await new Promise((resolve,reject)=>{
        let finished=false;
        const finish=(error,value)=>{
          if(finished)return;
          finished=true;clearTimeout(timeout);
          if(error)reject(error);else resolve(value);
        };
        // Evita quedar indefinidamente en "Conectando" si el navegador bloquea la ventana.
        const timeout=setTimeout(()=>finish(Error('Google no respondió. Abre la PWA desde una pestaña de Chrome, permite ventanas emergentes y vuelve a intentar.')),90000);
        try{
          const tc=window.google.accounts.oauth2.initTokenClient({
            client_id:this.clientId,scope:SCOPE,
            callback:response=>{
              if(response?.error)finish(Error('Google rechazó la autorización: '+response.error+(response.error_description?' — '+response.error_description:'')));
              else if(response?.access_token)finish(null,response.access_token);
              else finish(Error('Google no devolvió un token de acceso. Revisa el Client ID y el origen autorizado.'));
            },
            error_callback:event=>{
              const type=event?.type||'desconocido';
              const message=type==='popup_failed_to_open'
                ?'El navegador bloqueó la ventana de Google. Abre el sitio en Chrome y permite ventanas emergentes.'
                :type==='popup_closed'
                  ?'La ventana de Google se cerró antes de autorizar. Pulsa Conectar para intentarlo de nuevo.'
                  :'No se pudo completar la autorización de Google ('+type+'). Abre el sitio en Chrome.';
              finish(Error(message));
            }
          });
          tc.requestAccessToken({prompt:'consent'});
        }catch(error){finish(Error(error?.message||'No se pudo abrir la autorización de Google.'));}
      });
      this.token=token;this.notify('Comprobando respaldo en Drive…');
      const found=await this.lookup();this.fileId=found?.id||null;
      if(!found){
        this.ready=true;this.remoteRevision=null;this.dirty=true;this.notify('Conectado · preparando primer respaldo');
        await this.sync();return {status:'created'};
      }
      const cloud=await this.readCloud();
      const restored=await decrypt(cloud,this.password);
      const local=this.getData();
      const same=snapshotsEqual(restored,local);
      this.remoteRevision=cloud.revision;
      if(!same){
        this.ready=false;this.notify('Diferencias detectadas · elige versión');
        return {status:'conflict',remote:restored,updatedAt:cloud.updatedAt};
      }
      this.ready=true;this.dirty=false;this.notify('Sincronizado · Drive protegido');return {status:'current'};
    }
    async acceptCloud(snapshot){await this.restore(snapshot);this.dirty=false;this.ready=true;this.notify('Restaurado y sincronizado');}
    async useLocal(){this.ready=true;this.dirty=true;await this.sync();}
    markChanged(){this.dirty=true;if(this.ready)this.schedule();else this.notify('Cambios locales · pendientes de Drive');}
    schedule(){clearTimeout(this.timer);this.timer=setTimeout(()=>{this.sync().catch(err=>this.notify('Sin sincronizar: '+err.message));},1200);}
    async sync(){
      if(!this.ready||!this.token||!this.password||!this.dirty||this.running)return;
      if(!navigator.onLine){this.notify('Sin conexión · pendiente de Drive');return;}
      this.running=true;this.notify('Sincronizando en Drive…');
      try{
        const remote=await this.readCloud();
        if((remote?.revision||null)!==this.remoteRevision){this.ready=false;this.notify('Conflicto con otra sesión · reconectar');throw Error('El respaldo remoto cambió. No se sobreescribió.');}
        const current=this.getData();this.dirty=false;
        const payload=JSON.stringify(await encrypt(current,this.password));
        if(!this.fileId){
          const boundary='mcf-'+random().replace(/[^a-zA-Z0-9-]/g,'');
          const metadata={name:CLOUD_NAME,mimeType:'application/json',parents:['appDataFolder']};
          const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${payload}\r\n--${boundary}--`;
          const created=await this.request(`${UPLOAD}?uploadType=multipart&fields=id`,{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
          this.fileId=created.id;
        }else{
          await this.request(`${UPLOAD}/${encodeURIComponent(this.fileId)}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:payload});
        }
        this.remoteRevision=JSON.parse(payload).revision;
        this.notify('Sincronizado · Drive protegido');
      }catch(err){this.dirty=true;throw err;}
      finally{this.running=false;if(this.ready&&this.dirty)this.schedule();}
    }
  }
  return {DriveSync,encrypt,decrypt,snapshotSignature,snapshotsEqual};
});
