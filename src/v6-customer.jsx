// v0.6 customer web screens: group-buy meter, leader, office lunch, home services, flash deals
import React, { useEffect, useMemo, useState } from 'react';
import { models, api, notify } from './live.js';
import { METER, SAMPLE_BASKET, basketTotals, meterForecast, fmtLeft, fmtDay, fmtTime, shareText, joinLink, walletBalance, leaderEarnings,
  LUNCH, OFFICES, nextLunchDate, lunchTotals, lunchCutoffMs, SERVICES, SERVICE_FEE, SLOTS, WARRANTY_DAYS, JOB_STEPS, slotStartMs, istDate, jobPayable, inWarranty, HOUR, DAY,
  DEALS, AREAS, isDealLive, kmBetween, shouldPush } from './models.js';
import { rs, useSub, useNow, MeterBar, Kv, Code, Step, Seg, Chips, Stars, Field, Empty, Sk, Err, run } from './v6-common.jsx';

const H = ({ title, go, back = 'home' }) => <header className="hdr"><button className="back" aria-label="Back" onClick={() => go('customer', back)}>←</button><h2>{title}</h2></header>;
export const MORE = [
  { id: 'meter', en: 'Group buy', ta: 'குழு வாங்குதல்', k: 'Up to 25% off · weekly', em: '🧺', cls: 'dark' },
  { id: 'deals', en: "Tonight's deals", ta: 'இன்றைய சலுகை', k: '9–11 pm · 30%+ off', em: '🔥', bg: 'var(--orange2,#F26A2E)' },
  { id: 'lunch', en: 'Office lunch', ta: 'அலுவலக சாப்பாடு', k: '₹130–150 · 5+ packs', em: '🍱', bg: 'var(--yellow)' },
  { id: 'services', en: 'Home services', ta: 'வீட்டு சேவை', k: 'Verified · ₹149 visit', em: '🛠️', bg: '#E1EBFF' },
];
export function MoreWays({ go, t }) {
  return <><h3 className="sec" data-testid="more-ways">{t('More ways to save', 'மேலும் சேமிக்க')}</h3>
    <div className="ta small" style={{ marginTop: -6, marginBottom: 10 }}>{t("Group buys, office lunch, home services & tonight's deals", 'குழு வாங்குதல் · அலுவலக சாப்பாடு · வீட்டு சேவை · இன்றைய சலுகை')}</div>
    <div className="mways">{MORE.map(m => <button key={m.id} data-testid={'more-' + m.id} className={m.cls || ''} style={m.bg ? { background: m.bg } : undefined} onClick={() => go('customer', m.id)}>
      <span className="k">{m.k}</span><b>{m.en}</b><small>{m.ta}</small><span className="em">{m.em}</span></button>)}</div></>;
}
/* in-app deal alert while the tab is open (same rule as the Cloud Function push) */
export function useDealAlerts(user) {
  useEffect(() => { if (!user) return; let prefs = null; const seen = new Set(); let first = true;
    const a = models.watchPrefs(p => { prefs = p; }); const b = models.watchLiveDeals(ds => { const fresh = ds.filter(d => !seen.has(d.id)); ds.forEach(d => seen.add(d.id)); if (first) { first = false; return; }
      const d = fresh.find(x => prefs && !shouldPush(prefs, x)); if (d) notify(`🔥 ${d.discountPct}% off ${d.item}`, `${d.storeName} · ₹${d.dealPrice} · only ${d.qtyLeft} left`); });
    return () => { a(); b(); }; }, [user?.uid]);
}

/* ---------------- GROUP BUY ---------------- */
export function MeterW({ go, me, route }) {
  const now = useNow(30000); const comms = useSub(cb => models.watchCommunities(cb), []); const meters = useSub(cb => models.watchMeters('porur-west', cb), []);
  const mine = useSub(cb => models.watchMyBaskets(cb), [], []); const wallet = useSub(cb => models.watchWallet(cb), [], []); const drops = useSub(cb => models.watchDropsFor('uids', api.uid(), cb), [], []);
  const meter = meters?.find(m => m.status === 'open') || meters?.[0]; const list = useSub(cb => meter?.listId ? models.watchList(meter.listId, cb) : undefined, [meter?.listId]);
  const [cid, setCid] = useState(route.arg || me?.communityId || localStorage.getItem('pd_comm') || ''); const [flat, setFlat] = useState(me?.flat || ''); const [sel, setSel] = useState({}); const [pay, setPay] = useState('COD');
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (me?.flat && !flat) setFlat(me.flat); }, [me?.flat]);
  const tot = useMemo(() => basketTotals(Object.entries(sel).map(([skuId, qty]) => ({ skuId, qty })), list?.skus || []), [sel, list]);
  if (!comms || !meters) return <div className="page v6"><H title="Group buy" go={go} /><Sk n={4} /></div>;
  if (!meter) return <div className="page v6"><H title="Group buy" go={go} /><Empty testid="meter-empty" emoji="🧺" title="No group buy open right now" body="A new weekly meter opens every Sunday." /></div>;
  const fc = meterForecast(meter, now); const open = meter.status === 'open' && now < meter.cutoffMs; const current = mine.find(o => o.meterId === meter.id && o.status !== 'cancelled');
  const community = comms.find(c => c.id === cid); const bal = walletBalance(wallet);
  const share = () => { const text = shareText(meter, joinLink(cid || undefined)); if (navigator.share) navigator.share({ text }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); };
  const commit = async () => { setErr(''); setOk(''); if (!community) return setErr('Pick your apartment / community first.'); if (!flat.trim()) return setErr('Add your flat / door number.');
    setBusy(true); try { localStorage.setItem('pd_comm', community.id); if (flat !== me?.flat) api.updateMe({ flat: flat.trim() }).catch(() => {}); await models.commitBasket(meter, list, community, flat.trim(), sel, pay); setSel({}); setOk('Basket committed! You pay on delivery — never more than the Sunday price.'); }
    catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <div className="page v6" data-testid="meter-screen"><H title="Group buy" go={go} />
    <div className="hero6 dark" data-testid="meter-hero"><span className="k">🧺 {meter.clusterName.toUpperCase()} · WEEK OF {fmtDay(meter.cutoffMs).toUpperCase()}</span>
      <h2>{fc.left > 0 ? `${fc.left} more baskets to unlock the lower price` : 'Meter full — lower price unlocked!'}</h2><div className="ta small">100 கூடைகள் சேர்ந்தால் விலை குறையும்</div>
      <div style={{ marginTop: 12 }}><MeterBar count={meter.count} threshold={meter.threshold} testid="meter-bar" /></div>
      <div className="tiles2"><div><small>Closes in</small><b data-testid="meter-countdown">{open ? fmtLeft(meter.cutoffMs - now) : 'closed'}</b><small>Sat 9 pm cutoff</small></div>
        <div><small>Expected delivery</small><b data-testid="meter-eta">{fmtDay(fc.deliveryMs)}</b><small>{fc.fillMs ? METER.fillSlot : '9–11 am'} at your gate</small></div></div>
      <p className="small" style={{ color: '#E9E4D8' }} data-testid="meter-forecast">{fc.text}</p>
      <button className="primary y" data-testid="meter-share" onClick={share}>📣 Share with neighbours (WhatsApp)</button></div>
    <div className="card" data-testid="meter-tiers"><Kv k="🟡 Meter fills (100 baskets)" v="Fill price · 7–9 am" /><Kv k="⚪ Doesn't fill by Sat 9 pm" v="Sunday price · Sun 9–11 am" />
      <p className="muted small">You commit at the Sunday price — the most you'll pay. Pay cash or UPI to your community leader on delivery. If it fills you simply pay the lower price. Line refunds go to your Porur wallet and come off your next basket.</p></div>
    {bal > 0 && <div className="okbar" data-testid="meter-wallet">👛 Wallet: {rs(bal)} credit — applied to your next basket</div>}
    {current ? <MyBasket o={current} drops={drops} open={open} /> : !open ? <div className="warnbar" data-testid="meter-closed">This week's meter is closed — the next one opens shortly.</div> : <>
      <h3 className="sec">1. Your community <span className="ta small">உங்கள் குடியிருப்பு</span></h3>
      <Chips value={cid} set={setCid} opts={comms.map(c => [c.id, c.name])} testid="comm" />
      {community && <p className="muted small">Gate drop at {community.gate}{community.leaderName ? ` · leader ${community.leaderName}` : ''}</p>}
      <Field label="Flat / door no." value={flat} set={setFlat} testid="meter-flat" placeholder="e.g. B-204" maxLength={20} />
      <h3 className="sec" style={{ display: 'flex', justifyContent: 'space-between' }}>2. This week's list <button className="linkbtn" data-testid="meter-sample" onClick={() => setSel(SAMPLE_BASKET)}>Use a sample basket</button></h3>
      {!list ? <Sk n={4} /> : list.skus.map(k => { const q = sel[k.id] || 0; const set = n => setSel(s => { const x = { ...s }; if (n <= 0) delete x[k.id]; else x[k.id] = Math.min(k.maxPerHousehold, n); return x; });
        return <div key={k.id} className={'skurow' + (q ? ' on' : '')} data-testid={'sku-' + k.id}><span className="e">{k.emoji}</span><div className="nm"><b>{k.name}</b><small className="ta">{k.ta}</small><br />
          <small>₹{k.sundayPrice} → <b style={{ color: 'var(--green)', display: 'inline' }}>₹{k.fillPrice}</b> / {k.unit}{k.refPrice ? <span className="muted"> · mkt ₹{k.refPrice}</span> : null}</small></div>
          {q ? <div className="step6"><button aria-label="less" onClick={() => set(Math.round((q - k.step) * 100) / 100)}>−</button><span>{q}</span><button aria-label="more" onClick={() => set(Math.round((q + k.step) * 100) / 100)}>+</button></div>
            : <button className="add" data-testid={'madd-' + k.id} aria-label={'Add ' + k.name} onClick={() => set(k.step)}>+</button>}</div>; })}
      <h3 className="sec">3. Pay on delivery</h3><Seg value={pay} set={setPay} opts={[['COD', '💵 Cash'], ['UPI_DOD', '📱 UPI at the gate']]} />
      <div className="card" data-testid="meter-summary"><Kv k="Sunday price (max)" v={rs(tot.sundayTotal)} /><Kv k="If the meter fills" v={rs(tot.fillTotal)} /><Kv k="You'd save" v={rs(tot.saving)} />
        {!tot.ok && <p className="err" data-testid="meter-short">Add {rs(tot.short)} more — minimum basket is ₹{METER.minBasket}.</p>}</div>
      <Err e={err} />
      <button className="primary y" data-testid="meter-commit" disabled={busy || !tot.ok || !community || !flat.trim()} onClick={commit}>{busy ? 'Committing…' : `Commit basket · max ${rs(tot.sundayTotal)}`}</button>
      {(!community || !flat.trim()) && <p className="muted small">{!community ? 'Pick your community.' : 'Add your flat number.'}</p>}
    </>}
    {ok && <div className="okbar" data-testid="meter-ok">✅ {ok}</div>}
    <h3 className="sec">Past baskets</h3>
    {mine.filter(o => o.id !== current?.id).length === 0 ? <p className="muted">Nothing yet.</p> : mine.filter(o => o.id !== current?.id).map(o => <div key={o.id} className="card"><Kv k={`${o.id} · ${o.lines.length} items`} v={o.status} /><Kv k={o.finalTier ? `Final (${o.finalTier})` : 'Sunday price'} v={rs(o.amountDue ?? o.finalAmount ?? o.sundayTotal)} /></div>)}
    {me?.role === 'leader' && <button className="primary" data-testid="open-leader" onClick={() => go('customer', 'leader')}>👑 Open leader dashboard</button>}
    {wallet.length > 0 && <><h3 className="sec">Wallet</h3>{wallet.map(w => <Kv key={w.id} k={`${w.reason} · ${w.createdAt.slice(0, 10)}`} v={(w.amount > 0 ? '+' : '') + rs(w.amount)} />)}</>}
  </div>;
}
function MyBasket({ o, drops, open }) {
  const code = useSub(cb => o.dropId ? models.watchDropCode(o.dropId, cb) : undefined, [o.dropId]); const drop = drops.find(d => d.id === o.dropId); const [err, setErr] = useState('');
  return <div className="card" data-testid="my-basket" style={{ border: '2px solid var(--ink)' }}>
    <div className="kv"><b className="dd-h" style={{ fontSize: 18 }}>Your basket · {o.flat}</b><span className={'tag6 ' + (o.status === 'committed' ? 'y' : 'g')}>{o.status === 'committed' ? 'Committed' : o.handoverStatus === 'handed' ? 'Handed over' : o.status === 'locked' ? 'Packing' : o.status}</span></div>
    {o.lines.map(l => <Kv key={l.skuId} k={`${l.emoji || ''} ${l.name} × ${l.qty} ${l.unit}`} v={rs(l.sundayPrice * l.qty)} />)}<hr />
    {o.finalTier ? <><Kv k={`Final price (${o.finalTier === 'fill' ? 'meter filled' : 'Sunday'})`} v={rs(o.finalAmount)} />{!!o.walletApplied && <Kv k="Wallet credit applied" v={'−' + rs(o.walletApplied)} />}<Kv b k="Pay at delivery" v={rs(o.amountDue ?? o.finalAmount)} testid="basket-due" />
      {!!o.refundDue && <p className="ok small">You save {rs(o.refundDue)} — not charged.</p>}</> : <><Kv b k="Max you pay (Sunday price)" v={rs(o.sundayTotal)} testid="basket-max" /><Kv k="If the meter fills" v={rs(o.fillTotal)} /></>}
    {drop && <><p><b>🚚 Gate drop: {drop.status.replace('_', ' ')} · {drop.slot}</b></p>{code && drop.status !== 'delivered' && <Code label="Drop code for the rider (leader shares it at the gate)" code={code} testid="drop-code" />}</>}
    <Err e={err} />
    {o.status === 'committed' && open && <button className="ghost" data-testid="basket-cancel" onClick={run(setErr)(() => models.cancelBasket(o))}>Cancel basket (free until Sat 9 pm)</button>}
  </div>;
}
export function LeaderW({ go, me }) {
  const cid = me?.communityId; const comms = useSub(cb => models.watchCommunities(cb), [], []); const meters = useSub(cb => models.watchMeters('porur-west', cb), [], []);
  const orders = useSub(cb => cid ? models.watchCommunityBaskets(cid, cb) : undefined, [cid]); const drops = useSub(cb => cid ? models.watchDropsFor('communityId', cid, cb) : undefined, [cid], []); const [err, setErr] = useState('');
  if (me?.role !== 'leader' || !cid) return <div className="page v6"><H title="Leader" go={go} back="meter" /><Empty testid="leader-none" emoji="👑" title="Leader dashboard" body="Community leaders are appointed by Porur (5% of delivered sales)." /></div>;
  if (!orders) return <div className="page v6"><H title="Leader" go={go} back="meter" /><Sk /></div>;
  const comm = comms.find(c => c.id === cid); const meter = meters.find(m => m.status === 'open') || meters[0]; const live = orders.filter(o => o.status !== 'cancelled'); const wk = live.filter(o => o.meterId === meter?.id);
  const e1 = leaderEarnings(wk), e2 = leaderEarnings(live); const drop = drops.find(d => d.status !== 'delivered');
  return <div className="page v6" data-testid="leader-screen"><H title={'👑 ' + (comm?.name || cid)} go={go} back="meter" />
    <p className="ta small">குடியிருப்பு தலைவர் · gate: {comm?.gate}</p>
    {meter && <div className="card"><MeterBar light count={meter.count} threshold={meter.threshold} testid="leader-meter" /><p className="muted small">{wk.length} from your community this week</p>
      <button className="primary y" data-testid="leader-share" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(shareText(meter, joinLink(cid))), '_blank')}>📣 Share join link</button></div>}
    <div className="stats3"><div data-testid="leader-earn-week"><b>{rs(e1.commission)}</b><small>This week (5%)</small></div><div><b>{e1.delivered}</b><small>Handed</small></div><div data-testid="leader-earn-all"><b>{rs(e2.commission)}</b><small>All time</small></div></div>
    {drop && <div className="card" data-testid="leader-drop"><Kv k={drop.title} v={drop.status.replace('_', ' ')} /><Kv k="Slot" v={drop.slot} /><DropCode id={drop.id} /></div>}
    <Err e={err} />
    <h3 className="sec">Households ({wk.length})</h3>
    {!wk.length ? <Empty emoji="🏠" title="No baskets yet this week" body="Share the join link on your apartment WhatsApp group." /> : [...wk].sort((a, b) => a.flat.localeCompare(b.flat)).map(o => <div key={o.id} className="card" data-testid={'lb-' + o.id}>
      <div className="kv"><b>{o.flat} · {o.customer}</b><span className="tag6">{o.handoverStatus === 'handed' ? '✓ ' + o.collectedVia : o.handoverStatus === 'missed' ? 'Missed' : o.status}</span></div>
      <small className="muted">{o.lines.map(l => `${l.name} ${l.qty}${l.unit}`).join(' · ')}</small><Kv b k={o.amountDue != null ? 'Collect' : 'Max (Sunday)'} v={rs(o.amountDue ?? o.sundayTotal)} />
      {o.status === 'locked' && o.handoverStatus === 'pending' && <div className="seg" style={{ display: 'flex' }}>{[['cash', '💵 Cash'], ['upi', '📱 UPI'], ['missed', 'Missed']].map(([k, n]) => <button key={k} style={{ flex: 1 }} data-testid={`hand-${k}-${o.id}`} onClick={() => models.markHanded(o, k).catch(e => setErr(e.message))}>{n}</button>)}</div>}
    </div>)}
  </div>;
}
const DropCode = ({ id }) => { const c = useSub(cb => models.watchDropCode(id, cb), [id]); return <Code label="Give this code to the rider when the crates arrive" code={c} testid="leader-drop-code" />; };

/* ---------------- OFFICE LUNCH ---------------- */
const dayMs = d => Date.parse(d + 'T06:30:00Z');
export function LunchW({ go, me }) {
  const now = useNow(60000); const date = nextLunchDate(now); const menus = useSub(cb => models.watchMenus(date, cb), [date]); const cooks = useSub(cb => models.watchCooks(cb), [], []); const mine = useSub(cb => models.watchMyLunch(cb), [], []);
  const [mid, setMid] = useState(''); const [veg, setVeg] = useState(5); const [nv, setNv] = useState(0); const [company, setCompany] = useState(me?.office?.company || ''); const [officeId, setOfficeId] = useState(me?.office?.officeId || OFFICES[0].id);
  const [floor, setFloor] = useState(''); const [pay, setPay] = useState('UPI_DOD'); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const active = (menus || []).filter(m => cooks.find(c => c.id === m.cookId)?.status !== 'paused'); const menu = active.find(m => m.id === mid) || (active.length === 1 ? active[0] : null); const tot = menu ? lunchTotals(veg, nv, menu, now) : null;
  const place = async () => { setErr(''); setOk(''); if (!company.trim()) return setErr('Add your company name.'); setBusy(true);
    try { const off = OFFICES.find(o => o.id === officeId); const id = await models.placeLunch(menu, { company: company.trim(), officeId, office: off.name, floor: floor.trim() || undefined, vegPacks: veg, nonVegPacks: nv, pay });
      api.updateMe({ office: { company: company.trim(), officeId } }).catch(() => {}); setOk(`Order ${id} placed for ${fmtDay(dayMs(date))}. The cook confirms by 9 pm.`); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <div className="page v6" data-testid="lunch-screen"><H title="Office lunch" go={go} />
    <div className="hero6" style={{ background: 'var(--yellow)' }}><span className="k">🍱 OFFICE LUNCH · {fmtDay(dayMs(date)).toUpperCase()}</span><h2>Home-cooked lunch for your team, {LUNCH.slot}</h2><div className="ta small">வீட்டு சாப்பாடு · அலுவலகத்திற்கு</div>
      <p className="small" data-testid="lunch-cutoff"><b>Order closes in {fmtLeft(lunchCutoffMs(date) - now)}</b> (8 pm the evening before) · min {LUNCH.minPacks} packs · ₹{LUNCH.minPrice}–{LUNCH.maxPrice}/pack</p></div>
    <h3 className="sec">Tomorrow's cooks</h3>
    {!menus ? <Sk /> : !active.length ? <Empty testid="lunch-empty" emoji="👩‍🍳" title="No menus yet for this day" body="Our FSSAI-registered home cooks post menus by 6 pm." /> : active.map(m => { const c = cooks.find(x => x.id === m.cookId); const left = m.capacity - m.booked; const on = menu?.id === m.id;
      return <div key={m.id} className="card" data-testid={'menu-' + m.cookId} style={{ border: on ? '2px solid var(--ink)' : undefined }}><div className="kv"><b className="dd-h" style={{ fontSize: 18 }}>{m.cookName}</b><span className={'tag6 ' + (left > 0 ? 'g' : 'r')}>{left > 0 ? left + ' left' : 'Full'}</span></div>
        <small className="muted">{c?.kitchen} · {c?.area} · ★ {c?.rating || 'new'} · FSSAI {c?.fssaiNo}</small><Kv k={'🟢 ' + m.vegDish} v={rs(m.vegPrice)} />{m.nonVegDish && <Kv k={'🔴 ' + m.nonVegDish} v={rs(m.nonVegPrice)} />}
        <button className={on ? 'primary' : 'ghost'} data-testid={'pick-' + m.cookId} disabled={left <= 0} onClick={() => setMid(m.id)}>{on ? '✓ Selected' : 'Order from this cook'}</button></div>; })}
    {menu && tot && <><h3 className="sec">Packs</h3><div className="card"><div className="kv"><b>🟢 Veg · {rs(menu.vegPrice)}</b><Step v={veg} set={setVeg} testid="lunch-veg" /></div>
      {!!menu.nonVegPrice && <div className="kv" style={{ marginTop: 8 }}><b>🔴 Non-veg · {rs(menu.nonVegPrice)}</b><Step v={nv} set={setNv} testid="lunch-nonveg" /></div>}</div>
      <h3 className="sec">Office</h3><Field label="Company name" value={company} set={setCompany} testid="lunch-company" placeholder="e.g. Acme Analytics" maxLength={60} />
      <Chips value={officeId} set={setOfficeId} opts={OFFICES.map(o => [o.id, o.short])} testid="office" />
      <Field label="Floor / reception note (optional)" value={floor} set={setFloor} testid="lunch-floor" maxLength={60} />
      <h3 className="sec">Pay on delivery</h3><Seg value={pay} set={setPay} opts={[['UPI_DOD', '📱 UPI'], ['COD', '💵 Cash']]} />
      <div className="card" data-testid="lunch-summary"><Kv k={`${tot.packs} packs (${veg} veg · ${nv} non-veg)`} v={rs(tot.total)} /><Kv k="Delivery (batched run)" v="Free" /><Kv b k="Total" v={rs(tot.total)} />{tot.errors.map(e => <p key={e} className="err small">{e}</p>)}</div>
      <Err e={err} /><button className="primary y" data-testid="lunch-place" disabled={busy || !tot.ok} onClick={place}>{busy ? 'Placing…' : `Place team order · ${rs(tot.total)}`}</button></>}
    {ok && <div className="okbar" data-testid="lunch-ok">✅ {ok}</div>}
    <h3 className="sec">Your team orders</h3>{!mine.length ? <p className="muted">No orders yet.</p> : mine.map(o => <LunchCard key={o.id} o={o} />)}
  </div>;
}
function LunchCard({ o }) { const code = useSub(cb => o.dropId ? models.watchDropCode(o.dropId, cb) : undefined, [o.dropId]);
  return <div className="card" data-testid={'lunch-' + o.id}><div className="kv"><b>{o.id} · {fmtDay(dayMs(o.date))} {o.slot}</b><span className={'tag6 ' + (o.status === 'delivered' ? 'g' : 'y')}>{o.status.replace('_', ' ')}</span></div>
    <small className="muted">{o.company} · {o.office}</small><Kv k={`${o.vegPacks} veg · ${o.nonVegPacks} non-veg`} v={rs(o.total)} />{code && o.status !== 'delivered' && <Code label="Reception gives this code to the rider" code={code} testid="lunch-code" />}</div>; }

/* ---------------- HOME SERVICES ---------------- */
export const JOB_LABEL = { requested: 'Finding a pro', assigned: 'Pro assigned', en_route: 'On the way', started: 'Inspecting', quoted: 'Quote waiting', quote_approved: 'Working', quote_declined: 'Inspection only', done: 'Done', cancelled: 'Cancelled' };
export function ServicesW({ go }) {
  const pros = useSub(cb => models.watchPros(cb), [], []); const jobs = useSub(cb => models.watchMyJobs(cb), [], []); const [svc, setSvc] = useState('');
  const days = [0, 1, 2, 3].map(i => istDate(Date.now() + i * DAY)); const [date, setDate] = useState(days[0]); const [slot, setSlot] = useState(''); const [addr, setAddr] = useState(''); const [problem, setProblem] = useState(''); const [pay, setPay] = useState('UPI_DOD');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const s = SERVICES.find(x => x.id === svc); const slots = SLOTS.filter(([k]) => slotStartMs(date, k) > Date.now() + HOUR);
  const avail = id => pros.filter(p => p.status === 'active' && p.skills.includes(id)).length;
  const book = async () => { setErr(''); if (!addr.trim()) return setErr('Add the address for the visit.'); setBusy(true);
    try { const j = await models.bookJob({ serviceId: s.id, address: addr.trim(), problem: problem.trim() || s.blurb, slotDate: date, slot, pay }, pros); go('customer', 'job', j.id); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <div className="page v6" data-testid="services-screen"><H title="Home services" go={go} />
    <div className="hero6" style={{ background: '#E1EBFF' }}><span className="k" style={{ color: '#1D4ED8' }}>🛠️ HOME SERVICES · PORUR</span><h2>Verified pros in a 2-hour slot</h2><div className="ta small">சரிபார்க்கப்பட்ட நிபுணர்கள் · போலீஸ் சரிபார்ப்பு</div>
      <p className="small">₹{SERVICE_FEE} inspection (adjusted if you go ahead) · quote before any work · OTP at start & finish · {WARRANTY_DAYS}-day warranty</p></div>
    <h3 className="sec">What do you need?</h3>
    <div className="svcgrid">{SERVICES.map(x => <button key={x.id} data-testid={'svc-' + x.id} className={svc === x.id ? 'on' : ''} onClick={() => setSvc(x.id)}><span className="em">{x.emoji}</span><b>{x.name}</b><small className="ta">{x.ta}</small><br /><small style={{ fontWeight: 700 }}>{avail(x.id) ? `${avail(x.id)} pro${avail(x.id) > 1 ? 's' : ''} nearby` : 'On request'}</small></button>)}</div>
    {s && <><div className="card" data-testid="rate-card"><b>Typical prices · {s.name}</b>{s.rateCard.map(([k, v]) => <Kv key={k} k={k} v={'from ' + rs(v)} />)}<p className="muted small">Parts extra at MRP. You approve the quote in the app before work starts.</p></div>
      <h3 className="sec">Pick a 2-hour slot</h3><Chips value={date} set={d => { setDate(d); setSlot(''); }} opts={days.map((d, i) => [d, i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDay(Date.parse(d + 'T06:00:00Z'))])} testid="day" />
      {slots.length ? <Chips value={slot} set={setSlot} opts={slots} testid="slot" /> : <p className="muted">No more slots today — pick tomorrow.</p>}
      <Field label="Address" value={addr} set={setAddr} testid="svc-address" placeholder="Flat, street, landmark" maxLength={160} /><Field label="What's the problem? (optional)" value={problem} set={setProblem} testid="svc-problem" placeholder={s.blurb} maxLength={200} />
      <h3 className="sec">Pay after the visit</h3><Seg value={pay} set={setPay} opts={[['UPI_DOD', '📱 UPI'], ['COD', '💵 Cash']]} />
      <Err e={err} /><button className="primary y" data-testid="svc-book" disabled={busy || !slot} onClick={book}>{busy ? 'Booking…' : `Book · ₹${SERVICE_FEE} inspection`}</button></>}
    <h3 className="sec">Your bookings</h3>{!jobs.length ? <p className="muted">No bookings yet.</p> : jobs.map(j => <button key={j.id} className="card" data-testid={'job-' + j.id} style={{ width: '100%', textAlign: 'left' }} onClick={() => go('customer', 'job', j.id)}>
      <div className="kv"><b>{SERVICES.find(x => x.id === j.serviceId)?.emoji} {j.serviceName}{j.warrantyOf ? ' · warranty' : ''}</b><span className={'tag6 ' + (j.status === 'done' ? 'g' : 'y')}>{JOB_LABEL[j.status]}</span></div><small className="muted">{fmtDay(j.slotStartMs)} · {j.slotLabel}{j.proName ? ' · ' + j.proName : ''}</small></button>)}
  </div>;
}
export function JobW({ go, route }) {
  const id = route.arg; const jobs = useSub(cb => models.watchMyJobs(cb), []); const sec = useSub(cb => models.watchJobSecret(id, cb), [id]); const pros = useSub(cb => models.watchPros(cb), [], []);
  const [stars, setStars] = useState(0); const [review, setReview] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [wslot, setWslot] = useState(''); const R = run(setErr, setBusy);
  if (!jobs) return <div className="page v6"><H title="Your booking" go={go} back="services" /><Sk /></div>;
  const j = jobs.find(x => x.id === id); if (!j) return <div className="page v6"><H title="Your booking" go={go} back="services" /><Empty emoji="🔎" title="Booking not found" /></div>;
  const step = JOB_STEPS.findIndex(s => s[0] === j.status); const pro = pros.find(p => p.id === j.proId); const kids = jobs.filter(x => x.warrantyOf === j.id);
  return <div className="page v6" data-testid="job-screen"><H title={j.serviceName + (j.warrantyOf ? ' · warranty' : '')} go={go} back="services" /><p className="muted small">{j.id} · {fmtDay(j.slotStartMs)} · {j.slotLabel}</p>
    <div className="card" data-testid="job-status"><b className="dd-h" style={{ fontSize: 20 }} data-testid="job-status-text">{JOB_LABEL[j.status]}</b>
      {j.status !== 'cancelled' && JOB_STEPS.map(([k, l], i) => <div key={k} className="small" style={{ fontWeight: i <= step ? 800 : 500, color: i <= step ? 'var(--ink)' : 'var(--muted)' }}>{i <= step ? '●' : '○'} {l}</div>)}
      {pro && <p className="small"><b>👷 {pro.name} · ★ {pro.rating || 'new'} · {pro.jobsDone} jobs{pro.policeVerified ? ' · police-verified ✓' : ''}</b></p>}
      {j.status === 'requested' && <p className="muted small">All pros are busy in this slot — our team will assign one shortly.</p>}</div>
    {sec && ['assigned', 'en_route', 'requested'].includes(j.status) && <Code label="Start OTP — share only when the pro is at your door" code={sec.startOtp} testid="job-start-otp" />}
    {sec && ['started', 'quoted', 'quote_approved', 'quote_declined'].includes(j.status) && <Code label="Finish OTP — share when the work is done" code={sec.finishOtp} testid="job-finish-otp" />}
    {j.quoteLines && <div className="card" data-testid="job-quote"><b>Quote</b>{j.quoteLines.map((l, i) => <Kv key={i} k={l.label} v={rs(l.amount)} />)}<Kv k="Inspection" v={rs(j.inspectionFee)} /><Kv b k="Total if approved" v={rs(j.inspectionFee + (j.quoteTotal || 0))} />
      {j.status === 'quoted' && <div style={{ display: 'flex', gap: 8 }}><button className="primary" style={{ background: 'var(--green)' }} data-testid="quote-approve" disabled={busy} onClick={R(() => models.jobDecide(j.id, true))}>Approve</button><button className="ghost" data-testid="quote-decline" disabled={busy} onClick={R(() => models.jobDecide(j.id, false))}>Decline (pay ₹{j.inspectionFee})</button></div>}</div>}
    <div className="card"><Kv b k={j.status === 'done' ? (j.paymentStatus === 'collected' ? `Paid (${j.collectedVia})` : 'To pay') : 'Payable so far'} v={rs(jobPayable(j))} testid="job-payable" /></div>
    <Err e={err} />
    {['requested', 'assigned'].includes(j.status) && <button className="ghost" data-testid="job-cancel" onClick={R(() => models.jobCancel(j.id))}>Cancel booking (free)</button>}
    {j.status === 'done' && !j.rating && <><h3 className="sec">Rate the pro</h3><Stars v={stars} set={setStars} testid="job-stars" /><Field label="Review (optional)" value={review} set={setReview} testid="job-review" maxLength={200} />
      <button className="primary" data-testid="job-rate" disabled={!stars || busy} onClick={R(() => models.jobRate(j.id, stars, review.trim()))}>Submit rating</button></>}
    {!!j.rating && <p className="ok" data-testid="job-rated"><b>Thanks! You rated {j.rating}★</b></p>}
    {inWarranty(j) && <div className="card" data-testid="job-warranty"><b>Problem came back?</b><p className="muted small">Free re-visit by the same pro until {fmtDay(j.warrantyUntilMs)} — no inspection fee.</p>
      {kids.length ? <p className="ok"><b>Warranty visit booked ({kids[0].id}).</b></p> : <><Chips value={wslot} set={setWslot} opts={SLOTS.slice(0, 4).map(([k, l]) => [k, 'Tomorrow ' + l])} testid="wslot" />
        <button className="primary y" data-testid="job-warranty-claim" disabled={!wslot || busy} onClick={R(async () => { const w = await models.bookJob({ serviceId: j.serviceId, address: j.address, problem: 'Warranty: ' + j.problem, slotDate: istDate(Date.now() + DAY), slot: wslot, pay: j.pay, warrantyOf: j }, pros); go('customer', 'job', w.id); })}>Claim warranty visit</button></>}</div>}
  </div>;
}

/* ---------------- FLASH DEALS ---------------- */
export function DealsW({ go }) {
  const now = useNow(15000); const deals = useSub(cb => models.watchLiveDeals(cb), []); const claims = useSub(cb => models.watchMyClaims(cb), [], []); const prefs = useSub(cb => models.watchPrefs(cb), []); const [openId, setOpenId] = useState(''); const cfg = useSub(cb => models.watchDealsCfg(cb), []);
  const here = prefs ? { lat: prefs.lat, lng: prefs.lng } : { lat: AREAS[0][1], lng: AREAS[0][2] }; const live = cfg?.killAll ? [] : (deals || []).filter(d => isDealLive(d, now) && kmBetween(here, d) <= (prefs?.radiusKm || DEALS.radiusKm) + 2);
  return <div className="page v6" data-testid="deals-screen"><H title="Tonight's deals" go={go} />
    <div className="hero6" style={{ background: '#F26A2E' }}><span className="k">🔥 TONIGHT'S SURPLUS · 9–11 PM</span><h2>Fresh leftover food, 30–60% off</h2><div className="ta small" style={{ color: 'var(--ink)' }}>இன்றைய மீதமுள்ள உணவு · குறைந்த விலையில்</div>
      <p className="small">Only FSSAI-licensed kitchens · cooked today · pickup with a code, or ₹{DEALS.deliveryFee} batched delivery where offered.</p></div>
    <h3 className="sec">Live near you</h3>
    {!deals ? <Sk /> : !live.length ? <Empty testid="deals-empty" emoji="🌙" title="No deals live right now" body="Kitchens post surplus between 9 and 11 pm. Turn on alerts below (max once a day)." /> : live.map(d => <DealCard key={d.id} d={d} now={now} here={here} open={openId === d.id} toggle={() => setOpenId(openId === d.id ? '' : d.id)} />)}
    <h3 className="sec">Your claims</h3>{!claims.length ? <p className="muted">Nothing claimed yet.</p> : claims.map(c => <ClaimCard key={c.id} c={c} />)}
    <Alerts prefs={prefs} />
  </div>;
}
function DealCard({ d, now, here, open, toggle }) {
  const [qty, setQty] = useState(1); const [ful, setFul] = useState('pickup'); const [addr, setAddr] = useState(''); const [pay, setPay] = useState('UPI_DOD'); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const max = Math.min(3, d.qtyLeft); const total = qty * d.dealPrice + (ful === 'delivery' ? d.deliveryFee : 0);
  const claim = async () => { setErr(''); if (ful === 'delivery' && !addr.trim()) return setErr('Add the delivery address.'); setBusy(true); try { await models.claimDeal(d, qty, ful, pay, ful === 'delivery' ? addr.trim() : undefined); setOk('Claimed! Your pickup code is in "Your claims".'); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return <div className="card" data-testid={'deal-' + d.id}><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 60, height: 60, borderRadius: 16, background: '#FFE6D6', display: 'grid', placeItems: 'center', fontSize: 32 }}>{d.emoji || '🍱'}</div>
    <div style={{ flex: 1 }}><b className="dd-h" style={{ fontSize: 18 }}>{d.item}</b><br /><small className="muted">{d.storeName} · {kmBetween(here, d).toFixed(1)} km · {d.veg ? '🟢 veg' : '🔴 non-veg'}</small><br />
      <b className="dd-h" style={{ fontSize: 18 }}>{rs(d.dealPrice)}</b> <s className="muted small">{rs(d.regularPrice)}</s> <b className="ok small">{d.discountPct}% off</b></div></div>
    <div><span className="tag6 y">⏳ {fmtLeft(d.expiresAtMs - now)} left</span><span className={'tag6 ' + (d.qtyLeft <= 3 ? 'r' : 'g')}>{d.qtyLeft} of {d.qtyTotal} left</span><span className="tag6">{d.fulfil === 'both' ? 'Pickup / ₹39 delivery' : 'Pickup only'}</span></div>
    <small className="muted">Cooked {d.preparedAt} · FSSAI {d.fssaiNo}{d.allergens ? ' · contains ' + d.allergens : ''}</small>
    {ok ? <div className="okbar" data-testid="claim-ok">✅ {ok}</div> : !open ? <button className="primary" data-testid={'deal-open-' + d.id} onClick={toggle}>Claim</button> : <>
      <div className="kv" style={{ marginTop: 10 }}><b>How many? (max {max})</b><Step v={qty} set={n => setQty(Math.max(1, Math.min(max, n)))} testid="claim-qty" min={1} /></div>
      {d.fulfil === 'both' && <Seg value={ful} set={setFul} opts={[['pickup', '🏃 Pickup (free)'], ['delivery', `🛵 Delivery ₹${d.deliveryFee}`]]} />}
      {ful === 'delivery' && <Field label="Delivery address" value={addr} set={setAddr} testid="claim-address" maxLength={160} />}
      <div style={{ marginTop: 8 }}><Seg value={pay} set={setPay} opts={[['UPI_DOD', '📱 UPI'], ['COD', '💵 Cash']]} /></div><Err e={err} />
      <button className="primary y" data-testid="claim-confirm" disabled={busy} onClick={claim}>{busy ? 'Claiming…' : `Claim ${qty} · pay ${rs(total)} at ${ful === 'pickup' ? 'pickup' : 'the door'}`}</button></>}</div>;
}
function ClaimCard({ c }) {
  const code = useSub(cb => models.watchClaimCode(c.id, cb), [c.id]); const [stars, setStars] = useState(0); const [complaint, setComplaint] = useState(''); const [err, setErr] = useState(''); const done = c.status === 'picked_up' || c.status === 'delivered';
  return <div className="card" data-testid={'claim-' + c.id}><div className="kv"><b>{c.item} × {c.qty} · {c.storeName}</b><span className={'tag6 ' + (done ? 'g' : 'y')}>{c.status.replace('_', ' ')}</span></div>
    <Kv k={c.fulfil === 'pickup' ? 'Pay at pickup' : `Pay at door (incl. ₹${c.deliveryFee})`} v={rs(c.total)} />
    {c.status === 'claimed' && <Code label={c.fulfil === 'pickup' ? 'Show this code at the counter' : 'Give this code to the rider'} code={code} sub={'Collect before ' + fmtTime(c.expiresAtMs)} testid="claim-code" />}
    {done && !c.rating && <><b>How was it?</b><Stars v={stars} set={setStars} testid="claim-stars" /><Field label="Problem? (optional — goes to Porur support)" value={complaint} set={setComplaint} testid="claim-complaint" placeholder="e.g. cold, stale, wrong item" maxLength={200} /><Err e={err} />
      <button className="primary" data-testid="claim-rate" disabled={!stars} onClick={() => models.rateClaim(c.id, stars, complaint.trim()).catch(e => setErr(e.message))}>Submit</button></>}
    {!!c.rating && <p className="ok small"><b>You rated {c.rating}★{c.complaint ? ' · complaint sent' : ''}</b></p>}</div>;
}
function Alerts({ prefs }) {
  const [p, setP] = useState({ optIn: false, radiusKm: 3, vegOnly: false, area: AREAS[0][0], lat: AREAS[0][1], lng: AREAS[0][2] }); const [saved, setSaved] = useState('');
  useEffect(() => { if (prefs) setP(x => ({ ...x, ...prefs })); }, [prefs]);
  const save = n => { setP(n); setSaved(''); models.savePrefs({ optIn: n.optIn, radiusKm: n.radiusKm, vegOnly: n.vegOnly, area: n.area, lat: n.lat, lng: n.lng }).then(() => setSaved('Saved')).catch(e => setSaved(e.message)); };
  const useGps = () => navigator.geolocation?.getCurrentPosition(pos => save({ ...p, area: 'My location', lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4) }), () => setSaved('Location blocked — pick an area.'));
  return <><h3 className="sec">Deal alerts</h3><div className="card" data-testid="deal-alerts">
    <label className="kv" style={{ alignItems: 'center', minHeight: 48 }}><span><b>Tell me when a deal goes live</b><br /><small className="muted">Max one alert a day · never after 10:30 pm</small></span>
      <input type="checkbox" data-testid="alerts-toggle" aria-label="Deal alerts" style={{ width: 28, height: 28 }} checked={p.optIn} onChange={e => save({ ...p, optIn: e.target.checked })} /></label>
    {p.optIn && <><b className="small">Your area</b><Chips value={p.area} set={a => { const x = AREAS.find(r => r[0] === a); save({ ...p, area: a, lat: x[1], lng: x[2] }); }} opts={AREAS.map(a => [a[0], a[0]])} testid="area" />
      <button className="chipbtn" onClick={useGps}>📍 Use my location</button>
      <Chips value={p.radiusKm} set={r => save({ ...p, radiusKm: r })} opts={[[1, '1 km'], [2, '2 km'], [3, '3 km']]} /><Chips value={p.vegOnly ? 'veg' : ''} set={() => save({ ...p, vegOnly: !p.vegOnly })} opts={[['veg', '🟢 Veg only']]} testid="alerts" /></>}
    {saved && <p className={saved === 'Saved' ? 'ok small' : 'err small'} data-testid="alerts-saved"><b>{saved}</b></p>}</div></>;
}
