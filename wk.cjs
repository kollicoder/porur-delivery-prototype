const { webkit } = require('playwright');
(async()=>{ const b=await webkit.launch(); const base=process.argv[2]||'http://localhost:4173/';
for (const h of ['#/','#/admin-desktop','#/customer/home']) { const p=await b.newPage({viewport:{width:1440,height:900}}); const e=[];
 p.on('console',m=>m.type()==='error'&&e.push(m.text())); p.on('pageerror',x=>e.push('PAGEERR '+x.message));
 await p.goto(base+h); await p.waitForTimeout(1500);
 console.log(h, JSON.stringify(await p.evaluate(()=>({w:document.body.scrollWidth, dk:!!document.querySelector('.dk'), txt:document.body.innerText.slice(0,80)}))), e);
 if(h==='#/admin-desktop'&&process.argv[3]) await p.screenshot({path:process.argv[3]}); await p.close(); }
await b.close(); })();
