import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, ComposedChart, Line, CartesianGrid } from 'recharts';
import { STORES, PRODUCTS, SETTINGS } from './data.js';
import { STEPS, DONE } from './store.js';
import { api, backendInfo } from './live.js';
import LiveMap, { HUB } from './map.jsx';
import './desktop.css';
import { BRAND } from './brand.js';
import { FOOD_STORES } from './models.js';
import { GroupBuyPage, LunchPage, ServicesPage, DealsPage } from './v6-admin.jsx';
import './v6.css';

const rs = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const NAV = [['overview','📊','Overview'],['orders','📦','Live Orders'],['riders','🛵','Riders'],['stores','🏪','Stores / Vendors'],['customers','👥','Customers'],['errands','📝','Errands'],['groupbuy','🧺','Group buy'],['lunch','🍱','Office lunch'],['services','🛠️','Home services'],['deals','🔥','Flash deals'],['payments','💳','Payments'],['reports','📈','Reports'],['users','🔑','Users & Access'],['settings','⚙️','Settings']];
const HOURS = [3,1,0,1,2,5,9,12,8,6,7,9,6,4,5,8,11,14,12,9,6,4].map((v,i)=>({ h:`${(i+2)%24}:00`, orders:v }));
const COLORS = ['#1F7A3A','#C98A00','#1D4ED8','#B42318'];
const SHIFTS = ['6AM–2PM','2PM–10PM','10PM–6AM'];
const RATING = [4.8,4.6,4.7,4.5,4.4,4.9,4.6,4.3,4.7,4.5];
const BASE = 12000, PER_TASK = 25;
const catOf = name => (PRODUCTS.find(p=>p.name===name)||{}).cat;
const Badge = ({s}) => <span className={'bdg s'+s}>{STEPS[s]}</span>;
const Sample = () => <span className="sample">SAMPLE DATA</span>;

export default function AdminDesktop(ctx) {
  const page = ctx.route.screen || 'overview';
  const [q, setQ] = useState(''); const [range, setRange] = useState('Today'); const [notif, setNotif] = useState(false);
  // live from Firestore: settings/app, products (stock), orders.rxStatus
  const settings = SETTINGS; const setSettings = fn => api.updateSettings(typeof fn==='function' ? fn(SETTINGS) : fn);
  const stock = Object.fromEntries(PRODUCTS.map(p=>[p.id, p.inStock!==false])); const setStock = fn => { const n = fn(stock); for (const k in n) if (n[k]!==stock[k]) api.updateProduct(k, { inStock: n[k] }); };
  const rx = Object.fromEntries(ctx.orders.filter(o=>o.rxStatus && o.rxStatus!=='pending').map(o=>[o.id,o.rxStatus]));
  const setRx = fn => { const n = fn(rx); for (const k in n) if (n[k]!==rx[k]) api.updateOrder(k, { rxStatus: n[k], ...(n[k]==='rejected'?{status:'rejected'}:{}) }); };
  const P = { overview:Overview, orders:Orders, riders:Riders, stores:Stores, customers:Customers, errands:Errands, payments:Payments, reports:Reports, users:Users, settings:Settings, groupbuy:GroupBuyPage, lunch:LunchPage, services:ServicesPage, deals:DealsPage }[page] || Overview;
  const x = { ...ctx, q, settings, setSettings, stock, setStock, rx, setRx };
  const pendingRx = ctx.orders.filter(o => o.items.some(([n])=>PRODUCTS.find(p=>p.name===n)?.rx) && o.rxStatus==='pending').length;
  return (<div className="dk">
    <aside className="side">
      <div className="brand"><span className="blogo">🛵</span><b>{BRAND.name}</b><small>Admin console · Porur hub</small></div>
      {NAV.map(([k,i,n]) => <a key={k} href={`#/admin-desktop/${k}`} className={page===k?'on':''}>{i} {n}{k==='orders'&&pendingRx>0&&<em>{pendingRx}</em>}</a>)}
      <div className="sidefoot"><a href="#/customer/home">📱 Customer app</a><a href="#/rider/home">🛵 Rider app</a><a href="#/partner/home">🤝 Partner (web)</a><a href="#/admin/home">📱 Mobile admin</a></div>
    </aside>
    <main>
      <div className="top">
        <input placeholder="🔍 Search orders, customers, riders…" value={q} onChange={e=>setQ(e.target.value)}/>
        <select value={range} onChange={e=>setRange(e.target.value)}>{['Today','Yesterday','Last 7 days','This month'].map(r=><option key={r}>{r}</option>)}</select>
        <span className="live" title={backendInfo.projectId}>● {backendInfo.emulatorHost?'EMULATOR':'LIVE'} SYNC · 24x7 · Night mode {settings.nightFrom}–{settings.nightTo}</span>
        <button className="bell" onClick={()=>setNotif(!notif)}>🔔<em>{pendingRx+2}</em></button>
        {notif && <div className="notifs"><b>Notifications</b><p>💊 {pendingRx} prescription(s) awaiting approval</p><p>⚠️ Rider Arun offline since 2 hrs</p><p>📦 Supermarket low stock: Sunflower Oil</p></div>}
        <div className="me">VC</div>
      </div>
      <div className="content"><P {...x}/></div>
    </main>
  </div>);
}

function Kpi({label,value,sub,tone}) { return <div className={'kpi '+(tone||'')}><small>{label}</small><b>{value}</b>{sub&&<span>{sub}</span>}</div>; }

function Overview({ orders, riders, rx, go }) {
  const gmv = orders.reduce((a,o)=>a+o.total,0) + 14250;
  const n = orders.length + 38;
  const active = riders.filter(r=>r.status==='online'||r.status==='delivering').length;
  const pending = orders.filter(o => o.items.some(([nm])=>PRODUCTS.find(p=>p.name===nm)?.rx) && o.rxStatus==='pending').length;
  const mix = [['Groceries',22],['Fruits & Veg',14],['Medicines',9],['Errands',6]].map(([name,v])=>({name,value:v}));
  orders.forEach(o => { const c = o.type==='errand'?3 : {grocery:0,fv:1,med:2}[catOf(o.items[0]?.[0])] ?? 0; mix[c].value++; });
  return (<>
    <h1>Overview <Sample/></h1>
    <div className="kpis7">
      <Kpi label="Orders today" value={n} sub="▲ 12% vs yesterday"/>
      <Kpi label="GMV" value={rs(gmv)} sub="Gross order value"/>
      <Kpi label="Avg order value" value={rs(gmv/n)} sub="Target ₹550"/>
      <Kpi label="Active riders" value={`${active}/${riders.length}`} sub={`${riders.filter(r=>r.status==='delivering').length} on delivery`}/>
      <Kpi label="Avg delivery time" value="27 min" sub="Goal < 30 min"/>
      <Kpi label="Cancellations" value="2" sub="4.3% of orders" tone="warn"/>
      <Kpi label="Pending prescriptions" value={pending} sub="Needs pharmacist" tone={pending?'alert':''}/>
    </div>
    <div className="grid2">
      <div className="panel"><h3>Orders by hour</h3><ResponsiveContainer width="100%" height={240}><BarChart data={HOURS}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="h" fontSize={11}/><YAxis fontSize={11}/><Tooltip/><Bar dataKey="orders" fill="#15140F" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
      <div className="panel"><h3>Category mix</h3><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={mix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>{mix.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}</Pie><Legend/><Tooltip/></PieChart></ResponsiveContainer></div>
    </div>
    <div className="grid2">
      <div className="panel"><h3>Live map · Porur zone (3–5 km) <small className="muted">OpenStreetMap · rider GPS</small></h3><ZoneMap riders={riders} orders={orders}/></div>
      <div className="panel"><h3>Recent orders</h3><OrderTable orders={orders.slice(0,7)} riders={riders}/></div>
    </div>
    <BreakevenCard/>
  </>);
}
function ZoneMap({ riders, orders }) {
  return <LiveMap testId="admin-map" height={300} rings fit={false} zoom={13} markers={[
    { lat: HUB.lat, lng: HUB.lng, emoji: '🏠', label: 'Hub' },
    ...STORES.map(s => ({ lat: s.lat, lng: s.lng, emoji: '🏪', label: s.name.split(' ')[0] })),
    ...riders.filter(r => r.status !== 'offline' && r.lat).map(r => ({ lat: r.lat, lng: r.lng, emoji: '🛵', label: r.name })),
    ...orders.filter(o => o.status >= 0 && o.status < DONE && o.dropLat).map(o => ({ lat: o.dropLat, lng: o.dropLng, emoji: '📍', label: o.id })),
  ]} />;
}
function OrderTable({ orders, riders, onOpen }) {
  return <table className="dt"><thead><tr><th>ID</th><th>Time</th><th>Customer</th><th>Type</th><th>Total</th><th>Pay</th><th>Rider</th><th>Status</th></tr></thead><tbody>
    {orders.map(o=><tr key={o.id} onClick={()=>onOpen&&onOpen(o.id)} className={onOpen?'click':''}><td><b>{o.id}</b></td><td>{o.time}</td><td>{o.customer}</td><td>{o.type==='errand'?'Errand':'Order'}</td><td>{rs(o.total)}</td><td>{o.pay}</td><td>{riders.find(r=>r.id===o.rider)?.name}</td><td><Badge s={o.status}/></td></tr>)}
  </tbody></table>;
}

function Orders({ orders, setOrders, riders, q, rx, setRx }) {
  const [view, setView] = useState('kanban'); const [f, setF] = useState('all'); const [open, setOpen] = useState(null);
  const list = orders.filter(o => (f==='all' || (f==='errand'?o.type==='errand':f==='cod'?o.pay==='COD':f==='active'?o.status<DONE:true)) && (!q || JSON.stringify(o).toLowerCase().includes(q.toLowerCase())));
  const isRx = o => o.items.some(([n])=>PRODUCTS.find(p=>p.name===n)?.rx);
  const queue = orders.filter(o=>o.rxStatus==='pending');
  const upd = (id, ch) => setOrders(os=>os.map(o=>o.id===id?{...o,...ch}:o));
  const o = orders.find(x=>x.id===open);
  return (<>
    <h1>Live Orders</h1>
    <div className="toolbar">
      {[['all','All'],['active','Active'],['errand','Errands'],['cod','Cash on delivery']].map(([k,n])=><button key={k} className={f===k?'on':''} onClick={()=>setF(k)}>{n}</button>)}
      <span style={{flex:1}}/><button className={view==='kanban'?'on':''} onClick={()=>setView('kanban')}>Kanban</button><button className={view==='table'?'on':''} onClick={()=>setView('table')}>Table</button>
    </div>
    <div className="panel rxq"><h3>💊 Prescription approval queue ({queue.length})</h3>
      {!queue.length && <p className="muted">No prescriptions waiting. (Place a medicine order with an Rx item in the Customer app to see one here.)</p>}
      {queue.map(o=><div key={o.id} className="rxrow"><b>{o.id}</b><span>{o.customer}</span><span>{o.items.filter(([n])=>PRODUCTS.find(p=>p.name===n)?.rx).map(([n])=>n).join(', ')}</span><span>{o.prescriptionUri ? <a href={o.prescriptionUri} target="_blank" rel="noreferrer"><img src={o.prescriptionUri} alt="Rx" style={{height:40,borderRadius:4,verticalAlign:'middle'}}/></a> : '📄 no photo'}</span>
        <button className="ok" onClick={()=>setRx(r=>({...r,[o.id]:'approved'}))}>Approve</button><button className="no" onClick={()=>{setRx(r=>({...r,[o.id]:'rejected'})); }}>Reject</button></div>)}
    </div>
    {view==='kanban' ? <div className="kanban">{STEPS.map((s,i)=><div key={s} className="kcol"><h4>{s} <em>{list.filter(o=>o.status===i).length}</em></h4>
      {list.filter(o=>o.status===i).map(o=><div key={o.id} className="kcard" onClick={()=>setOpen(o.id)}><div className="row"><b>{o.id}</b><small>{o.time}</small></div><small>{o.customer}</small><div className="row"><small>{rs(o.total)} · {o.pay}</small><small>🛵 {riders.find(r=>r.id===o.rider)?.name}</small></div>{isRx(o)&&<span className="rxtag">Rx {rx[o.id]||'pending'}</span>}</div>)}
    </div>)}</div> : <div className="panel"><OrderTable orders={list} riders={riders} onOpen={setOpen}/></div>}
    {o && <div className="drawer-bg" onClick={()=>setOpen(null)}><div className="drawer" onClick={e=>e.stopPropagation()}>
      <div className="row"><h2>{o.id}</h2><button onClick={()=>setOpen(null)}>✕</button></div>
      <Badge s={o.status}/><p><b>{o.customer}</b><br/>{o.address}</p>
      <table className="dt"><tbody>{o.items.map(([n,qq],i)=><tr key={i}><td>{n}</td><td>×{qq}</td></tr>)}<tr><td><b>Total ({o.pay})</b></td><td><b>{rs(o.total)}</b></td></tr></tbody></table>
      <label>Assign / reassign rider</label><select value={o.rider||''} onChange={e=>upd(o.id,{rider:e.target.value})}>{!o.rider && <option value="">⚠️ Unassigned — pick a rider</option>}{riders.map(r=><option key={r.id} value={r.id}>{r.name} ({r.status})</option>)}</select>
      <label>Status</label><select value={o.status} onChange={e=>upd(o.id,{status:+e.target.value})}>{STEPS.map((s,i)=><option key={s} value={i}>{s}</option>)}</select>
      <AdminOtp id={o.id} time={o.time} o={o}/>
      <button className="danger" onClick={()=>{setOrders(os=>os.filter(x=>x.id!==o.id)); setOpen(null);}}>Cancel order</button>
    </div></div>}
  </>);
}

function Riders({ riders, setRiders, orders }) {
  const cash = r => orders.filter(o=>o.rider===r.id && o.pay==='COD' && o.status===DONE).reduce((a,o)=>a+o.total,0) + [820,0,450,1210,0,300,640,0,150,0][+r.id.slice(1)-1];
  const cyc = { online:'break', break:'offline', offline:'online', delivering:'online' };
  return (<>
    <h1>Riders <Sample/></h1>
    <div className="kpis7 k4"><Kpi label="On duty" value={riders.filter(r=>r.status!=='offline').length}/><Kpi label="Tasks today" value={riders.reduce((a,r)=>a+r.today,0)}/><Kpi label="Pay model" value={`₹${BASE/1000}k + ₹${PER_TASK}/task`} sub="Fixed monthly + per task"/><Kpi label="Cash in hand (total)" value={rs(riders.reduce((a,r)=>a+cash(r),0))} tone="warn"/></div>
    <div className="panel"><table className="dt"><thead><tr><th>Rider</th><th>Phone</th><th>Status</th><th>Shift</th><th>Tasks today</th><th>Earnings this month</th><th>Rating</th><th>Cash in hand</th><th></th></tr></thead><tbody>
      {riders.map((r,i)=>{ const month = r.today*22; return <tr key={r.id}><td><b>{r.name}</b></td><td>{r.phone}</td><td><span className={'dot '+r.status}/>{r.status}</td><td>{SHIFTS[i%3]}</td><td>{r.today}</td><td>{rs(BASE+month*PER_TASK)} <small className="muted">({rs(BASE)} + {month}×₹{PER_TASK})</small></td><td>⭐ {RATING[i]}</td><td>{rs(cash(r))}</td><td><button className="sm" onClick={()=>setRiders(rr=>rr.map(x=>x.id===r.id?{...x,status:cyc[x.status]}:x))}>Change status</button></td></tr>; })}
    </tbody></table></div>
  </>);
}

function Stores({ stock, setStock }) {
  const meta = { s1:{type:'Fruits & Veg vendor',comm:12,pay:18400,contact:'Ravi · 98410 22110'}, s2:{type:'Supermarket / bulk grocery',comm:10,pay:42600,contact:'Murugan · 98400 55120'}, s3:{type:'Licensed pharmacy (Rx)',comm:8,pay:23900,contact:'Ph. Divya · 94440 11870'} };
  return (<>
    <h1>Stores / Vendors <Sample/></h1>
    <div className="grid3">{STORES.map(s=><div key={s.id} className="panel">
      <h3>{s.name}</h3><p className="muted">{meta[s.id].type} · {s.open}<br/>{meta[s.id].contact}</p>
      <div className="row"><Kpi label="Commission" value={meta[s.id].comm+'%'}/><Kpi label="Payout due" value={rs(meta[s.id].pay)} sub="Next: Friday"/></div>
      <h4>Item stock</h4>
      {PRODUCTS.filter(p=>p.store===s.id).map(p=>{ const on = stock[p.id]!==false; return <div key={p.id} className="stock"><span>{p.emoji} {p.name}</span><span>{rs(p.price)}</span><button className={'tog '+(on?'on':'')} onClick={()=>setStock(x=>({...x,[p.id]:!on}))}>{on?'In stock':'Out'}</button></div>; })}
    </div>)}</div>
  </>);
}

function Customers({ orders, q }) {
  const base = [['Lakshmi R','98401 23456','Ramaniyam Apts, Porur',14,6230],['Ganesh K','98402 34567','Kundrathur Main Rd',6,1890],['Priya S','98403 45678','Iyyappanthangal',9,2410],['Mohan V','98404 56789','Gerugambakkam',3,980],['Fathima N','98405 67890','Valasaravakkam',21,11240],['Senthil Kumar','98406 78901','Ramapuram',2,420]];
  const you = orders.filter(o=>/^You/.test(o.customer));
  const rows = [...(you.length?[['You (demo)','—','Sri Sai Apartments, Porur',you.length,you.reduce((a,o)=>a+o.total,0)]]:[]), ...base].filter(r=>!q||r.join(' ').toLowerCase().includes(q.toLowerCase()));
  return (<><h1>Customers <Sample/></h1>
    <div className="kpis7 k4"><Kpi label="Total customers" value="1,284"/><Kpi label="New this week" value="96"/><Kpi label="Repeat rate" value="41%"/><Kpi label="Subscribers (free delivery)" value="73"/></div>
    <div className="panel"><table className="dt"><thead><tr><th>Name</th><th>Phone</th><th>Area</th><th>Orders</th><th>Lifetime spend</th><th>Segment</th></tr></thead><tbody>
      {rows.map(r=><tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{rs(r[4])}</td><td>{r[3]>10?'⭐ Loyal':r[3]>4?'Regular':'New'}</td></tr>)}
    </tbody></table></div></>);
}

function Errands({ orders, riders, settings }) {
  const list = orders.filter(o=>o.type==='errand');
  return (<><h1>Errands (Book a Rider)</h1>
    <div className="kpis7 k4"><Kpi label="Errands today" value={list.length+6}/><Kpi label="Per-trip price" value={`₹${settings.errandBase}`} sub="First 3 km"/><Kpi label="Hourly hire" value={`₹${settings.errandHour}/hr`}/><Kpi label="Cost per rider-hour" value="~₹145" sub="Estimate" tone="warn"/></div>
    <div className="panel">{list.length ? <OrderTable orders={list} riders={riders}/> : <p className="muted">No errands yet — book one from the Customer app.</p>}
      {list.map(o=><p key={o.id} className="muted small"><b>{o.id}:</b> {o.items[0][0]} → {o.address}</p>)}</div></>);
}

function Payments({ orders }) {
  const cod = orders.filter(o=>o.pay==='COD'); const delivered = cod.filter(o=>o.status===DONE);
  const sett = [['Porur Fresh F&V',18400,'12%','Fri 16 Oct','Due'],['Sri Murugan Supermarket',42600,'10%','Fri 16 Oct','Due'],['Pharmacy, Porur',23900,'8%','Fri 9 Oct','Paid'],['Sri Murugan Supermarket',39100,'10%','Fri 9 Oct','Paid']];
  return (<><h1>Payments & Settlements <Sample/></h1>
    <div className="kpis7 k4"><Kpi label="UPI collected today" value={rs(orders.filter(o=>o.pay==='UPI').reduce((a,o)=>a+o.total,0)+11200)}/><Kpi label="COD to collect" value={rs(cod.reduce((a,o)=>a+o.total,0)+3050)} tone="warn"/><Kpi label="Vendor payouts due" value={rs(61000)}/><Kpi label="Gateway fees (2%)" value={rs(224)}/></div>
    <div className="grid2">
      <div className="panel"><h3>Vendor settlements (weekly)</h3><table className="dt"><thead><tr><th>Vendor</th><th>Amount</th><th>Commission</th><th>Date</th><th>Status</th></tr></thead><tbody>{sett.map((s,i)=><tr key={i}><td>{s[0]}</td><td>{rs(s[1])}</td><td>{s[2]}</td><td>{s[3]}</td><td><span className={'bdg '+(s[4]==='Paid'?'s4':'s0')}>{s[4]}</span></td></tr>)}</tbody></table></div>
      <div className="panel"><h3>COD reconciliation</h3><table className="dt"><thead><tr><th>Order</th><th>Amount</th><th>Status</th><th>Deposited</th></tr></thead><tbody>
        {cod.map(o=><tr key={o.id}><td>{o.id}</td><td>{rs(o.total)}</td><td><Badge s={o.status}/></td><td>{o.status===DONE?'With rider — deposit at hub':'—'}</td></tr>)}
        <tr><td>PD0998</td><td>₹1,210</td><td><span className="bdg s4">Delivered</span></td><td>✅ Deposited 8:40 AM</td></tr></tbody></table>
        <p className="muted small">{delivered.length} delivered COD order(s) pending hub deposit today.</p></div>
    </div></>);
}

/** v0.5: breakeven gets its own card instead of a thin line dwarfed by the bars. Sample model numbers. */
function BreakevenCard() {
  const today = 110, need = 443, pct = Math.round(today / need * 100);
  return (<div className="panel bcard" data-testid="breakeven-card"><div className="row"><h3>Breakeven <Sample/></h3><span className="muted">Model: ₹3.8 L/month fixed ≈ ₹12.7k/day</span></div>
    <div className="bgrid">
      <div><small>Orders/day needed</small><b>~{need}</b><span>at ₹29 contribution/order</span></div>
      <div><small>Orders/day today</small><b>~{today}</b><span>10 riders' capacity ≈ 110–200</span></div>
      <div><small>With ₹60/order</small><b>~215</b><span>₹199 min order + fees</span></div>
      <div><small>Payback</small><b>~Month 52</b><span>optimistic: month 14</span></div>
    </div>
    <div className="bbar" aria-label={`${pct}% of breakeven volume`}><i style={{width:pct+'%'}}/><em style={{left:'100%'}}>Breakeven</em></div>
    <p className="small" style={{margin:'6px 0 0'}}><b>{pct}%</b> of the daily volume needed to cover fixed costs.</p>
  </div>);
}
function Reports() {
  const [mode, setMode] = useState('daily');
  // model-like: ~₹3.8L/month fixed cost ≈ ₹12.7k/day; ~₹29 contribution/order today rising toward ₹60
  const daily = Array.from({length:14},(_,i)=>{ const orders = 60 + i*9; const revenue = orders*(32+i*1.6); return { d:`Day ${i+1}`, revenue:Math.round(revenue), cost:12700+orders*6, breakeven:12700 }; });
  const weekly = Array.from({length:12},(_,i)=>{ const orders=(70+i*25)*7; const revenue=orders*(30+i*2.6); return { d:`Wk ${i+1}`, revenue:Math.round(revenue), cost:88900+orders*6, breakeven:88900 }; });
  const data = mode==='daily'?daily:weekly;
  return (<><h1>Reports <Sample/></h1>
    <div className="toolbar"><button className={mode==='daily'?'on':''} onClick={()=>setMode('daily')}>Daily (14 days)</button><button className={mode==='weekly'?'on':''} onClick={()=>setMode('weekly')}>Weekly (12 weeks)</button></div>
    <BreakevenCard/>
    <div className="panel"><h3>Revenue vs cost</h3>
      <ResponsiveContainer width="100%" height={340}><ComposedChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="d" fontSize={11}/><YAxis fontSize={11} tickFormatter={v=>'₹'+(v/1000).toFixed(0)+'k'}/><Tooltip formatter={v=>rs(v)}/><Legend/>
        <Bar dataKey="revenue" name="Our revenue (commission + fees)" fill="#1F7A3A" radius={[4,4,0,0]}/><Bar dataKey="cost" name="Total cost" fill="#E8A598" radius={[4,4,0,0]}/></ComposedChart></ResponsiveContainer>
      <p className="muted small">Sample numbers shaped like the business model: ~₹3.8 lakh/month fixed costs (≈₹12.7k/day), revenue per order rising from ~₹30 toward ~₹60 as basket size and fees grow. Not real data.</p></div>
  </>);
}

function Settings({ settings, setSettings }) {
  const set = (k,v) => setSettings(s=>({...s,[k]:v}));
  const F = ({k,label,type='number',pre}) => <label className="fld"><span>{label}</span><div>{pre}<input type={type} value={settings[k]} onChange={e=>set(k,type==='number'?+e.target.value:e.target.value)}/></div></label>;
  return (<><h1>Settings</h1>
    <div className="grid2">
      <div className="panel"><h3>Pricing</h3>{F({k:"fee", label:"Delivery fee", pre:"₹",})}{F({k:"min", label:"Minimum order", pre:"₹",})}{F({k:"free", label:"Free delivery above", pre:"₹",})}{F({k:"errandBase", label:"Errand – first 3 km", pre:"₹",})}{F({k:"errandHour", label:"Rider hire per hour", pre:"₹",})}</div>
      <div className="panel"><h3>Zones & hours</h3>{F({k:"radius", label:"Delivery radius (km)",})}
        <h4>Active areas</h4>{Object.entries(settings.zones).map(([z,on])=><div key={z} className="stock"><span>{z}</span><button className={'tog '+(on?'on':'')} onClick={()=>set('zones',{...settings.zones,[z]:!on})}>{on?'Live':'Off'}</button></div>)}
        <h4>Night hours</h4>{F({k:"nightFrom", label:"Night from", type:"time",})}{F({k:"nightTo", label:"Night to", type:"time",})}
        <div className="stock"><span>Night: medicines only</span><button className={'tog '+(settings.nightMedOnly?'on':'')} onClick={()=>set('nightMedOnly',!settings.nightMedOnly)}>{settings.nightMedOnly?'On':'Off'}</button></div></div>
    </div>
    <p className="muted small">Saved to the backend (settings/app) and applied live in the customer apps (web + native).</p></>);
}

function Users({ users, riders, me }) {
  const [filter, setFilter] = useState('');
  const pending = users.filter(u => u.request);
  const roleOf = u => u.role || 'customer';
  const setRole = (u, role) => { if (role === 'vendor') api.setUserRole(u.uid, 'vendor', { storeId: u.storeId || u.request?.storeId || 's1' });
    else if (role === 'rider') api.setUserRole(u.uid, 'rider', { riderId: u.riderId || u.request?.riderId || 'r1' });
    else api.setUserRole(u.uid, role === 'customer' ? null : role); };
  return (<>
    <h1>Users & Access</h1>
    <p className="muted">Everyone signs in with phone OTP. New users are customers; vendors, riders and admins are approved here. Users cannot change their own role (enforced by Firestore rules).</p>
    <div className="panel rxq"><h3>🔔 Access requests ({pending.length})</h3>
      {!pending.length && <p className="muted">No pending requests.</p>}
      {pending.map(u => <div key={u.uid} className="rxrow" data-testid={'req-' + u.phone}><b>{u.name || '—'}</b><span>{u.phone}</span>
        <span>wants <b>{u.request.role}</b> {u.request.storeId ? '· ' + ([...STORES, ...FOOD_STORES].find(s => s.id === u.request.storeId)?.name || u.request.storeId) : ''}{u.request.riderId ? '· ' + (riders.find(r => r.id === u.request.riderId)?.name || u.request.riderId) : ''}</span>
        <span className="muted small">{new Date(u.request.at).toLocaleString('en-IN')}</span>
        {['cook', 'pro'].includes(u.request.role) ? <a className="ok" style={{ padding: '6px 10px', borderRadius: 8 }} href={'#/admin-desktop/' + (u.request.role === 'cook' ? 'lunch' : 'services')}>Review FSSAI / KYC →</a>
          : <button className="ok" data-testid={'approve-' + u.phone} onClick={() => api.setUserRole(u.uid, u.request.role, { storeId: u.request.storeId, riderId: u.request.riderId })}>Approve</button>}
        <button className="no" onClick={() => api.rejectRequest(u.uid)}>Reject</button></div>)}
    </div>
    <div className="panel"><div className="row"><h3>All users ({users.length})</h3><input placeholder="Filter by phone/name" value={filter} onChange={e => setFilter(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 6 }} /></div>
      <table className="dt"><thead><tr><th>Phone</th><th>Name</th><th>Role</th><th>Store / Rider</th><th>Joined</th></tr></thead><tbody>
        {users.filter(u => !filter || (u.phone + ' ' + (u.name || '')).includes(filter)).map(u => <tr key={u.uid}><td>{u.phone}{u.uid === me?.uid ? ' (you)' : ''}</td><td>{u.name || '—'}</td>
          <td><select value={roleOf(u)} onChange={e => setRole(u, e.target.value)}>{['customer', 'vendor', 'rider', 'admin', 'leader', 'cook', 'pro'].map(r => <option key={r} disabled={(r === 'cook' && !u.cookId) || (r === 'pro' && !u.proId) || r === 'leader'}>{r}</option>)}</select></td>
          <td>{u.role === 'vendor' ? <select value={u.storeId} onChange={e => api.setUserRole(u.uid, 'vendor', { storeId: e.target.value })}>{[...STORES, ...FOOD_STORES].map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            : u.role === 'leader' ? `community ${u.communityId}` : u.role === 'cook' ? `cook ${u.cookId}` : u.role === 'pro' ? `pro ${u.proId}`
            : u.role === 'rider' ? <select value={u.riderId} onChange={e => api.setUserRole(u.uid, 'rider', { riderId: e.target.value })}>{riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select> : '—'}</td>
          <td className="muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : ''}</td></tr>)}
      </tbody></table>
      <p className="muted small">Bootstrap admin: the owner's phone number is written into the deployed security rules, so it is always an admin even if this table is edited.</p></div>
  </>);
}

/** Admin may read the private delivery OTP (orderSecrets) — e.g. to help a customer whose phone died. */
function AdminOtp({ id, time, o }) {
  const [otp, setOtp] = useState(null); useEffect(() => api.watchSecret(id, setOtp), [id]);
  const [rx, setRx] = useState(null); useEffect(() => o.rxStatus ? api.watchPrescription(id, setRx) : undefined, [id, o.rxStatus]);
  return <><p className="muted">Delivery OTP (admin only): {otp ?? o.otp ?? '—'} · placed {time} · {o.paymentStatus === 'collected' ? `paid (${o.collectedVia})` : 'payment due on delivery'}</p>
    {rx && <img src={rx} alt="prescription" style={{ maxWidth: 160, borderRadius: 8 }}/>}</>;
}
