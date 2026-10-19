// v0.6 web views for riders (batched drops, deal deliveries) and partners (surplus deals, home cooks, service pros)
import React, { useEffect, useRef, useState } from 'react';
import { models, api, db } from './live.js';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEALS, FOOD_PRODUCTS, FOOD_STORES, parseDeal, validateDeal, isDealLive, fmtLeft, fmtTime, fmtDay, istHourFloat, istDate,
  LUNCH, HYGIENE_ITEMS, ONBOARD_ITEMS, OFFICES, nextLunchDate, lunchCutoffMs, priceOk, SERVICES, KYC_FIELDS, jobPayable } from './models.js';
import { PRODUCTS, STORES } from './data.js';
import { rs, useSub, useNow, Kv, Code, Step, Seg, Chips, Field, Empty, Sk, Err, run } from './v6-common.jsx';

/* ---------------- RIDER: gate drops, lunch runs, deal delivery runs ---------------- */
export function RiderV6({ rid }) {
  const drops = useSub(cb => models.watchRiderDrops(rid, cb), [rid], []); const claims = useSub(cb => models.watchRiderClaims(rid, cb), [rid], []);
  const [code, setCode] = useState({}); const [msg, setMsg] = useState({}); const [via, setVia] = useState({});
  const active = drops.filter(d => d.status !== 'delivered'); const dclaims = claims.filter(c => c.status === 'claimed');
  if (!active.length && !dclaims.length) return null;
  const say = (id, m) => setMsg(x => ({ ...x, [id]: m }));
  return <div className="v6" data-testid="rider-v6"><h3 className="sec">Batched runs</h3>
    {active.map(d => <div key={d.id} className="card rcard" data-testid={'drop-' + d.id}><div className="line"><b>{d.kind === 'meter' ? '🧺 Gate drop' : d.kind === 'lunch' ? '🍱 Lunch run' : '🔥 Deal run'} {d.id}</b><span className="badge">{d.status.replace('_', ' ')}</span></div>
      <p><b>📍 {d.address}</b><br /><small className="muted">{d.title} · {d.slot}</small></p>
      {d.status === 'assigned' && <button className="primary" data-testid={'drop-pick-' + d.id} onClick={() => models.dropPickedUp(d.id).catch(e => say(d.id, e.message))}>Picked up from hub / kitchen</button>}
      {d.status === 'picked_up' && <><div className="step"><i>1</i>Ask the {d.kind === 'meter' ? 'community leader' : 'reception'} for the 4-digit drop code</div>
        <div className="otprow"><input className="inp" aria-label="Drop code" data-testid={'drop-code-' + d.id} inputMode="numeric" maxLength={4} placeholder="• • • •" value={code[d.id] || ''} onChange={e => setCode(c => ({ ...c, [d.id]: e.target.value.replace(/\D/g, '') }))} />
          <button className="primary" data-testid={'drop-done-' + d.id} onClick={async () => { try { await models.dropDelivered(d.id, code[d.id] || ''); say(d.id, ''); } catch (e) { say(d.id, /permission/i.test(e.message) ? 'Wrong code — ask again.' : e.message); } }}>Delivered</button></div></>}
      {msg[d.id] && <p className="err">{msg[d.id]}</p>}</div>)}
    {dclaims.map(c => <div key={c.id} className="card rcard" data-testid={'rclaim-' + c.id}><div className="line"><b>🔥 {c.item} × {c.qty}</b><span className="badge">{c.run || 'deal'}</span></div>
      <p><b>🏪 {c.storeName} → 📍 {c.address}</b><br /><small className="muted">👤 {c.customer} · collect {rs(c.total)} ({c.pay === 'UPI_DOD' ? 'UPI' : 'cash'})</small></p>
      <Seg value={via[c.id] || (c.pay === 'UPI_DOD' ? 'upi' : 'cash')} set={v => setVia(x => ({ ...x, [c.id]: v }))} opts={[['cash', '💵 Got cash'], ['upi', '📱 Got UPI']]} />
      <div className="otprow"><input className="inp" aria-label="Customer code" data-testid={'rclaim-code-' + c.id} inputMode="numeric" maxLength={4} placeholder="• • • •" value={code[c.id] || ''} onChange={e => setCode(x => ({ ...x, [c.id]: e.target.value.replace(/\D/g, '') }))} />
        <button className="primary" data-testid={'rclaim-done-' + c.id} onClick={async () => { try { await models.claimHandover(c.id, code[c.id] || '', 'delivered', via[c.id] || (c.pay === 'UPI_DOD' ? 'upi' : 'cash')); say(c.id, ''); } catch (e) { say(c.id, /permission/i.test(e.message) ? 'Wrong code — ask again.' : e.message); } }}>Delivered</button></div>
      {msg[c.id] && <p className="err">{msg[c.id]}</p>}</div>)}
  </div>;
}

/* ---------------- PARTNER (web): routes by role ---------------- */
export function Partner({ me, user }) {
  if (!me) return <div className="page"><Sk /></div>;
  if ((me.role === 'vendor' || me.role === 'admin') && me.storeId) return <VendorDealsW storeId={me.storeId} />;
  if (me.role === 'cook' && me.cookId) return <CookW cookId={me.cookId} />;
  if (me.role === 'pro' && me.proId) return <ProW proId={me.proId} />;
  return <ApplyW me={me} user={user} />;
}
const ALL_STORES = [...STORES, ...FOOD_STORES];
function useStoreDoc(id) { const [d, setD] = useState(undefined); useEffect(() => id ? onSnapshot(doc(db, 'stores', id), s => setD(s.data() || {}), () => setD({})) : undefined, [id]); return d; }
export function VendorDealsW({ storeId }) {
  const now = useNow(15000); const store = ALL_STORES.find(s => s.id === storeId); const sd = useStoreDoc(storeId); const cfg = useSub(cb => models.watchDealsCfg(cb), []);
  const cap = useSub(cb => models.watchCap(storeId, cb), [storeId], { deals: 0, units: 0 }); const deals = useSub(cb => models.watchStoreDeals(storeId, cb), [storeId]); const claims = useSub(cb => models.watchStoreClaims(storeId, cb), [storeId], []);
  const [hErr, setHErr] = useState({}); // survives the remount caused by a rejected (optimistic) hand-over write
  const [text, setText] = useState(''); const [draft, setDraft] = useState(null); const [msg, setMsg] = useState(''); const [lang, setLang] = useState('ta-IN'); const [rec, setRec] = useState(false); const recRef = useRef(null);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!sd || !deals) return <div className="page v6"><Sk /></div>;
  if (!sd.dealsApproved || !sd.fssaiNo) return <div className="page v6"><Empty testid="deals-locked" emoji="🔒" title="Surplus deals need an FSSAI licence" body="Only FSSAI-licensed kitchens can post surplus food. Send your licence number to the Porur team." /></div>;
  const cat = PRODUCTS.concat(FOOD_PRODUCTS).filter((p, i, a) => p.store === storeId && a.findIndex(x => x.id === p.id) === i).map(p => ({ ...p, kw: FOOD_PRODUCTS.find(f => f.id === p.id)?.kw || p.kw }));
  const h = istHourFloat(now); const inWin = cfg?.anyTime || (h >= (cfg?.fromHour ?? 21) && h < (cfg?.toHour ?? 23));
  const blocked = cfg?.killAll ? 'Deals are paused across Porur right now.' : sd.dealsPaused ? `Your deals are paused: ${sd.pauseReason || 'quality review'}.` : !inWin ? `Deals can go live between ${cfg?.fromHour ?? 21}:00 and ${cfg?.toHour ?? 23}:00.` : '';
  const mic = () => { if (!SR) return; if (rec) { recRef.current?.stop(); return; } const r = new SR(); r.lang = lang; r.interimResults = true; recRef.current = r; setRec(true);
    r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(' '); setText(t); if (e.results[e.results.length - 1].isFinal) setDraft(parseDeal(t, cat)); }; r.onend = () => setRec(false); r.onerror = e => { setRec(false); setMsg('Voice: ' + e.error); }; r.start(); };
  const live = deals.filter(d => isDealLive(d, now)); const open = claims.filter(c => c.status === 'claimed');
  return <div className="page v6" data-testid="vendor-deals"><div className="hero6" style={{ background: '#F26A2E' }}><span className="k">🔥 {store?.name?.toUpperCase()}</span><h2>Post tonight's surplus</h2><div className="ta small" style={{ color: 'var(--ink)' }}>மீதமுள்ள உணவை விற்கவும் — பேசுங்கள் அல்லது டைப் செய்யுங்கள்</div>
    <p className="small" data-testid="deal-cap"><b>Tonight: {cap.deals}/{DEALS.capDeals} deals · {cap.units}/{DEALS.capUnits} portions · ≥30% off · 60–90 min</b></p></div>
    {blocked && <div className="warnbar" data-testid="deal-blocked">{blocked}</div>}
    {!draft ? <div className="card" data-testid="deal-input"><b>Say it like: “பத்து பிரியாணி நூறு ரூபாய் தள்ளுபடி” or “5 parotta at 40% off for 90 minutes”</b>
      <Chips value={lang} set={setLang} opts={[['ta-IN', 'தமிழ்'], ['en-IN', 'English']]} />
      {SR && <button className="bigmic" data-testid="deal-mic" aria-label="Speak your deal" onClick={mic} style={{ display: 'block', margin: '8px auto', width: 84, height: 84, borderRadius: 42, background: rec ? 'var(--red)' : 'var(--ink)', color: '#fff', fontSize: 32, border: 0 }}>{rec ? '■' : '🎤'}</button>}
      <textarea className="inp" data-testid="deal-text" aria-label="Deal text" style={{ width: '100%', minHeight: 72, boxSizing: 'border-box' }} value={text} onChange={e => setText(e.target.value)} placeholder={SR ? 'Or type it here' : 'Type your deal here'} />
      {msg && <p className="err small">{msg}</p>}
      <button className="primary" data-testid="deal-parse" disabled={!text.trim()} onClick={() => setDraft(parseDeal(text, cat))}>Next: check details</button>
      <button className="ghost" data-testid="deal-form" onClick={() => setDraft({ minutes: 60, fulfil: 'pickup', notes: [] })}>Fill a form instead</button></div>
      : <ConfirmDeal draft={draft} cat={cat} cap={cap} blocked={blocked} store={store} sd={sd} transcript={text} done={m => { setDraft(null); setText(''); setMsg(''); setTimeout(() => setMsg(m), 0); }} back={() => setDraft(null)} />}
    {msg && !draft && msg.includes('live') && <div className="okbar" data-testid="deal-published">✅ {msg}</div>}
    <h3 className="sec">Live now ({live.length})</h3>{!live.length ? <p className="muted">No live deals.</p> : live.map(d => <div key={d.id} className="card" data-testid={'vd-' + d.id}><Kv k={`${d.emoji || ''} ${d.item} · ${rs(d.dealPrice)} (${d.discountPct}% off)`} v={`${d.qtyLeft}/${d.qtyTotal} left`} />
      <small className="muted">Ends in {fmtLeft(d.expiresAtMs - now)} · {d.fulfil === 'both' ? 'pickup + delivery' : 'pickup only'}</small><button className="ghost" onClick={() => models.removeDeal(d.id)}>Stop this deal</button></div>)}
    <h3 className="sec">Pickups to hand over ({open.length})</h3>{!open.length ? <p className="muted">Nobody waiting.</p> : open.map(c => <Handover key={c.id} c={c} now={now} err={hErr[c.id] || ''} setErr={m => setHErr(x => ({ ...x, [c.id]: m }))} />)}
  </div>;
}
function ConfirmDeal({ draft, cat, cap, blocked, store, sd, transcript, done, back }) {
  const [pid, setPid] = useState(draft.productId || ''); const p = cat.find(x => x.id === pid); const [qty, setQty] = useState(draft.qty || 5); const [price, setPrice] = useState(draft.dealPrice ? String(draft.dealPrice) : '');
  const [mins, setMins] = useState(draft.minutes || 60); const [ful, setFul] = useState(draft.fulfil || 'pickup'); const [prep, setPrep] = useState(fmtTime(Date.now() - 30 * 60e3)); const [allergens, setAllergens] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (p && !price && draft.offPct != null) setPrice(String(Math.round(p.price * (1 - draft.offPct / 100)))); else if (p && !price && draft.offRs != null) setPrice(String(p.price - draft.offRs)); }, [pid]);
  const v = p ? validateDeal({ qty, regularPrice: p.price, dealPrice: Number(price), minutes: mins }, cap) : null;
  const publish = async () => { setErr(''); setBusy(true); try { await models.createDeal({ id: store.id, name: store.name, fssaiNo: sd.fssaiNo, lat: store.lat, lng: store.lng }, { id: p.id, name: p.name, ta: p.ta, emoji: p.emoji, price: p.price, veg: FOOD_PRODUCTS.find(f => f.id === p.id)?.veg ?? p.veg },
    { qty, dealPrice: Number(price), minutes: mins, fulfil: ful, preparedAt: prep.trim() || 'today', allergens: allergens.trim() || undefined, transcript: transcript.trim() || undefined });
    done(`${qty} × ${p.name} is live at ${rs(Number(price))} for ${mins} min. Nearby customers who opted in get one alert.`); } catch (e) { setErr(/permission/i.test(e.message) ? "Not allowed right now — check the time window, price (≥30% off) and tonight's limits." : e.message); } finally { setBusy(false); } };
  return <div className="card" data-testid="deal-confirm" style={{ border: '2px solid var(--ink)' }}><b className="dd-h" style={{ fontSize: 20 }}>Check & confirm</b><div className="ta small">சரிபார்த்து உறுதி செய்யுங்கள்</div>
    {transcript && <p className="small" data-testid="deal-heard">Heard: “{transcript}”</p>}{draft.notes.map(n => <p key={n} className="err small">{n}</p>)}
    <b className="small">Item</b><Chips value={pid} set={setPid} opts={cat.map(x => [x.id, `${x.emoji} ${x.name} ₹${x.price}`])} testid="dp" />
    <div className="kv"><b>Portions</b><Step v={qty} set={n => setQty(Math.max(1, Math.min(DEALS.capUnits, n)))} testid="deal-qty" min={1} /></div>
    <Field label={p ? `Deal price (₹) — regular ${rs(p.price)}, max ${rs(Math.floor(p.price * DEALS.maxPriceRatio))}` : 'Deal price (₹)'} value={price} set={setPrice} testid="deal-price" inputMode="numeric" maxLength={4} />
    <b className="small">Runs for</b><Chips value={mins} set={setMins} opts={[[60, '60 min'], [75, '75 min'], [90, '90 min']]} testid="dm" />
    <Seg value={ful} set={setFul} opts={[['pickup', '🏃 Pickup only'], ['both', `+ ₹${DEALS.deliveryFee} delivery`]]} />
    <Field label="Cooked at" value={prep} set={setPrep} testid="deal-prep" maxLength={20} /><Field label="Allergens (optional)" value={allergens} set={setAllergens} placeholder="nuts, dairy…" maxLength={60} />
    {v && <div data-testid="deal-checks">{v.errors.map(e => <p key={e} className="err small">✕ {e}</p>)}{v.warnings.map(w => <p key={w} className="small" style={{ color: '#9A3412' }}>! {w}</p>)}{v.ok && <p className="ok small"><b>✓ {v.pct}% off · within tonight's limits</b></p>}</div>}
    <Err e={err} /><button className="primary y" data-testid="deal-publish" disabled={busy || !p || !v?.ok || !!blocked} onClick={publish}>{busy ? 'Publishing…' : 'Confirm & go live'}</button><button className="ghost" onClick={back}>← Back</button></div>;
}
function Handover({ c, now, err, setErr }) {
  const [code, setCode] = useState(''); const [via, setVia] = useState('upi');
  if (c.fulfil === 'delivery') return <div className="card"><Kv k={`🛵 ${c.item} × ${c.qty} · ${c.customer}`} v={c.rider ? 'rider ' + c.rider : 'awaiting rider'} /><small className="muted">Pack it — the batched run picks up at {DEALS.runs.join(' / ')}.</small></div>;
  return <div className="card" data-testid={'vc-' + c.id}><Kv k={`${c.item} × ${c.qty} · ${c.customer}`} v={rs(c.total)} /><small className="muted">Collect before {fmtTime(c.expiresAtMs)}</small>
    <Field label="Pickup code" value={code} set={v => setCode(v.replace(/\D/g, ''))} testid="vc-code" inputMode="numeric" maxLength={4} /><div style={{ marginTop: 6 }}><Seg value={via} set={setVia} opts={[['upi', '📱 UPI'], ['cash', '💵 Cash']]} /></div><Err e={err} />
    <button className="primary" style={{ background: 'var(--green)' }} data-testid="vc-handover" disabled={code.length !== 4} onClick={() => { setErr(''); models.claimHandover(c.id, code, 'picked_up', via).catch(() => setErr('Wrong code — ask the customer to show the code in their app.')); }}>Handed over</button>
    {now > c.expiresAtMs && <button className="ghost" onClick={() => models.claimNoShow(c.id).catch(e => setErr(e.message))}>No-show</button>}</div>;
}
/* ---- apply as cook / pro ---- */
function ApplyW({ me }) {
  const [kind, setKind] = useState('cook'); const k = me.request?.role; const app = useSub(cb => (k === 'cook' || k === 'pro') ? models.watchApplication(k, cb) : undefined, [k]);
  if (me.request && app?.status !== 'rejected') return <div className="page v6" data-testid="pending"><div className="card"><b className="dd-h" style={{ fontSize: 20 }}>⏳ Waiting for approval</b><p className="muted small">You asked to join as a {k === 'cook' ? 'home cook' : k === 'pro' ? 'service pro' : k}. The Porur team checks {k === 'cook' ? 'your FSSAI registration and books a kitchen visit' : 'your ID and police verification'} — this page updates automatically.</p></div></div>;
  return <div className="page v6"><h2 className="dd-h">Partner with Porur</h2>{app?.status === 'rejected' && <div className="statecard" data-testid="rejected"><h3>Application not approved</h3>{app.reason}</div>}
    <Seg value={kind} set={setKind} opts={[['cook', '👩‍🍳 Home cook'], ['pro', '🛠️ Service pro']]} />{kind === 'cook' ? <CookApply /> : <ProApply />}
    <p className="muted small">Grocery / pharmacy stores and kitchens: use the Porur Partner app to request store access.</p></div>;
}
function CookApply() {
  const [f, setF] = useState({ name: '', kitchen: '', area: 'Porur', fssaiNo: '', fssaiExpiry: '', capacity: '20' }); const [nonVeg, setNonVeg] = useState(false); const [chk, setChk] = useState({}); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const up = k => v => setF(x => ({ ...x, [k]: v }));
  const go = async () => { setErr(''); if (!f.name.trim() || !f.kitchen.trim()) return setErr('Add your name and kitchen name.'); if (!/^[0-9]{14}$/.test(f.fssaiNo.trim())) return setErr('FSSAI registration number is 14 digits.'); if (!ONBOARD_ITEMS.every(([x]) => chk[x])) return setErr('Tick every onboarding item.');
    setBusy(true); try { await models.apply('cook', { ...f, fssaiNo: f.fssaiNo.trim(), capacity: Number(f.capacity) || 20, veg: true, nonVeg, checklist: chk }); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <div className="card" data-testid="cook-form"><p className="muted small">Cook office lunches (₹130–150 a pack) from your home kitchen. You need a basic FSSAI registration (₹100/yr).</p>
    <Field label="Your name" value={f.name} set={up('name')} testid="cook-name" /><Field label="Kitchen name" value={f.kitchen} set={up('kitchen')} testid="cook-kitchen" /><Field label="Area" value={f.area} set={up('area')} />
    <Field label="FSSAI registration no. (14 digits)" value={f.fssaiNo} set={up('fssaiNo')} testid="cook-fssai" inputMode="numeric" maxLength={14} /><Field label="FSSAI valid until" value={f.fssaiExpiry} set={up('fssaiExpiry')} testid="cook-fssai-exp" placeholder="YYYY-MM-DD" />
    <Field label="Packs per day" value={f.capacity} set={up('capacity')} testid="cook-capacity" inputMode="numeric" maxLength={3} /><Chips value={nonVeg ? 'nv' : ''} set={() => setNonVeg(!nonVeg)} opts={[['nv', '🔴 I also cook non-veg']]} testid="cook" />
    <b className="small">Hygiene & onboarding</b>{ONBOARD_ITEMS.map(([k, l]) => <label key={k} className="kv" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}><input type="checkbox" data-testid={'onb-' + k} style={{ width: 24, height: 24 }} checked={!!chk[k]} onChange={() => setChk(c => ({ ...c, [k]: !c[k] }))} />{l}</label>)}
    <Err e={err} /><button className="primary" data-testid="cook-apply" disabled={busy} onClick={go}>{busy ? 'Sending…' : 'Apply as a home cook'}</button></div>;
}
function ProApply() {
  const [name, setName] = useState(''); const [skills, setSkills] = useState([]); const [kyc, setKyc] = useState({ idType: 'Aadhaar' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { setErr(''); if (!name.trim()) return setErr('Add your name.'); if (!skills.length) return setErr('Pick at least one skill.'); if (!/^[0-9]{4}$/.test(kyc.idLast4 || '')) return setErr('Enter only the LAST 4 digits of your ID.');
    setBusy(true); try { await models.apply('pro', { name: name.trim(), area: 'Porur', skills, ...kyc, police: kyc.policeRef ? 'submitted' : 'pending' }); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <div className="card" data-testid="pro-form"><p className="muted small">Plumbing, electrical, appliance and deep-cleaning jobs near Porur. ₹149 inspection + your quote; 85% to you. Police verification required.</p>
    <Field label="Your name" value={name} set={setName} testid="pro-name" /><b className="small">Skills</b><Chips value={skills} set={x => setSkills(s => s.includes(x) ? s.filter(y => y !== x) : [...s, x])} opts={SERVICES.map(x => [x.id, `${x.emoji} ${x.name}`])} testid="skill" />
    <p className="muted small">KYC — we never store your full Aadhaar number.</p>{KYC_FIELDS.map(([k, l]) => <Field key={k} label={l} value={kyc[k] || ''} set={v => setKyc(x => ({ ...x, [k]: v }))} testid={'kyc-' + k} maxLength={k === 'idLast4' ? 4 : 40} />)}
    <Err e={err} /><button className="primary" data-testid="pro-apply" disabled={busy} onClick={go}>{busy ? 'Sending…' : 'Apply as a service pro'}</button></div>;
}
/* ---- cook dashboard ---- */
const dayMs = d => Date.parse(d + 'T06:30:00Z'); const NEXT = { placed: 'confirmed', confirmed: 'cooking', cooking: 'ready' };
export function CookW({ cookId }) {
  const now = useNow(60000); const cooks = useSub(cb => models.watchCooks(cb), [], []); const menus = useSub(cb => models.watchCookMenus(cookId, cb), [cookId]); const orders = useSub(cb => models.watchCookOrders(cookId, cb), [cookId], []); const [err, setErr] = useState('');
  const cook = cooks.find(c => c.id === cookId); if (!cook || !menus) return <div className="page v6"><Sk /></div>;
  const next = nextLunchDate(now), today = istDate(now); const live = orders.filter(o => o.status !== 'cancelled'); const dates = [...new Set([today, next, ...live.map(o => o.date)])].filter(d => d >= today).sort().slice(0, 3);
  return <div className="page v6" data-testid="cook-home"><h2 className="dd-h">👩‍🍳 {cook.kitchen}</h2><small className="muted">{cook.name} · FSSAI {cook.fssaiNo} · ★ {cook.rating || 'new'}</small>
    {cook.status === 'paused' && <div className="warnbar">Your kitchen is paused by Porur.</div>}
    <MenuEditor cook={cook} date={next} menu={menus.find(m => m.date === next)} now={now} /><Err e={err} />
    {dates.map(d => { const os = live.filter(o => o.date === d); const menu = menus.find(m => m.date === d);
      return <div key={d}><h3 className="sec">{d === today ? 'Today' : fmtDay(dayMs(d))} · {os.length} orders <span className="ta small">{os.reduce((a, o) => a + o.vegPacks, 0)} veg · {os.reduce((a, o) => a + o.nonVegPacks, 0)} non-veg · {LUNCH.slot}</span></h3>
        {menu && d === today && <Checklist menu={menu} />}
        {!os.length ? <p className="muted">No orders yet.</p> : OFFICES.filter(off => os.some(o => o.officeId === off.id)).map(off => <div key={off.id} className="card" data-testid={'cook-office-' + off.id}><b>{off.short}</b>
          {os.filter(o => o.officeId === off.id).map(o => { const ck = menus.find(m => m.id === o.menuId)?.checklistDone; return <div key={o.id} data-testid={'co-' + o.id} style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6 }}><Kv k={o.company + (o.floor ? ' · ' + o.floor : '')} v={o.status} /><small>🟢 {o.vegPacks} · 🔴 {o.nonVegPacks} · {rs(o.total)}</small>
            {NEXT[o.status] && <button className="primary" data-testid={'cook-next-' + o.id} disabled={NEXT[o.status] === 'ready' && !ck} onClick={() => models.setLunchStatus(o.id, NEXT[o.status]).catch(e => setErr(e.message))}>Mark {NEXT[o.status]}{NEXT[o.status] === 'ready' && !ck ? ' (finish hygiene checklist)' : ''}</button>}</div>; })}</div>)}</div>; })}
  </div>;
}
function MenuEditor({ cook, date, menu, now }) {
  const [vd, setVd] = useState(menu?.vegDish || 'Sambar rice, poriyal, curd rice'); const [vp, setVp] = useState(String(menu?.vegPrice || 130)); const [nd, setNd] = useState(menu?.nonVegDish || (cook.nonVeg ? 'Chicken curry meals' : '')); const [np, setNp] = useState(String(menu?.nonVegPrice || (cook.nonVeg ? 150 : '')));
  const [cap, setCap] = useState(String(menu?.capacity || cook.capacity || 20)); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (menu) { setVd(menu.vegDish); setVp(String(menu.vegPrice)); setNd(menu.nonVegDish || ''); setNp(menu.nonVegPrice ? String(menu.nonVegPrice) : ''); setCap(String(menu.capacity)); } }, [menu?.id]);
  const npn = nd.trim() ? Number(np) : undefined; const bad = !priceOk(Number(vp)) || (npn != null && !priceOk(npn)) ? `Price must be ₹${LUNCH.minPrice}–${LUNCH.maxPrice} per pack.` : ''; const closed = now >= lunchCutoffMs(date);
  return <div className="card" data-testid="menu-editor" style={{ border: '2px solid var(--ink)' }}><b className="dd-h" style={{ fontSize: 18 }}>Menu for {fmtDay(dayMs(date))}</b><br /><small className="muted">{menu ? `${menu.booked} / ${menu.capacity} booked · ` : ''}orders close in {fmtLeft(lunchCutoffMs(date) - now)}</small>
    <Field label="🟢 Veg meal" value={vd} set={setVd} testid="menu-veg" /><Field label="Veg price (₹)" value={vp} set={setVp} testid="menu-veg-price" inputMode="numeric" maxLength={3} />
    <Field label="🔴 Non-veg meal (optional)" value={nd} set={setNd} testid="menu-nv" />{nd.trim() && <Field label="Non-veg price (₹)" value={np} set={setNp} testid="menu-nv-price" inputMode="numeric" maxLength={3} />}
    <Field label="Max packs" value={cap} set={setCap} testid="menu-cap" inputMode="numeric" maxLength={3} />{bad && <p className="err small">{bad}</p>}{msg && <p className={msg.startsWith('Saved') ? 'ok small' : 'err small'} data-testid="menu-msg"><b>{msg}</b></p>}
    <button className="primary y" data-testid="menu-save" disabled={busy || !!bad || closed || !vd.trim()} onClick={async () => { setBusy(true); setMsg(''); try { await models.saveMenu(cook, date, { vegDish: vd.trim(), vegPrice: Number(vp), ...(npn != null ? { nonVegDish: nd.trim(), nonVegPrice: npn } : {}), capacity: Math.max(1, Math.min(200, Math.round(Number(cap) || 20))) }); setMsg('Saved — customers can order now.'); } catch (e) { setMsg(e.message); } finally { setBusy(false); } }}>{busy ? 'Saving…' : menu ? 'Update menu' : 'Publish menu'}</button></div>;
}
function Checklist({ menu }) {
  const [c, setC] = useState(menu.checklist || {}); useEffect(() => setC(menu.checklist || {}), [menu.id]);
  const toggle = k => { const n = { ...c, [k]: !c[k] }; setC(n); models.saveChecklist(menu.id, n, HYGIENE_ITEMS.every(([x]) => n[x])).catch(() => {}); };
  return <div className="card" data-testid="hygiene" style={{ background: menu.checklistDone ? '#DDF3E1' : '#FFF1C7' }}><b>{menu.checklistDone ? '✅ Hygiene checklist done' : '🧼 Before you cook — hygiene checklist'}</b>
    {HYGIENE_ITEMS.map(([k, l]) => <label key={k} className="kv" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}><input type="checkbox" data-testid={'hyg-' + k} style={{ width: 24, height: 24 }} checked={!!c[k]} onChange={() => toggle(k)} />{l}</label>)}</div>;
}
/* ---- pro dashboard ---- */
const LBL = { assigned: 'New', en_route: 'On the way', started: 'Inspecting', quoted: 'Waiting for customer', quote_approved: 'Approved — do the work', quote_declined: 'Declined — inspection only', done: 'Done', cancelled: 'Cancelled', requested: 'Requested' };
export function ProW({ proId }) {
  const pros = useSub(cb => models.watchPros(cb), [], []); const jobs = useSub(cb => models.watchProJobs(proId, cb), [proId]); const pro = pros.find(p => p.id === proId);
  if (!pro || !jobs) return <div className="page v6"><Sk /></div>;
  const active = jobs.filter(j => !['done', 'cancelled'].includes(j.status)), done = jobs.filter(j => j.status === 'done');
  return <div className="page v6" data-testid="pro-home"><h2 className="dd-h">🛠️ {pro.name}</h2><small className="muted">{pro.skills.map(s => SERVICES.find(x => x.id === s)?.name).join(' · ')} · ★ {pro.rating || 'new'} ({pro.ratingCount}) · {pro.policeVerified ? 'police-verified ✓' : 'police check pending'}</small>
    <div className="stats3"><div><b>{done.length}</b><small>Jobs done</small></div><div data-testid="pro-earned"><b>{rs(done.reduce((a, j) => a + jobPayable(j), 0) * 0.85)}</b><small>Your 85%</small></div><div><b>{active.length}</b><small>Upcoming</small></div></div>
    <h3 className="sec">Upcoming</h3>{!active.length ? <Empty testid="pro-empty" emoji="🧰" title="No jobs right now" body="New bookings in your skills appear here automatically." /> : active.map(j => <ProJob key={j.id} j={j} />)}
    {done.length > 0 && <><h3 className="sec">Completed</h3>{done.slice(0, 10).map(j => <div key={j.id} className="card"><Kv k={`${j.serviceName} · ${fmtDay(j.slotStartMs)}`} v={rs(jobPayable(j))} />{j.rating && <small className="muted">{'★'.repeat(j.rating)} {j.review}</small>}</div>)}</>}</div>;
}
function ProJob({ j }) {
  const [otp, setOtp] = useState(''); const [lines, setLines] = useState([]); const [lab, setLab] = useState(''); const [amt, setAmt] = useState(''); const [via, setVia] = useState('upi'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const svc = SERVICES.find(x => x.id === j.serviceId);
  const R = (f, bad = 'Wrong OTP — ask the customer to read it from their app.') => async () => { setErr(''); setBusy(true); try { await f(); setOtp(''); } catch (e) { setErr(/permission/i.test(e.message) ? bad : e.message); } finally { setBusy(false); } };
  return <div className="card" data-testid={'pj-' + j.id} style={{ border: '2px solid var(--ink)' }}><div className="kv"><b>{svc?.emoji} {j.serviceName}{j.warrantyOf ? ' · WARRANTY' : ''}</b><span className="tag6 y">{LBL[j.status]}</span></div>
    <small><b>{fmtDay(j.slotStartMs)} · {j.slotLabel}</b> · {j.customer} · {j.phone}</small><br /><small>📍 {j.address}</small><br /><small className="muted">“{j.problem}”</small><Err e={err} />
    {j.status === 'assigned' && <button className="primary" data-testid="pj-enroute" disabled={busy} onClick={R(() => models.jobEnRoute(j.id), 'Could not update')}>I'm on my way</button>}
    {['assigned', 'en_route'].includes(j.status) && <><Field label="Start OTP (from the customer)" value={otp} set={v => setOtp(v.replace(/\D/g, ''))} testid="pj-start-otp" inputMode="numeric" maxLength={4} /><button className="primary y" data-testid="pj-start" disabled={busy || otp.length !== 4} onClick={R(() => models.jobStart(j.id, otp))}>Start inspection</button></>}
    {j.status === 'started' && <><p className="small"><b>Quote (inspection {rs(j.inspectionFee)} already counted)</b></p><div className="chiprow">{svc?.rateCard.map(([l, a]) => <button key={l} className="chipbtn" data-testid={'rc-' + l.slice(0, 6)} onClick={() => setLines(x => [...x, { label: l, amount: a }])}>{l} ₹{a}</button>)}</div>
      <div style={{ display: 'flex', gap: 8 }}><div style={{ flex: 2 }}><Field label="Other item / part" value={lab} set={setLab} testid="pj-line" /></div><div style={{ flex: 1 }}><Field label="₹" value={amt} set={setAmt} testid="pj-amt" inputMode="numeric" maxLength={5} /></div></div>
      <button className="ghost" disabled={!lab.trim() || !(Number(amt) > 0)} onClick={() => { setLines(x => [...x, { label: lab.trim(), amount: Number(amt) }]); setLab(''); setAmt(''); }}>+ Add line</button>
      {lines.map((l, i) => <Kv key={i} k={l.label} v={rs(l.amount)} />)}<button className="primary y" data-testid="pj-quote" disabled={busy || !lines.length || lines.length > 10} onClick={R(() => models.jobQuote(j.id, lines), 'Could not send quote')}>Send quote · {rs(lines.reduce((a, l) => a + l.amount, 0))}</button></>}
    {j.status === 'quoted' && <p className="muted small">Waiting for the customer to approve {rs(j.quoteTotal || 0)}…</p>}
    {['quote_approved', 'quote_declined'].includes(j.status) && <><Kv b k="Collect" v={rs(jobPayable(j))} testid="pj-collect" /><Seg value={via} set={setVia} opts={[['upi', '📱 UPI'], ['cash', '💵 Cash']]} />
      <Field label="Finish OTP (from the customer)" value={otp} set={v => setOtp(v.replace(/\D/g, ''))} testid="pj-finish-otp" inputMode="numeric" maxLength={4} /><button className="primary" style={{ background: 'var(--green)' }} data-testid="pj-finish" disabled={busy || otp.length !== 4} onClick={R(() => models.jobFinish(j.id, otp, via))}>Finish job & collected</button></>}</div>;
}
