// v0.6 admin-desktop pages: Group buy, Office lunch, Home services, Flash deals
import React, { useEffect, useMemo, useState } from 'react';
import { models, api, db } from './live.js';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { meterForecast, aggregateSkus, poCsv, fmtDay, fmtLeft, fmtTime, walletBalance, leaderEarnings, OFFICES, nextLunchDate, istDate, SERVICES, jobPayable, DEALS, isDealLive, vendorQuality, FOOD_STORES, DAY } from './models.js';
import { STORES } from './data.js';
import { rs, useSub, useNow } from './v6-common.jsx';
const Kpi = ({ label, value, sub, tone }) => <div className={'kpi ' + (tone || '')}><small>{label}</small><b>{value}</b>{sub && <span>{sub}</span>}</div>;
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); };
const useErr = () => { const [e, setE] = useState(''); return [e, setE, f => async () => { setE(''); try { await f(); } catch (x) { setE(x.message); } }]; };

export function GroupBuyPage({ users, riders }) {
  const now = useNow(30000); const meters = useSub(cb => models.watchAllMeters(cb), [], []); const comms = useSub(cb => models.watchCommunities(cb), [], []); const [sel, setSel] = useState('');
  const meter = meters.find(m => m.id === sel) || meters.find(m => m.status === 'open') || meters[0]; const list = useSub(cb => meter?.listId ? models.watchList(meter.listId, cb) : undefined, [meter?.listId]);
  const orders = useSub(cb => meter ? models.watchMeterOrders(meter.id, cb) : undefined, [meter?.id], []); const pos = useSub(cb => meter ? models.watchPOs(meter.id, cb) : undefined, [meter?.id], []);
  const wallet = useSub(cb => models.watchAllWallet(cb), [], []); const drops = useSub(cb => models.watchAllDrops(cb), [], []); const [err, setErr, R] = useErr(); const [res, setRes] = useState(null);
  const [wPhone, setWPhone] = useState(''); const [wAmt, setWAmt] = useState(''); const [wWhy, setWWhy] = useState('Short-supplied item refund');
  if (!meter) return <><h1>Group buy</h1><p className="muted">No meters yet — run the v0.6 seed.</p></>;
  const live = orders.filter(o => o.status !== 'cancelled'); const fc = meterForecast(meter, now); const po = list ? aggregateSkus(live, list.skus) : [];
  const gmvS = live.reduce((a, o) => a + o.sundayTotal, 0), gmvF = live.reduce((a, o) => a + o.fillTotal, 0), cost = po.reduce((a, l) => a + l.estCost, 0);
  const leaderOf = c => users.find(u => u.uid === c.leaderUid);
  const setLeader = async (c, phone) => { const u = users.find(x => x.phone === phone || x.phone?.endsWith(phone)); if (!u) throw new Error('No user with that phone — they must sign in once first.');
    await api.setUserRole(u.uid, 'leader', { communityId: c.id }); await models.saveCommunity({ ...c, leaderUid: u.uid, leaderName: u.name || u.phone }); };
  return <div className="v6a" data-testid="admin-groupbuy"><h1>🧺 Group buy — the Meter</h1>
    <p className="muted">One weekly list per cluster. Households commit a ₹300+ basket at the Sunday price; if {meter.threshold} baskets come in before Saturday 9 pm the batch closes early at the lower fill price. Pay on delivery to the community leader (5% commission).</p>
    <div className="kpis6"><Kpi label="Meter" value={`${meter.count}/${meter.threshold}`} sub={fc.text.slice(0, 60)} /><Kpi label="Status" value={meter.status} sub={meter.status === 'open' ? 'closes in ' + fmtLeft(meter.cutoffMs - now) : meter.deliverySlot} />
      <Kpi label="GMV (Sunday / fill)" value={`${rs(gmvS)} / ${rs(gmvF)}`} /><Kpi label="Est. supplier cost" value={rs(cost)} sub={gmvF ? `margin at fill ≈ ${Math.round((1 - cost / gmvF) * 100)}%` : ''} /></div>
    <div className="panel"><div className="row"><h3>Meters</h3><select value={meter.id} onChange={e => setSel(e.target.value)}>{meters.map(m => <option key={m.id} value={m.id}>{m.id} · {m.status} · {m.count}/{m.threshold} · {fmtDay(m.cutoffMs)}</option>)}</select></div>
      {meter.status === 'open' ? <div className="row" style={{ justifyContent: 'flex-start' }}>
        <button className="act y" data-testid="close-fill" disabled={meter.count < meter.threshold} onClick={R(async () => setRes(await models.closeBatch(meter, list, comms, riders, 'fill')))}>Close batch — meter filled (fill price)</button>
        <button className="act" data-testid="close-sunday" onClick={R(async () => { if (confirm('Close as Sunday buy (Sunday price)?')) setRes(await models.closeBatch(meter, list, comms, riders, 'sunday')); })}>Close as Sunday buy</button>
        <span className="muted small">Closing freezes baskets, writes supplier POs + gate-drop tasks, and opens the next meter (rollover).</span></div>
        : <p>Closed ({meter.tier}) · delivery {meter.deliverySlot} · next meter {meter.nextMeterId}</p>}
      {res && <p className="ok" data-testid="close-result">✓ Closed as {res.tier}: {res.orders} baskets · {res.drops} gate drops · {res.po.length} PO lines · next meter {res.nextMeterId}</p>}
      {err && <p className="err">{err}</p>}</div>
    <div className="grid2"><div className="panel"><div className="row"><h3>Per-SKU aggregation → supplier POs</h3><button className="act g" data-testid="po-csv" disabled={!po.length} onClick={() => download(`PO_${meter.id}.csv`, poCsv(meter.id, po))}>⬇ PO CSV</button></div>
      <table className="dt"><thead><tr><th>Supplier</th><th>Item</th><th>Households</th><th>Cases</th><th>Order qty</th><th>Est. ₹</th></tr></thead><tbody>
        {po.map(l => <tr key={l.skuId}><td>{l.supplier}</td><td>{l.name}</td><td>{l.qty} {l.unit}</td><td>{l.cases} × {l.caseQty} ({l.caseUnit})</td><td>{l.orderQty}</td><td>{rs(l.estCost)}</td></tr>)}</tbody></table>
      {!po.length && <p className="muted">No baskets yet.</p>}{pos.length > 0 && <p className="muted small">Saved POs: {pos.map(p => `${p.supplier} (${rs(p.total)})`).join(' · ')}</p>}</div>
      <div className="panel"><h3>Communities & leaders</h3><table className="dt"><thead><tr><th>Community</th><th>Baskets</th><th>Leader</th><th>Earned (5%)</th></tr></thead><tbody>
        {comms.map(c => { const cs = live.filter(o => o.communityId === c.id); const all = drops.filter(d => d.communityId === c.id); return <tr key={c.id}><td><b>{c.name}</b><br /><small className="muted">{c.gate} · {c.flats} flats</small></td><td>{cs.length}</td>
          <td>{leaderOf(c)?.phone || c.leaderName || '—'}<br /><LeaderSet c={c} onSet={setLeader} /></td><td>{rs(leaderEarnings(cs).commission)}<br /><small className="muted">{all.length} drops</small></td></tr>; })}</tbody></table></div></div>
    <div className="panel"><h3>Baskets ({live.length})</h3><table className="dt"><thead><tr><th>ID</th><th>Customer</th><th>Community / flat</th><th>Items</th><th>Sunday</th><th>Fill</th><th>Due</th><th>Status</th></tr></thead><tbody>
      {live.map(o => <tr key={o.id}><td>{o.id}{o.repriced ? ' ⚠️' : ''}</td><td>{o.customer}<br /><small>{o.phone}</small></td><td>{comms.find(c => c.id === o.communityId)?.name} · {o.flat}</td><td>{o.lines.length}</td><td>{rs(o.sundayTotal)}</td><td>{rs(o.fillTotal)}</td><td>{o.amountDue != null ? rs(o.amountDue) : '—'}</td><td>{o.status}{o.handoverStatus && o.handoverStatus !== 'pending' ? ' · ' + o.handoverStatus : ''}</td></tr>)}</tbody></table></div>
    <div className="grid2"><div className="panel"><h3>Gate drops</h3><table className="dt"><thead><tr><th>Drop</th><th>Rider</th><th>Status</th></tr></thead><tbody>
      {drops.filter(d => d.kind === 'meter').slice(0, 12).map(d => <tr key={d.id}><td>{d.title}<br /><small className="muted">{d.slot}</small></td><td><select value={d.riderId || ''} onChange={e => models.assignDrop(d.id, e.target.value)}><option value="">—</option>{riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></td><td>{d.status}</td></tr>)}</tbody></table></div>
      <div className="panel"><h3>Wallet credit (refund of difference / short items)</h3><p className="muted small">Credits are applied automatically to the customer's next basket at batch close.</p>
        <div className="row"><input placeholder="Customer phone" value={wPhone} onChange={e => setWPhone(e.target.value)} /><input placeholder="₹" style={{ width: 70 }} value={wAmt} onChange={e => setWAmt(e.target.value)} /><input placeholder="Reason" value={wWhy} onChange={e => setWWhy(e.target.value)} />
          <button className="act" data-testid="wallet-credit" onClick={R(async () => { const u = users.find(x => x.phone === wPhone || x.phone?.endsWith(wPhone)); if (!u) throw new Error('Unknown phone'); await models.creditWallet(u.uid, Math.round(+wAmt), wWhy); setWAmt(''); })}>Credit</button></div>
        <table className="dt"><tbody>{wallet.slice(-8).reverse().map(w => <tr key={w.id}><td>{users.find(u => u.uid === w.uid)?.phone || w.uid.slice(0, 6)}</td><td>{w.reason}</td><td>{rs(w.amount)}</td></tr>)}</tbody></table></div></div>
  </div>;
}
function LeaderSet({ c, onSet }) { const [p, setP] = useState(''); const [e, setE] = useState('');
  return <span><input placeholder="+91… phone" value={p} onChange={x => setP(x.target.value)} style={{ width: 120 }} data-testid={'leader-phone-' + c.id} /><button className="act" style={{ minHeight: 32, marginLeft: 4 }} data-testid={'leader-set-' + c.id} onClick={() => onSet(c, p.trim()).then(() => setP('')).catch(x => setE(x.message))}>Set</button>{e && <small className="err">{e}</small>}</span>; }

export function LunchPage({ riders }) {
  const apps = useSub(cb => models.watchApplications('cook', cb), [], []); const cooks = useSub(cb => models.watchCooks(cb), [], []); const orders = useSub(cb => models.watchAllLunch(cb), [], []); const drops = useSub(cb => models.watchAllDrops(cb), [], []);
  const [date, setDate] = useState(nextLunchDate()); const [err, setErr, R] = useErr(); const [msg, setMsg] = useState('');
  const day = orders.filter(o => o.date === date && o.status !== 'cancelled'); const pend = apps.filter(a => a.status === 'pending');
  const dates = [istDate(Date.now()), nextLunchDate(), istDate(Date.now() + 2 * DAY)].filter((d, i, a) => a.indexOf(d) === i);
  return <div className="v6a" data-testid="admin-lunch"><h1>🍱 Office lunch</h1><p className="muted">FSSAI-registered home cooks; min 5 packs at ₹130–150; order by 8 pm the evening before; one batched rider run per office for the 12:15–12:45 slot.</p>
    <div className="kpis6"><Kpi label="Active cooks" value={cooks.filter(c => c.status === 'active').length} /><Kpi label="Applications" value={pend.length} tone={pend.length ? 'warn' : ''} /><Kpi label={`Packs ${fmtDay(Date.parse(date + 'T06:30:00Z'))}`} value={day.reduce((a, o) => a + o.packs, 0)} sub={`${day.length} orders`} /><Kpi label="Value" value={rs(day.reduce((a, o) => a + o.total, 0))} /></div>
    <div className="panel" data-testid="cook-apps"><h3>Cook applications ({pend.length})</h3>{!pend.length && <p className="muted">None pending.</p>}
      {pend.map(a => <div key={a.uid} className="rxrow" data-testid={'capp-' + a.phone}><b>{a.name}</b><span>{a.kitchen} · {a.area}</span><span>FSSAI {a.fssaiNo} (till {a.fssaiExpiry || '?'})</span><span className="muted small">{Object.values(a.checklist || {}).filter(Boolean).length}/5 checks · {a.capacity}/day · {a.nonVeg ? 'veg + non-veg' : 'veg'}</span>
        <button className="ok" data-testid={'capprove-' + a.phone} onClick={R(() => models.approveCook(a))}>Approve</button><button className="no" onClick={R(() => models.rejectApplication('cook', a.uid, prompt('Reason?') || 'Details incomplete'))}>Reject</button></div>)}</div>
    <div className="grid2"><div className="panel"><h3>Cooks</h3><table className="dt"><thead><tr><th>Kitchen</th><th>FSSAI</th><th>Rating</th><th>Status</th></tr></thead><tbody>{cooks.map(c => <tr key={c.id}><td>{c.kitchen}<br /><small>{c.name}</small></td><td>{c.fssaiNo}</td><td>{c.rating || 'new'}</td>
      <td><button className={'act ' + (c.status === 'active' ? 'r' : 'g')} onClick={R(() => models.setStatusOf('cooks', c.id, { status: c.status === 'active' ? 'paused' : 'active' }))}>{c.status === 'active' ? 'Pause' : 'Activate'}</button></td></tr>)}</tbody></table></div>
      <div className="panel"><div className="row"><h3>Orders by office</h3><select value={date} onChange={e => setDate(e.target.value)}>{dates.map(d => <option key={d} value={d}>{fmtDay(Date.parse(d + 'T06:30:00Z'))}</option>)}</select></div>
        <table className="dt"><thead><tr><th>Office</th><th>Orders</th><th>Veg</th><th>Non-veg</th><th>Run</th></tr></thead><tbody>{OFFICES.map(off => { const os = day.filter(o => o.officeId === off.id); if (!os.length) return null; const d = drops.find(x => x.kind === 'lunch' && x.officeId === off.id && x.ref === date);
          return <tr key={off.id}><td>{off.short}</td><td>{os.length}</td><td>{os.reduce((a, o) => a + o.vegPacks, 0)}</td><td>{os.reduce((a, o) => a + o.nonVegPacks, 0)}</td><td>{d ? <><select data-testid={'lrun-' + off.id} value={d.riderId || ''} onChange={e => models.assignDrop(d.id, e.target.value)}><option value="">—</option>{riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select> {d.status}</> : '—'}</td></tr>; })}</tbody></table>
        <button className="act y" data-testid="lunch-runs" style={{ marginTop: 10 }} onClick={R(async () => setMsg(`${await models.createLunchRuns(date, orders, riders, OFFICES)} run(s) created`))}>Create batched rider runs</button>{msg && <span className="ok"> {msg}</span>}</div></div>
    {err && <p className="err">{err}</p>}
    <div className="panel"><h3>All lunch orders</h3><table className="dt"><thead><tr><th>ID</th><th>Date</th><th>Company</th><th>Office</th><th>Cook</th><th>Packs</th><th>Total</th><th>Status</th></tr></thead><tbody>
      {orders.slice(0, 30).map(o => <tr key={o.id}><td>{o.id}</td><td>{o.date}</td><td>{o.company}</td><td>{OFFICES.find(x => x.id === o.officeId)?.short}</td><td>{cooks.find(c => c.id === o.cookId)?.kitchen}</td><td>{o.vegPacks}+{o.nonVegPacks}</td><td>{rs(o.total)}</td><td>{o.status}</td></tr>)}</tbody></table></div>
  </div>;
}

export function ServicesPage() {
  const apps = useSub(cb => models.watchApplications('pro', cb), [], []); const pros = useSub(cb => models.watchPros(cb), [], []); const jobs = useSub(cb => models.watchAllJobs(cb), [], []); const [err, setErr, R] = useErr();
  const pend = apps.filter(a => a.status === 'pending'); const open = jobs.filter(j => !['done', 'cancelled'].includes(j.status)); const done = jobs.filter(j => j.status === 'done');
  const rated = done.filter(j => j.rating); const warranty = jobs.filter(j => j.warrantyOf);
  return <div className="v6a" data-testid="admin-services"><h1>🛠️ Home services</h1><p className="muted">Plumber, electrician (petty repairs), appliance repair, deep cleaning — no maids. KYC + police verification before approval. ₹149 inspection, OTP start/finish, quote approval, 30-day warranty.</p>
    <div className="kpis6"><Kpi label="Active pros" value={pros.filter(p => p.status === 'active').length} /><Kpi label="Applications" value={pend.length} tone={pend.length ? 'warn' : ''} /><Kpi label="Open jobs" value={open.length} sub={`${open.filter(j => j.status === 'requested').length} unassigned`} />
      <Kpi label="Billed" value={rs(done.reduce((a, j) => a + jobPayable(j), 0))} sub={`take rate 15% ≈ ${rs(done.reduce((a, j) => a + jobPayable(j), 0) * 0.15)}`} /><Kpi label="Avg rating" value={rated.length ? (rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1) : '—'} sub={`${warranty.length} warranty visits`} /></div>
    <div className="panel" data-testid="pro-apps"><h3>Pro applications ({pend.length})</h3>{!pend.length && <p className="muted">None pending.</p>}
      {pend.map(a => <div key={a.uid} className="rxrow" data-testid={'papp-' + a.phone}><b>{a.name}</b><span>{(a.skills || []).join(', ')}</span><span>{a.idType} ••{a.idLast4} · police: {a.police}{a.policeRef ? ' (' + a.policeRef + ')' : ''}</span><span className="muted small">{a.tnelb ? 'TNELB ' + a.tnelb : ''} {a.eshram ? 'e-Shram ' + a.eshram : ''}</span>
        <button className="act" onClick={R(() => updateDoc(doc(db, 'proApplications', a.uid), { police: 'verified' }))}>Mark police-verified</button>
        <button className="ok" data-testid={'papprove-' + a.phone} onClick={R(() => models.approvePro(a))}>Approve</button><button className="no" onClick={R(() => models.rejectApplication('pro', a.uid, prompt('Reason?') || 'KYC incomplete'))}>Reject</button></div>)}</div>
    {err && <p className="err">{err}</p>}
    <div className="panel" data-testid="jobs-board"><h3>Jobs board</h3><table className="dt"><thead><tr><th>Job</th><th>Service</th><th>Slot</th><th>Customer</th><th>Pro</th><th>Status</th><th>Payable</th></tr></thead><tbody>
      {jobs.slice(0, 40).map(j => <tr key={j.id}><td>{j.id}{j.warrantyOf ? ' (W)' : ''}</td><td>{SERVICES.find(s => s.id === j.serviceId)?.emoji} {j.serviceName}</td><td>{fmtDay(j.slotStartMs)} {j.slotLabel}</td><td>{j.customer}<br /><small>{j.address}</small></td>
        <td>{j.status === 'requested' ? <select data-testid={'assign-' + j.id} value="" onChange={e => { const p = pros.find(x => x.id === e.target.value); if (p) models.assignJob(j, p).catch(x => setErr(x.message.includes('ermission') ? 'That pro is already booked in this slot.' : x.message)); }}><option value="">⚠️ Assign…</option>{pros.filter(p => p.status === 'active' && p.skills.includes(j.serviceId)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select> : j.proName || '—'}</td>
        <td>{j.status}{j.rating ? ` · ${j.rating}★` : ''}</td><td>{rs(jobPayable(j))}</td></tr>)}</tbody></table></div>
    <div className="panel"><h3>Pros</h3><table className="dt"><thead><tr><th>Name</th><th>Skills</th><th>Rating</th><th>Jobs</th><th>Police</th><th></th></tr></thead><tbody>{pros.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.skills.join(', ')}</td><td>{p.rating || 'new'} ({p.ratingCount})</td><td>{p.jobsDone}</td><td>{p.policeVerified ? '✓' : 'pending'}</td>
      <td><button className={'act ' + (p.status === 'active' ? 'r' : 'g')} onClick={R(() => models.setStatusOf('pros', p.id, { status: p.status === 'active' ? 'paused' : 'active' }))}>{p.status === 'active' ? 'Pause' : 'Activate'}</button></td></tr>)}</tbody></table></div>
  </div>;
}

export function DealsPage({ riders }) {
  const now = useNow(15000); const cfg = useSub(cb => models.watchDealsCfg(cb), []); const deals = useSub(cb => models.watchAllDeals(cb), [], []); const claims = useSub(cb => models.watchAllClaims(cb), [], []);
  const [stores, setStores] = useState([]); useEffect(() => onSnapshot(collection(db, 'stores'), s => setStores(s.docs.map(d => ({ id: d.id, ...d.data() })))), []);
  const [log, setLog] = useState([]); useEffect(() => onSnapshot(collection(db, 'pushLog'), s => setLog(s.docs.map(d => d.data()).sort((a, b) => (b.at || '').localeCompare(a.at || '')))), []);
  const [err, setErr, R] = useErr(); const [rider, setRider] = useState(riders[0]?.id || 'r1'); const [fssai, setFssai] = useState({});
  const live = deals.filter(d => isDealLive(d, now)); const todayClaims = claims.filter(c => now - +new Date(c.createdAt) < DAY); const pendingDel = claims.filter(c => c.status === 'claimed' && c.fulfil === 'delivery' && !c.rider);
  const complaints = claims.filter(c => c.complaint); const kitchens = stores.filter(s => s.cat === 'food' || s.fssaiNo || s.dealsApproved !== undefined);
  return <div className="v6a" data-testid="admin-deals"><h1>🔥 Surplus flash deals</h1><p className="muted">FSSAI-licensed vendors post tonight's surplus (≥30% off, 60–90 min, max {DEALS.capDeals} deals / {DEALS.capUnits} portions per night). First come first served; pickup code by default, ₹{DEALS.deliveryFee} batched delivery optional. Opt-in alerts within 3 km, max 1/day, none after 10:30 pm.</p>
    <div className="kpis6"><Kpi label="Live deals" value={live.length} /><Kpi label="Claims (24 h)" value={todayClaims.length} sub={rs(todayClaims.reduce((a, c) => a + c.total, 0))} /><Kpi label="Awaiting delivery run" value={pendingDel.length} tone={pendingDel.length ? 'warn' : ''} /><Kpi label="Complaints" value={complaints.length} tone={complaints.length ? 'alert' : ''} /></div>
    <div className="panel"><h3>Controls</h3><div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
      <button className={'act ' + (cfg?.killAll ? 'g' : 'r')} data-testid="deals-kill" onClick={R(async () => { const on = !cfg?.killAll; await models.setDealsCfg({ killAll: on }); if (on) for (const d of live) await models.removeDeal(d.id, 'Kill switch'); })}>{cfg?.killAll ? '▶ Resume all deals' : '⛔ Kill switch — stop all deals'}</button>
      <button className="act" data-testid="deals-anytime" onClick={R(() => models.setDealsCfg({ anyTime: !cfg?.anyTime }))}>{cfg?.anyTime ? 'Testing: any time (switch to 9–11 pm window)' : `Window ${cfg?.fromHour}:00–${cfg?.toHour}:00 (allow any time for testing)`}</button>
      {cfg?.killAll && <b className="err">All deals are stopped.</b>}</div></div>
    {err && <p className="err">{err}</p>}
    <div className="grid2"><div className="panel" data-testid="deal-vendors"><h3>Kitchens / vendors</h3><table className="dt"><thead><tr><th>Store</th><th>FSSAI</th><th>Quality</th><th>Deals</th></tr></thead><tbody>
      {kitchens.map(s => { const q = vendorQuality(claims.filter(c => c.storeId === s.id), now); return <tr key={s.id}><td>{s.name || s.id}</td>
        <td>{s.fssaiNo || <span><input placeholder="14-digit licence" style={{ width: 130 }} value={fssai[s.id] || ''} onChange={e => setFssai(x => ({ ...x, [s.id]: e.target.value }))} /></span>}</td>
        <td>{q.ratings ? `${q.avg}★ (${q.ratings})` : '—'} {q.complaints7d ? `· ${q.complaints7d} complaints` : ''}</td>
        <td>{!s.dealsApproved ? <button className="act g" data-testid={'approve-deals-' + s.id} onClick={R(() => { const n = s.fssaiNo || (fssai[s.id] || '').trim(); if (!/^[0-9]{14}$/.test(n)) throw new Error('Enter the 14-digit FSSAI licence first'); return updateDoc(doc(db, 'stores', s.id), { fssaiNo: n, dealsApproved: true }); })}>Approve</button>
          : s.dealsPaused ? <><small className="err">Paused: {s.pauseReason}</small><br /><button className="act g" onClick={R(() => models.setStorePause(s.id, false))}>Un-pause</button></> : <button className="act r" data-testid={'pause-' + s.id} onClick={R(() => models.setStorePause(s.id, true, 'Paused by admin'))}>Pause</button>}</td></tr>; })}</tbody></table>
      <p className="muted small">Auto-pause: the Cloud Function pauses a vendor whose deal rating drops below 4.0 (≥3 ratings) or who gets 2 complaints in 7 days.</p></div>
      <div className="panel"><h3>Batched delivery runs ({DEALS.runs.join(', ')})</h3><p className="muted small">{pendingDel.length} delivery claims waiting.</p>
        <div className="row" style={{ justifyContent: 'flex-start' }}><select value={rider} onChange={e => setRider(e.target.value)}>{riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <button className="act y" data-testid="deal-run" disabled={!pendingDel.length} onClick={R(() => models.createDealRun('RUN-' + fmtTime(now).replace(/\s/g, ''), pendingDel, rider))}>Create run & assign</button></div>
        <h4>Alert fan-out log (Cloud Function)</h4><table className="dt"><tbody>{log.slice(0, 6).map((l, i) => <tr key={i}><td>{l.dealId}</td><td>{l.sent} sent / {l.candidates} opted-in</td><td className="muted small">{Object.entries(l.skipped || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}</td></tr>)}</tbody></table>{!log.length && <p className="muted small">No deals pushed yet.</p>}</div></div>
    <div className="panel"><h3>Deals</h3><table className="dt"><thead><tr><th>Deal</th><th>Store</th><th>Price</th><th>Left</th><th>Ends</th><th>Status</th><th></th></tr></thead><tbody>
      {deals.slice(0, 25).map(d => <tr key={d.id}><td>{d.emoji} {d.item}</td><td>{d.storeName}</td><td>{rs(d.dealPrice)} <s className="muted">{rs(d.regularPrice)}</s> ({d.discountPct}%)</td><td>{d.qtyLeft}/{d.qtyTotal}</td><td>{isDealLive(d, now) ? fmtLeft(d.expiresAtMs - now) : fmtTime(d.expiresAtMs)}</td><td>{isDealLive(d, now) ? 'live' : d.status === 'live' ? 'expired' : d.status}</td>
        <td>{d.status === 'live' && <button className="act r" onClick={R(() => models.removeDeal(d.id, 'Removed by admin'))}>Remove</button>}</td></tr>)}</tbody></table></div>
    <div className="panel" data-testid="deal-complaints"><h3>Complaints & ratings</h3><table className="dt"><thead><tr><th>Claim</th><th>Store</th><th>Customer</th><th>Rating</th><th>Complaint</th></tr></thead><tbody>
      {claims.filter(c => c.rating || c.complaint).slice(0, 25).map(c => <tr key={c.id}><td>{c.id}</td><td>{c.storeName}</td><td>{c.customer}</td><td>{c.rating}★</td><td className={c.complaint ? 'err' : ''}>{c.complaint || '—'}</td></tr>)}</tbody></table></div>
  </div>;
}
