const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1440,height:900} });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const U='http://localhost:4173/#/';
  await p.goto(U+'customer/home'); await p.evaluate(()=>{ localStorage.clear(); });
  await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const o=JSON.parse(localStorage.getItem('pd_orders')); o.unshift({id:'PD1050',customer:'Fathima N',address:'Valasaravakkam',items:[['Amoxicillin 500mg (Rx)',1],['Paracetamol 500mg (10 tabs)',1]],total:140,pay:'UPI',status:0,rider:'r3',otp:'3321',type:'order',time:'09:52',rx:'rx-fathima.jpg'}); localStorage.setItem('pd_orders',JSON.stringify(o)); });
  for (const [pg,n] of [['overview','overview'],['orders','live-orders'],['riders','riders'],['stores','stores'],['reports','reports'],['payments','payments']]) {
    await p.goto(U+'admin-desktop/'+pg); await p.reload(); await p.waitForTimeout(1200);
    await p.screenshot({path:`screenshots/desktop-${n}.png`});
  }
  await p.goto(U+'admin-desktop/orders'); await p.waitForTimeout(500); await p.click('.kcard'); await p.waitForTimeout(400);
  await p.screenshot({path:'screenshots/desktop-order-drawer.png'});
  await p.goto(U+'admin-desktop/settings'); await p.waitForTimeout(400); const i=p.locator('.fld input').first(); await i.click(); await p.keyboard.type('9'); await p.keyboard.type('9');
  console.log('fee', await i.inputValue(), 'errors', errs); await b.close();
})();
