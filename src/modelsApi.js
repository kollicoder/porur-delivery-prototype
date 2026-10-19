// GENERATED from porur-native/packages/shared/src/modelsApi.ts by scripts/sync-models.mjs — do not edit.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { collection, doc, onSnapshot, query, where, writeBatch, updateDoc, setDoc, getDoc, getDocs, runTransaction, deleteField } from "firebase/firestore";
import {
  basketTotals,
  settleBasket,
  aggregateSkus,
  groupPos,
  nextCutoffMs,
  cycleIdFor,
  CLUSTERS,
  METER,
  lunchCutoffMs,
  LUNCH,
  SERVICES,
  SERVICE_FEE,
  WARRANTY_DAYS,
  SLOTS,
  slotStartMs,
  DEALS,
  istDayNo,
  DAY,
  newCode,
  newId,
  walletBalance,
  fmtDay,
  sundayDeliveryMs,
  vendorQuality,
  istDate
} from "./models.js";
const clean = (o) => JSON.parse(JSON.stringify(o));
const nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
const warn = (k) => (e) => console.warn(k, e?.code || e?.message || e);
const pickR = (riders, at) => {
  const on = riders.filter((r) => r.status === "online");
  const pool = on.length ? on : riders.filter((r) => r.status === "delivering");
  if (at) {
    const d = (r) => r.lat == null ? 1e9 : (r.lat - at.lat) ** 2 + (r.lng - at.lng) ** 2;
    return [...pool].sort((a, b) => d(a) - d(b))[0]?.id;
  }
  return [...pool].sort((a, b) => (a.today || 0) - (b.today || 0))[0]?.id;
};
class ModelsApi {
  constructor(db, who) {
    this.db = db;
    this.who = who;
    __publicField(this, "quality", vendorQuality);
  }
  me() {
    const m = this.who();
    if (!m) throw new Error("Sign in first");
    return m;
  }
  watch(q, cb, k) {
    return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), warn(k));
  }
  watchDoc(path, cb, k) {
    return onSnapshot(doc(this.db, path), (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null), warn(k));
  }
  // ============================================================ METER
  watchCommunities(cb) {
    return this.watch(collection(this.db, "communities"), cb, "communities");
  }
  watchMeters(clusterId, cb) {
    return this.watch(query(collection(this.db, "meters"), where("clusterId", "==", clusterId)), (m) => cb(m.sort((a, b) => b.openedMs - a.openedMs)), "meters");
  }
  watchAllMeters(cb) {
    return this.watch(collection(this.db, "meters"), (m) => cb(m.sort((a, b) => b.openedMs - a.openedMs)), "meters");
  }
  watchList(id, cb) {
    return this.watchDoc("weeklyLists/" + id, cb, "list");
  }
  watchMyBaskets(cb) {
    return this.watch(query(collection(this.db, "meterOrders"), where("customerUid", "==", this.me().uid)), (o) => cb(o.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "baskets");
  }
  watchWallet(cb) {
    return this.watch(query(collection(this.db, "walletLedger"), where("uid", "==", this.me().uid)), (e) => cb(e.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "wallet");
  }
  /** Pre-commit a basket. Transaction: meter.count + 1 together with the new meterOrders doc (rules check both, the cutoff and the ₹300 minimum). */
  async commitBasket(meter, list, community, flat, sel, pay) {
    const m = this.me();
    const t = basketTotals(Object.entries(sel).map(([skuId, qty]) => ({ skuId, qty })), list.skus);
    if (!t.ok) throw new Error(`Add \u20B9${t.short} more \u2014 the minimum basket is \u20B9${METER.minBasket}.`);
    const id = newId("GB");
    const mref = doc(this.db, "meters", meter.id), oref = doc(this.db, "meterOrders", id);
    await runTransaction(this.db, async (tx) => {
      const cur = await tx.get(mref);
      const d = cur.data();
      if (!cur.exists() || d.status !== "open" || Date.now() >= d.cutoffMs) throw new Error("This meter just closed \u2014 refresh to join the next one.");
      const o = {
        id,
        meterId: meter.id,
        cycleId: d.cycleId,
        communityId: community.id,
        customerUid: m.uid,
        customer: m.name,
        phone: m.phone,
        flat,
        lines: t.lines,
        sundayTotal: t.sundayTotal,
        fillTotal: t.fillTotal,
        prepaidAmount: t.sundayTotal,
        pay,
        paymentStatus: "due",
        status: "committed",
        createdAt: nowIso()
      };
      tx.set(oref, clean(o));
      tx.update(mref, { count: d.count + 1, lastOrderId: id, updatedAt: nowIso() });
    });
    return id;
  }
  async cancelBasket(o) {
    const mref = doc(this.db, "meters", o.meterId), oref = doc(this.db, "meterOrders", o.id);
    await runTransaction(this.db, async (tx) => {
      const cur = await tx.get(mref);
      const d = cur.data();
      if (d.status !== "open") throw new Error("Batch already closed \u2014 contact support.");
      tx.update(oref, { status: "cancelled", cancelledAt: nowIso(), updatedAt: nowIso() });
      tx.update(mref, { count: d.count - 1, lastCancelId: o.id, updatedAt: nowIso() });
    });
  }
  // leader
  watchCommunityBaskets(communityId, cb) {
    return this.watch(query(collection(this.db, "meterOrders"), where("communityId", "==", communityId)), cb, "community baskets");
  }
  watchDropsFor(field, v, cb) {
    return this.watch(query(collection(this.db, "drops"), field === "uids" ? where("uids", "array-contains", v) : where("communityId", "==", v)), cb, "drops");
  }
  watchDropCode(dropId, cb) {
    return onSnapshot(doc(this.db, "dropSecrets", dropId), (s) => cb(s.exists() ? s.data().code : null), () => cb(null));
  }
  markHanded(o, via) {
    return updateDoc(doc(this.db, "meterOrders", o.id), via === "missed" ? { handoverStatus: "missed", handedAt: nowIso(), updatedAt: nowIso() } : { handoverStatus: "handed", collectedVia: via, handedAt: nowIso(), updatedAt: nowIso() });
  }
  // admin
  watchMeterOrders(meterId, cb) {
    return this.watch(query(collection(this.db, "meterOrders"), where("meterId", "==", meterId)), cb, "meter orders");
  }
  watchAllWallet(cb) {
    return this.watch(collection(this.db, "walletLedger"), cb, "wallets");
  }
  async creditWallet(uid, amount, reason, ref) {
    const id = newId("W");
    await setDoc(doc(this.db, "walletLedger", id), clean({ id, uid, amount, reason, ref, createdAt: nowIso() }));
  }
  async saveList(l) {
    await setDoc(doc(this.db, "weeklyLists", l.id), clean(l));
  }
  async saveCommunity(c) {
    await setDoc(doc(this.db, "communities", c.id), clean(c));
  }
  async openMeter(clusterId, listId, threshold = METER.threshold, cutoffMs = nextCutoffMs()) {
    const id = newId("M");
    const m = {
      id,
      clusterId,
      clusterName: CLUSTERS[clusterId] || clusterId,
      cycleId: cycleIdFor(cutoffMs),
      listId,
      threshold,
      count: 0,
      status: "open",
      openedAt: nowIso(),
      openedMs: Date.now(),
      cutoffAt: new Date(cutoffMs).toISOString(),
      cutoffMs
    };
    await setDoc(doc(this.db, "meters", id), m);
    return m;
  }
  /** Close a batch (meter filled, or the Saturday cutoff passed): freeze baskets, set the tier & amount due (wallet credit applied),
   *  write supplier POs, one gate-drop task per community (rider auto-assigned, drop OTP for the leader), and open the next meter. */
  async closeBatch(meter, list, communities, riders = [], force) {
    const orders = (await getDocs(query(collection(this.db, "meterOrders"), where("meterId", "==", meter.id)))).docs.map((d) => d.data()).filter((o) => o.status === "committed");
    const wallets = (await getDocs(collection(this.db, "walletLedger"))).docs.map((d) => d.data());
    const tier = force || (meter.count >= meter.threshold ? "fill" : "sunday");
    const now = Date.now();
    const delMs = tier === "fill" ? (() => {
      const p = new Date(now + 5.5 * 36e5);
      return Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() + 1, 7) - 5.5 * 36e5;
    })() : sundayDeliveryMs(meter.cutoffMs);
    const slot = `${fmtDay(delMs)} ${tier === "fill" ? METER.fillSlot : "9\u201311 am"}`;
    const b = writeBatch(this.db);
    const byCom = {};
    const dropIds = {};
    orders.forEach((o) => {
      var _a;
      return (byCom[_a = o.communityId] || (byCom[_a] = [])).push(o);
    });
    for (const [cid, os] of Object.entries(byCom)) {
      const c = communities.find((x) => x.id === cid);
      const did = newId("DR");
      dropIds[cid] = did;
      const drop = {
        id: did,
        kind: "meter",
        ref: meter.id,
        title: `Gate drop \xB7 ${c?.name || cid} \xB7 ${os.length} baskets`,
        address: `${c?.name || cid} \u2014 ${c?.gate || "gate"}`,
        slot,
        orderIds: os.map((o) => o.id),
        count: os.length,
        status: "assigned",
        uids: [...new Set([c?.leaderUid, ...os.map((o) => o.customerUid)].filter(Boolean))],
        communityId: cid,
        createdAt: nowIso(),
        lat: c?.lat,
        lng: c?.lng,
        ...pickR(riders, c) ? { riderId: pickR(riders, c) } : {}
      };
      b.set(doc(this.db, "drops", did), clean(drop));
      b.set(doc(this.db, "dropSecrets", did), { code: newCode(), uids: c?.leaderUid ? [c.leaderUid] : [], communityId: cid, createdAt: nowIso() });
    }
    for (const o0 of orders) {
      const t = basketTotals(o0.lines.map((l) => ({ skuId: l.skuId, qty: l.qty })), list.skus);
      const repriced = t.sundayTotal !== o0.sundayTotal || t.fillTotal !== o0.fillTotal;
      const o = { ...o0, sundayTotal: t.sundayTotal, fillTotal: t.fillTotal };
      const bal = walletBalance(wallets.filter((w) => w.uid === o.customerUid));
      const s = settleBasket(o, tier, bal);
      b.update(doc(this.db, "meterOrders", o.id), clean({ ...s, ...repriced ? { repriced: true, sundayTotal: t.sundayTotal, fillTotal: t.fillTotal } : {}, status: "locked", dropId: dropIds[o.communityId], handoverStatus: "pending", updatedAt: nowIso() }));
      if (s.walletApplied > 0) {
        const wid = newId("W");
        b.set(doc(this.db, "walletLedger", wid), { id: wid, uid: o.customerUid, amount: -s.walletApplied, reason: `Applied to basket ${o.id}`, ref: o.id, createdAt: nowIso() });
        wallets.push({ id: wid, uid: o.customerUid, amount: -s.walletApplied, reason: "", createdAt: "" });
      }
    }
    const po = aggregateSkus(orders, list.skus);
    const batchId = meter.id;
    for (const [sup, lines] of Object.entries(groupPos(po))) b.set(doc(this.db, "supplierPOs", `${batchId}_${sup.replace(/[^A-Za-z0-9]+/g, "-")}`), clean({ batchId, supplier: sup, lines, tier, createdAt: nowIso(), total: lines.reduce((a, l) => a + l.estCost, 0) }));
    const nextCut = now < meter.cutoffMs && tier === "fill" ? meter.cutoffMs : nextCutoffMs(Math.max(now, meter.cutoffMs));
    const nid = newId("M");
    b.set(doc(this.db, "meters", nid), {
      id: nid,
      clusterId: meter.clusterId,
      clusterName: meter.clusterName,
      cycleId: cycleIdFor(nextCut),
      listId: meter.listId,
      threshold: meter.threshold,
      count: 0,
      status: "open",
      openedAt: nowIso(),
      openedMs: now,
      cutoffAt: new Date(nextCut).toISOString(),
      cutoffMs: nextCut
    });
    b.update(doc(this.db, "meters", meter.id), clean({ status: tier === "fill" ? "filled" : "sundayClosed", tier, closedAt: nowIso(), ...tier === "fill" ? { filledAt: nowIso() } : {}, deliverySlot: slot, deliveryMs: delMs, nextMeterId: nid }));
    await b.commit();
    return { tier, orders: orders.length, drops: Object.keys(byCom).length, po, nextMeterId: nid };
  }
  watchPOs(batchId, cb) {
    return this.watch(query(collection(this.db, "supplierPOs"), where("batchId", "==", batchId)), cb, "pos");
  }
  // ============================================================ DROPS (riders)
  watchRiderDrops(riderId, cb) {
    return this.watch(query(collection(this.db, "drops"), where("riderId", "==", riderId)), (d) => cb(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "rider drops");
  }
  watchAllDrops(cb) {
    return this.watch(collection(this.db, "drops"), (d) => cb(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "drops");
  }
  dropPickedUp(id) {
    return updateDoc(doc(this.db, "drops", id), { status: "picked_up", updatedAt: nowIso() });
  }
  /** Rider enters the drop OTP read out by the leader / office reception; rules compare it with dropSecrets/{id}. */
  dropDelivered(id, code) {
    return updateDoc(doc(this.db, "drops", id), { status: "delivered", dropCode: code, deliveredAt: nowIso(), updatedAt: nowIso() });
  }
  assignDrop(id, riderId) {
    return updateDoc(doc(this.db, "drops", id), { riderId, updatedAt: nowIso() });
  }
  // ============================================================ OFFICE LUNCH
  watchMenus(date, cb) {
    return this.watch(query(collection(this.db, "mealMenus"), where("date", "==", date)), cb, "menus");
  }
  watchCookMenus(cookId, cb) {
    return this.watch(query(collection(this.db, "mealMenus"), where("cookId", "==", cookId)), (m) => cb(m.sort((a, b) => b.date.localeCompare(a.date))), "cook menus");
  }
  watchCooks(cb) {
    return this.watch(collection(this.db, "cooks"), cb, "cooks");
  }
  watchMyLunch(cb) {
    return this.watch(query(collection(this.db, "lunchOrders"), where("customerUid", "==", this.me().uid)), (o) => cb(o.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "lunch");
  }
  watchCookOrders(cookId, cb) {
    return this.watch(query(collection(this.db, "lunchOrders"), where("cookId", "==", cookId)), (o) => cb(o.sort((a, b) => a.date.localeCompare(b.date))), "cook orders");
  }
  watchAllLunch(cb) {
    return this.watch(collection(this.db, "lunchOrders"), (o) => cb(o.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "all lunch");
  }
  async saveMenu(cook, date, m) {
    const id = `${date}_${cook.id}`;
    const ref = doc(this.db, "mealMenus", id);
    const cur = await getDoc(ref);
    const base = { id, cookId: cook.id, cookName: cook.name, date, cutoffMs: lunchCutoffMs(date), ...m, updatedAt: nowIso() };
    if (cur.exists()) await updateDoc(ref, clean({ vegDish: m.vegDish, vegPrice: m.vegPrice, nonVegDish: m.nonVegDish ?? deleteField(), nonVegPrice: m.nonVegPrice ?? deleteField(), capacity: m.capacity, updatedAt: nowIso() }));
    else await setDoc(ref, clean({ ...base, booked: 0, checklistDone: false }));
  }
  saveChecklist(menuId, checklist, done) {
    return updateDoc(doc(this.db, "mealMenus", menuId), { checklist, checklistDone: done, updatedAt: nowIso() });
  }
  async placeLunch(menu, f) {
    const m = this.me();
    const packs = f.vegPacks + f.nonVegPacks;
    if (packs < LUNCH.minPacks) throw new Error(`Minimum ${LUNCH.minPacks} packs`);
    const id = newId("LN");
    const mref = doc(this.db, "mealMenus", menu.id);
    await runTransaction(this.db, async (tx) => {
      const cur = (await tx.get(mref)).data();
      if (Date.now() >= cur.cutoffMs) throw new Error("Orders for this day closed at 8 pm yesterday.");
      if (cur.booked + packs > cur.capacity) throw new Error(`Only ${cur.capacity - cur.booked} packs left with ${cur.cookName}.`);
      const o = {
        id,
        customerUid: m.uid,
        customer: m.name,
        phone: m.phone,
        company: f.company,
        gstin: f.gstin || void 0,
        office: f.office,
        officeId: f.officeId,
        floor: f.floor,
        date: cur.date,
        menuId: cur.id,
        cookId: cur.cookId,
        slot: LUNCH.slot,
        vegPacks: f.vegPacks,
        nonVegPacks: f.nonVegPacks,
        packs,
        vegPrice: cur.vegPrice,
        nonVegPrice: cur.nonVegPrice || 0,
        total: f.vegPacks * cur.vegPrice + f.nonVegPacks * (cur.nonVegPrice || 0),
        pay: f.pay,
        paymentStatus: "due",
        status: "placed",
        note: f.note,
        createdAt: nowIso()
      };
      tx.set(doc(this.db, "lunchOrders", id), clean(o));
      tx.update(mref, { booked: cur.booked + packs, lastOrderId: id, updatedAt: nowIso() });
    });
    return id;
  }
  setLunchStatus(id, status) {
    return updateDoc(doc(this.db, "lunchOrders", id), { status, updatedAt: nowIso() });
  }
  /** Admin: one batched rider run per office for a date (orders that are ready/confirmed); reception gets the drop OTP. */
  async createLunchRuns(date, orders, riders, offices) {
    const todo = orders.filter((o) => o.date === date && !o.dropId && ["placed", "confirmed", "cooking", "ready"].includes(o.status));
    const by = {};
    todo.forEach((o) => {
      var _a;
      return (by[_a = o.officeId] || (by[_a] = [])).push(o);
    });
    const b = writeBatch(this.db);
    let n = 0;
    for (const [oid, os] of Object.entries(by)) {
      const off = offices.find((x) => x.id === oid);
      const did = newId("DR");
      const uids = [...new Set(os.map((o) => o.customerUid))];
      const rider = pickR(riders, off);
      const packs = os.reduce((a, o) => a + o.packs, 0);
      b.set(doc(this.db, "drops", did), clean({ id: did, kind: "lunch", ref: date, title: `Lunch run \xB7 ${off?.name || oid} \xB7 ${packs} packs`, address: off?.name || oid, slot: `${fmtDay(Date.parse(date + "T06:00:00Z"))} ${LUNCH.slot}`, orderIds: os.map((o) => o.id), count: packs, status: "assigned", uids, officeId: oid, createdAt: nowIso(), lat: off?.lat, lng: off?.lng, ...rider ? { riderId: rider } : {} }));
      b.set(doc(this.db, "dropSecrets", did), { code: newCode(), uids, createdAt: nowIso() });
      os.forEach((o) => b.update(doc(this.db, "lunchOrders", o.id), { dropId: did, updatedAt: nowIso() }));
      n++;
    }
    await b.commit();
    return n;
  }
  // cook onboarding (private application doc; admin approves → cooks/{id} + users.role = 'cook')
  watchApplication(kind, cb) {
    return this.watchDoc(`${kind}Applications/${this.me().uid}`, cb, kind + " app");
  }
  watchApplications(kind, cb) {
    return this.watch(collection(this.db, `${kind}Applications`), cb, kind + " apps");
  }
  async apply(kind, data) {
    const m = this.me();
    await setDoc(doc(this.db, `${kind}Applications`, m.uid), clean({ ...data, uid: m.uid, phone: m.phone, status: "pending", submittedAt: nowIso() }));
    await updateDoc(doc(this.db, "users", m.uid), { name: data.name || m.name, request: { role: kind, note: data.name, at: nowIso() }, updatedAt: nowIso() });
  }
  async approveCook(app) {
    const id = "k" + app.uid.slice(0, 6);
    const b = writeBatch(this.db);
    b.set(doc(this.db, "cooks", id), clean({ id, uid: app.uid, name: app.name, kitchen: app.kitchen, area: app.area, fssaiNo: app.fssaiNo, fssaiExpiry: app.fssaiExpiry, rating: 0, status: "active", veg: !!app.veg, nonVeg: !!app.nonVeg, capacity: Number(app.capacity) || 20, approvedAt: nowIso() }));
    b.update(doc(this.db, `cookApplications`, app.uid), { status: "approved", reviewedAt: nowIso() });
    b.update(doc(this.db, "users", app.uid), { role: "cook", cookId: id, storeId: deleteField(), riderId: deleteField(), proId: deleteField(), communityId: deleteField(), request: deleteField(), updatedAt: nowIso() });
    await b.commit();
    return id;
  }
  async approvePro(app) {
    const id = "x" + app.uid.slice(0, 6);
    const b = writeBatch(this.db);
    b.set(doc(this.db, "pros", id), clean({ id, uid: app.uid, name: app.name, skills: app.skills || [], area: app.area, rating: 0, ratingCount: 0, jobsDone: 0, status: "active", policeVerified: app.police === "verified", since: nowIso() }));
    b.update(doc(this.db, `proApplications`, app.uid), { status: "approved", reviewedAt: nowIso() });
    b.update(doc(this.db, "users", app.uid), { role: "pro", proId: id, storeId: deleteField(), riderId: deleteField(), cookId: deleteField(), communityId: deleteField(), request: deleteField(), updatedAt: nowIso() });
    await b.commit();
    return id;
  }
  rejectApplication(kind, uid, reason) {
    return updateDoc(doc(this.db, `${kind}Applications`, uid), { status: "rejected", reason, reviewedAt: nowIso() });
  }
  setStatusOf(coll, id, patch) {
    return updateDoc(doc(this.db, coll, id), clean(patch));
  }
  // ============================================================ HOME SERVICES
  watchPros(cb) {
    return this.watch(collection(this.db, "pros"), cb, "pros");
  }
  watchMyJobs(cb) {
    return this.watch(query(collection(this.db, "jobs"), where("customerUid", "==", this.me().uid)), (j) => cb(j.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "jobs");
  }
  watchProJobs(proId, cb) {
    return this.watch(query(collection(this.db, "jobs"), where("proId", "==", proId)), (j) => cb(j.sort((a, b) => a.slotStartMs - b.slotStartMs)), "pro jobs");
  }
  watchAllJobs(cb) {
    return this.watch(collection(this.db, "jobs"), (j) => cb(j.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "all jobs");
  }
  watchJobSecret(id, cb) {
    return onSnapshot(doc(this.db, "jobSecrets", id), (s) => cb(s.exists() ? s.data() : null), () => cb(null));
  }
  /** Book a 2-hour slot. Auto-assigns an active pro with the skill whose slot is free: proSlots/{pro_date_slot} is create-only, so a taken slot fails the batch and we try the next pro. */
  async bookJob(f, pros) {
    const m = this.me();
    const svc = SERVICES.find((s) => s.id === f.serviceId);
    const label = SLOTS.find((s) => s[0] === f.slot)?.[1] || f.slot;
    const cands = f.warrantyOf ? pros.filter((p) => p.id === f.warrantyOf.proId) : pros.filter((p) => p.status === "active" && p.skills.includes(f.serviceId)).sort((a, b) => b.rating - a.rating);
    if (!f.warrantyOf) cands.push(void 0);
    let lastErr;
    for (const p of cands) {
      const id = newId("JB");
      const b = writeBatch(this.db);
      const job = {
        id,
        customerUid: m.uid,
        customer: m.name,
        phone: m.phone,
        serviceId: svc.id,
        serviceName: svc.name,
        address: f.address,
        problem: f.problem,
        slotDate: f.slotDate,
        slot: f.slot,
        slotLabel: label,
        slotStartMs: slotStartMs(f.slotDate, f.slot),
        inspectionFee: f.warrantyOf ? 0 : SERVICE_FEE,
        pay: f.pay,
        paymentStatus: "due",
        status: p ? "assigned" : "requested",
        createdAt: nowIso(),
        ...p ? { proId: p.id, proName: p.name } : {},
        ...f.warrantyOf ? { warrantyOf: f.warrantyOf.id } : {}
      };
      b.set(doc(this.db, "jobs", id), clean(job));
      b.set(doc(this.db, "jobSecrets", id), { startOtp: newCode(), finishOtp: newCode(), customerUid: m.uid, createdAt: nowIso() });
      if (p) b.set(doc(this.db, "proSlots", `${p.id}_${f.slotDate}_${f.slot}`), { jobId: id, proId: p.id, customerUid: m.uid, createdAt: nowIso() });
      try {
        await b.commit();
        return job;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("No slot");
  }
  /** Pro actions; OTP checks happen in the rules against jobSecrets/{id}. */
  jobEnRoute(id) {
    return updateDoc(doc(this.db, "jobs", id), { status: "en_route", updatedAt: nowIso() });
  }
  jobStart(id, code) {
    return updateDoc(doc(this.db, "jobs", id), { status: "started", startCode: code, startedAt: nowIso(), updatedAt: nowIso() });
  }
  jobQuote(id, lines) {
    return updateDoc(doc(this.db, "jobs", id), { status: "quoted", quoteLines: lines, quoteTotal: lines.reduce((a, l) => a + l.amount, 0), updatedAt: nowIso() });
  }
  jobFinish(id, code, collectedVia) {
    const until = Date.now() + WARRANTY_DAYS * DAY;
    return updateDoc(doc(this.db, "jobs", id), clean({ status: "done", finishCode: code, doneAt: nowIso(), warrantyUntilMs: until, warrantyUntil: new Date(until).toISOString(), updatedAt: nowIso(), ...collectedVia ? { paymentStatus: "collected", collectedVia } : {} }));
  }
  jobDecide(id, approve) {
    return updateDoc(doc(this.db, "jobs", id), { status: approve ? "quote_approved" : "quote_declined", updatedAt: nowIso() });
  }
  jobCancel(id) {
    return updateDoc(doc(this.db, "jobs", id), { status: "cancelled", updatedAt: nowIso() });
  }
  jobRate(id, rating, review) {
    return updateDoc(doc(this.db, "jobs", id), { rating, review, ratedAt: nowIso(), updatedAt: nowIso() });
  }
  async assignJob(j, p) {
    const b = writeBatch(this.db);
    b.update(doc(this.db, "jobs", j.id), { proId: p.id, proName: p.name, status: "assigned", updatedAt: nowIso() });
    b.set(doc(this.db, "proSlots", `${p.id}_${j.slotDate}_${j.slot}`), { jobId: j.id, proId: p.id, customerUid: j.customerUid, createdAt: nowIso() });
    await b.commit();
  }
  // ============================================================ FLASH DEALS
  watchDealsCfg(cb) {
    return onSnapshot(doc(this.db, "settings", "deals"), (s) => cb({ fromHour: DEALS.fromHour, toHour: DEALS.toHour, ...s.data() || {} }), warn("deals cfg"));
  }
  setDealsCfg(p) {
    return setDoc(doc(this.db, "settings", "deals"), p, { merge: true });
  }
  watchLiveDeals(cb) {
    return this.watch(query(collection(this.db, "deals"), where("status", "==", "live")), (d) => cb(d.sort((a, b) => a.expiresAtMs - b.expiresAtMs)), "deals");
  }
  watchStoreDeals(storeId, cb) {
    return this.watch(query(collection(this.db, "deals"), where("storeId", "==", storeId)), (d) => cb(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "store deals");
  }
  watchAllDeals(cb) {
    return this.watch(collection(this.db, "deals"), (d) => cb(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "all deals");
  }
  watchCap(storeId, cb) {
    return onSnapshot(doc(this.db, "dealCaps", `${storeId}_${istDayNo(Date.now())}`), (s) => cb(s.data() || { deals: 0, units: 0 }), () => cb({ deals: 0, units: 0 }));
  }
  /** Publish (only after the vendor tapped Confirm). Transaction bumps the per-night cap counter dealCaps/{store_dayNo}; rules enforce price ≤ 0.7×, 60–90 min, 2 deals / 20 units. */
  async createDeal(store, p, f) {
    const now = Date.now(), day = istDayNo(now), id = newId("DL");
    const capRef = doc(this.db, "dealCaps", `${store.id}_${day}`);
    await runTransaction(this.db, async (tx) => {
      const cap = await tx.get(capRef);
      const c = cap.data() || { deals: 0, units: 0 };
      if (c.deals + 1 > DEALS.capDeals || c.units + f.qty > DEALS.capUnits) throw new Error(`Tonight's limit: ${DEALS.capDeals} deals / ${DEALS.capUnits} portions (used ${c.deals} / ${c.units}).`);
      const d = {
        id,
        storeId: store.id,
        storeName: store.name,
        fssaiNo: store.fssaiNo || "",
        productId: p.id,
        item: p.name,
        ta: p.ta,
        emoji: p.emoji,
        qtyTotal: f.qty,
        qtyLeft: f.qty,
        regularPrice: p.price,
        dealPrice: f.dealPrice,
        discountPct: Math.round((1 - f.dealPrice / p.price) * 100),
        preparedAt: f.preparedAt,
        windowStartMs: now,
        expiresAtMs: now + f.minutes * 6e4,
        expiresAt: new Date(now + f.minutes * 6e4).toISOString(),
        dayNo: day,
        fulfil: f.fulfil,
        deliveryFee: DEALS.deliveryFee,
        veg: !!p.veg,
        allergens: f.allergens,
        status: "live",
        voiceTranscript: f.transcript,
        lat: store.lat,
        lng: store.lng,
        createdAt: nowIso(),
        confirmedAt: nowIso()
      };
      tx.set(doc(this.db, "deals", id), clean(d));
      if (cap.exists()) tx.update(capRef, { deals: c.deals + 1, units: c.units + f.qty, lastDealId: id });
      else tx.set(capRef, { storeId: store.id, dayNo: day, deals: 1, units: f.qty, lastDealId: id });
    });
    return id;
  }
  removeDeal(id, reason = "Removed by vendor") {
    return updateDoc(doc(this.db, "deals", id), { status: "removed", removedReason: reason, updatedAt: nowIso() });
  }
  /** First come, first served: transaction decrements qtyLeft and creates the claim + private pickup code. */
  async claimDeal(deal, qty, fulfil, pay, address) {
    const m = this.me();
    const id = newId("CL");
    const dref = doc(this.db, "deals", deal.id);
    await runTransaction(this.db, async (tx) => {
      const d = (await tx.get(dref)).data();
      if (!d || d.status !== "live" || Date.now() >= d.expiresAtMs) throw new Error("This deal has ended.");
      if (d.qtyLeft < qty) throw new Error(d.qtyLeft ? `Only ${d.qtyLeft} left.` : "Sold out \u2014 someone was faster!");
      const fee = fulfil === "delivery" ? d.deliveryFee : 0;
      const left = d.qtyLeft - qty;
      const c = {
        id,
        dealId: d.id,
        storeId: d.storeId,
        storeName: d.storeName,
        item: d.item,
        customerUid: m.uid,
        customer: m.name,
        phone: m.phone,
        qty,
        price: d.dealPrice,
        deliveryFee: fee,
        total: qty * d.dealPrice + fee,
        fulfil,
        address,
        pay,
        status: "claimed",
        createdAt: nowIso(),
        expiresAtMs: d.expiresAtMs
      };
      tx.set(doc(this.db, "dealClaims", id), clean(c));
      tx.set(doc(this.db, "claimSecrets", id), { code: newCode(), customerUid: m.uid, createdAt: nowIso() });
      tx.update(dref, { qtyLeft: left, status: left === 0 ? "soldOut" : "live", lastClaimId: id, updatedAt: nowIso() });
    });
    return id;
  }
  watchMyClaims(cb) {
    return this.watch(query(collection(this.db, "dealClaims"), where("customerUid", "==", this.me().uid)), (c) => cb(c.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "claims");
  }
  watchStoreClaims(storeId, cb) {
    return this.watch(query(collection(this.db, "dealClaims"), where("storeId", "==", storeId)), (c) => cb(c.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "store claims");
  }
  watchRiderClaims(riderId, cb) {
    return this.watch(query(collection(this.db, "dealClaims"), where("rider", "==", riderId)), cb, "rider claims");
  }
  watchAllClaims(cb) {
    return this.watch(collection(this.db, "dealClaims"), (c) => cb(c.sort((a, b) => b.createdAt.localeCompare(a.createdAt))), "all claims");
  }
  watchClaimCode(id, cb) {
    return onSnapshot(doc(this.db, "claimSecrets", id), (s) => cb(s.exists() ? s.data().code : null), () => cb(null));
  }
  claimHandover(id, code, status, collectedVia) {
    return updateDoc(doc(this.db, "dealClaims", id), clean({ status, pickupCode: code, updatedAt: nowIso(), ...collectedVia ? { collectedVia } : {} }));
  }
  claimNoShow(id) {
    return updateDoc(doc(this.db, "dealClaims", id), { status: "no_show", updatedAt: nowIso() });
  }
  rateClaim(id, rating, complaint) {
    return updateDoc(doc(this.db, "dealClaims", id), clean({ rating, complaint: complaint || void 0, ratedAt: nowIso(), updatedAt: nowIso() }));
  }
  watchPrefs(cb) {
    return this.watchDoc("dealPrefs/" + this.me().uid, cb, "prefs");
  }
  savePrefs(p) {
    return setDoc(doc(this.db, "dealPrefs", this.me().uid), clean({ ...p, updatedAt: nowIso() }), { merge: true });
  }
  // admin moderation
  setStorePause(storeId, paused, reason = "") {
    return updateDoc(doc(this.db, "stores", storeId), { dealsPaused: paused, pauseReason: paused ? reason : deleteField() });
  }
  async createDealRun(run, claims, riderId) {
    const b = writeBatch(this.db);
    claims.forEach((c) => b.update(doc(this.db, "dealClaims", c.id), { rider: riderId, run, updatedAt: nowIso() }));
    await b.commit();
  }
}
export {
  ModelsApi,
  istDate
};
