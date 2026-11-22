const assert=require('node:assert/strict');
const Card=require('./card-designs.js');
const CSV=require('./csv.js');
const {prepare}=require('./card-images.js');
(async()=>{
  for(const [bank,key] of [['Inbursa','inbursa'],['Mercado Pago','mercado-pago'],['Nu','nu'],['BBVA','bbva'],['Revolut','revolut'],['BDESA','bdesa']]){
    assert.equal(Card.institution(bank),key);
  }
  assert.equal(Card.styleOf('INVALID'),'auto');
  assert.equal(Card.safePicture('javascript:alert(1)'),'');
  assert.ok(Card.safePicture('data:image/png;base64,aGVsbG8='));
  const account={name:'Prueba <img src=x onerror=alert(1)>',type:'credit',institution:'Nu',cardStyle:'auto'};
  const html=Card.render(account);
  assert.match(html,/finance-card--nu/);
  assert.match(html,/CRÉDITO/);
  assert.match(html,/fc-chip/);
  assert.match(html,/fc-contactless/);
  assert.match(html,/fc-network--mc/);
  assert.match(Card.render({institution:'Mercado Pago',name:'Mi tarjeta',type:'credit'}),/fc-network--visa/);
  assert.match(Card.render({institution:'Mercado Pago',name:'Mi tarjeta',type:'debit'}),/fc-network--mc/);
  assert.match(Card.render({institution:'BBVA',name:'Mi cuenta',type:'debit'}),/finance-card--bbva/);
  const fs=require('node:fs'), path=require('node:path');
  for(const name of ['inbursa','mercado-pago','nu','bbva','revolut','bdesa']){
    const file=path.join(__dirname,'cards','banks',name+'.css');
    assert.ok(fs.existsSync(file),'Falta archivo de diseño '+name);
    assert.match(fs.readFileSync(file,'utf8'),new RegExp('finance-card--'+name));
  }
  const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  assert.ok(page.includes('cards/banks/mercado-pago.css'));
  assert.ok(page.includes('cards/banks/revolut.css'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img'));
  const raw=CSV.format([{nombre:'Inbursa Nómina',institucion:'Inbursa',tipo:'debito',diseno:'auto'}],
    ['nombre','institucion','tipo','diseno']);
  const imported=CSV.accounts(raw,[],'2026-11-20');
  assert.equal(imported.items.length,1);
  assert.equal(imported.items[0].cardStyle,'auto');
  assert.equal(imported.items[0].cardImage,'');
  assert.throws(()=>CSV.accounts('nombre,tipo,diseno\nTarjeta,debito,unsafe',[],'2026-11-20'),/diseño inválido/);
  await assert.rejects(()=>prepare({name:'mal.svg',type:'image/svg+xml',size:10}),/PNG, JPG o WebP/);
  await assert.rejects(()=>prepare({name:'foto.jpg',type:'image/jpeg',size:5000000}),/4 MB/);
  console.log('✓ Diseños y CSV de tarjetas seguros y compatibles');
})().catch(error=>{console.error(error);process.exitCode=1});
