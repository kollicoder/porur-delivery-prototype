import React, { useState, useEffect, useRef } from 'react';
import { STORES, PRODUCTS, SETTINGS, deliveryFee, parseOrder } from './data.js';
import { useLive, api, backendInfo, toProto } from './live.js';
import { useLS, STEPS, DONE } from './store.js';
import AdminDesktop from './AdminDesktop.jsx';

const rs = n => '₹' + Math.round(n).toLocaleString('en-IN');
const CATS = [
  { id:'grocery', label:'Groceries', ta:'மளிகை', emoji:'🛒', color:'#fff3d6' },
  { id:'fv', label:'Fruits & Veg', ta:'பழம் & காய்கறி', emoji:'🥕', color:'#e3f7e3' },
  { id:'med', label:'Medicines', ta:'மருந்துகள்', emoji:'💊', color:'#e3eeff' },
  { id:'rider', label:'Book a Rider', ta:'ரைடர் புக்', emoji:'🛵', color:'#ffe4e4' },
];
const ROLES = ['customer','rider','admin','admin-desktop'];
const readHash = () => {
  const [, role, screen, arg] = location.hash.replace(/^#/, '').split('/');
  if (!ROLES.includes(role)) {
    // Unknown or empty route: wide screens get the desktop admin, phones get the customer app
    const wide = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
    return wide ? { role:'admin-desktop', screen:'overview', arg:'' } : { role:'customer', screen:'home', arg:'' };
  }
  return { role, screen: screen || (role==='admin-desktop' ? 'overview' : 'home'), arg: arg || '' };
};

export default function App() {
  const [route, setRoute] = useState(readHash());
  useEffect(() => { const f = () => setRoute(readHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  const go = (role, screen='home', arg='') => { location.hash = `#/${role}/${screen}${arg ? '/' + arg : ''}`; scrollTo(0,0); };
  const [cart, setCart] = useLS('pd_cart', {});
  const role = { customer:'customer', rider:'rider' }[route.role] || 'admin';
  const live = useLive(role);
  const ctx = { route, go, cart, setCart, ...live };
  const banner = live.error ? <div className="syncbar err">⚠️ Backend: {live.error}</div> : null;
  if (route.role==='admin-desktop') return <>{banner}<AdminDesktop {...ctx} /></>;
  return (
    <div className="phone">
      <div className="switcher">
        {['customer','rider','admin'].map(r => <button key={r} className={route.role===r?'on':''} onClick={()=>go(r)}>{r[0].toUpperCase()+r.slice(1)}</button>)}
        <button onClick={()=>go('admin-desktop','overview')}>Admin (Desktop)</button>
        <button className="reset" title={'Live: '+backendInfo.projectId+(backendInfo.emulatorHost?' (emulator)':'')} onClick={()=>{localStorage.removeItem('pd_cart'); location.reload();}}>↺</button>
      </div>
      {banner}
      {route.role==='customer' && <Customer {...ctx} />}
      {route.role==='rider' && <Rider {...ctx} />}
      {route.role==='admin' && <Admin {...ctx} />}
    </div>
  );
}

/* ---------------- CUSTOMER ---------------- */
function Customer(ctx) {
  const { route, go, cart } = ctx;
  const count = Object.values(cart).reduce((a,b)=>a+b,0);
  const S = { home:Home, list:ProductList, search:Search, voice:Voice, cart:Cart, checkout:Checkout, track:Track, rider:BookRider }[route.screen] || Home;
  return (<>
    <S {...ctx} />
    <nav className="tabbar">
      <button onClick={()=>go('customer')}>🏠<span>Home</span></button>
      <button onClick={()=>go('customer','search')}>🔍<span>Search</span></button>
      <button className="mic-tab" onClick={()=>go('customer','voice')}>🎤</button>
      <button onClick={()=>go('customer','cart')}>🛒<span>Cart{count?` (${count})`:''}</span></button>
      <button onClick={()=>go('customer','track')}>📦<span>Orders</span></button>
    </nav>
  </>);
}
function Header({ title, back, go }) {
  return <header className="hdr">{back && <button className="back" onClick={()=>go('customer',...back)}>←</button>}<h2>{title}</h2></header>;
}
function Home({ go }) {
  return (<div className="page">
    <div className="hero">
      <div className="loc">📍 Delivering to <b>Porur, Chennai 600116</b> ▾</div>
      <h1>Porur Delivery App</h1>
      <p>Groceries, fruits & veg and medicines in ~30 min. <b>Open 24 x 7.</b></p>
      <div className="searchbox" onClick={()=>go('customer','search')}>🔍 Search tomato, milk, paracetamol…</div>
    </div>
    <button className="voice-cta" onClick={()=>go('customer','voice')}>
      <span className="bigmic">🎤</span><div><b>Just say it!</b><br/><small>Speak in தமிழ் or English — "2 kg tomato, 1 litre milk"</small></div>
    </button>
    <h3 className="sec">What do you need?</h3>
    <div className="cats">{CATS.map(c => <button key={c.id} className="cat" style={{background:c.color}} onClick={()=>c.id==='rider'?go('customer','rider'):go('customer','list',c.id)}>
      <span className="em">{c.emoji}</span><b>{c.label}</b><small>{c.ta}</small></button>)}</div>
    <h3 className="sec">Partner stores near you</h3>
    {STORES.map(s => <div key={s.id} className="card store" onClick={()=>go('customer','list',s.cat)}>
      <div className="sicon">{CATS.find(c=>c.id===s.cat).emoji}</div>
      <div><b>{s.name}</b><br/><small>⭐ {s.rating} · {s.eta} · {s.open}</small></div></div>)}
    <div className="banner">🌙 Night delivery for medicines, 11 PM – 6 AM. Free delivery above ₹499.</div>
  </div>);
}
function Qty({ p, cart, setCart }) {
  const q = cart[p.id] || 0;
  const set = n => setCart(c => { const x = { ...c }; if (n<=0) delete x[p.id]; else x[p.id]=Math.round(n*2)/2; return x; });
  if (p.inStock===false) return <small className="muted">Out of stock</small>;
  return q ? <div className="qty"><button onClick={()=>set(q-1)}>−</button><span>{q}</span><button onClick={()=>set(q+1)}>+</button></div>
           : <button className="add" onClick={()=>set(1)}>ADD</button>;
}
function ProductRow(props) { const { p } = props;
  return <div className="prod"><div className="pem">{p.emoji}</div><div className="pinfo"><b>{p.name}</b>{p.rx && <span className="rx">Rx</span>}<br/><small>{p.ta} · per {p.unit}</small><div className="price">{rs(p.price)}</div></div><Qty {...props} /></div>;
}
function ProductList(ctx) {
  const cat = CATS.find(c=>c.id===ctx.route.arg) || CATS[0];
  const store = STORES.find(s=>s.cat===cat.id);
  return (<div className="page"><Header title={cat.label} back={['home']} go={ctx.go}/>
    {store && <div className="storebar">{cat.emoji} From <b>{store.name}</b> · {store.eta}</div>}
    {cat.id==='med' && <div className="note">💡 Rx medicines need a prescription. A licensed pharmacist checks every order.</div>}
    {PRODUCTS.filter(p=>p.cat===cat.id).map(p=><ProductRow key={p.id} p={p} {...ctx}/>)}
    <CartBar {...ctx}/></div>);
}
function Search(ctx) {
  const [q, setQ] = useState('');
  const res = q ? PRODUCTS.filter(p => (p.name+' '+p.ta+' '+p.kw.join(' ')).toLowerCase().includes(q.toLowerCase())) : [];
  return (<div className="page"><Header title="Search" back={['home']} go={ctx.go}/>
    <input className="inp" autoFocus placeholder="Search in English or தமிழ்" value={q} onChange={e=>setQ(e.target.value)}/>
    {!q && <div className="chips">{['milk','tomato','rice','paracetamol','banana'].map(s=><button key={s} onClick={()=>setQ(s)}>{s}</button>)}</div>}
    {res.map(p=><ProductRow key={p.id} p={p} {...ctx}/>)}
    {q && !res.length && <p className="muted">No match. Try "Book a Rider" — we'll buy it for you!</p>}
    <CartBar {...ctx}/></div>);
}
function cartTotals(cart) {
  const lines = Object.entries(cart).map(([id,q])=>({ p:PRODUCTS.find(p=>p.id===id), q })).filter(l=>l.p && l.p.inStock!==false);
  const sub = lines.reduce((a,l)=>a+l.p.price*l.q,0);
  return { lines, sub, fee: sub ? deliveryFee(sub) : 0, rx: lines.some(l=>l.p.rx) };
}
function CartBar({ cart, go }) {
  const { lines, sub } = cartTotals(cart); if (!lines.length) return null;
  return <div className="cartbar" onClick={()=>go('customer','cart')}><span>{lines.length} item(s) · {rs(sub)}</span><b>View cart →</b></div>;
}
function Voice(ctx) {
  const { setCart, go } = ctx;
  const [lang, setLang] = useState('en-IN');
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const recRef = useRef(null);
  const SR = typeof window!=='undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const start = () => {
    setErr('');
    if (!SR) { setErr('Voice not supported in this browser. Please type below (Chrome on Android works best).'); return; }
    const r = new SR(); r.lang = lang; r.interimResults = true; r.continuous = false;
    r.onresult = e => { const t = Array.from(e.results).map(x=>x[0].transcript).join(' '); setText(t); };
    r.onerror = e => { setErr('Mic error: ' + e.error + '. You can type instead.'); setListening(false); };
    r.onend = () => setListening(false);
    recRef.current = r; r.start(); setListening(true);
  };
  const stop = () => { recRef.current && recRef.current.stop(); setListening(false); };
  const understand = () => setResult(parseOrder(text));
  const addAll = () => { setCart(c => { const x={...c}; result.items.forEach(({product,qty})=>{ x[product.id]=(x[product.id]||0)+qty; }); return x; }); go('customer','cart'); };
  return (<div className="page"><Header title="Order by voice" back={['home']} go={go}/>
    <div className="langtoggle">{[['ta-IN','தமிழ்'],['en-IN','English']].map(([l,n])=><button key={l} className={lang===l?'on':''} onClick={()=>setLang(l)}>{n}</button>)}</div>
    <div className="micwrap"><button className={'mic '+(listening?'live':'')} onClick={listening?stop:start}>🎤</button>
      <p>{listening ? 'Listening… tap to stop' : 'Tap and speak your list'}</p></div>
    {err && <div className="note warn">{err}</div>}
    <label className="lbl">Or type your list</label>
    <textarea className="inp" rows={3} value={text} placeholder={lang==='ta-IN'?'உதா: 2 கிலோ தக்காளி, ஒரு லிட்டர் பால்':'e.g. 2 kg tomato, 1 litre milk, 1 dozen eggs'} onChange={e=>setText(e.target.value)}/>
    <div className="chips">{['2 kg tomato, 1 litre milk, 1 dozen eggs','5 kg rice and 1 kg dal','2 paracetamol, 3 ors'].map(s=><button key={s} onClick={()=>{setText(s); setResult(parseOrder(s));}}>{s}</button>)}</div>
    <button className="primary" disabled={!text.trim()} onClick={understand}>Understand my order</button>
    {result && <div className="card">
      <b>Here's what we understood:</b>
      {result.items.map(({product,qty},i)=><div key={i} className="line"><span>{product.emoji} {product.name}</span><span>{qty} {product.unit} · {rs(product.price*qty)}</span></div>)}
      {result.unknown.length>0 && <p className="muted">Couldn't match: {result.unknown.join(', ')} — our team will call you, or add from Search.</p>}
      {result.items.length>0 && <button className="primary" onClick={addAll}>Add {result.items.length} item(s) to cart</button>}
    </div>}
    <p className="muted small">ℹ️ Prototype: simple keyword matching on our catalogue. Real AI understanding (mixed Tamil-English, brands, quantities) comes later.</p>
  </div>);
}
function Cart(ctx) {
  const { cart, go } = ctx; const { lines, sub, fee } = cartTotals(cart);
  const short = SETTINGS.min - sub;
  return (<div className="page"><Header title="Your cart" back={['home']} go={go}/>
    {!lines.length && <div className="empty">🛒<p>Your cart is empty</p><button className="primary" onClick={()=>go('customer','voice')}>🎤 Order by voice</button></div>}
    {lines.map(l=><ProductRow key={l.p.id} p={l.p} {...ctx}/>)}
    {lines.length>0 && <div className="card bill">
      <div className="line"><span>Item total</span><span>{rs(sub)}</span></div>
      <div className="line"><span>Delivery fee</span><span>{fee? rs(fee) : <s className="free">FREE</s>}</span></div>
      <div className="line tot"><span>To pay</span><span>{rs(sub+fee)}</span></div>
      {fee>0 && <small className="muted">Add {rs(SETTINGS.free-sub)} more for free delivery</small>}
    </div>}
    {lines.length>0 && (short>0
      ? <div className="note warn">Minimum order is {rs(SETTINGS.min)}. Add {rs(short)} more.</div>
      : <button className="primary" onClick={()=>go('customer','checkout')}>Proceed to checkout →</button>)}
  </div>);
}
function Checkout(ctx) {
  const { cart, setCart, go } = ctx; const { lines, sub, fee, rx } = cartTotals(cart);
  const [pay, setPay] = useState('UPI'); const [addr, setAddr] = useState('Flat 2A, Sri Sai Apartments, Mount-Poonamallee Rd, Porur');
  const [rxFile, setRxFile] = useState(''); const [busy, setBusy] = useState(false);
  const hasMed = lines.some(l=>l.p.cat==='med');
  const [rxData, setRxData] = useState('');
  const place = async () => {
    setBusy(true);
    await new Promise(r=>setTimeout(r, pay==='UPI'?900:200)); // mock UPI
    const ids = await api.placeOrder({ lines, fee, pay, address:addr, rxDataUrl: rxData });
    setCart({}); go('customer','track',ids[0]);
  };
  if (!lines.length) return <div className="page"><Header title="Checkout" back={['cart']} go={go}/><p className="muted">Cart is empty.</p></div>;
  return (<div className="page"><Header title="Checkout" back={['cart']} go={go}/>
    <label className="lbl">Deliver to</label><textarea className="inp" rows={2} value={addr} onChange={e=>setAddr(e.target.value)}/>
    {hasMed && <div className="card"><b>📄 Prescription {rx ? '(required)' : '(optional)'}</b>
      <p className="muted small">Upload a photo. A licensed pharmacist will verify before dispatch. (Prototype: file is not uploaded anywhere.)</p>
      <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files[0]; setRxFile(f?.name||''); if(f) shrink(f).then(setRxData); }}/>
      {rxFile && <p className="ok">✓ {rxFile} attached</p>}</div>}
    <label className="lbl">Pay with</label>
    {[['UPI','📱 UPI (GPay / PhonePe / Paytm)'],['COD','💵 Cash on delivery']].map(([k,n])=><label key={k} className={'radio '+(pay===k?'on':'')}><input type="radio" checked={pay===k} onChange={()=>setPay(k)}/>{n}</label>)}
    <div className="card bill"><div className="line tot"><span>To pay</span><span>{rs(sub+fee)}</span></div></div>
    <button className="primary" disabled={busy || (rx && !rxFile)} onClick={place}>{busy ? (pay==='UPI'?'Waiting for UPI… (mock)':'Placing…') : `Place order · ${rs(sub+fee)}`}</button>
    {rx && !rxFile && <p className="muted small">Attach prescription to continue.</p>}
  </div>);
}
// No Firebase Storage on the free plan: shrink the photo to ~600px JPEG and store it inline in the order
function shrink(file) { return new Promise(res => { const img = new Image(); img.onload = () => { const w = Math.min(600, img.width), c = document.createElement('canvas'); c.width = w; c.height = img.height * w / img.width; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.5)); }; img.onerror = () => res(''); img.src = URL.createObjectURL(file); }); }
function Track(ctx) {
  const { allOrders, go, route, riders, uid } = ctx;
  const mine = allOrders.filter(o=>o.customerUid===uid).map(toProto);
  const o = mine.find(x=>x.id===route.arg) || mine[0];
  if (!o) return <div className="page"><Header title="My orders" back={['home']} go={go}/><div className="empty">📦<p>No orders yet</p></div></div>;
  const r = riders.find(x=>x.id===o.rider);
  return (<div className="page"><Header title={`Order ${o.id}`} back={['home']} go={go}/>
    <div className="map">
      <div className="road h"/><div className="road v"/>
      <span className="pin store">🏪</span><span className="pin home">🏠</span>
      <span className="pin bike" style={{left: `${15+Math.max(0,o.status)*13}%`, top:`${70-Math.max(0,o.status)*10}%`}}>🛵</span>
      <small className="maplbl">Map placeholder · Porur</small>
    </div>
    <div className="card"><div className="eta">{o.status<0?'Order cancelled by store':o.status>=DONE?'Delivered 🎉':`Arriving in ~${Math.max(5,30-o.status*5)} min`}</div>
      {o.rxStatus && <p className="small">💊 Prescription: <b>{o.rxStatus}</b></p>}
      <ol className="steps" data-testid="steps">{STEPS.map((s,i)=><li key={s} className={i<=o.status?'done':''}><span/>{s}</li>)}</ol>
    </div>
    {r && <div className="card rider"><div className="sicon">🧑</div><div><b>{r.name}</b> is your rider<br/><small>📞 {r.phone}</small></div></div>}
    <div className="card"><b>Delivery OTP: <span className="otp">{o.otp}</span></b><p className="muted small">Share this with the rider only at delivery.</p></div>
    <div className="card">{o.items.map(([n,q],i)=><div key={i} className="line"><span>{n}</span><span>×{q}</span></div>)}<div className="line tot"><span>Total ({o.pay})</span><span>{rs(o.total)}</span></div></div>
    <p className="muted small">🟢 Live: updates from the store, rider and admin appear here automatically.</p>
    {mine.length>1 && <><h3 className="sec">Other orders</h3>{mine.filter(x=>x.id!==o.id).map(x=><div key={x.id} className="card store" onClick={()=>go('customer','track',x.id)}><b>{x.id}</b> · {STEPS[x.status]||'Cancelled'} · {rs(x.total)}</div>)}</>}
  </div>);
}
function BookRider(ctx) {
  const { go } = ctx;
  const [pickup, setPickup] = useState('Saravana Stores, Porur Junction');
  const [drop, setDrop] = useState('Flat 2A, Sri Sai Apartments, Porur');
  const [task, setTask] = useState('Pick up a parcel and hand it over at home');
  const [km, setKm] = useState(3); const [mode, setMode] = useState('trip'); const [hours, setHours] = useState(1);
  const price = mode==='trip' ? SETTINGS.errandBase + Math.max(0, Math.ceil(km-3))*SETTINGS.errandPerKm : SETTINGS.errandHour*hours;
  const book = async () => { const id = await api.bookErrand({ pickup, drop, task, price }); go('customer','track',id); };
  return (<div className="page"><Header title="Book a Rider 🛵" back={['home']} go={go}/>
    <p className="muted">Anything, anywhere in Porur — pick up, drop, buy & bring, queue for you.</p>
    <div className="seg">{[['trip','Per trip'],['hour','Hire by hour']].map(([k,n])=><button key={k} className={mode===k?'on':''} onClick={()=>setMode(k)}>{n}</button>)}</div>
    <label className="lbl">🟢 Pickup</label><input className="inp" value={pickup} onChange={e=>setPickup(e.target.value)}/>
    <label className="lbl">🔴 Drop</label><input className="inp" value={drop} onChange={e=>setDrop(e.target.value)}/>
    <label className="lbl">What should the rider do?</label><textarea className="inp" rows={2} value={task} onChange={e=>setTask(e.target.value)}/>
    {mode==='trip' ? <><label className="lbl">Distance (estimated): {km} km</label><input type="range" min="1" max="8" step="0.5" value={km} onChange={e=>setKm(+e.target.value)}/></>
     : <><label className="lbl">Hours: {hours}</label><input type="range" min="1" max="6" value={hours} onChange={e=>setHours(+e.target.value)}/></>}
    <div className="card bill"><div className="line tot"><span>Estimated price</span><span>{rs(price)}</span></div>
      <small className="muted">{mode==='trip' ? `${rs(SETTINGS.errandBase)} for first 3 km, ${rs(SETTINGS.errandPerKm)} per extra km` : `${rs(SETTINGS.errandHour)} per hour, rider stays with you`} · item cost (if buying) paid separately</small></div>
    <button className="primary" onClick={book}>Book rider · {rs(price)}</button>
  </div>);
}

/* ---------------- RIDER ---------------- */
function Rider({ orders, setOrders, riders, setRiders }) {
  const [rid, setRid] = useState('r1');
  const [otpIn, setOtpIn] = useState({}); const [msg, setMsg] = useState({});
  const me = riders.find(r=>r.id===rid);
  const mine = orders.filter(o=>o.rider===rid && o.status<DONE);
  const done = orders.filter(o=>o.rider===rid && o.status===DONE);
  const upd = (id, s) => setOrders(os=>os.map(o=>o.id===id?{...o,status:s}:o));
  const deliver = o => { if (otpIn[o.id]===o.otp) { upd(o.id,DONE); setRiders(rs_=>rs_.map(r=>r.id===rid?{...r,today:r.today+1}:r)); setMsg(m=>({...m,[o.id]:''})); } else setMsg(m=>({...m,[o.id]:'Wrong OTP. Ask customer again.'})); };
  const toggle = () => setRiders(rs_=>rs_.map(r=>r.id===rid?{...r,status:r.status==='offline'?'online':'offline'}:r));
  return (<div className="page dark-top">
    <div className="rhead"><select value={rid} onChange={e=>setRid(e.target.value)}>{riders.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button className={'pill '+me.status} onClick={toggle}>{me.status==='offline'?'⚪ Offline':'🟢 On duty'}</button></div>
    <div className="stats3"><div><b>{me.today}</b><small>Done today</small></div><div><b>{rs(me.today*25)}</b><small>Incentive</small></div><div><b>{mine.length}</b><small>Active</small></div></div>
    <h3 className="sec">Assigned to you</h3>
    {!mine.length && <p className="muted">No active tasks. Stay online!</p>}
    {mine.map(o=><div key={o.id} className="card rcard">
      <div className="line"><b>{o.type==='errand'?'🛵 Errand':'📦 Order'} {o.id}</b><span className="badge">{STEPS[o.status]}</span></div>
      <small>👤 {o.customer} · 📍 {o.address}</small>
      <ul className="small">{o.items.map(([n,q],i)=><li key={i}>{n} ×{q}</li>)}</ul>
      <div className="line"><span>{o.pay==='COD'?'💵 Collect cash':'✅ Prepaid (UPI)'}</span><b>{rs(o.total)}</b></div>
      {o.type!=='errand' && o.status<2 && <p className="muted small">⏳ Waiting for the store to {o.status===0?'accept':'pack'} the order…</p>}
      {o.type==='errand' && o.status===0 && <button className="primary" onClick={()=>upd(o.id,1)}>Accept errand</button>}
      {(o.status===2 || (o.type==='errand' && o.status===1)) && <button className="primary" onClick={()=>upd(o.id,3)}>Picked up</button>}
      {o.status===3 && <button className="primary" onClick={()=>upd(o.id,4)}>Start trip</button>}
      {o.status===4 && <div className="otprow"><input className="inp" inputMode="numeric" maxLength={4} placeholder="Customer OTP" value={otpIn[o.id]||''} onChange={e=>setOtpIn(m=>({...m,[o.id]:e.target.value}))}/><button className="primary" onClick={()=>deliver(o)}>Delivered</button></div>}
      {msg[o.id] && <p className="err">{msg[o.id]}</p>}
      {o.status===4 && <small className="muted">Demo hint: OTP is {o.otp}</small>}
    </div>)}
    {done.length>0 && <><h3 className="sec">Completed</h3>{done.map(o=><div key={o.id} className="card small">✅ {o.id} · {rs(o.total)}</div>)}</>}
  </div>);
}

/* ---------------- ADMIN ---------------- */
function Admin({ orders, setOrders, riders }) {
  const delivered = orders.filter(o=>o.status===DONE);
  const revenue = delivered.reduce((a,o)=>a+o.total,0);
  const cols = STEPS.map((n,i)=>[i, i===0?'New':n]);
  const assign = (id, rider) => setOrders(os=>os.map(o=>o.id===id?{...o,rider}:o));
  const st = s => riders.filter(r=>r.status===s).length;
  return (<div className="page">
    <h2 className="ahead">Admin · Porur Hub</h2>
    <a className="note" style={{display:'block'}} href="#/admin-desktop/overview">🖥️ Open full desktop dashboard →</a>
    <div className="kpis">
      <div><b>{orders.length + 38}</b><small>Orders today</small></div>
      <div><b>{rs(revenue + 14250)}</b><small>GMV today</small></div>
      <div><b>27 min</b><small>Avg delivery</small></div>
      <div><b>{orders.filter(o=>o.status<DONE).length}</b><small>Live now</small></div>
      <div><b>{st('online')+st('delivering')}/{riders.length}</b><small>Riders active</small></div>
      <div><b>{orders.filter(o=>o.type==='errand').length + 6}</b><small>Errands</small></div>
    </div>
    <p className="muted small">Includes mock baseline numbers for the day.</p>
    <h3 className="sec">Live orders</h3>
    <div className="board">{cols.map(([s,n])=><div key={s} className="col"><h4>{n} <span>{orders.filter(o=>o.status===s).length}</span></h4>
      {orders.filter(o=>o.status===s).map(o=><div key={o.id} className="ocard"><b>{o.id}</b> <small>{o.time}</small><br/><small>{o.customer}</small><br/><small>{rs(o.total)} · {o.pay}</small>
        {s<DONE && <select value={o.rider} onChange={e=>assign(o.id,e.target.value)}>{riders.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>}</div>)}
    </div>)}</div>
    <h3 className="sec">Riders</h3>
    <table className="tbl"><thead><tr><th>Rider</th><th>Status</th><th>Today</th><th>Active</th></tr></thead><tbody>
      {riders.map(r=><tr key={r.id}><td>{r.name}</td><td><span className={'dot '+r.status}/>{r.status}</td><td>{r.today}</td><td>{orders.filter(o=>o.rider===r.id&&o.status<4).length}</td></tr>)}
    </tbody></table>
    <h3 className="sec">Orders by hour (mock)</h3>
    <div className="bars">{[3,1,0,1,2,5,9,12,8,6,7,9,6,4,5,8,11,14,12,9,6,4].map((v,i)=><div key={i} style={{height:v*6+'px'}} title={`${i+2}:00 – ${v}`}/>)}</div>
    <small className="muted">2 AM → 11 PM · night orders are mostly medicines</small>
  </div>);
}
