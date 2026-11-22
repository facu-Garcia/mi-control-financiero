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
