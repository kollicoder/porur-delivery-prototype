import React, { useState, useEffect, useRef } from 'react';
import { STORES, PRODUCTS, SETTINGS, deliveryFee, parseOrder } from './data.js';
import { useLive, api, backendInfo, toProto, notifySupported, PAY_LABEL, FLOW_LABEL } from './live.js';
import { sendPushMany } from './push.js';
const pushCustomer = (o, st) => sendPushMany([o.customerPushToken], `Order ${o.id}`, FLOW_LABEL[st] || st);
import LiveMap, { HUB } from './map.jsx';
import { Login, RequestAccess } from './auth.jsx';
import { useLS, STEPS, DONE } from './store.js';
import AdminDesktop from './AdminDesktop.jsx';
import { BRAND, isTestMode } from './brand.js';
const useOnline = () => { const [on, setOn] = useState(navigator.onLine); useEffect(() => { const u = () => setOn(navigator.onLine); addEventListener('online', u); addEventListener('offline', u); return () => { removeEventListener('online', u); removeEventListener('offline', u); }; }, []); return on; };
const Sk = ({ h=16, w='100%', r=12, style }) => <div className="sk" style={{ height:h, width:w, borderRadius:r, ...style }} />;
export const SkList = ({ n=4 }) => <div data-testid="skeleton">{Array.from({length:n}).map((_,i)=><div key={i} className="card" style={{display:'flex',gap:12,alignItems:'center'}}><Sk h={56} w={56} r={14}/><div style={{flex:1,display:'grid',gap:8}}><Sk w="70%"/><Sk h={12} w="40%"/></div></div>)}</div>;

const rs = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
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
  const live = useLive();
  const ctx = { route, go, cart, setCart, ...live };
  const [toast, setToast] = useState('');
  useEffect(() => { const f = e => { setToast(e.detail); setTimeout(() => setToast(''), 5000); }; addEventListener('pd-toast', f); return () => removeEventListener('pd-toast', f); }, []);
  const online = useOnline();
  const offlineEl = !online ? <div className="offline" data-testid="offline-banner" role="alert">📡 You're offline. We'll sync when you're back.</div> : null;
  const toastEl = toast ? <div className="toast" data-testid="toast">🔔 {toast}</div> : null;
  if (live.user === undefined) return <div className="phone"><div className="page" data-testid="boot-skeleton" style={{display:'grid',gap:14,paddingTop:40}}><Sk h={34} w="60%"/><Sk h={18} w="80%"/><Sk h={150} r={22}/><SkList n={3}/></div></div>;
  if (!live.user) return <div className="phone">{offlineEl}<Login title={route.role==='customer'?'Sign in':'Staff sign in'} staff={route.role!=='customer'} /></div>;
  const staffOk = route.role==='rider' ? (live.me?.role==='rider' || live.isAdmin) : ['admin','admin-desktop'].includes(route.role) ? live.isAdmin : true;
  const gate = !staffOk && <RequestAccess me={live.me} role={route.role==='rider'?'rider':'admin'} riders={live.riders} />;
  const banner = live.error ? <div className="syncbar err">⚠️ Backend: {live.error}</div> : null;
  if (route.role==='admin-desktop') return <>{offlineEl}{banner}{toastEl}{gate ? <div className="phone">{gate}</div> : <AdminDesktop {...ctx} />}</>;
  return (
    <div className="phone">
      <div className="switcher">
        {['customer','rider','admin'].map(r => <button key={r} className={route.role===r?'on':''} onClick={()=>go(r)}>{r[0].toUpperCase()+r.slice(1)}</button>)}
        <button onClick={()=>go('admin-desktop','overview')}>Admin (Desktop)</button>
        {notifySupported && Notification.permission==='default' && <button className="reset" title="Enable notifications" onClick={()=>Notification.requestPermission()}>🔔</button>}
        <button className="reset" title={'Sign out · '+backendInfo.projectId+(backendInfo.emulatorHost?' (emulator)':'')} onClick={()=>api.logout()}>⎋</button>
      </div>
      {offlineEl}{banner}{toastEl}
      {gate}
      {!gate && route.role==='customer' && <Customer {...ctx} />}
      {!gate && route.role==='rider' && <Rider {...ctx} />}
      {!gate && route.role==='admin' && <Admin {...ctx} />}
    </div>
  );
}

/* ---------------- CUSTOMER ---------------- */
function Customer(ctx) {
  const { route, go, cart } = ctx;
  const count = Object.values(cart).reduce((a,b)=>a+b,0);
  const S = { home:Home, list:ProductList, search:Search, voice:Voice, cart:Cart, checkout:Checkout, track:Track, rider:BookRider, profile:Profile, credits:Credits }[route.screen] || Home;
  const L = useLang(); const on = k => route.screen===k ? 'on' : '';
  return (<>
    <S {...ctx} />
    <nav className="tabbar">
      <button className={on('home')} aria-label="Home" onClick={()=>go('customer')}>🏠<span>{L.t('Home','முகப்பு')}</span></button>
      <button className={on('search')} aria-label="Search" onClick={()=>go('customer','search')}>🔍<span>{L.t('Search','தேடல்')}</span></button>
      <button className="mic-tab" aria-label="Speak your order" onClick={()=>go('customer','voice')}>🎤<span>{L.t('Speak','பேசு')}</span></button>
      <button className={on('cart')} aria-label="Cart" onClick={()=>go('customer','cart')}>🛒<span>{L.t('Cart','கூடை')}{count?` (${count})`:''}</span></button>
      <button className={on('track')} aria-label="Orders" onClick={()=>go('customer','track')}>📦<span>{L.t('Orders','ஆர்டர்')}</span></button>
    </nav>
  </>);
}
function Header({ title, back, go }) {
  return <header className="hdr">{back && <button className="back" onClick={()=>go('customer',...back)}>←</button>}<h2>{title}</h2></header>;
}
const useLang = () => { const [lang, setLang] = useLS('pd_lang', 'en'); return { lang, setLang, t: (en, ta) => lang==='ta' ? ta : en }; };
function Home({ go }) {
  const L = useLang();
  return (<div className="page">
    <div className="dd-top"><div className="who"><small>{L.t('Delivering to','டெலிவரி முகவரி')}</small><br/><b>📍 {BRAND.area}</b></div>
      <button className="iconbtn" data-testid="open-profile" aria-label="Profile and settings" onClick={()=>go('customer','profile')}>👤</button></div>
    <h1 className="dd-h">Groceries, veggies &amp; medicines in <em>30 minutes.</em></h1>
    <div className="ta small">30 நிமிடத்தில் வீட்டுக்கே டெலிவரி</div>
    <div className="dd-search"><div className="box" onClick={()=>go('customer','search')}>🔍 {L.t('Search tomato, milk, paracetamol…','தக்காளி, பால் தேடுங்கள்…')}</div>
      <button className="micbtn" aria-label="Order by voice" onClick={()=>go('customer','voice')}>🎤</button></div>
    <h3 className="sec">{L.t('What do you need?','உங்களுக்கு என்ன வேண்டும்?')}</h3>
    <div className="cats">{CATS.map(c => <button key={c.id} data-testid={'cat-'+c.id} className="cat" style={{background:{fv:'#DDF3E1',grocery:'#FFF1C7',med:'#E6DEFF',rider:'#FFDDE3'}[c.id]}} onClick={()=>c.id==='rider'?go('customer','rider'):go('customer','list',c.id)}>
      <span className="k">{c.id==='rider'?'Anything, anywhere':c.id==='med'?'24×7':'20–30 min'}</span><b>{c.label}</b><small className="ta">{c.ta}</small><span className="em">{c.emoji}</span></button>)}</div>
    <button className="voicebig" onClick={()=>go('customer','voice')}><div style={{flex:1}}><b>{L.t('Just say your list','உங்கள் பட்டியலைச் சொல்லுங்கள்')}</b><span className="ta">தமிழ் or English · "2 kg tomato, 1 litre milk"</span></div><span className="m">🎤</span></button>
    <div className="promos"><div style={{background:'var(--green)',color:'#fff'}}><b style={{color:'#fff'}}>Free delivery above ₹{SETTINGS.free}</b><small>Applied at checkout</small></div><div style={{background:'var(--lilac)'}}><b>Medicines all night</b><small>24×7 pharmacy tie-up</small></div></div>
    <h3 className="sec">{L.t('Stores near you','அருகிலுள்ள கடைகள்')}</h3>
    {STORES.map(s => <div key={s.id} className="card store" onClick={()=>go('customer','list',s.cat)}>
      <div className="sicon" style={{background:{fv:'#DDF3E1',grocery:'#FFF1C7',med:'#E6DEFF'}[s.cat]}}>{CATS.find(c=>c.id===s.cat).emoji}</div>
      <div><b>{s.name}</b><br/><small className="muted">★ {s.rating} · {s.eta} · {s.open}</small></div><span className="openpill">Open</span></div>)}
  </div>);
}
function Profile({ go, me, user }) {
  const L = useLang();
  return (<div className="page"><Header title={L.t('Profile & settings','சுயவிவரம்')} back={['home']} go={go}/>
    <div className="card" style={{display:'flex',gap:12,alignItems:'center'}}><div className="iconbtn" style={{background:'var(--yellow)',border:0,width:56,height:56}}>{(me?.name||'Y')[0].toUpperCase()}</div>
      <div><b className="dd-h" style={{fontSize:19}}>{me?.name || L.t('Your profile','உங்கள் சுயவிவரம்')}</b><br/><small className="muted">{me?.phone || user?.phoneNumber}</small></div></div>
    <label className="lbl">{L.t('Language','மொழி')}</label>
    <div className="seg" data-testid="lang-switch">{[['en','English'],['ta','தமிழ்']].map(([k,n])=><button key={k} className={L.lang===k?'on':''} onClick={()=>L.setLang(k)}>{n}</button>)}</div>
    <p className="muted small">{L.t('Changes menus and the default voice language.','மெனுக்கள் மற்றும் குரல் மொழியை மாற்றும்.')}</p>
    <div className="card" style={{padding:'0 14px'}}>
      <button className="prow" onClick={()=>go('customer','track')}><span>📦</span>{L.t('My orders','எனது ஆர்டர்கள்')}<span>›</span></button>
      <button className="prow" onClick={()=>go('customer','rider')}><span>🛵</span>{L.t('Book a rider','ரைடர் புக்')}<span>›</span></button>
      <button className="prow" data-testid="open-credits" onClick={()=>go('customer','credits')}><span>ℹ️</span>{L.t('About & photo credits','பற்றி')}<span>›</span></button></div>
    <button className="primary" style={{background:'#fff',color:'var(--ink)',border:'1.5px solid var(--ink)'}} onClick={()=>api.logout()}>{L.t('Sign out','வெளியேறு')}</button>
    <p className="muted small" style={{textAlign:'center'}}>{BRAND.name} · v0.5</p>
  </div>);
}
function Credits({ go }) {
  return (<div className="page"><Header title="About & credits" back={['profile']} go={go}/>
    <div className="card"><b>{BRAND.name}</b><p className="muted small">Hyperlocal delivery for {BRAND.area}. Version 0.5.</p></div>
    <div className="card"><b>Maps</b><p className="muted small">© OpenStreetMap contributors · Leaflet.</p></div>
    <div className="card"><b>Fonts</b><p className="muted small">Bricolage Grotesque, Plus Jakarta Sans, Noto Sans Tamil — SIL Open Font License.</p></div>
    <div className="card"><b>Product imagery</b><p className="muted small">Product photos in the design mock-ups are placeholders; store-supplied photos and their credits will be listed here.</p></div>
  </div>);
}
function Qty({ p, cart, setCart }) {
  const q = cart[p.id] || 0;
  const set = n => setCart(c => { const x = { ...c }; if (n<=0) delete x[p.id]; else x[p.id]=Math.round(n*2)/2; return x; });
  if (p.inStock===false) return <small className="oos">Out of stock</small>;
  return q ? <div className="qty"><button aria-label="Decrease" onClick={()=>set(q-1)}>−</button><span>{q}</span><button aria-label="Increase" onClick={()=>set(q+1)}>+</button></div>
           : <button className="add" aria-label={'Add '+p.name} data-testid={'add-'+p.id} onClick={()=>set(1)}>+</button>;
}
function ProductRow(props) { const { p, removable, setCart } = props;
  return <div className="prod" data-testid={'row-'+p.id} style={p.inStock===false?{borderColor:'#F3B6AE'}:null}><div className="pem" style={{background:{fv:'#DDF3E1',grocery:'#FFF1C7',med:'#E6DEFF'}[p.cat]}}>{p.emoji}</div><div className="pinfo"><b>{p.name}</b>{p.rx && <span className="rx">Rx</span>}<br/><small className="ta">{p.ta} · per {p.unit}</small><div className="price">{rs(p.price)}</div></div><Qty {...props} />
    {removable && <button className="rm" data-testid={'remove-'+p.id} aria-label={'Remove '+p.name} onClick={()=>setCart(c=>{ const x={...c}; delete x[p.id]; return x; })}>✕</button>}</div>;
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
    {q && !res.length && <div className="empty">🔎<p>Not on our shelves yet</p><small className="muted">We couldn't find "{q}". Book a rider and we'll buy it for you.</small><button className="primary" onClick={()=>ctx.go('customer','rider')}>Book a rider</button></div>}
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
    <div className={'micpanel '+(listening?'live':'')}><button className={'mic '+(listening?'live':'')} aria-label={listening?'Stop listening':'Tap and speak'} onClick={listening?stop:start}>🎤</button>
      <b>{listening ? 'Listening… tap to stop' : 'Tap and speak'}</b><span>"Two kilo tomato, one litre milk"</span></div>
    {err && <div className="note warn">{err}</div>}
    <label className="lbl">Or type it</label>
    <textarea className="inp" rows={3} value={text} placeholder={lang==='ta-IN'?'உதா: 2 கிலோ தக்காளி, ஒரு லிட்டர் பால்':'e.g. 2 kg tomato, 1 litre milk, 1 dozen eggs'} onChange={e=>setText(e.target.value)}/>
    <div className="chips">{['2 kg tomato, 1 litre milk, 1 dozen eggs','5 kg rice and 1 kg dal','2 paracetamol, 3 ors'].map(s=><button key={s} onClick={()=>{setText(s); setResult(parseOrder(s));}}>{s}</button>)}</div>
    <button className="primary" disabled={!text.trim()} onClick={understand}>Understand my order</button>
    {result && <div className="card">
      <b>Here's what we understood:</b>
      {result.items.map(({product,qty},i)=><div key={i} className="line"><span>{product.emoji} {product.name}</span><span>{qty} {product.unit} · {rs(product.price*qty)}</span></div>)}
      {result.unknown.length>0 && <p className="muted">Couldn't match: {result.unknown.join(', ')} — our team will call you, or add from Search.</p>}
      {result.items.length>0 && <button className="primary" onClick={addAll}>Add {result.items.length} item(s) to cart</button>}
    </div>}
    
  </div>);
}
function Cart(ctx) {
  const { cart, go, setCart } = ctx; const { lines, sub, fee, rx } = cartTotals(cart);
  const short = SETTINGS.min - sub;
  const oos = Object.keys(cart).map(id=>PRODUCTS.find(p=>p.id===id)).filter(p=>p && p.inStock===false);
  const groups = STORES.map(st=>({ st, ls: lines.filter(l=>l.p.store===st.id) })).filter(g=>g.ls.length);
  return (<div className="page"><Header title="Cart" back={['home']} go={go}/>
    {!lines.length && !oos.length && <div className="empty" data-testid="cart-empty">🧺<p>Your cart is empty</p><small className="muted">Add something from the shelves, or just say your list.</small><button className="primary" onClick={()=>go('customer','voice')}>🎤 Order by voice</button></div>}
    {(lines.length>0) && <div className="card" style={{display:'flex',gap:10,alignItems:'center'}}>🏠<div style={{flex:1}}><b>Home</b><br/><small className="muted">Flat 2A, Sri Sai Apartments, Mount-Poonamallee Rd</small></div><button className="linkbtn" data-testid="cart-change" onClick={()=>go('customer','checkout')}>Change</button></div>}
    {fee>0 && <div className="note" style={{background:'var(--gsoft)',color:'#14532D'}}>🛵 Add {rs(SETTINGS.free-sub)} more for free delivery</div>}
    {rx && <div className="note warn">📄 An item needs a prescription. Add a photo at checkout — a pharmacist checks it first.</div>}
    {oos.length>0 && <div className="statecard" data-testid="oos-banner" style={{padding:12}}><b>⚠️ {oos.length} item{oos.length>1?'s':''} went out of stock</b><br/><small>They're not counted in your total.</small> <button className="linkbtn" style={{color:'#7A1A12'}} onClick={()=>setCart(c=>{ const x={...c}; oos.forEach(p=>delete x[p.id]); return x; })}>Remove</button></div>}
    {groups.map(({st,ls})=><div key={st.id}><div className="line" style={{marginTop:12}}><b className="dd-h" style={{fontSize:17,margin:0}}>{st.name}</b><small className="muted">{st.eta}</small></div>
      {ls.map(l=><ProductRow key={l.p.id} p={l.p} removable {...ctx}/>)}</div>)}
    {oos.map(p=><ProductRow key={p.id} p={p} removable {...ctx}/>)}
    {lines.length>0 && <div className="card bill">
      <div className="line"><span>Item total</span><span>{rs(sub)}</span></div>
      <div className="line"><span>Delivery fee{groups.length>1?' (charged once)':''}</span><span>{fee? rs(fee) : <s className="free">FREE</s>}</span></div>
      <div className="line tot"><span>To pay</span><span>{rs(sub+fee)}</span></div>
      <small className="muted">💵 Pay on delivery · cash or UPI</small>
    </div>}
    {lines.length>0 && (short>0
      ? <div className="note warn">Minimum order is {rs(SETTINGS.min)}. Add {rs(short)} more.</div>
      : <button className="primary" onClick={()=>go('customer','checkout')}>Proceed to checkout →</button>)}
  </div>);
}
function Checkout(ctx) {
  const { cart, setCart, go } = ctx; const { lines, sub, fee, rx } = cartTotals(cart);
  const [pay, setPay] = useState('COD'); const [err, setErr] = useState(''); const [addr, setAddr] = useState('Flat 2A, Sri Sai Apartments, Mount-Poonamallee Rd, Porur');
  const [rxFile, setRxFile] = useState(''); const [busy, setBusy] = useState(false);
  const hasMed = lines.some(l=>l.p.cat==='med');
  const [rxData, setRxData] = useState(''); const rxRef = useRef(null); const [flash, setFlash] = useState(false);
  const goToRx = () => { rxRef.current?.scrollIntoView({ behavior:'smooth', block:'center' }); setFlash(true); setTimeout(()=>setFlash(false), 1600); };
  const [loc, setLoc] = useState({ lat: HUB.lat + 0.012, lng: HUB.lng + 0.009 }); const [locMsg, setLocMsg] = useState('');
  const useMyLoc = () => { setLocMsg('Locating…'); navigator.geolocation?.getCurrentPosition(p => { setLoc({ lat:p.coords.latitude, lng:p.coords.longitude }); setLocMsg('📍 Using your current location'); }, e => setLocMsg('Location unavailable ('+e.message+') — using the address pin')); };
  const place = async () => {
    setBusy(true);
    try { const ids = await api.placeOrder({ lines, fee, pay, address:addr, rxDataUrl: rxData, name: ctx.name, dropLat: loc.lat, dropLng: loc.lng });
      setCart({}); go('customer','track',ids[0]); } catch (e) { setErr(!navigator.onLine || /network|unavailable/i.test(e.message) ? "You're offline or the network dropped. Your cart is saved — try again." : 'Could not place the order: ' + e.message); setBusy(false); }
  };
  if (!lines.length) return <div className="page"><Header title="Checkout" back={['cart']} go={go}/><p className="muted">Cart is empty.</p></div>;
  return (<div className="page"><Header title="Checkout" back={['cart']} go={go}/>
    <label className="lbl">Deliver to</label><textarea className="inp" rows={2} value={addr} onChange={e=>setAddr(e.target.value)}/>
    <button className="chipbtn" onClick={useMyLoc}>📍 Use my current location</button> <small className="muted">{locMsg}</small>
    <LiveMap testId="checkout-map" height={150} markers={[{ lat:loc.lat, lng:loc.lng, emoji:'📍', label:'Deliver here' }]} />
    {hasMed && <div ref={rxRef} data-testid="rx-section" className={'card'+(flash?' flash':'')} style={rx && !rxFile ? {borderColor:'var(--orange)'} : null}><div className="line" style={{padding:0}}><b>📄 Photo of your prescription</b><span className={'pillx '+(rxFile?'okp':rx?'req':'')}>{rxFile?'Added':rx?'Required':'Optional'}</span></div>
      <p className="muted small">Upload a photo. Only the pharmacist and you can see it — never the rider.</p>
      <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files[0]; setRxFile(f?.name||''); if(f) shrink(f).then(d=>{ if (d.length > 280000) { setRxFile(''); setErr('Photo too large — please use a smaller photo.'); } else { setErr(''); setRxData(d); } }); }}/>
      {rxFile && <p className="ok">✓ {rxFile} attached</p>}</div>}
    <label className="lbl">Pay on delivery</label>
    {[['COD','💵 Cash on delivery','Pay the rider in cash'],['UPI_DOD','📱 UPI on delivery','Scan & pay with GPay / PhonePe / Paytm at your door']].map(([k,n,sub])=><label key={k} data-testid={'pay-'+k} className={'radio '+(pay===k?'on':'')}><input type="radio" checked={pay===k} onChange={()=>setPay(k)}/>{n}<br/><small className="muted">{sub}</small></label>)}
    <label className="radio" style={{opacity:.55}} data-testid="pay-online"><input type="radio" disabled/>💳 Pay online now (UPI / cards) <b style={{color:'#b45309',fontSize:11}}>COMING SOON</b></label>
    <div className="card bill" data-testid="bill"><div className="line"><span>Item total</span><span>{rs(sub)}</span></div>
      <div className="line"><span>Delivery fee{new Set(lines.map(l=>l.p.store)).size>1?' (once for this checkout)':''}</span><span>{fee?rs(fee):'FREE'}</span></div>
      <div className="line tot"><span>To pay at delivery</span><span>{rs(sub+fee)}</span></div>
      {new Set(lines.map(l=>l.p.store)).size>1 && <small className="muted">Your items come from {new Set(lines.map(l=>l.p.store)).size} stores, so you'll get {new Set(lines.map(l=>l.p.store)).size} orders. The delivery fee is charged once.</small>}</div>
    {err && <div className="errbox" data-testid="place-error"><b>Order not placed</b>{err} <button className="linkbtn" onClick={place}>Retry</button></div>}
    {rx && !rxFile && <button className="lockreason" data-testid="place-reason" onClick={goToRx}>⚠️ Add your prescription photo to place this order — tap here to go to it.</button>}
    <div onClick={()=>{ if (rx && !rxFile) goToRx(); }}><button className="primary" data-testid="place" disabled={busy || (rx && !rxFile)} onClick={place}>{busy ? 'Placing…' : `Place order · ${rs(sub+fee)}`}</button></div>
  </div>);
}
// No Storage bucket on the Spark plan: shrink the photo to ~800px JPEG; saved in its own private prescriptions/{orderId} doc (rules cap ~300 KB)
function shrink(file) { return new Promise(res => { const img = new Image(); img.onload = () => { const w = Math.min(800, img.width), c = document.createElement('canvas'); c.width = w; c.height = img.height * w / img.width; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.5)); }; img.onerror = () => res(''); img.src = URL.createObjectURL(file); }); }
/** Rider GPS: real browser geolocation (watchPosition, throttled) or a simulated drive toward the active drop point. */
function useRiderGps(rid) {
  const [sharing, setSharing] = useState(false); const [status, setStatus] = useState('not sharing'); const watch = useRef(null), last = useRef(0), sim = useRef(null);
  const push = (lat, lng, src) => { if (Date.now() - last.current < 3000) return; last.current = Date.now(); api.updateRider(rid, { lat, lng, locAt: new Date().toISOString() }).then(() => setStatus(`${src} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`)).catch(e => setStatus('⚠️ ' + e.message)); };
  const stop = () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); watch.current = null; clearInterval(sim.current); setSharing(false); setStatus('not sharing'); };
  const toggle = () => { if (sharing) return stop(); if (!navigator.geolocation) return setStatus('GPS not available');
    setSharing(true); setStatus('waiting for GPS…');
    watch.current = navigator.geolocation.watchPosition(p => push(p.coords.latitude, p.coords.longitude, 'GPS'), e => setStatus('⚠️ ' + e.message), { enableHighAccuracy: true, maximumAge: 5000 }); };
  const [simulating, setSimulating] = useState(false);
  const simulate = (o) => { setSimulating(true); clearInterval(sim.current); const to = o?.dropLat ? { lat: o.dropLat, lng: o.dropLng } : { lat: HUB.lat + 0.015, lng: HUB.lng + 0.01 };
    let lat = HUB.lat, lng = HUB.lng, n = 0; last.current = 0; push(lat, lng, 'simulated');
    sim.current = setInterval(() => { n++; lat += (to.lat - lat) * 0.25; lng += (to.lng - lng) * 0.25; last.current = 0; push(lat, lng, 'simulated'); if (n > 10) clearInterval(sim.current); }, 3000); };
  useEffect(() => stop, [rid]);
  return { sharing, status, toggle, simulate, simulating };
}
function Track(ctx) {
  const { allOrders, go, route, riders, uid } = ctx;
  const mine = allOrders.filter(o=>o.customerUid===uid).map(toProto);
  const o = mine.find(x=>x.id===route.arg) || mine[0];
  if (!o && route.arg) return <div className="page"><Header title="Track order" back={['home']} go={go}/><div className="sk" style={{height:220,borderRadius:22}}/><SkList n={2}/></div>;
  if (!o) return <div className="page"><Header title="My orders" back={['home']} go={go}/><div className="empty">📦<p>No orders yet</p><small className="muted">Your orders and errands will show here.</small><button className="primary" onClick={()=>go('customer')}>Start shopping</button></div></div>;
  const r = riders.find(x=>x.id===o.rider);
  return <TrackView {...ctx} o={o} r={r} mine={mine}/>;
}
function TrackView({ o, r, mine, go }) {
  const [otp, setOtp] = useState(null); useEffect(() => api.watchSecret(o.id, setOtp), [o.id]);
  return (<div className="page"><Header title={`Order ${o.id}`} back={['home']} go={go}/>
    <LiveMap testId="track-map" markers={[
      ...(o.storeId ? [STORES.find(x=>x.id===o.storeId)].filter(Boolean).map(st=>({lat:st.lat,lng:st.lng,emoji:'🏪',label:st.name.split(' ')[0]})) : []),
      { lat:o.dropLat||HUB.lat+0.01, lng:o.dropLng||HUB.lng+0.01, emoji:'🏠', label:'You' },
      ...(r && r.lat && o.status>=1 && o.status<DONE ? [{ lat:r.lat, lng:r.lng, emoji:'🛵', label:r.name }] : []),
    ]} />
    {r && r.locAt && o.status>=3 && o.status<DONE && <p className="muted small">🛰️ Rider location updated {Math.max(0,Math.round((Date.now()-new Date(r.locAt))/1000))}s ago</p>}
    {o.status<0 ? <div className="statecard" data-testid={o.rxStatus==='rejected'?'order-cancelled':'store-rejected'}><h3>{o.rxStatus==='rejected'?'Order cancelled':"Store couldn't take this order"}</h3>
        <p style={{margin:0}}>{o.rxStatus==='rejected'?"The pharmacist couldn't approve the prescription. Nothing to pay — please upload a clear, valid prescription and order again.":'The store is out of stock or closing. Nothing to pay — your other items (if any) are still on the way.'}</p>
        <button className="primary" onClick={()=>go('customer')}>Shop again</button></div>
    : <div className="trackhero" data-testid="track-hero"><small>{o.status>=DONE?'Order complete':'Your order is on its way'}</small><div className="eta">{o.status>=DONE?'Delivered 🎉':`Arriving in ~${Math.max(5,30-o.status*5)} min`}</div>
        <div className="bars6">{STEPS.map((s_,i)=><i key={i} className={i<=o.status?'on':''}/>)}</div></div>}
    <div className="card">
      {o.rxStatus && <p className="small">💊 Prescription: <b>{o.rxStatus}</b></p>}
      <ol className="steps" data-testid="steps">{STEPS.map((s,i)=><li key={s} className={i<=o.status?'done':''}><span/>{s}</li>)}</ol>
    </div>
    {r && <div className="card rider"><div className="sicon" style={{background:'var(--osoft)',fontFamily:'var(--fd)'}}>{r.name[0]}</div><div style={{flex:1}}><b>{r.name}</b> is your rider<br/><small className="muted">📞 {r.phone}</small></div><a className="primary" style={{width:'auto',padding:'0 18px',display:'grid',placeItems:'center',background:'var(--green)',textDecoration:'none',marginTop:0}} href={'tel:'+r.phone}>Call</a></div>}
    {o.status>=0 && o.status<DONE && <div className="otpcard" data-testid="otp-card"><b>Delivery OTP: <span className="otp">{otp ?? o.otp ?? '····'}</span></b><p className="small" style={{margin:'4px 0 0'}}>Only you can see this code. Tell it to the rider when you receive the order.</p></div>}
    <div className="card" data-testid="order-bill">{o.parts>1 && <small className="muted">Part {o.part} of {o.parts} from one checkout (one order per store)</small>}
      {o.type==='errand' ? o.items.map(([n],i)=><div key={i} className="line"><span>{n}</span></div>) : (o.lines||[]).map((l,i)=><div key={i} className="line"><span>{l.name} × {l.qty}</span><span>{rs(l.price*l.qty)}</span></div>)}
      {o.type!=='errand' && <><div className="line"><span>Item total</span><span>{rs(o.subtotal)}</span></div><div className="line"><span>Delivery fee</span><span>{o.fee?rs(o.fee):(o.parts>1&&o.part>1?'on part 1':'FREE')}</span></div>{o.feeNote && <small className="muted">{o.feeNote}</small>}</>}
      <div className="line tot"><span>Total · {PAY_LABEL[o.pay]||o.pay}</span><span>{rs(o.total)}</span></div>
      <small className="muted">{o.paymentStatus==='collected' ? `✅ Paid (${o.collectedVia==='upi'?'UPI':'cash'}) to the rider` : 'Pay the rider when it arrives'}</small></div>
    <p className="muted small">🟢 Live: updates from the store, rider and admin appear here automatically.</p>
    {mine.length>1 && <><h3 className="sec">Other orders</h3>{mine.filter(x=>x.id!==o.id).map(x=><div key={x.id} className="card store" onClick={()=>go('customer','track',x.id)}><b>{x.id}</b> · {x.status<0?(x.rxStatus==='rejected'?'Cancelled':'Store rejected'):STEPS[x.status]} · {rs(x.total)} <span className="muted" style={{marginLeft:'auto'}}>Track →</span></div>)}</>}
  </div>);
}
function BookRider(ctx) {
  const { go } = ctx;
  const [pickup, setPickup] = useState('Saravana Stores, Porur Junction');
  const [drop, setDrop] = useState('Flat 2A, Sri Sai Apartments, Porur');
  const [task, setTask] = useState('Pick up a parcel and hand it over at home');
  const [km, setKm] = useState(3); const [mode, setMode] = useState('trip'); const [hours, setHours] = useState(1);
  const price = mode==='trip' ? SETTINGS.errandBase + Math.max(0, Math.ceil(km-3))*SETTINGS.errandPerKm : SETTINGS.errandHour*hours;
  const [pay, setPay] = useState('COD');
  const book = async () => { const id = await api.bookErrand({ pickup, drop, task, price, pay, riders: ctx.riders, name: ctx.name, dropLat: HUB.lat + 0.01, dropLng: HUB.lng + 0.012 }); go('customer','track',id); };
  return (<div className="page"><Header title="Book a rider" back={['home']} go={go}/><div className="ta small" style={{marginTop:-6}}>ரைடர் புக் செய்யுங்கள்</div>
    <p className="muted">Anything, anywhere in Porur — pick up, drop, buy & bring, queue for you.</p>
    <div className="seg">{[['trip','Per trip'],['hour','Hire by hour']].map(([k,n])=><button key={k} className={mode===k?'on':''} onClick={()=>setMode(k)}>{n}</button>)}</div>
    <label className="lbl">🟢 Pickup</label><input className="inp" value={pickup} onChange={e=>setPickup(e.target.value)}/>
    <label className="lbl">🔴 Drop</label><input className="inp" value={drop} onChange={e=>setDrop(e.target.value)}/>
    <label className="lbl">What should the rider do?</label><textarea className="inp" rows={2} value={task} onChange={e=>setTask(e.target.value)}/>
    <div className="line" style={{alignItems:'center',marginTop:10}}><b>{mode==='trip'?'Estimated distance':'Hours'}</b>
      {mode==='trip' ? <div className="qty"><button aria-label="Less distance" onClick={()=>setKm(k=>Math.max(1,k-1))}>−</button><span>{km} km</span><button aria-label="More distance" onClick={()=>setKm(k=>Math.min(8,k+1))}>+</button></div>
       : <div className="qty"><button aria-label="Fewer hours" onClick={()=>setHours(h=>Math.max(1,h-1))}>−</button><span>{hours} hr</span><button aria-label="More hours" onClick={()=>setHours(h=>Math.min(6,h+1))}>+</button></div>}</div>
    <div className="card bill" style={{background:'var(--yellow)',border:0}}><div className="line tot" style={{border:0}}><span>Estimated price</span><span>{rs(price)}</span></div>
      <small className="muted">{mode==='trip' ? `${rs(SETTINGS.errandBase)} for first 3 km, ${rs(SETTINGS.errandPerKm)} per extra km` : `${rs(SETTINGS.errandHour)} per hour, rider stays with you`} · item cost (if buying) paid separately</small></div>
    <div className="seg">{[['COD','💵 Cash on delivery'],['UPI_DOD','📱 UPI on delivery']].map(([k,n])=><button key={k} className={pay===k?'on':''} onClick={()=>setPay(k)}>{n}</button>)}</div>
    <small className="muted">We assign the nearest available rider automatically.</small>
    <button className="primary" onClick={book}>Book rider · {rs(price)}</button>
  </div>);
}

/* ---------------- RIDER ---------------- */
function Rider({ orders, setOrders, riders, setRiders, me: profile, isAdmin }) {
  const [rid, setRid] = useState(profile?.riderId || 'r1');
  const gps = useRiderGps(rid);
  const [otpIn, setOtpIn] = useState({}); const [msg, setMsg] = useState({});
  const me = riders.find(r=>r.id===rid);
  const mine = orders.filter(o=>o.rider===rid && o.status<DONE);
  const done = orders.filter(o=>o.rider===rid && o.status===DONE);
  const upd = (id, s) => setOrders(os=>os.map(o=>o.id===id?{...o,status:s}:o));
  const [via, setVia] = useState({});
  // The rider never sees the OTP: the code typed here is checked by Firestore rules against the customer's private orderSecrets doc.
  const deliver = async o => { const code = (otpIn[o.id]||'').trim(); if (!/^\d{4}$/.test(code)) return setMsg(m=>({...m,[o.id]:'Enter the 4-digit code from the customer.'}));
    setMsg(m=>({...m,[o.id]:'Checking…'}));
    try { await api.deliver(o.id, code, via[o.id] || (o.pay==='UPI_DOD'?'upi':'cash')); setRiders(rs_=>rs_.map(r=>r.id===rid?{...r,today:r.today+1}:r)); setMsg(m=>({...m,[o.id]:''}));
      if (o.customerPushToken) pushCustomer(o, 'delivered'); }
    catch (e) { setMsg(m=>({...m,[o.id]:/permission/i.test(e.message)?'Wrong OTP. Ask the customer again.':'⚠️ '+e.message})); } };
  const toggle = () => setRiders(rs_=>rs_.map(r=>r.id===rid?{...r,status:r.status==='offline'?'online':'offline'}:r));
  return (<div className="page dark-top">
    <div className="rhead">{isAdmin && profile?.role!=='rider' ? <select value={rid} onChange={e=>setRid(e.target.value)}>{riders.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select> : <b style={{color:'#fff',flex:1}}>🛵 {me?.name}</b>}
      <button className={'pill '+me.status} onClick={toggle}>{me.status==='offline'?'⚪ Offline':'🟢 On duty'}</button></div>
    {me.status!=='offline' && !gps.sharing && !gps.simulating && <div className="blocker" role="alert" data-testid="loc-blocker"><b>📍 Location is off</b>You're on duty but we can't see you, so new orders can't be sent to you. Turn on location to keep receiving orders.
      <button onClick={gps.toggle}>Turn on location</button></div>}
    {me.status==='offline' && <div className="card" style={{textAlign:'center'}} data-testid="rider-offline"><div style={{fontSize:40}}>🛵</div><b className="dd-h" style={{fontSize:20}}>You are offline</b><p className="muted small">Go on duty to start receiving orders and errands.</p><button className="primary y" onClick={toggle}>Go on duty</button></div>}
    <div className="stats3"><div><b>{me.today}</b><small>Done today</small></div><div><b>{rs(me.today*25)}</b><small>Incentive today</small></div><div><b>{mine.length}</b><small>Active</small></div></div>
    <div className="card gpsbar" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><b style={{flex:1}}>🛰️ Live location <small className="muted">{gps.status}</small></b>
      <button className={'chipbtn '+(gps.sharing?'on':'')} data-testid="gps-share" onClick={gps.toggle}>{gps.sharing?'Stop sharing':'Share my GPS'}</button>
      {isTestMode() && <button className="chipbtn" data-testid="gps-sim" onClick={()=>gps.simulate(mine.find(o=>o.status>=3) || mine[0])}>Simulate drive (test)</button>}</div>
    <h3 className="sec">Assigned to you</h3>
    {!mine.length && me.status!=='offline' && <p className="muted">No active tasks. Stay online!</p>}
    {mine.map(o=><div key={o.id} className="card rcard">
      <div className="line"><b>{o.type==='errand'?'🛵 Errand':'📦 Order'} {o.id}</b><span className="badge">{STEPS[o.status]}</span></div>
      <div style={{margin:'8px 0'}}><b>📍 {o.address}</b><br/><small className="muted">👤 {o.customer}</small></div>
      <details><summary>{o.items.length} item{o.items.length>1?'s':''} in this order</summary><ul className="small">{o.items.map(([n,q],i)=><li key={i}>{n} ×{q}</li>)}</ul></details>
      <div className="line"><span>{o.pay==='UPI' ? '✅ Prepaid (legacy demo)' : o.pay==='UPI_DOD' ? '📱 Collect via UPI' : '💵 Collect cash'}</span><b>{rs(o.total)}</b></div>
      {o.type!=='errand' && o.status<2 && <p className="muted small">⏳ Waiting for the store to {o.status===0?'accept':'pack'} the order…</p>}
      {o.type==='errand' && o.status===0 && <button className="primary" onClick={()=>upd(o.id,1)}>Accept errand</button>}
      {(o.status===2 || (o.type==='errand' && o.status===1)) && <button className="primary" onClick={()=>upd(o.id,3)}>Picked up</button>}
      {o.status===3 && <button className="primary" onClick={()=>upd(o.id,4)}>Start trip</button>}
      {o.status===4 && <div className="step"><i>1</i>Collect payment</div>}
      {o.status===4 && o.pay!=='UPI' && <div className="seg">{[['cash','💵 Got cash'],['upi','📱 Got UPI']].map(([k,n])=><button key={k} className={(via[o.id]||(o.pay==='UPI_DOD'?'upi':'cash'))===k?'on':''} onClick={()=>setVia(v=>({...v,[o.id]:k}))}>{n}</button>)}</div>}
      {o.status===4 && <div className="step"><i>2</i>Ask the customer for their 4-digit delivery code</div>}
      {o.status===4 && <div className="otprow"><input aria-label="Customer's 4-digit code" data-testid={'otp-in-'+o.id} className="inp" inputMode="numeric" maxLength={4} placeholder="• • • •" value={otpIn[o.id]||''} onChange={e=>setOtpIn(m=>({...m,[o.id]:e.target.value}))}/><button className="primary" data-testid={'deliver-'+o.id} onClick={()=>deliver(o)}>Delivered</button></div>}
      {msg[o.id] && <p className="err">{msg[o.id]}</p>}
      {o.status===4 && <small className="muted">The code is shown only in the customer's app. Delivery is confirmed when it matches.</small>}
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
        {s<DONE && <select value={o.rider} onChange={e=>assign(o.id,e.target.value)}>{!o.rider && <option value="">⚠️ Unassigned</option>}{riders.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>}</div>)}
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
