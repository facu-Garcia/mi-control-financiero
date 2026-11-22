/* Card background customization. Only a re-encoded bitmap is persisted, without EXIF metadata. */
(function(root,factory){
  const a=factory();
  if(typeof module==='object'&&module.exports)module.exports=a;
  else root.FinanceCardImages=a;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const LIMIT=4*1024*1024;
  async function prepare(file,options={}){
    if(!file)throw Error('Selecciona una imagen.');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Usa una imagen PNG, JPG o WebP.');
    if(file.size>LIMIT)throw Error('La imagen no puede superar 4 MB.');
    const createBitmap=options.createImageBitmap||globalThis.createImageBitmap;
    const makeCanvas=options.makeCanvas||(()=>document.createElement('canvas'));
    if(typeof createBitmap!=='function')throw Error('No se pudo procesar la imagen en este navegador.');
    let bitmap;
    try{
      bitmap=await createBitmap(file);
      const scale=Math.min(1,840/bitmap.width,530/bitmap.height);
      const canvas=makeCanvas();
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('No se pudo crear la vista de la imagen.');
      ctx.fillStyle='#172033';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/jpeg',0.75);
      if(!/^data:image\/jpeg;base64,/i.test(data)||data.length>260000)throw Error('La imagen resultante es demasiado grande. Usa otra imagen más sencilla.');
      return data;
    }finally{bitmap?.close?.();}
  }
  return {prepare,LIMIT};
});
